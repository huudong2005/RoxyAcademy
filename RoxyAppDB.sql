/* =====================================================================
   ROXY ACADEMY - Quản lý học tập (Zalo Mini App + Web Admin)
   SQL Server 2019+  |  Script tạo schema v1
   Quy ước:
   - PK: INT IDENTITY (BIGINT cho bảng phát sinh nhiều: Attendances, Notifications, Messages)
   - Chuỗi tiếng Việt: NVARCHAR. Tiền VND: DECIMAL(18,0)
   - Enum lưu dạng chuỗi tiếng Anh + CHECK (EF Core: HasConversion<string>())
   - v2: FK ép đúng vai trò (Users.Role) và đúng lớp (StudentClasses) bằng FK tổng hợp; trạng thái thu tiền lấy từ view
   - Mọi FK dùng NO ACTION (xóa mềm bằng IsActive/Status), trừ 2 chỗ CASCADE ghi chú bên dưới
   - Thời gian lưu UTC (SYSUTCDATETIME)
   ===================================================================== */

-- CREATE DATABASE RoxyAcademy COLLATE Vietnamese_100_CI_AS;
-- GO
-- USE RoxyAcademy;
-- GO

/* =====================================================================
   NHÓM 1: QUẢN TRỊ & NGƯỜI DÙNG
   ===================================================================== */

CREATE TABLE Branches (
    Id          INT IDENTITY(1,1) CONSTRAINT PK_Branches PRIMARY KEY,
    BranchName  NVARCHAR(150) NOT NULL,
    Address     NVARCHAR(300) NOT NULL,
    Phone       VARCHAR(20)   NULL,
    IsActive    BIT           NOT NULL CONSTRAINT DF_Branches_IsActive DEFAULT 1,
    CreatedAt   DATETIME2(0)  NOT NULL CONSTRAINT DF_Branches_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE Users (
    Id                 INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    PhoneNumber        VARCHAR(15)   NOT NULL,
    PasswordHash       NVARCHAR(256) NULL,            -- Parent/Student đăng nhập qua Zalo thì có thể NULL
    FullName           NVARCHAR(150) NOT NULL,
    Email              VARCHAR(150)  NULL,
    AvatarUrl          NVARCHAR(500) NULL,
    Role               VARCHAR(20)   NOT NULL,
    BranchId           INT           NULL,            -- SuperAdmin/Parent = NULL
    ZaloId             VARCHAR(64)   NULL,            -- Zalo User ID (map tài khoản Mini App)
    PreferredLanguage  VARCHAR(5)    NOT NULL CONSTRAINT DF_Users_Lang DEFAULT 'vi',
    IsActive           BIT           NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    LastLoginAt        DATETIME2(0)  NULL,
    CreatedAt          DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2(0)  NULL,
    CONSTRAINT FK_Users_Branches FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('SuperAdmin','BranchManager','Teacher','Parent','Student')),
    CONSTRAINT CK_Users_Lang CHECK (PreferredLanguage IN ('vi','en')),
    CONSTRAINT CK_Users_ManagerBranch CHECK (Role <> 'BranchManager' OR BranchId IS NOT NULL),
    CONSTRAINT UQ_Users_Id_Role UNIQUE (Id, Role)      -- đích của các FK "đúng vai trò" bên dưới
);
CREATE UNIQUE INDEX UX_Users_PhoneNumber ON Users(PhoneNumber);
CREATE UNIQUE INDEX UX_Users_ZaloId ON Users(ZaloId) WHERE ZaloId IS NOT NULL;
CREATE INDEX IX_Users_BranchId_Role ON Users(BranchId, Role);
GO

