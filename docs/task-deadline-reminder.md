# Task Deadline Reminder — Cron Job Gửi Email Nhắc Nhở

## 1. Tổng quan

Cron job chạy mỗi 5 phút, tìm các task sắp tới hạn và gửi email nhắc nhở cho assignees. Đồng thời tạo in-app notification.

**Mốc nhắc cố định**: 3 ngày, 1 ngày, 12 giờ, 3 giờ, 1 giờ trước deadline.

**Dedup**: Kiểm tra bảng `notifications` tránh gửi trùng lặp.

---

## 2. Flow hoạt động

```
Mỗi 5 phút:
1. TaskReminderService.handleTaskDeadlineReminders() được trigger
   │
   ├─ 2. Loop qua 5 mốc: [3 ngày, 1 ngày, 12 giờ, 3 giờ, 1 giờ]
   │     │
   │     ├─ 3. Tính time window cho mỗi mốc:
   │     │    windowStart = now + milliseconds - 2.5 phút
   │     │    windowEnd   = now + milliseconds + 2.5 phút
   │     │    (window rộng 5 phút để đảm bảo không bỏ sót do drift)
   │     │
   │     ├─ 4. Query tasks:
   │     │    SELECT t.*, p.name AS project_name, p.workspace_id
   │     │    FROM tasks t JOIN projects p ON t.project_id = p.id
   │     │    WHERE t.due_date >= $windowStart
   │     │      AND t.due_date <= $windowEnd
   │     │      AND t.status NOT IN ('done','completed','cancelled')
   │     │      AND t.assigned_to IS NOT NULL
   │     │
   │     └─ 5. Với mỗi task → mỗi assignee:
   │           │
   │           ├─ 5a. Dedup check: Đã gửi notification với
   │           │   type='reminder', entity_type='task', entity_id=taskId,
   │           │   user_id=assigneeId, data->>'remind_before'=windowLabel
   │           │   trong 30 phút qua chưa? → Nếu rồi, SKIP
   │           │
   │           ├─ 5b. Preference check:
   │           │   → Nếu doNotDisturb → SKIP
   │           │   → Nếu types.reminder.email=off và in_app=off → SKIP
   │           │   → Nếu global.email=off và global.in_app=off → SKIP
   │           │
   │           ├─ 5c. Gửi email qua EmailProviderService.send()
   │           │   → Subject: "[Nexus] Nhắc nhở: "task title" sẽ hết hạn sau X"
   │           │   → HTML/Text từ buildTaskReminderEmail()
   │           │
   │           └─ 5d. Tạo in-app notification qua NotificationsService.sendNotification()
   │               → type: REMINDER, entity_type: 'task', entity_id: taskId
   │               → data: { remind_before, due_date, priority, ... }
   │               → Ghi nhận dedup key cho lần kiểm tra tiếp theo
```

---

## 3. Cơ chế Dedup

Cron chạy mỗi 5 phút, window rộng 5 phút → 1 task có thể xuất hiện ở 2 lần chạy liên tiếp. Dedup đảm bảo không gửi trùng:

```sql
SELECT id FROM notifications
WHERE user_id = $1
  AND type = 'reminder'
  AND entity_type = 'task'
  AND entity_id = $2              -- task ID
  AND created_at >= $3            -- 30 phút trước
  AND data->>'remind_before' = $4 -- '1 giờ', '1 ngày', v.v.
LIMIT 1
```

Nếu query trả về kết quả → đã gửi → **SKIP**.

---

## 4. Danh sách file cần tạo/sửa

### 4.1. File mới: `backend/src/modules/scheduler/templates/task-reminder-email.ts`

Email template cho task reminder. Export `buildTaskReminderEmail(data)` trả về `{ html, text }`.

**Input** (`TaskReminderData`):

| Field | Type | Mô tả |
|-------|------|--------|
| `taskTitle` | `string` | Tên task |
| `taskDescription` | `string?` | Mô tả task |
| `projectName` | `string` | Tên project |
| `dueDate` | `string` | Hạn deadline (đã format) |
| `priority` | `string` | Mức ưu tiên (urgent/high/medium/low) |
| `remindBeforeLabel` | `string` | Nhãn mốc nhắc ("3 ngày", "1 ngày", v.v.) |
| `taskUrl` | `string` | Link đến task |
| `workspaceName` | `string?` | Tên workspace |
| `assigneeName` | `string` | Tên người được gán |

**Output email**:
- Subject: `[Nexus] Nhắc nhở: "task title" sẽ hết hạn sau X`
- HTML: Template responsive với header indigo, bảng thông tin, nút "Xem chi tiết task"
- Text: Plain text fallback

**Template HTML** bao gồm:
- Header: `⏰ Nhắc nhở: Task sắp tới hạn`
- Lời chào: `Xin chào <tên>,`
- Thông điệp chính: `Task "title" sẽ hết hạn sau X.`
- Bảng thông tin: Task, Dự án, Hạn, Mức ưu tiên (badge màu theo priority)
- Nút CTA: `Xem chi tiết task` (link đến task trong app)
- Footer: Branding Nexus

**Priority color map**:

