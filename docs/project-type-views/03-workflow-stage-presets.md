# Preset Workflow Stages

`kanban_stages` là nguồn workflow chuẩn cho tất cả loại dự án.

## 1. Preset stage theo loại

### `kanban`
| id | name | order |
|---|---|---|
| `todo` | To Do | 0 |
| `in_progress` | In Progress | 1 |
| `review` | Review | 2 |
| `done` | Done | 3 |

### `scrum`
| id | name | order |
|---|---|---|
| `backlog` | Backlog | 0 |
| `sprint_todo` | Sprint To Do | 1 |
| `in_progress` | In Progress | 2 |
| `done` | Done | 3 |

### `bug_tracking`
| id | name | order |
|---|---|---|
| `new` | New | 0 |
| `triaged` | Triaged | 1 |
| `in_fix` | In Fix | 2 |
| `in_test` | In Test | 3 |
| `closed` | Closed | 4 |

### `feature`
| id | name | order |
|---|---|---|
| `idea` | Idea | 0 |
| `planned` | Planned | 1 |
| `building` | Building | 2 |
| `released` | Released | 3 |

### `research`
| id | name | order |
|---|---|---|
| `question` | Question | 0 |
| `collecting` | Collecting | 1 |
| `analyzing` | Analyzing | 2 |
| `published` | Published | 3 |

## 2. Transition Rules
- Chuyển tiến luôn hợp lệ.
- Chuyển lùi hợp lệ nếu stage đích tồn tại.
- Chuyển nhảy cóc:
  - mặc định cho phép
  - chỉ chặn khi có rule đặc thù.
- Rule đặc thù:
  - `bug_tracking`: không cho `new` -> `closed` trực tiếp, phải qua `triaged`.

## 3. Quy tắc fallback
- Nếu dự án có `kanban_stages` tùy chỉnh: dùng dữ liệu đó, không áp preset.
- Nếu `kanban_stages` rỗng:
  - áp preset theo `project.type`.
- Nếu `project.type` thiếu/không hợp lệ:
  - áp preset `kanban`.

## 4. Stage hoàn thành chuẩn
- Stage hoàn thành mặc định:
  - `kanban`: `done`
  - `scrum`: `done`
  - `bug_tracking`: `closed`
  - `feature`: `released`
  - `research`: `published`
- Mọi chỉ số progress/completion phải dùng mapping này.