CREATE TABLE Students (
    Id         INT IDENTITY(1,1) CONSTRAINT PK_Students PRIMARY KEY,
    FullName   NVARCHAR(150) NOT NULL,
    DOB        DATE          NULL,
    Gender     VARCHAR(10)   NULL,
    ParentId   INT           NOT NULL,                -- Users (Role=Parent)
    UserId     INT           NULL,                    -- Users (Role=Student), cho học viên lớp 6+ tự đăng nhập
    BranchId   INT           NOT NULL,
    School     NVARCHAR(200) NULL,
    Grade      NVARCHAR(50)  NULL,                    -- Lớp/Khối đang học ở trường
    Note       NVARCHAR(1000) NULL,                   -- Ghi chú nội bộ (nhu cầu đặc biệt...). Dữ liệu nhạy cảm, hạn chế quyền xem
    AvatarUrl  NVARCHAR(500) NULL,
    Status     VARCHAR(20)   NOT NULL CONSTRAINT DF_Students_Status DEFAULT 'Active',
    CreatedAt  DATETIME2(0)  NOT NULL CONSTRAINT DF_Students_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt  DATETIME2(0)  NULL,
    ParentRole AS CAST('Parent'  AS VARCHAR(20)) PERSISTED,   -- hằng số, chỉ để FK ép đúng vai trò
    UserRole   AS CAST('Student' AS VARCHAR(20)) PERSISTED,
    CONSTRAINT FK_Students_Parent   FOREIGN KEY (ParentId, ParentRole) REFERENCES Users(Id, Role),
    CONSTRAINT FK_Students_User     FOREIGN KEY (UserId, UserRole)     REFERENCES Users(Id, Role),
    CONSTRAINT FK_Students_Branches FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    CONSTRAINT CK_Students_Gender CHECK (Gender IS NULL OR Gender IN ('Male','Female','Other')),
    CONSTRAINT CK_Students_Status CHECK (Status IN ('Active','Paused','Graduated','Dropped'))
);
CREATE INDEX IX_Students_ParentId ON Students(ParentId);
CREATE INDEX IX_Students_BranchId ON Students(BranchId);
CREATE UNIQUE INDEX UX_Students_UserId ON Students(UserId) WHERE UserId IS NOT NULL;
GO

/* =====================================================================
   NHÓM 2: QUẢN LÝ HỌC TẬP
   ===================================================================== */

CREATE TABLE Courses (
    Id            INT IDENTITY(1,1) CONSTRAINT PK_Courses PRIMARY KEY,
    CourseCode    VARCHAR(30)    NULL,
    CourseName    NVARCHAR(200)  NOT NULL,
    CourseNameEn  NVARCHAR(200)  NULL,
    Description   NVARCHAR(MAX)  NULL,
    DescriptionEn NVARCHAR(MAX)  NULL,
    TotalSessions INT            NULL,                -- VD: Giáo dục giới tính = 3 buổi, Luyện chữ đẹp = 12 tuần
    DefaultFee    DECIMAL(18,0)  NULL,                -- Học phí gợi ý, lớp có thể ghi đè
    IsActive      BIT            NOT NULL CONSTRAINT DF_Courses_IsActive DEFAULT 1,
    CreatedAt     DATETIME2(0)   NOT NULL CONSTRAINT DF_Courses_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX UX_Courses_CourseCode ON Courses(CourseCode) WHERE CourseCode IS NOT NULL;
GO

CREATE TABLE Classes (
    Id                     INT IDENTITY(1,1) CONSTRAINT PK_Classes PRIMARY KEY,
    ClassName              NVARCHAR(200) NOT NULL,
    CourseId               INT           NOT NULL,
    TeacherId              INT           NOT NULL,    -- Users (Role=Teacher): giáo viên phụ trách chính
    BranchId               INT           NOT NULL,
    ClassType              VARCHAR(10)   NOT NULL CONSTRAINT DF_Classes_Type DEFAULT 'Group',
    MaxStudents            INT           NULL,
    StartDate              DATE          NULL,
    EndDate                DATE          NULL,
    TuitionFee             DECIMAL(18,0) NULL,        -- NULL = dùng Courses.DefaultFee
    IsOpenForRegistration  BIT           NOT NULL CONSTRAINT DF_Classes_OpenReg DEFAULT 0,
    Status                 VARCHAR(20)   NOT NULL CONSTRAINT DF_Classes_Status DEFAULT 'Upcoming',
    Note                   NVARCHAR(500) NULL,
    CreatedAt              DATETIME2(0)  NOT NULL CONSTRAINT DF_Classes_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt              DATETIME2(0)  NULL,
    TeacherRole AS CAST('Teacher' AS VARCHAR(20)) PERSISTED,
    CONSTRAINT FK_Classes_Courses  FOREIGN KEY (CourseId)  REFERENCES Courses(Id),
    CONSTRAINT FK_Classes_Teacher  FOREIGN KEY (TeacherId, TeacherRole) REFERENCES Users(Id, Role),
    CONSTRAINT FK_Classes_Branches FOREIGN KEY (BranchId)  REFERENCES Branches(Id),
    CONSTRAINT CK_Classes_Type   CHECK (ClassType IN ('Group','OneToOne')),
    CONSTRAINT CK_Classes_Status CHECK (Status IN ('Upcoming','Ongoing','Finished')),
    CONSTRAINT CK_Classes_Dates  CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate)
);
CREATE INDEX IX_Classes_BranchId_Status ON Classes(BranchId, Status);
CREATE INDEX IX_Classes_TeacherId ON Classes(TeacherId);
CREATE INDEX IX_Classes_CourseId ON Classes(CourseId);
GO

