/* =====================================================================
   ROXY ACADEMY - Seed danh mục tối thiểu (2 chi nhánh + 8 khóa học)
   Script idempotent: kiểm tra tồn tại theo BranchName / CourseName,
   chạy lại nhiều lần không bị nhân đôi dữ liệu.
   KHÔNG seed học viên, giáo viên, phụ huynh hay tài khoản giả.
   ===================================================================== */

SET NOCOUNT ON;

-- 1. Seed 2 chi nhánh tại P. Bình Trưng, TP.HCM
IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = N'Roxy Academy - Cơ sở 1 (Bình Trưng)')
BEGIN
    INSERT INTO Branches (BranchName, Address, Phone, IsActive)
    VALUES (N'Roxy Academy - Cơ sở 1 (Bình Trưng)', N'P. Bình Trưng, TP.HCM', '0326538824', 1);
END

IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = N'Roxy Academy - Cơ sở 2 (Bình Trưng)')
BEGIN
    INSERT INTO Branches (BranchName, Address, Phone, IsActive)
    VALUES (N'Roxy Academy - Cơ sở 2 (Bình Trưng)', N'P. Bình Trưng, TP.HCM', '0326538824', 1);
END

-- 2. Seed 8 khóa học chuẩn
IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Tiền tiểu học')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Tiền tiểu học', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Luyện chữ đẹp')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Luyện chữ đẹp', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Tư duy logic')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Tư duy logic', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Gia sư Cấp 1-2-3')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Gia sư Cấp 1-2-3', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Lớp Học Vẽ')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Lớp Học Vẽ', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Dạy trẻ phổ tự kỷ')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Dạy trẻ phổ tự kỷ', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Kỹ năng sống Cấp 1-2-3')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Kỹ năng sống Cấp 1-2-3', 1);
END

IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseName = N'Lớp Giáo Dục Giới Tính')
BEGIN
    INSERT INTO Courses (CourseName, IsActive) VALUES (N'Lớp Giáo Dục Giới Tính', 1);
END
GO
