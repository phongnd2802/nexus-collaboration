# UX Contract Theo Loại Dự Án

## 1. Mục tiêu sản phẩm
Cho phép người dùng chọn loại dự án và nhận ngay workflow, view và quy tắc dữ liệu phù hợp với ít thao tác thiết lập nhất.

## 2. Danh sách loại dự án và mục tiêu nghiệp vụ
- `kanban`: quản lý luồng công việc liên tục.
- `scrum`: quản lý thực thi theo sprint.
- `bug_tracking`: quản lý vòng đời lỗi từ triage đến đóng lỗi.
- `feature`: quản lý luồng từ ý tưởng tính năng đến phát hành.
- `research`: quản lý luồng nghiên cứu, bằng chứng và tài liệu.

## 3. Đơn vị công việc chính theo loại
- `kanban`: task
- `scrum`: story/task
- `bug_tracking`: bug
- `feature`: feature item/task
- `research`: research item/task

## 4. Tiêu chí thành công UX
- Tạo work item đầu tiên dưới 30 giây sau khi vào dự án.
- Đổi trạng thái work item trong 1 thao tác (kéo-thả hoặc chọn nhanh).
- Mở được màn hình tiến độ trong tối đa 2 thao tác.

## 5. Hành vi trong phạm vi triển khai
- Chọn loại dự án sẽ áp dụng:
  - view mặc định
  - bộ trạng thái workflow (`kanban_stages`)
  - quy tắc field trong task modal
  - bộ widget dashboard
- Dự án cũ chưa có preset vẫn hoạt động bằng fallback.

## 6. Ngoài phạm vi
- Tạo mới loại dự án trong UI.
- Migration schema backend cho field lưu trữ mới.
- Backfill dữ liệu lịch sử tự động.

## 7. Ràng buộc bắt buộc
- Giữ kiến trúc hiện tại: `create-project-modal` -> `projects-view` -> `unified-task-view`.
- Giữ nguyên các giá trị `Project.type` và contract API hiện có.
- Ưu tiên config-driven, không tách thành 5 component task view riêng biệt.

## 8. Quy tắc mặc định/fallback
- Thiếu config loại dự án: dùng preset `kanban`.
- Thiếu stage: tự sinh bộ stage mặc định theo loại dự án.
- Stage không hợp lệ khi cập nhật: chặn transition và hiển thị phản hồi rõ ràng.
