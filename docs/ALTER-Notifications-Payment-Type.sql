/* =====================================================================
   ROXY ACADEMY - Bổ sung giá trị 'Payment' cho ràng buộc CK_Notif_Type
   Mục đích: Cho phép lưu thông báo loại 'Payment' trong bảng Notifications
             khi phụ huynh gửi yêu cầu thanh toán chờ xác nhận (3C)
   Lưu ý deploy: LÚC DEPLOY PRODUCTION CŨNG PHẢI CHẠY SCRIPT NÀY.
   Tính an toàn: Idempotent - Có thể chạy lại nhiều lần không gây lỗi
   ===================================================================== */

-- 1. Xóa ràng buộc CK_Notif_Type cũ nếu tồn tại
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Notif_Type' AND parent_object_id = OBJECT_ID('Notifications')
)
BEGIN
    ALTER TABLE Notifications
        DROP CONSTRAINT CK_Notif_Type;
    PRINT N'Đã xóa ràng buộc CK_Notif_Type cũ trên bảng Notifications.';
END
GO

-- 2. Tạo lại ràng buộc CK_Notif_Type với đủ 10 loại (bổ sung 'Payment')
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Notif_Type' AND parent_object_id = OBJECT_ID('Notifications')
)
BEGIN
    ALTER TABLE Notifications
        ADD CONSTRAINT CK_Notif_Type CHECK (
            Type IN ('Newsfeed','Attendance','Tuition','Payment','Leave','Grade','Homework','Message','Schedule','System')
        );
    PRINT N'Đã thêm ràng buộc CK_Notif_Type mới (bao gồm ''Payment'') trên bảng Notifications.';
END
GO