| Priority | Color code | Label |
|----------|-----------|-------|
| urgent | `#DC2626` | Khẩn cấp |
| high | `#EA580C` | Cao |
| medium | `#D97706` | Trung bình |
| low | `#059669` | Thấp |

---

### 4.2. File mới: `backend/src/modules/scheduler/templates/index.ts`

Barrel export:

```typescript
export { buildTaskReminderEmail, TaskReminderData } from './task-reminder-email';
```

---

### 4.3. File mới: `backend/src/modules/scheduler/task-reminder.service.ts`

Service chính chứa cron job. Chi tiết đầy đủ:

#### Constants

```typescript
const REMINDER_WINDOWS: ReminderWindow[] = [
  { milliseconds: 3 * 24 * 60 * 60 * 1000, label: '3 ngày' },
  { milliseconds: 1 * 24 * 60 * 60 * 1000, label: '1 ngày' },
  { milliseconds: 12 * 60 * 60 * 1000,      label: '12 giờ' },
  { milliseconds: 3 * 60 * 60 * 1000,        label: '3 giờ' },
  { milliseconds: 1 * 60 * 60 * 1000,        label: '1 giờ' },
];

const COMPLETED_STATUSES = ['done', 'completed', 'cancelled'];
```

#### Dependencies (inject)

| Dependency | Module | Mục đích |
|-----------|--------|---------|
| `DatabaseService` | DatabaseModule | Query tasks, users, notifications (dedup) |
| `EmailProviderService` | EmailProviderModule | Gửi email nhắc nhở |
| `NotificationsService` | NotificationsModule | Tạo in-app notification, kiểm tra preferences |

#### Methods

**`handleTaskDeadlineReminders()`** — `@Cron(CronExpression.EVERY_5_MINUTES)`
- Lock: `isProcessing` flag tránh concurrent execution
- Loop qua mỗi `REMINDER_WINDOWS`
- Log start/end

**`processReminderWindow(now, window)`**
- Tính `windowStart` / `windowEnd` (± 2.5 phút từ thời điểm nhắc)
- Gọi `findTasksDueInWindow()`
- Loop tasks → `processTaskReminder()`

**`findTasksDueInWindow(windowStart, windowEnd)`** → `any[]`
- Raw SQL query JOIN tasks với projects
- Lấy `project_name` và `workspace_id` trong cùng query (tránh N+1)
- Filter: `due_date BETWEEN windowStart AND windowEnd`, `status NOT IN COMPLETED_STATUSES`, `assigned_to IS NOT NULL`

**`processTaskReminder(task, window)`**
- Parse `assigned_to` (jsonb → `string[]`)
- Loop assignee IDs:
  1. `hasReminderBeenSent()` → dedup check
  2. `getUserById()` → lấy user info
  3. `checkNotificationPreferences()` → check DND, reminder prefs
  4. `sendTaskReminderEmail()` → gửi email
  5. `createTaskReminderNotification()` → in-app notification

**`hasReminderBeenSent(taskId, userId, remindBeforeLabel)`** → `boolean`
- Query bảng `notifications` tìm bản ghi cùng `user_id`, `type='reminder'`, `entity_type='task'`, `entity_id=taskId`, `data->>'remind_before'=label`, tạo trong 30 phút qua
- Nếu có → return `true` (đã gửi, skip)

**`checkNotificationPreferences(userId)`** → `boolean`
- Gọi `NotificationsService.getNotificationPreferences(userId)`
- Kiểm tra: `metadata.doNotDisturb` → `false`
- Kiểm tra: `types.reminder` prefs (email/in_app đều tắt → `false`)
- Kiểm tra: `global.email` và `global.in_app` (cả hai tắt → `false`)
- Default: `true` (cho phép nếu có lỗi)

**`sendTaskReminderEmail(user, task, window, taskUrl, dueDate)`**
- Kiểm tra `user.email` tồn tại
- Kiểm tra `emailProvider.isAvailable()`
- Gọi `buildTaskReminderEmail()` → `{ html, text }`
- Gọi `emailProvider.send({ to, subject, html, text, tags })`

**`createTaskReminderNotification(task, assigneeId, workspaceId, window, taskUrl)`**
- Gọi `notificationsService.sendNotification()` với:
  - `user_id`: assignee ID
  - `type`: `NotificationType.REMINDER`
  - `title`: `Task sắp tới hạn: {task.title}`
  - `message`: `Task "{title}" sẽ hết hạn sau {window.label}. Hạn: {dueDate}`
  - `action_url`: task URL
  - `priority`: `high` nếu task priority urgent/high, còn lại `normal`
  - `send_push`: `true`
  - `send_email`: `false` (đã gửi riêng qua EmailProviderService)
  - `data`: `{ category, entity_type, entity_id, workspace_id, task_title, task_id, project_id, remind_before, due_date, priority }`

**`getReminderStats()`** → `{ lastRun, isRunning }`
- Admin endpoint để monitor trạng thái cron job

---

### 4.4. Sửa: `backend/src/modules/scheduler/scheduler.module.ts`

**Thay đổi**:

