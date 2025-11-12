# 🔧 Subtask CRUD Fix - Tài liệu sửa lỗi

## 📋 Vấn đề

Chức năng Subtask không thể thực hiện CRUD (Create, Read, Update, Delete) do lỗi routing giữa Backend và Frontend.

## 🔍 Nguyên nhân

### 1. **Backend Routing Không Khớp**

- Subtask router được mount riêng lẻ tại `/api/subTasks` trong `index.ts`
- Nhưng route định nghĩa lại có prefix `/:taskId/subtasks`
- Kết quả: `/api/subTasks/:taskId/subtasks` (Không nhất quán với thiết kế)

### 2. **Thiết Kế Không Thống Nhất**

- Task Links: `/api/tasks/:taskId/links` ✅ (Mounted vào tasks router)
- Subtasks: `/api/subTasks/:taskId/subtasks` ❌ (Mount riêng lẻ)

### 3. **Frontend Gọi Sai Route**

- Frontend gọi: `/api/subTasks/${taskId}/subtasks`
- Nhưng thiết kế chuẩn nên là: `/api/tasks/${taskId}/subtasks`

## ✅ Giải pháp

### Backend Changes

#### 1. **Mount Subtasks Router vào Tasks Router** (`backend/src/routes/tasks.ts`)

```typescript
// Thêm dòng này:
tasksRouter.use("/:taskId/subtasks", subtasksRouter);
```

#### 2. **Cập nhật Subtasks Router** (`backend/src/routes/subtasks.ts`)

- Thêm `mergeParams: true` để nhận `taskId` từ parent router
- Xóa prefix `/:taskId/subtasks` khỏi các route
- Các route giờ chỉ còn `/`, `/:subtaskId`

**Trước:**

```typescript
const subTasksRouter: Router = express.Router();
subTasksRouter.post("/:taskId/subtasks", ...);
subTasksRouter.get("/:taskId/subtasks", ...);
```

**Sau:**

```typescript
const subTasksRouter: Router = express.Router({ mergeParams: true });
subTasksRouter.post("/", ...);
subTasksRouter.get("/", ...);
```

#### 3. **Xóa Mount Riêng Lẻ** (`backend/src/index.ts`)

- Xóa import `subtasksRouter`
- Xóa dòng `app.use("/api/subTasks", subtasksRouter);`

### Frontend Changes

#### 1. **SubtaskSection.tsx**

**Trước:**

```typescript
`/api/subTasks/${taskId}/subtasks/${subtaskId}`
```

**Sau:**

```typescript
`/api/tasks/${taskId}/subtasks/${subtaskId}`
```

#### 2. **AddSubtaskDialog.tsx**

**Trước:**

```typescript
`/api/subTasks/${taskId}/subtasks`
```

**Sau:**

```typescript
`/api/tasks/${taskId}/subtasks`
```

## 🎯 Kết quả

### API Endpoints Mới

1. **Create Subtask**: `POST /api/tasks/:taskId/subtasks`
2. **Get Subtasks**: `GET /api/tasks/:taskId/subtasks`
3. **Update Subtask**: `PATCH /api/tasks/:taskId/subtasks/:subtaskId`
4. **Delete Subtask**: `DELETE /api/tasks/:taskId/subtasks/:subtaskId`

### Lợi ích

✅ Routing nhất quán với Task Links và các tính năng khác
✅ RESTful design chuẩn (subtasks là tài nguyên con của tasks)
✅ Dễ bảo trì và mở rộng
✅ Authentication middleware từ tasks router được kế thừa

## 🧪 Testing

### 1. Test Create Subtask

```bash
POST http://localhost:5000/api/tasks/{taskId}/subtasks
Content-Type: application/json

{
  "name": "Test Subtask",
  "priority": "MEDIUM",
  "status": "TODO",
  "assigneeId": "user_id_here"
}
```

### 2. Test Get Subtasks

```bash
GET http://localhost:5000/api/tasks/{taskId}/subtasks
```

### 3. Test Update Subtask

```bash
PATCH http://localhost:5000/api/tasks/{taskId}/subtasks/{subtaskId}
Content-Type: application/json

{
  "status": "DONE"
}
```

### 4. Test Delete Subtask

```bash
DELETE http://localhost:5000/api/tasks/{taskId}/subtasks/{subtaskId}
```

## 📝 Files Changed

### Backend (3 files)

1. `backend/src/index.ts` - Xóa subtasks router mount
2. `backend/src/routes/tasks.ts` - Thêm subtasks router mount
3. `backend/src/routes/subtasks.ts` - Cập nhật routes với mergeParams

### Frontend (2 files)

1. `frontend/components/tasks/SubtaskSection.tsx` - Cập nhật API endpoints
2. `frontend/components/tasks/AddSubtaskDialog.tsx` - Cập nhật API endpoint

## 🚀 Deployment Notes

- Không cần migration database
- Không có breaking changes cho dữ liệu
- Cần restart cả backend và frontend sau khi deploy
- Frontend cần rebuild để áp dụng thay đổi route

## ✨ Best Practices Learned

1. Nested resources nên được mount vào parent router
2. Sử dụng `mergeParams: true` cho nested routers
3. Giữ routing nhất quán trong toàn bộ ứng dụng
4. Document API endpoints rõ ràng từ đầu

---

**Fixed by:** AI Assistant
**Date:** November 12, 2025
**Status:** ✅ Resolved & Tested
