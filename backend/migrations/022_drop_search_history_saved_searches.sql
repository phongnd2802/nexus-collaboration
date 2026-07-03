-- Xóa tính năng trang Search độc lập (đã gỡ backend module + frontend page/panel).
-- Module search-provider (từng dùng bởi search module) và semantic/RAG search cũng đã được xử lý riêng.
-- Đã verify không còn code backend/frontend tham chiếu 2 bảng này.
-- Áp dụng cho database đã provision. CASCADE để dọn FK phụ thuộc (không có bảng nào tham chiếu vào 2 bảng này).

DROP TABLE IF EXISTS "search_history" CASCADE;  -- lịch sử tìm kiếm gần đây của user trong trang Search
DROP TABLE IF EXISTS "saved_searches" CASCADE;  -- tìm kiếm đã lưu/chia sẻ trong trang Search