-- Học viên - Lớp học (đồng thời là "đăng ký lớp": Pending -> trung tâm duyệt -> Active)
CREATE TABLE StudentClasses (
    Id           INT IDENTITY(1,1) CONSTRAINT PK_StudentClasses PRIMARY KEY,
    StudentId    INT           NOT NULL,
    ClassId      INT           NOT NULL,
    Status       VARCHAR(20)   NOT NULL CONSTRAINT DF_StudentClasses_Status DEFAULT 'Pending',
    RegisteredAt DATETIME2(0)  NOT NULL CONSTRAINT DF_StudentClasses_RegAt DEFAULT SYSUTCDATETIME(),
    ApprovedBy   INT           NULL,
    ApprovedAt   DATETIME2(0)  NULL,
    Note         NVARCHAR(500) NULL,
    CONSTRAINT FK_StudentClasses_Students FOREIGN KEY (StudentId)  REFERENCES Students(Id),
    CONSTRAINT FK_StudentClasses_Classes  FOREIGN KEY (ClassId)    REFERENCES Classes(Id),
    CONSTRAINT FK_StudentClasses_Approver FOREIGN KEY (ApprovedBy) REFERENCES Users(Id),
    CONSTRAINT UQ_StudentClasses UNIQUE (StudentId, ClassId),
    CONSTRAINT CK_StudentClasses_Status CHECK (Status IN ('Pending','Active','Rejected','Dropped','Completed'))
);
CREATE INDEX IX_StudentClasses_ClassId ON StudentClasses(ClassId, Status);
GO

CREATE TABLE Schedules (
    Id                  INT IDENTITY(1,1) CONSTRAINT PK_Schedules PRIMARY KEY,
    ClassId             INT           NOT NULL,
    StudyDate           DATE          NOT NULL,
    StartTime           TIME(0)       NOT NULL,
    EndTime             TIME(0)       NOT NULL,
    Room                NVARCHAR(50)  NULL,
    SubstituteTeacherId INT           NULL,           -- Dạy thay (NULL = giáo viên chính)
    Status              VARCHAR(20)   NOT NULL CONSTRAINT DF_Schedules_Status DEFAULT 'Scheduled',
    Note                NVARCHAR(500) NULL,
    CreatedAt           DATETIME2(0)  NOT NULL CONSTRAINT DF_Schedules_CreatedAt DEFAULT SYSUTCDATETIME(),
    SubstituteRole AS CAST('Teacher' AS VARCHAR(20)) PERSISTED,
    CONSTRAINT FK_Schedules_Classes    FOREIGN KEY (ClassId) REFERENCES Classes(Id),
    CONSTRAINT FK_Schedules_Substitute FOREIGN KEY (SubstituteTeacherId, SubstituteRole) REFERENCES Users(Id, Role),
    CONSTRAINT UQ_Schedules_Id_Class UNIQUE (Id, ClassId),     -- đích FK "buổi học thuộc đúng lớp"
    CONSTRAINT CK_Schedules_Time   CHECK (EndTime > StartTime),
    CONSTRAINT CK_Schedules_Status CHECK (Status IN ('Scheduled','Completed','Cancelled'))
);
CREATE INDEX IX_Schedules_ClassId_Date ON Schedules(ClassId, StudyDate);
CREATE INDEX IX_Schedules_Date ON Schedules(StudyDate);
GO

/* =====================================================================
   NHÓM 3: NGHIỆP VỤ HÀNG NGÀY
   ===================================================================== */

