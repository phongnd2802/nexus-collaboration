# Approvals APIs

Base path: `workspaces/:workspaceId/approvals`

## Request Types

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | POST | `/types` | Tạo loại yêu cầu mới |
| 2 | GET | `/types` | Lấy danh sách loại yêu cầu |
| 3 | GET | `/types/:typeId` | Lấy chi tiết một loại yêu cầu |
| 4 | PATCH | `/types/:typeId` | Cập nhật loại yêu cầu |
| 5 | DELETE | `/types/:typeId` | Xoá (soft delete) loại yêu cầu |

## Approval Requests

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 6 | POST | `/requests` | Tạo yêu cầu phê duyệt mới (kèm thông báo, WebSocket, Google Sheets) |
| 7 | GET | `/requests` | Lấy danh sách yêu cầu (filter theo status, type, requester, priority, pendingMyApproval; phân trang) |
| 8 | GET | `/requests/:requestId` | Lấy chi tiết yêu cầu phê duyệt |
| 9 | PATCH | `/requests/:requestId` | Cập nhật yêu cầu (chỉ requester khi đang pending) |
| 10 | POST | `/requests/:requestId/approve` | Phê duyệt yêu cầu (kèm xử lý Budget Expense, notification, Google Sheets, WebSocket) |
| 11 | POST | `/requests/:requestId/reject` | Từ chối yêu cầu (kèm xử lý Budget Expense, notification, Google Sheets, WebSocket) |
| 12 | POST | `/requests/:requestId/cancel` | Huỷ yêu cầu (chỉ requester khi đang pending, kèm notification, WebSocket) |
| 13 | DELETE | `/requests/:requestId` | Xoá yêu cầu (chỉ owner/admin, chỉ xoá được request đã hoàn tất, kèm WebSocket) |

## Comments

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 14 | POST | `/requests/:requestId/comments` | Thêm bình luận vào yêu cầu (kèm notification, WebSocket) |
| 15 | GET | `/requests/:requestId/comments` | Lấy danh sách bình luận của yêu cầu |
| 16 | DELETE | `/requests/:requestId/comments/:commentId` | Xoá bình luận (chỉ người tạo) |

## Statistics

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 17 | GET | `/stats` | Thống kê phê duyệt (tổng số, pending/approved/rejected/my, pending my approval, avg time, breakdown theo type) |
