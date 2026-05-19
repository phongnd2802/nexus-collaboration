# Đặc Tả Luồng Tương Tác

## 1. Luồng tạo project
1. Người dùng mở modal tạo dự án.
2. Người dùng chọn `project.type`.
3. Hệ thống tự áp:
   - preset view
   - preset workflow stages
   - preset field theo loại.
4. Người dùng xem preview.
5. Khi bấm tạo:
   - lưu `project.type`
   - lưu `kanban_stages`
   - điều hướng vào default view của loại dự án.

Xử lý lỗi:
- Nếu API tạo dự án lỗi: hiển thị toast lỗi và giữ modal mở.

## 2. Luồng mở project
1. Tải dự án theo ID.
2. Resolve config runtime:
   - `project.type`
   - `kanban_stages`
   - ma trận view khả dụng.
3. Resolve view ban đầu:
   - ưu tiên view từ query URL nếu hợp lệ
   - nếu không, dùng default view theo loại
   - nếu vẫn thiếu, fallback `board`.

## 3. Luồng tạo task
1. Người dùng mở task modal trong project hiện tại.
2. Modal tải quy tắc field theo `project.type`.
3. Khi submit:
   - validate field lõi + field đặc thù
   - chuẩn hóa enum (UI -> API)
   - gửi payload.
4. Thành công:
   - đóng modal
   - invalidate query task
   - render lại board/list.

## 4. Luồng đổi trạng thái
1. Người dùng kéo-thả item (hoặc đổi nhanh trạng thái).
2. Validate stage đích có trong `kanban_stages`.
3. Validate rule chuyển trạng thái đặc thù theo loại.
4. Áp optimistic UI.
5. Gọi API lưu.
6. Nếu lỗi thì rollback optimistic state và báo lỗi.

## 5. Luồng chuyển view
1. Người dùng bấm tab view.
2. Nếu view được phép cho loại dự án:
   - chuyển view
   - cập nhật `?view=<name>`.
3. Nếu không được phép:
   - giữ nguyên view hiện tại
   - hiển thị toast thông tin.