CREATE TABLE Attendances (
    Id          BIGINT IDENTITY(1,1) CONSTRAINT PK_Attendances PRIMARY KEY,
    ScheduleId  INT           NOT NULL,
    ClassId     INT           NOT NULL,               -- phải khớp lớp của buổi học VÀ lớp học viên đang học
    StudentId   INT           NOT NULL,
    Status      VARCHAR(20)   NOT NULL,
    Note        NVARCHAR(300) NULL,
    MarkedBy    INT           NULL,
    MarkedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Attendances_MarkedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Attendances_Schedules FOREIGN KEY (ScheduleId, ClassId) REFERENCES Schedules(Id, ClassId),
    CONSTRAINT FK_Attendances_Enrolled  FOREIGN KEY (StudentId, ClassId)  REFERENCES StudentClasses(StudentId, ClassId),
    CONSTRAINT FK_Attendances_MarkedBy  FOREIGN KEY (MarkedBy)   REFERENCES Users(Id),
    CONSTRAINT UQ_Attendances UNIQUE (ScheduleId, StudentId),
    CONSTRAINT CK_Attendances_Status CHECK (Status IN ('Present','Late','ExcusedAbsent','UnexcusedAbsent'))
);
CREATE INDEX IX_Attendances_StudentId ON Attendances(StudentId);
GO

-- "Hôm nay / Tuần này" KHÔNG lưu cứng: truy vấn theo LessonDate (hôm nay / trong tuần)
CREATE TABLE LessonProgress (
    Id          INT IDENTITY(1,1) CONSTRAINT PK_LessonProgress PRIMARY KEY,
    ClassId     INT            NOT NULL,
    ScheduleId  INT            NULL,                  -- Gắn với buổi học cụ thể (nếu có)
    LessonDate  DATE           NOT NULL,
    Title       NVARCHAR(200)  NULL,
    Content     NVARCHAR(MAX)  NOT NULL,
    CreatedBy   INT            NOT NULL,
    CreatedAt   DATETIME2(0)   NOT NULL CONSTRAINT DF_LessonProgress_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2(0)   NULL,
    CONSTRAINT FK_LessonProgress_Classes   FOREIGN KEY (ClassId)    REFERENCES Classes(Id),
    CONSTRAINT FK_LessonProgress_Schedules FOREIGN KEY (ScheduleId, ClassId) REFERENCES Schedules(Id, ClassId),
    CONSTRAINT FK_LessonProgress_Creator   FOREIGN KEY (CreatedBy)  REFERENCES Users(Id)
);
CREATE INDEX IX_LessonProgress_Class_Date ON LessonProgress(ClassId, LessonDate);
GO

-- Bài tập về nhà (tách riêng để theo dõi từng học viên làm/chưa làm)
CREATE TABLE Homeworks (
    Id            INT IDENTITY(1,1) CONSTRAINT PK_Homeworks PRIMARY KEY,
    ClassId       INT            NOT NULL,
    ScheduleId    INT            NULL,
    Title         NVARCHAR(200)  NOT NULL,
    Description   NVARCHAR(MAX)  NULL,
    AttachmentUrl NVARCHAR(500)  NULL,
    DueDate       DATETIME2(0)   NULL,
    CreatedBy     INT            NOT NULL,
    CreatedAt     DATETIME2(0)   NOT NULL CONSTRAINT DF_Homeworks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Homeworks_Classes   FOREIGN KEY (ClassId)    REFERENCES Classes(Id),
    CONSTRAINT FK_Homeworks_Schedules FOREIGN KEY (ScheduleId, ClassId) REFERENCES Schedules(Id, ClassId),
    CONSTRAINT FK_Homeworks_Creator   FOREIGN KEY (CreatedBy)  REFERENCES Users(Id),
    CONSTRAINT UQ_Homeworks_Id_Class UNIQUE (Id, ClassId)
);
CREATE INDEX IX_Homeworks_Class_Due ON Homeworks(ClassId, DueDate);
GO

