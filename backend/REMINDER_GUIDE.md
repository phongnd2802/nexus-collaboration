# 📧 Email Reminder System - Hướng dẫn sử dụng

## 🎯 Tổng quan

Hệ thống tự động gửi email nhắc nhở cho tasks và projects sắp hết hạn.

## ⏰ Lịch gửi email

### Các mốc thời gian:

- **24 giờ trước**: Email màu xanh 🔵 (REMINDER)
- **3 giờ trước**: Email màu cam 🟠 (HIGH PRIORITY)
- **1 giờ trước**: Email màu đỏ 🔴 (URGENT)
- **< 1 giờ**: Email màu đỏ 🔴 (URGENT - LESS THAN 1 HOUR)

### Cơ chế hoạt động:

```
✅ Nếu due > 24h: Không gửi gì
✅ Nếu due = 24h ± 1p: Gửi reminder 24h (1 lần duy nhất)
✅ Nếu due = 3h ± 1p: Gửi reminder 3h (1 lần duy nhất)
✅ Nếu due = 1h ± 1p: Gửi reminder 1h (1 lần duy nhất)
✅ Nếu 0 < due < 59 phút: Gửi reminder urgent (1 lần duy nhất)
```

## 🚀 Cài đặt

### 1. Cấu hình SMTP

Thêm vào file `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
```

**Lưu ý cho Gmail:**

1. Bật 2-factor authentication
2. Tạo App Password tại: https://myaccount.google.com/apppasswords
3. Sử dụng App Password làm `SMTP_PASS`

### 2. Khởi động server

```bash
cd backend
npm run dev
```

Server sẽ tự động:

- ✅ Kiểm tra reminders mỗi 30 phút
- ✅ Cleanup cache mỗi ngày lúc 3:00 AM

## 🧪 Testing

### Test thủ công (không cần đợi 30 phút)

```bash
cd backend
npx ts-node src/test-reminder.ts
```

### Test với data thật

1. Tạo task/project với deadline trong 1-24 giờ tới
2. Chạy test script ở trên
3. Kiểm tra email

## 📁 Cấu trúc files

```
backend/src/
├── utils/
│   ├── email.ts                    # Email templates & sending functions
│   │   ├── sendTaskDueReminderEmail()
│   │   └── sendProjectDueReminderEmail()
│   │
│   └── scheduler.ts                # Cron job scheduler ⭐ MỚI
│       ├── startReminderScheduler()
│       ├── stopReminderScheduler()
│       ├── isSchedulerRunning()
│       └── triggerReminderNow()
│
├── services/
│   └── reminderService.ts          # Business logic
│       ├── checkAndSendTaskReminders()
│       ├── checkAndSendProjectReminders()
│       ├── runAllReminders()
│       └── cleanupReminderCache()
│
├── index.ts                        # Server entry (integrated scheduler)
└── test-reminder.ts               # Test script
```

## 🔧 Cron Schedule

### Reminder Check

- **Pattern**: `*/30 * * * *`
- **Nghĩa**: Mỗi 30 phút
- **Ví dụ**: 00:00, 00:30, 01:00, 01:30...

### Cache Cleanup

- **Pattern**: `0 3 * * *`
- **Nghĩa**: Mỗi ngày lúc 3:00 AM
- **Lý do**: Xóa cache cũ, tránh memory leak

## 📊 Logs

### Khi server start:

```
Server running on port 4000
Socket.io server configured and ready
⏰ Reminder scheduler started - checking every 30 minutes
🧹 Cache cleanup scheduled daily at 03:00 AM
```

### Khi cron chạy:

```
⏰ [CRON] Running scheduled reminder check...
🔔 Running reminder checks...
✅ Sent 24h reminder for task: Finish documentation to user@email.com
✅ Sent 3h reminder for project: Q4 Planning to user1@email.com
✅ Sent 3h reminder for project: Q4 Planning to user2@email.com
✅ Reminder checks completed
```

### Khi cleanup:

