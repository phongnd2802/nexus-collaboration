# Đặc Tả Trạng Thái (Empty, Loading, Error)

## 1. Nguyên tắc chung
- Không được lỗi im lặng.
- Lỗi không làm mất ngữ cảnh đang thao tác.
- Mọi trạng thái lỗi/empty phải có hành động tiếp theo rõ ràng.

## 2. Trạng thái loading
- Loading project:
  - hiển thị skeleton cho header và vùng nội dung.
- Loading view:
  - hiển thị skeleton theo từng view (board/list/timeline).
- Submit task modal:
  - disable nút submit
  - hiển thị trạng thái đang xử lý ngay trên nút.

## 3. Trạng thái empty

### Theo loại dự án
- `kanban`: chưa có task, gợi ý tạo task đầu tiên.
- `scrum`: backlog trống, gợi ý thêm story.
- `bug_tracking`: chưa có bug, gợi ý tạo/import bug.
- `feature`: chưa có feature, gợi ý tạo feature đầu tiên.
- `research`: chưa có research item, gợi ý thêm câu hỏi/hypothesis.

### CTA bắt buộc
- CTA chính: tạo item mới.
- CTA phụ: import hoặc tạo từ template (nếu có).

## 4. Trạng thái lỗi
- Lỗi tải dữ liệu:
  - hiển thị inline error card có nút `Retry`.
- Lỗi tạo/cập nhật task:
  - hiển thị destructive toast
  - giữ modal mở.
- Lỗi đổi trạng thái:
  - rollback optimistic state
  - hiển thị toast nêu rõ thao tác thất bại.

## 5. Thứ tự ưu tiên thông điệp lỗi
- Ưu tiên message từ API.
- Nếu không có:
  - message chung theo từng thao tác
  - cuối cùng fallback global: "Đã có lỗi xảy ra, vui lòng thử lại."

## 6. Yêu cầu accessibility/usability
- Toast lỗi/thành công phải hỗ trợ bàn phím và screen reader.
- Sau khi đổi trạng thái UI, focus quay lại control có thể thao tác.