CREATE TABLE HomeworkSubmissions (
    Id              INT IDENTITY(1,1) CONSTRAINT PK_HomeworkSubmissions PRIMARY KEY,
    HomeworkId      INT           NOT NULL,
    ClassId         INT           NOT NULL,
    StudentId       INT           NOT NULL,
    Status          VARCHAR(20)   NOT NULL CONSTRAINT DF_HwSub_Status DEFAULT 'Pending',
    SubmissionUrl   NVARCHAR(500) NULL,
    StudentNote     NVARCHAR(500) NULL,
    SubmittedAt     DATETIME2(0)  NULL,
    TeacherFeedback NVARCHAR(1000) NULL,
    ReviewedAt      DATETIME2(0)  NULL,
    Score           DECIMAL(5,2)  NULL,
    CONSTRAINT FK_HwSub_Homeworks FOREIGN KEY (HomeworkId, ClassId) REFERENCES Homeworks(Id, ClassId) ON DELETE CASCADE,  -- CASCADE #1
    CONSTRAINT FK_HwSub_Enrolled  FOREIGN KEY (StudentId, ClassId)  REFERENCES StudentClasses(StudentId, ClassId),
    CONSTRAINT UQ_HwSub UNIQUE (HomeworkId, StudentId),
    CONSTRAINT CK_HwSub_Status CHECK (Status IN ('Pending','Submitted','Reviewed')),
    CONSTRAINT CK_HwSub_Score CHECK (Score IS NULL OR (Score >= 0 AND Score <= 10))
);
CREATE INDEX IX_HwSub_StudentId ON HomeworkSubmissions(StudentId);
GO

CREATE TABLE Grades (
    Id             INT IDENTITY(1,1) CONSTRAINT PK_Grades PRIMARY KEY,
    StudentId      INT            NOT NULL,
    ClassId        INT            NOT NULL,
    ExamName       NVARCHAR(150)  NOT NULL,
    ExamType       VARCHAR(20)    NOT NULL CONSTRAINT DF_Grades_Type DEFAULT 'Other',
    ExamDate       DATE           NULL,
    Score          DECIMAL(5,2)   NULL,               -- NULL = chỉ nhận xét, không chấm điểm (VD: chương trình hỗ trợ trẻ)
    MaxScore       DECIMAL(5,2)   NOT NULL CONSTRAINT DF_Grades_Max DEFAULT 10,
    TeacherComment NVARCHAR(1000) NULL,
    GradedBy       INT            NULL,
    CreatedAt      DATETIME2(0)   NOT NULL CONSTRAINT DF_Grades_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2(0)   NULL,
    CONSTRAINT FK_Grades_Enrolled FOREIGN KEY (StudentId, ClassId) REFERENCES StudentClasses(StudentId, ClassId),
    CONSTRAINT FK_Grades_GradedBy FOREIGN KEY (GradedBy)  REFERENCES Users(Id),
    CONSTRAINT CK_Grades_Type  CHECK (ExamType IN ('Quiz','Midterm','Final','Daily','Other')),
    CONSTRAINT CK_Grades_MaxScore CHECK (MaxScore > 0),
    CONSTRAINT CK_Grades_Score CHECK (Score IS NULL OR (Score >= 0 AND Score <= MaxScore)),
    CONSTRAINT CK_Grades_HasContent CHECK (Score IS NOT NULL OR NULLIF(LTRIM(RTRIM(TeacherComment)), '') IS NOT NULL)  -- phải có điểm hoặc nhận xét
);
CREATE INDEX IX_Grades_Student_Class ON Grades(StudentId, ClassId);
GO

