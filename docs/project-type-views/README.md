# Bộ Đặc Tả View Theo Loại Dự Án

Thư mục này chứa bộ đặc tả đủ chi tiết để triển khai view theo loại dự án mà không cần tự quyết thêm.

Phạm vi loại dự án:
- `kanban`
- `scrum`
- `bug_tracking`
- `feature`
- `research`

Mục lục tài liệu:
1. `01-project-type-ux-contract.md`
2. `02-view-preset-matrix.md`
3. `03-workflow-stage-presets.md`
4. `04-field-matrix-and-task-modal-spec.md`
5. `05-interaction-flow-spec.md`
6. `06-state-handling-spec.md`
7. `07-kpi-definition-and-dashboard-widget-matrix.md`
8. `08-design-qa-checklist-and-uat-template.md`
9. `09-technical-backlog-handoff.md`

Kiến trúc nền tảng (luồng hiện có):
- `create-project-modal` -> `projects-view` -> `unified-task-view`

Giả định contract API hiện tại:
- `Project.type`: `kanban | scrum | bug_tracking | feature | research`
- `kanban_stages` là nguồn sự thật cho trạng thái workflow trên board.
