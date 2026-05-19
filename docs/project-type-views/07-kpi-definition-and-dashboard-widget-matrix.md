# KPI Definition Sheet và Ma Trận Widget Dashboard

## 1. Định nghĩa KPI

### `kanban`
- WIP count: number of items not in completion stage.
- Cycle time: average time from first in-progress stage to completion stage.
- Throughput: completed items per week.

### `scrum`
- Burndown: remaining story points per day in active sprint.
- Velocity: completed story points per sprint.
- Sprint completion rate: completed sprint items / planned sprint items.

### `bug_tracking`
- Open/closed ratio: open bugs / closed bugs in selected window.
- MTTR: mean time from bug creation to `closed`.
- Reopen rate: reopened bugs / closed bugs.

### `feature`
- Release progress: released feature items / planned feature items.
- Lead time: time from `idea` to `released`.
- On-time release rate: items delivered on or before `release_target`.

### `research`
- Findings count: completed/published research outcomes in window.
- Research cycle time: `question` to `published`.
- Evidence coverage: items with `source_links` populated / total research items.

## 2. Ma trận widget dashboard

| project.type | Widgets |
|---|---|
| `kanban` | WIP trend, cycle time trend, throughput by week, status distribution |
| `scrum` | burndown chart, velocity chart, sprint completion gauge, blocked items |
| `bug_tracking` | open vs closed trend, MTTR trend, severity distribution, reopen rate |
| `feature` | release progress, lead time trend, milestone status, on-time rate |
| `research` | findings trend, cycle time trend, evidence coverage, stage distribution |

## 3. Quy tắc nguồn dữ liệu
- Nguồn chính: endpoint task của project (status, timestamp, field đặc thù theo loại).
- Mapping stage hoàn thành lấy từ config completion stage theo loại dự án.
- Nếu thiếu dữ liệu cho KPI:
  - render trạng thái "Chưa đủ dữ liệu"
  - không được làm crash dashboard.

## 4. Cửa sổ thời gian
- Mặc định: 30 ngày gần nhất.
- Tùy chọn: 7 ngày, 90 ngày, cửa sổ sprint (chỉ cho `scrum`).
