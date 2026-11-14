/* =====================================================================
   ROXY ACADEMY - Bổ sung cột Score cho bảng HomeworkSubmissions
   Mục đích: Hỗ trợ chấm điểm bài tập về nhà cho học viên (thang điểm 0 - 10, thập phân 5,2)
   Tính an toàn: Idempotent - Kiểm tra tồn tại trước khi ALTER TABLE
   ===================================================================== */

-- 1. Thêm cột Score nếu chưa tồn tại
IF COL_LENGTH('HomeworkSubmissions', 'Score') IS NULL
BEGIN
    ALTER TABLE HomeworkSubmissions
        ADD Score DECIMAL(5,2) NULL;
    PRINT N'Đã thêm cột Score (DECIMAL(5,2) NULL) vào bảng HomeworkSubmissions.';
END
ELSE
BEGIN
    PRINT N'Cột Score đã tồn tại trong bảng HomeworkSubmissions.';
END
GO

-- 2. Thêm ràng buộc kiểm tra CK_HwSub_Score nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_HwSub_Score' AND parent_object_id = OBJECT_ID('HomeworkSubmissions')
)
BEGIN
    ALTER TABLE HomeworkSubmissions
        ADD CONSTRAINT CK_HwSub_Score CHECK (Score IS NULL OR (Score >= 0 AND Score <= 10));
    PRINT N'Đã thêm ràng buộc CK_HwSub_Score (Score IS NULL OR (Score >= 0 AND Score <= 10)).';
END
ELSE
BEGIN
    PRINT N'Ràng buộc CK_HwSub_Score đã tồn tại.';
END
GO