-- Tách StudentId / TeacherId thay cho RequesterType + RequesterId (để có FK thật)
CREATE TABLE LeaveRequests (
    Id            INT IDENTITY(1,1) CONSTRAINT PK_LeaveRequests PRIMARY KEY,
    StudentId     INT            NULL,
    TeacherId     INT            NULL,
    RequestedBy   INT            NOT NULL,            -- Người tạo đơn (phụ huynh hoặc chính giáo viên)
    ClassId       INT            NULL,
    ScheduleId    INT            NULL,                -- Nghỉ đúng buổi nào (nếu chọn)
    LeaveDate     DATE           NOT NULL,
    Reason        NVARCHAR(500)  NOT NULL,
    Status        VARCHAR(20)    NOT NULL CONSTRAINT DF_Leave_Status DEFAULT 'Pending',
    ReviewedBy    INT            NULL,
    ReviewedAt    DATETIME2(0)   NULL,
    ReviewNote    NVARCHAR(500)  NULL,
    CreatedAt     DATETIME2(0)   NOT NULL CONSTRAINT DF_Leave_CreatedAt DEFAULT SYSUTCDATETIME(),
    RequesterType AS (CASE WHEN StudentId IS NOT NULL THEN 'Student' ELSE 'Teacher' END) PERSISTED,
    TeacherRole   AS CAST('Teacher' AS VARCHAR(20)) PERSISTED,
    CONSTRAINT FK_Leave_Students  FOREIGN KEY (StudentId)   REFERENCES Students(Id),
    CONSTRAINT FK_Leave_Teacher   FOREIGN KEY (TeacherId, TeacherRole) REFERENCES Users(Id, Role),
    CONSTRAINT FK_Leave_Enrolled  FOREIGN KEY (StudentId, ClassId) REFERENCES StudentClasses(StudentId, ClassId),  -- bỏ qua khi ClassId NULL
    CONSTRAINT FK_Leave_Requester FOREIGN KEY (RequestedBy) REFERENCES Users(Id),
    CONSTRAINT FK_Leave_Classes   FOREIGN KEY (ClassId)     REFERENCES Classes(Id),
    CONSTRAINT FK_Leave_Schedules FOREIGN KEY (ScheduleId, ClassId) REFERENCES Schedules(Id, ClassId),
    CONSTRAINT FK_Leave_Reviewer  FOREIGN KEY (ReviewedBy)  REFERENCES Users(Id),
    CONSTRAINT CK_Leave_OneRequester CHECK ((StudentId IS NOT NULL AND TeacherId IS NULL) OR (StudentId IS NULL AND TeacherId IS NOT NULL)),
    CONSTRAINT CK_Leave_ScheduleNeedsClass CHECK (ScheduleId IS NULL OR ClassId IS NOT NULL),
    CONSTRAINT CK_Leave_Status CHECK (Status IN ('Pending','Approved','Rejected','Cancelled'))
);
CREATE INDEX IX_Leave_Status ON LeaveRequests(Status, LeaveDate);
CREATE INDEX IX_Leave_StudentId ON LeaveRequests(StudentId);
CREATE INDEX IX_Leave_TeacherId ON LeaveRequests(TeacherId);
GO

/* =====================================================================
   NHÓM 4: TÀI CHÍNH & TƯƠNG TÁC
   ===================================================================== */

-- Tuitions = khoản phải thu (hóa đơn). Payments = các lần thanh toán.
CREATE TABLE Tuitions (
    Id          INT IDENTITY(1,1) CONSTRAINT PK_Tuitions PRIMARY KEY,
    StudentId   INT            NOT NULL,
    ClassId     INT            NULL,
    BranchId    INT            NOT NULL,
    Title       NVARCHAR(200)  NOT NULL,              -- VD: Học phí tháng 10/2026
    Amount      DECIMAL(18,0)  NOT NULL,
    Discount    DECIMAL(18,0)  NOT NULL CONSTRAINT DF_Tuitions_Discount DEFAULT 0,
    DueDate     DATE           NOT NULL,
    IsCancelled BIT            NOT NULL CONSTRAINT DF_Tuitions_Cancelled DEFAULT 0,   -- Trạng thái thu tiền KHÔNG lưu: lấy từ view vw_TuitionSummary
    Note        NVARCHAR(500)  NULL,
    CreatedAt   DATETIME2(0)   NOT NULL CONSTRAINT DF_Tuitions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Tuitions_Students FOREIGN KEY (StudentId) REFERENCES Students(Id),
    CONSTRAINT FK_Tuitions_Enrolled FOREIGN KEY (StudentId, ClassId) REFERENCES StudentClasses(StudentId, ClassId),  -- bỏ qua khi ClassId NULL
    CONSTRAINT FK_Tuitions_Branches FOREIGN KEY (BranchId)  REFERENCES Branches(Id),
    CONSTRAINT CK_Tuitions_Amount CHECK (Amount >= 0 AND Discount >= 0 AND Discount <= Amount)
);
CREATE INDEX IX_Tuitions_Student ON Tuitions(StudentId);
CREATE INDEX IX_Tuitions_Branch_Due ON Tuitions(BranchId, DueDate);
GO