```diff
 import { Module, forwardRef } from '@nestjs/common';
 import { ScheduleModule } from '@nestjs/schedule';
 import { NotificationSchedulerService } from './notification-scheduler.service';
 import { RecordingProcessorService } from './recording-processor.service';
 import { ScheduledMessageProcessorService } from './scheduled-message-processor.service';
+import { TaskReminderService } from './task-reminder.service';
 import { SchedulerController } from './scheduler.controller';
 import { NotificationsModule } from '../notifications/notifications.module';
+import { EmailProviderModule } from '../email/email.module';
 import { VideoCallsModule } from '../video-calls/video-calls.module';
 import { ChatModule } from '../chat/chat.module';
 
 @Module({
   imports: [
     ScheduleModule.forRoot(),
     forwardRef(() => NotificationsModule),
+    EmailProviderModule,
     forwardRef(() => VideoCallsModule),
     forwardRef(() => ChatModule),
   ],
   controllers: [SchedulerController],
   providers: [
     NotificationSchedulerService,
     RecordingProcessorService,
     ScheduledMessageProcessorService,
+    TaskReminderService,
   ],
   exports: [
     NotificationSchedulerService,
     RecordingProcessorService,
     ScheduledMessageProcessorService,
+    TaskReminderService,
   ],
 })
 export class SchedulerModule {}
```

---

### 4.5. Sửa: `backend/src/modules/scheduler/scheduler.controller.ts`

**Thay đổi**: Thêm endpoint monitor.

```diff
 import { NotificationSchedulerService } from './notification-scheduler.service';
 import { RecordingProcessorService } from './recording-processor.service';
+import { TaskReminderService } from './task-reminder.service';
 import {
   CreateScheduledNotificationDto,
   UpdateScheduledNotificationDto,
   QueryScheduledNotificationsDto,
   ScheduledNotificationResponseDto,
   PaginatedScheduledNotificationsDto,
   SchedulerStatsDto,
 } from './dto';
 
 export class SchedulerController {
   constructor(
     private readonly schedulerService: NotificationSchedulerService,
     private readonly recordingProcessorService: RecordingProcessorService,
+    private readonly taskReminderService: TaskReminderService,
   ) {}

   // ...existing endpoints...

+  // =============================================
+  // TASK REMINDERS
+  // =============================================
+
+  @Get('task-reminders/stats')
+  @ApiOperation({ summary: 'Get task reminder statistics' })
+  @ApiResponse({ status: HttpStatus.OK, description: 'Task reminder stats' })
+  async getTaskReminderStats() {
+    return this.taskReminderService.getReminderStats();
+  }
 }
```

---

## 5. Giải thích thiết kế

### Tại sao dùng raw SQL thay vì `db.findMany()`?

`DatabaseService.findMany()` chỉ hỗ điều kiện equality. Cần `BETWEEN` cho date range và `NOT IN` cho status. Dùng `db.query()` (raw SQL) cho hiệu suất. Đồng thời `JOIN projects` để lấy `project_name` và `workspace_id` trong 1 query, tránh N+1.

### Tại sao KHÔNG sửa schema hay preference DTO (MVP)?

- Mốc nhắc cố định (3d, 1d, 12h, 3h, 1h) → không cần thêm cột `task_reminder_settings`
- Notification preferences hiện tại đã đủ: `global.email`, `types.reminder.email/in_app`, `doNotDisturb`, `quiet_hours`
- Sau này có thể mở rộng thêm preference API cho user tuỳ chỉnh mốc nhắc

### Tại sao gửi 2 kênh riêng (email + in-app)?

- **Email**: Gửi trực tiếp qua `EmailProviderService.send()` → không phụ thuộc vào notification system, đảm bảo deliverability
- **In-app**: Dùng `NotificationsService.sendNotification()` với `send_email: false` → tránh gửi email 2 lần, chỉ tạo notification trong DB + WebSocket push

### Tại sao window rộng ± 2.5 phút?

Cron chạy mỗi 5 phút. Nếu task due_date rơi đúng vào giữa 2 lần chạy, window ± 2.5 phút đảm bảo task vẫn được nhận. Dedup check ngăn gửi trùng.

---

## 6. Kiểm thử thủ công

1. **Tạo task có `due_date` trong 1 giờ tới**, assign cho user có email thật
2. Chờ cron trigger (hoặc gọi `GET /api/v1/scheduler/task-reminders/stats` để check)
3. Kiểm tra:
   - Email nhận được với đúng template
   - In-app notification xuất hiện với type=`reminder`
   - Không gửi trùng (chạy lại cron, dedup phải SKIP)
4. Test các mốc khác nhau: đổi `due_date` của task để test 3d, 1d, 12h, 3h

---

## 7. Mở rộng tương lai (Out of scope MVP)

- Cho phép user tuỳ chỉnh mốc nhắc trong notification preferences (thêm cột `task_reminder_settings` jsonb)
- Daily digest: gộp nhiều task sắp hạn thành 1 email tổng hợp
- Thêm endpoint PUT `/scheduler/task-reminders/preferences` cho user bật/tắt reminder
- Webhook event khi reminder được gửi, để integration bên ngoài consume