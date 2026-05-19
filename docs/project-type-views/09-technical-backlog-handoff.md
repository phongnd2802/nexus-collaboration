# Backlog Kỹ Thuật Handoff

## Epic A: Engine preset theo loại dự án
- Kết quả:
  - Tạo registry config cho `viewPreset`, `workflowPreset`, `fieldPreset` theo `project.type`.
  - Tạo resolver fallback về `kanban`.
- Phụ thuộc:
  - Không có.
- Ước lượng:
  - 3-4 ngày dev.
- DoD:
  - Resolve được preset cho đủ 5 loại dự án ở runtime.
  - Có test cho fallback.

## Epic B: Gating view trong task view
- Kết quả:
  - View switcher phản ánh đúng enabled/hidden theo matrix.
  - Hoàn thiện fallback khi URL yêu cầu view không khả dụng.
- Phụ thuộc:
  - Epic A.
- Ước lượng:
  - 2-3 ngày dev.
- DoD:
  - View bị disable không được render cho loại dự án đó.
  - Có test fallback theo query view.

## Epic C: Task modal động + validate + hiển thị lỗi rõ ràng
- Kết quả:
  - Render field theo `project.type`.
  - Validate field bắt buộc theo loại dự án.
  - Chuẩn hóa mapping enum trước submit.
  - Thống nhất xử lý lỗi, không còn submit im lặng.
- Phụ thuộc:
  - Epic A.
- Ước lượng:
  - 4-5 ngày dev.
- DoD:
  - Kịch bản hợp lệ/không hợp lệ pass cho từng loại.
  - Không còn silent failure khi submit.

## Epic D: Dashboard KPI theo loại dự án
- Kết quả:
  - Layer tính KPI theo loại dự án.
  - Render đúng widget matrix theo loại.
  - Xử lý trạng thái thiếu dữ liệu.
- Phụ thuộc:
  - Epic A.
- Ước lượng:
  - 4-6 ngày dev.
- DoD:
  - Widget đúng cho từng loại dự án.
  - Công thức KPI được kiểm thử với dữ liệu mẫu.

## Epic E: Regression + i18n + telemetry
- Kết quả:
  - Cập nhật regression cho luồng project/task.
  - Bổ sung key i18n cho label/message mới.
  - Bổ sung sự kiện telemetry:
    - `project_type_selected`
    - `view_blocked_for_type`
    - `task_submit_validation_failed`
    - `task_status_transition_failed`
- Phụ thuộc:
  - Epic B, C, D.
- Ước lượng:
  - 2-3 ngày dev.
- DoD:
  - Regression pass cho project cũ.
  - Fallback pass cho dữ liệu legacy.
  - Telemetry nhìn thấy được trên pipeline analytics.

## Thứ tự triển khai đề xuất
1. Epic A
2. Epic B và Epic C (song song)
3. Epic D
4. Epic E

## Danh sách rủi ro
- Rủi ro: lệch enum giữa UI và backend.
  - Giảm thiểu: gom mapping về một utility và test unit bắt buộc.
- Rủi ro: dự án cũ thiếu stage/field kỳ vọng.
  - Giảm thiểu: resolver fallback runtime + default an toàn.
- Rủi ro: KPI sai lệch do dữ liệu lịch sử thưa.
  - Giảm thiểu: guard "chưa đủ dữ liệu" + công thức null-safe.