CREATE TABLE Payments (
    Id              INT IDENTITY(1,1) CONSTRAINT PK_Payments PRIMARY KEY,
    TuitionId       INT            NOT NULL,
    Amount          DECIMAL(18,0)  NOT NULL,
    PaymentMethod   VARCHAR(20)    NOT NULL,
    Status          VARCHAR(20)    NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'PendingConfirm',
    TransactionCode NVARCHAR(100)  NULL,              -- Mã giao dịch ngân hàng / ZaloPay (đối soát)
    ProofImageUrl   NVARCHAR(500)  NULL,              -- Ảnh chuyển khoản phụ huynh gửi
    PaidAt          DATETIME2(0)   NULL,
    ConfirmedBy     INT            NULL,
    ConfirmedAt     DATETIME2(0)   NULL,
    Note            NVARCHAR(500)  NULL,
    CreatedAt       DATETIME2(0)   NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Payments_Tuitions  FOREIGN KEY (TuitionId)   REFERENCES Tuitions(Id),
    CONSTRAINT FK_Payments_Confirmer FOREIGN KEY (ConfirmedBy) REFERENCES Users(Id),
    CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
    CONSTRAINT CK_Payments_Method CHECK (PaymentMethod IN ('BankTransfer','Cash','ZaloPay','Other')),
    CONSTRAINT CK_Payments_Status CHECK (Status IN ('PendingConfirm','Confirmed','Rejected')),
    CONSTRAINT CK_Payments_Reviewed CHECK (Status = 'PendingConfirm' OR (ConfirmedBy IS NOT NULL AND ConfirmedAt IS NOT NULL))
);
CREATE INDEX IX_Payments_TuitionId ON Payments(TuitionId);
CREATE INDEX IX_Payments_TransactionCode ON Payments(TransactionCode) WHERE TransactionCode IS NOT NULL;
GO

-- Chặn tổng tiền ĐÃ XÁC NHẬN vượt số phải thu. Lưu ý EF Core: bảng có trigger cần
-- entity.ToTable(t => t.UseSqlOutputClause(false)) (EF Core 8+), nếu không SaveChanges sẽ lỗi.
CREATE TRIGGER TR_Payments_NoOverpay ON Payments AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM Tuitions t
        JOIN (SELECT TuitionId, SUM(Amount) AS Paid
              FROM Payments
              WHERE Status = 'Confirmed' AND TuitionId IN (SELECT TuitionId FROM inserted)
              GROUP BY TuitionId) p ON p.TuitionId = t.Id
        WHERE p.Paid > t.Amount - t.Discount)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Tổng tiền đã xác nhận vượt số tiền phải thu của khoản học phí.', 1;
    END
END;
GO

-- Nguồn sự thật cho trạng thái học phí: Cancelled / Paid / PartiallyPaid / Unpaid (+ IsOverdue theo giờ VN)
CREATE VIEW vw_TuitionSummary AS
SELECT t.Id AS TuitionId, t.StudentId, t.ClassId, t.BranchId, t.Title, t.DueDate,
       t.Amount - t.Discount                                  AS NetAmount,
       ISNULL(p.PaidAmount, 0)                                AS PaidAmount,
       ISNULL(p.PendingAmount, 0)                             AS PendingAmount,
       t.Amount - t.Discount - ISNULL(p.PaidAmount, 0)        AS RemainingAmount,
       CASE WHEN t.IsCancelled = 1 THEN 'Cancelled'
            WHEN ISNULL(p.PaidAmount, 0) >= t.Amount - t.Discount THEN 'Paid'
            WHEN ISNULL(p.PaidAmount, 0) > 0 THEN 'PartiallyPaid'
            ELSE 'Unpaid' END                                 AS PaymentStatus,
       CASE WHEN t.IsCancelled = 0
             AND ISNULL(p.PaidAmount, 0) < t.Amount - t.Discount
             AND t.DueDate < CAST(DATEADD(HOUR, 7, SYSUTCDATETIME()) AS DATE)
            THEN 1 ELSE 0 END                                 AS IsOverdue
FROM Tuitions t
OUTER APPLY (SELECT SUM(CASE WHEN Status = 'Confirmed'      THEN Amount END) AS PaidAmount,
                    SUM(CASE WHEN Status = 'PendingConfirm' THEN Amount END) AS PendingAmount
             FROM Payments WHERE TuitionId = t.Id) p;
GO

