# Design QA Checklist và UAT Template

## 1. Checklist QA thiết kế

### Thiết lập loại dự án
- [ ] Chọn được đủ 5 loại dự án.
- [ ] Áp đúng preset view khi tạo dự án.
- [ ] Sinh đúng preset workflow stages nếu chưa có custom stages.
- [ ] Fallback `kanban` hoạt động khi type thiếu/không hợp lệ.

### Task Modal
- [ ] Field lõi luôn hiển thị.
- [ ] Field đặc thù theo loại hiển thị/ẩn đúng.
- [ ] Validate field bắt buộc hiển thị rõ (inline/toast).
- [ ] Không còn lỗi submit im lặng.
- [ ] Mapping enum UI/API đúng.

### Gating view
- [ ] View bị tắt không hiện trong switcher.
- [ ] Mở URL trực tiếp vào view bị tắt sẽ fallback đúng.
- [ ] Logic chọn default view đúng cả khi có và không có query view.

### Luồng trạng thái
- [ ] Drag/drop hợp lệ theo rule transition.
- [ ] Transition không hợp lệ bị chặn và có thông báo.
- [ ] Rollback optimistic update khi API lỗi hoạt động đúng.

### Dashboard
- [ ] Bộ widget thay đổi đúng theo `project.type`.
- [ ] Empty state hiển thị đúng, không trắng trang hoặc crash.

## 2. Kịch bản UAT (theo từng loại dự án)

Với mỗi loại (`kanban`, `scrum`, `bug_tracking`, `feature`, `research`):
1. Tạo project mới.
2. Tạo một work item hợp lệ.
3. Tạo một work item không hợp lệ (thiếu field bắt buộc).
4. Đổi trạng thái item từ đầu đến cuối workflow.
5. Mở dashboard và kiểm tra đúng widget theo loại.

## 3. Mẫu Given/When/Then
- Given: người dùng đang ở project type `<type>`
- When: người dùng thực hiện `<action>`
- Then: hệ thống hiển thị `<expected_result>`

Ví dụ:
- Given: người dùng ở project `bug_tracking`
- When: submit task không có `severity`
- Then: hệ thống chặn submit và báo lỗi yêu cầu `severity`.

## 4. Mẫu thu thập dữ liệu UAT
- Số người test: 5-7 người nội bộ
- Chỉ số thu thập:
  - thời gian tạo item đầu tiên
  - thời gian đổi trạng thái item
  - số lần thao tác nhầm trong mỗi luồng
  - điểm gây bối rối theo từng bước
- Điều kiện pass:
  - median thời gian tạo item <= 30 giây
  - >= 90% người dùng hoàn thành đổi trạng thái không cần hỗ trợ
  - không có lỗi blocker trong luồng cốt lõi.

## 5. Mẫu nhật ký quyết định cuối
- Decision ID
- Vấn đề
- Phương án chọn
- Phương án loại bỏ
- Lý do
- Người chịu trách nhiệm
- Ngày chốt
