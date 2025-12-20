# Nexus Collaboration Platform

Một nền tảng quản lý dự án và hợp tác toàn diện, được xây dựng để đơn giản hóa quy trình làm việc và giao tiếp nhóm trong thời gian thực.

## 1 Các Tính năng Chính

Dự án hỗ trợ một loạt các tính năng phức tạp để tạo nên một nền tảng hợp tác toàn diện:

### 1.1. Quản lý Dự án và Công việc (Project & Task Management)

* **Quản lý Dự án (Project):** Tạo, cập nhật thông tin, và theo dõi trạng thái dự án (`IN_PROGRESS`, `AT_RISK`, `COMPLETED`).
* **Quản lý Task:** Gán Task cho người dùng (`assigneeId`), đặt độ ưu tiên (`LOW`, `MEDIUM`, `HIGH`), và quản lý trạng thái (`TODO`, `IN_PROGRESS`, `DONE`).
* **Subtask:** Hỗ trợ tạo và quản lý các công việc con (Subtask) chi tiết.
* **Task Linking:** Định nghĩa mối quan hệ giữa các Task, như `BLOCKS` (chặn) hoặc `BLOCKED_BY` (bị chặn bởi).
* **Quản lý Tệp tin:** Upload và quản lý tệp tin liên quan đến Project và Task (sử dụng MinIO/S3).
* **Lập lịch & Nhắc nhở:** Hệ thống lập lịch nhắc nhở tự động cho các Task hoặc Project sắp đến hạn.

### 1.2. Giao tiếp Thời gian thực (Real-time Communication)

* **Hội nghị Video:** Tích hợp **LiveKit** để tạo phòng họp video/audio trực tiếp cho các thành viên trong dự án/rooms/[roomName]/page.tsx].
* **Chat Dự án (Team Chat):** Kênh chat chung cho từng dự án (sử dụng Socket.IO).
* **Tin nhắn Trực tiếp (Direct Message):** Giao tiếp riêng tư 1-1 giữa hai người dùng.

### 1.3. Quản lý Tài khoản & Bảo mật

* **Xác thực:** Hỗ trợ đăng ký/đăng nhập bằng email/mật khẩu và quản lý hồ sơ người dùng/profile/page.tsx, backend/prisma/schema.prisma].
* **Tùy chỉnh Cài đặt:** Người dùng có thể tùy chỉnh các thiết lập thông báo qua Email và In-App.

## 2. Hướng dẫn Set Up Project

### 2.1. Điều kiện tiên quyết (Prerequisites)

* **Docker & Docker Compose**
* **Node.js (LTS)** và **npm** (hoặc yarn/pnpm)

### 2.2. Khởi tạo Môi trường Docker

Khởi động các dịch vụ nền tảng (PostgreSQL, Redis, MinIO, LiveKit):

```Bash
docker compose up -d
```

### 2.2. Khởi tạo Môi trường Docker
Tạo tệp .env trong thư mục backend và tệp .env.local trong thư mục frontend.

## A. Cấu hình Backend (backend/.env)

```Bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/project_collab_db"
# ... Các biến POSTGRES_USER/PASSWORD/DB khác tương ứng
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/shadow_db"

# Redis
REDIS_URL=redis://localhost:6379

# MinIO/S3 Storage
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio_access_key
MINIO_SECRET_KEY=minio_secret_key
MINIO_BUCKET_NAME=minio_bucket_name

# LiveKit (Sử dụng khóa mặc định cho môi trường dev)
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=livekit_api_key
LIVEKIT_API_SECRET=livekit_api_secret_key

# Authentication & Server
PORT=8000
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
```

## B. Cấu hình Frontend (frontend/.env.local)

```Bash
# Next-Auth Secret
NEXTAUTH_SECRET=your_nextauth_secret_key_long_and_random

# Public API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=http://localhost:7880

# MinIO Client Configuration
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_MINIO_BUCKET_NAME=nexus-files
```

### 2.3. Khởi tạo Database và Cài đặt Dependencies
#### Cài đặt Dependencies cho Backend:

```Bash
cd backend
npm install
```

#### Khởi chạy Migrations (Áp dụng Schema vào DB):

```Bash
npx prisma migrate dev --name initial_setup
npx prisma generate
```

#### Cài đặt Dependencies cho Frontend:

```Bash
cd ../frontend
npm install
```

### 2.4. Chạy Ứng dụng
Mở hai cửa sổ terminal riêng biệt.

#### Chạy Backend Server:

```Bash
cd backend
npm run dev
```
#### Chạy Frontend Server:

```Bash
cd frontend
npm run dev
```
#### Ứng dụng sẽ khả dụng tại http://localhost:3000.