```
🧹 [CRON] Running scheduled cache cleanup...
🧹 Reminder cache cleaned up
```

## 🎮 API Functions

### scheduler.ts

#### `startReminderScheduler()`

Khởi động cron jobs tự động.

```typescript
import { startReminderScheduler } from "./utils/scheduler";
startReminderScheduler();
```

#### `stopReminderScheduler()`

Dừng tất cả cron jobs.

```typescript
import { stopReminderScheduler } from "./utils/scheduler";
stopReminderScheduler();
```

#### `triggerReminderNow()`

Chạy reminder check ngay lập tức (không đợi cron).

```typescript
import { triggerReminderNow } from "./utils/scheduler";
await triggerReminderNow();
```

#### `isSchedulerRunning()`

Kiểm tra scheduler có đang chạy không.

```typescript
import { isSchedulerRunning } from "./utils/scheduler";
if (isSchedulerRunning()) {
  console.log("Scheduler is running");
}
```

## 🔍 Troubleshooting

### Email không gửi được

1. Kiểm tra `.env` có đầy đủ config SMTP
2. Test SMTP connection:
   ```bash
   npx ts-node -e "
   import { sendTaskDueReminderEmail } from './src/utils/email';
   sendTaskDueReminderEmail('test@email.com', 'Test', '1', 'Project', new Date(), 1);
   "
   ```

### Scheduler không chạy

1. Kiểm tra logs khi server start
2. Kiểm tra `index.ts` đã import và call `startReminderScheduler()`
3. Restart server

### Nhận quá nhiều email

- Cache đã bị xóa → Đợi đến ngày hôm sau hoặc restart server
- Mỗi task/project chỉ nhận tối đa 4 emails (24h, 3h, 1h, <1h)

### Timezone không đúng

Email sử dụng local time của server. Để đổi:

```javascript
// Trong email.ts
dueDate.toLocaleString("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh", // Thêm dòng này
});
```

## 🎨 Customization

### Thay đổi cron schedule

#### Chạy mỗi 15 phút:

```typescript
cron.schedule('*/15 * * * *', async () => { ... });
```

#### Chạy mỗi giờ:

```typescript
cron.schedule('0 * * * *', async () => { ... });
```

#### Chạy mỗi ngày lúc 9:00 AM:

```typescript
cron.schedule('0 9 * * *', async () => { ... });
```

### Thay đổi mốc thời gian

Sửa trong `reminderService.ts`:

```typescript
// Thay vì 24h, 3h, 1h
// Có thể đổi thành 48h, 6h, 2h
if (Math.abs(hoursUntilDue - 48) <= tolerance) {
  // Gửi reminder 48h
}
```

### Thay đổi email template

Sửa trong `email.ts`:

```typescript
export async function sendTaskDueReminderEmail(...) {
  // Customize HTML template
  html: `
    <div style="...">
      <!-- Your custom design -->
    </div>
  `
}
```

## 📈 Performance

- **Memory**: Map cache ~1KB per 100 tasks/projects
- **CPU**: Minimal (chỉ chạy 30 phút/lần)
- **Network**: Email gửi qua SMTP (async, không block server)

## 🔐 Security

- ✅ Email credentials trong `.env` (không commit)
- ✅ Rate limiting cho email sending (built-in nodemailer)
- ✅ Validation input (task/project IDs)
- ✅ Error handling (không crash server nếu email fail)

## 🚦 Production Checklist

- [ ] SMTP credentials đã cấu hình đúng
- [ ] Tested với data thật
- [ ] Logs được monitor
- [ ] Email template hiển thị đúng trên mobile
- [ ] Timezone đã set đúng
- [ ] Error alerts được setup (optional)

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs
2. Test với script `test-reminder.ts`
3. Verify SMTP config
4. Check database có tasks/projects với deadline phù hợp

---

✨ **Hệ thống đã sẵn sàng!** Start server và để nó tự động gửi email nhắc nhở. 🚀
