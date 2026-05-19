# Ma Trận Field và Đặc Tả Task Modal

## 1. Field lõi (mọi loại dự án)
- `title` (required)
- `description` (optional)
- `status` (required)
- `priority` (required, default `medium`)
- `assignees` (optional)
- `due_date` (optional)
- `labels` (optional)

## 2. Field mở rộng theo loại

| Field | kanban | scrum | bug_tracking | feature | research |
|---|---|---|---|---|---|
| `story_points` | hidden | optional | hidden | optional | hidden |
| `sprint_id` | hidden | optional | hidden | hidden | hidden |
| `severity` | hidden | hidden | required | hidden | hidden |
| `repro_steps` | hidden | hidden | optional | hidden | hidden |
| `environment` | hidden | hidden | optional | hidden | hidden |
| `epic_link` | optional | optional | hidden | optional | hidden |
| `release_target` | hidden | optional | hidden | optional | hidden |
| `customer_impact` | hidden | hidden | hidden | optional | hidden |
| `hypothesis` | hidden | hidden | hidden | hidden | required |
| `source_links` | hidden | hidden | hidden | hidden | optional |
| `evidence_level` | hidden | hidden | hidden | hidden | optional |

## 3. Quy tắc map task type (UI -> API)
- Chỉ gửi các giá trị backend hỗ trợ:
  - `task | story | bug | epic | subtask`
- Mọi giá trị chỉ tồn tại ở UI phải được map trước khi submit.
- Mapping bắt buộc:
  - `FEATURE_REQUEST` -> `task`
  - `BUG` -> `bug`
  - `STORY` -> `story`
  - `EPIC` -> `epic`
  - `SUBTASK` -> `subtask`
  - default -> `task`

## 4. Quy tắc hiển thị modal
- Hiển thị section theo thứ tự:
  - basic fields
  - type-specific fields
  - optional advanced fields
- Field ẩn:
  - không render
  - không gửi payload.
- Field tùy chọn:
  - hiển thị kèm helper text
  - để trống thì không gửi payload.

## 5. Quy tắc validate
- `title` must be non-empty.
- `status` must exist in project `kanban_stages`.
- `severity` required for `bug_tracking`.
- `hypothesis` required for `research`.
- `story_points` must be numeric and non-negative when provided.

## 6. Quy tắc phản hồi khi submit
- Success:
  - close modal
  - refresh list/board
  - toast success with item title.
- Failure:
  - destructive toast with API message fallback
  - preserve user-entered form state
  - keep modal open.
