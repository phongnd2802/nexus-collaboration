-- Kiểm tra xem có TaskLink nào đang sử dụng RELATES_TO hoặc DUPLICATES không
SELECT * FROM "TaskLink" WHERE relationship IN ('RELATES_TO', 'DUPLICATES');

-- Nếu có kết quả, bạn có thể xóa chúng bằng câu lệnh sau:
-- DELETE FROM "TaskLink" WHERE relationship IN ('RELATES_TO', 'DUPLICATES');