CREATE TABLE Newsfeed (
    Id             INT IDENTITY(1,1) CONSTRAINT PK_Newsfeed PRIMARY KEY,
    Title          NVARCHAR(300)  NOT NULL,
    Content        NVARCHAR(MAX)  NOT NULL,
    TitleEn        NVARCHAR(300)  NULL,               -- Đa ngôn ngữ VN/EN
    ContentEn      NVARCHAR(MAX)  NULL,
    ImageUrl       NVARCHAR(500)  NULL,
    TargetAudience VARCHAR(20)    NOT NULL CONSTRAINT DF_Newsfeed_Target DEFAULT 'All',
    BranchId       INT            NULL,               -- NULL = toàn hệ thống
    IsPinned       BIT            NOT NULL CONSTRAINT DF_Newsfeed_Pinned DEFAULT 0,
    IsPublished    BIT            NOT NULL CONSTRAINT DF_Newsfeed_Published DEFAULT 1,
    CreatedBy      INT            NOT NULL,
    CreatedAt      DATETIME2(0)   NOT NULL CONSTRAINT DF_Newsfeed_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2(0)   NULL,
    CONSTRAINT FK_Newsfeed_Branches FOREIGN KEY (BranchId)  REFERENCES Branches(Id),
    CONSTRAINT FK_Newsfeed_Creator  FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
    CONSTRAINT CK_Newsfeed_Target CHECK (TargetAudience IN ('All','Parents','Teachers'))
);
CREATE INDEX IX_Newsfeed_Branch_Created ON Newsfeed(BranchId, CreatedAt DESC);
GO

-- Thông báo cá nhân (chuông thông báo trong app + log đã đẩy qua Zalo OA/ZNS)
CREATE TABLE Notifications (
    Id         BIGINT IDENTITY(1,1) CONSTRAINT PK_Notifications PRIMARY KEY,
    UserId     INT            NOT NULL,
    Title      NVARCHAR(200)  NOT NULL,
    Body       NVARCHAR(1000) NULL,
    Type       VARCHAR(30)    NOT NULL,
    RefId      INT            NULL,                   -- Id bản ghi liên quan (Tuition, Leave, Newsfeed...)
    IsRead     BIT            NOT NULL CONSTRAINT DF_Notif_IsRead DEFAULT 0,
    ReadAt     DATETIME2(0)   NULL,
    CreatedAt  DATETIME2(0)   NOT NULL CONSTRAINT DF_Notif_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Notif_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,  -- CASCADE #2
    CONSTRAINT CK_Notif_Type CHECK (Type IN ('Newsfeed','Attendance','Tuition','Leave','Grade','Homework','Message','Schedule','System'))
);
CREATE INDEX IX_Notif_User_Read ON Notifications(UserId, IsRead, CreatedAt DESC);
GO

-- Lời nhắn giáo viên -> phụ huynh/học sinh, và hỗ trợ trực tiếp.
-- Gửi 1 người: ReceiverId. Gửi cả lớp: ClassId (ReceiverId NULL). Không được có cả hai.
-- IsRead chỉ có nghĩa với tin gửi 1 người; tin cả lớp thì tạo Notifications cho từng người nhận.
CREATE TABLE Messages (
    Id          BIGINT IDENTITY(1,1) CONSTRAINT PK_Messages PRIMARY KEY,
    SenderId    INT            NOT NULL,
    ReceiverId  INT            NULL,
    ClassId     INT            NULL,
    StudentId   INT            NULL,                  -- Lời nhắn nói về học viên nào
    Content     NVARCHAR(2000) NOT NULL,
    IsRead      BIT            NOT NULL CONSTRAINT DF_Messages_IsRead DEFAULT 0,
    ReadAt      DATETIME2(0)   NULL,
    CreatedAt   DATETIME2(0)   NOT NULL CONSTRAINT DF_Messages_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Messages_Sender   FOREIGN KEY (SenderId)   REFERENCES Users(Id),
    CONSTRAINT FK_Messages_Receiver FOREIGN KEY (ReceiverId) REFERENCES Users(Id),
    CONSTRAINT FK_Messages_Classes  FOREIGN KEY (ClassId)    REFERENCES Classes(Id),
    CONSTRAINT FK_Messages_Students FOREIGN KEY (StudentId)  REFERENCES Students(Id),
    CONSTRAINT CK_Messages_Target CHECK ((ReceiverId IS NOT NULL AND ClassId IS NULL) OR (ReceiverId IS NULL AND ClassId IS NOT NULL))  -- đúng 1 trong 2
);
CREATE INDEX IX_Messages_Receiver ON Messages(ReceiverId, IsRead, CreatedAt DESC);
CREATE INDEX IX_Messages_Class ON Messages(ClassId, CreatedAt DESC);
GO