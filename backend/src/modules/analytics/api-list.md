# Analytics APIs

Base path: `workspaces/:workspaceId/analytics`

## Danh sách API

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/` | Tổng quan analytics workspace (users, projects, tasks, activities + trends) |
| 2 | GET | `/users` | Analytics người dùng: số thành viên, active users, phân bố role, chi tiết hành động từng user |
| 3 | GET | `/projects` | Analytics dự án: tổng số project, active/completed, completion rate từng project, task overdue |
| 4 | GET | `/tasks` | Analytics nhiệm vụ: tổng số task, completed/overdue, completion rate, phân bố status/priority, task trends theo ngày |
| 5 | GET | `/activity` | Analytics hoạt động: tổng activities, phân bố action, phân bố theo giờ/ngày, peak activity day |

## Query Parameters (chung)

| Param | Type | Mô tả |
|-------|------|-------|
| `timeRange` | enum | `today`, `week` (default), `month`, `quarter`, `year`, `custom` |
| `startDate` | ISO string | Ngày bắt đầu (khi `timeRange=custom`) |
| `endDate` | ISO string | Ngày kết thúc (khi `timeRange=custom`) |
| `metrics` | enum[] | Lọc metrics: `users`, `projects`, `tasks`, `activity`, `performance` |
| `groupBy` | string | Nhóm kết quả theo field (vd: `user_id`) |
