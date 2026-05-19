# Ma Trận Preset View

## 1. Danh sách view hỗ trợ (hiện có)
- `board`
- `list`
- `timeline`
- `gantt`
- `team`
- `budgets`

## 2. Mapping loại dự án -> view

| project.type | default_view | enabled_views | hidden_views | ghi chú |
|---|---|---|---|---|
| `kanban` | `board` | `board,list,timeline,gantt,team,budgets` | không có | đầy đủ thao tác dự án |
| `scrum` | `board` | `board,list,timeline,team,budgets` | `gantt` (khi thiếu sprint dates) | board ưu tiên workflow sprint |
| `bug_tracking` | `list` | `board,list,timeline,team,budgets` | `gantt` | mặc định triage theo danh sách |
| `feature` | `timeline` | `board,list,timeline,gantt,team,budgets` | không có | mặc định roadmap/timeline |
| `research` | `list` | `list,timeline,board,team` | `gantt,budgets` | board tối giản, không cần budget |

## 3. Quy tắc gating view
- Nếu `default_view` bị ẩn do điều kiện runtime, fallback theo thứ tự:
  - `board` -> `list` -> `timeline` -> `team` -> `gantt` -> `budgets`
- Điều kiện runtime cho `scrum`:
  - ẩn `gantt` nếu chưa có khoảng ngày sprint.
- View bị ẩn không được xuất hiện ở:
  - thanh chuyển view
  - deep link không có cờ override.

## 4. Quy tắc routing và URL
- Keep current route structure.
- Hỗ trợ query:
  - `?view=<view_name>`
- Nếu URL yêu cầu view không khả dụng theo loại:
  - chuyển sang default view của loại
  - hiển thị toast không chặn thao tác: "View không khả dụng cho loại dự án này."
