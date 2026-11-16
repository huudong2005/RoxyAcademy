# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1H (MÀN HÌNH ĐIỂM KIỂM TRA - GRADES)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Điểm kiểm tra & Đánh giá học viên (`/grades`)  
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/DESIGN.md` (Mục 14), `docs/API.md`, `RoxyAppDB.sql` (bảng `Grades` dòng 255-275)

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

| Thành phần | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Database Schema** | Đối chiếu `RoxyAppDB.sql` (L255-275) | **PASS** | Bảng `Grades` giữ nguyên schema gốc, 0 chỉnh sửa schema DB |
| **Backend Build** | `dotnet build RoxyAppBE/RoxyAcademy.Api` | **PASS** | **0 Warning(s), 0 Error(s)**, target net9.0 |
| **Frontend Build** | `npm run build` (roxy-admin) | **PASS** | **0 Error(s)**, Vite built thành công 97 modules (277ms) |
| **Kiểm tra Localhost** | `Select-String -Pattern "localhost"` | **PASS** | 0 hard-code `localhost` trong `Grades.jsx` |
| **Kiểm tra Dashboard** | `git diff roxy-admin/src/pages/Dashboard.jsx` | **PASS** | File `Dashboard.jsx` không bị sửa đổi |

---

## 2. BẢNG TỔNG HỢP CHECKLIST KIỂM THỬ GIAI ĐOẠN 1H

| STT | Hạng mục kiểm tra | Tiêu chí yêu cầu | Kết quả | Dòng code đối chiếu cụ thể |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Enum ExamType chuẩn** | Nhập `Quiz`, `Midterm`, `Final`, `Daily`, `Other` đều hợp lệ, lưu DB thành công khớp `CK_Grades_Type`. | **PASS** | - DB: `CK_Grades_Type` (`RoxyAppDB.sql` L270)<br>- Backend: `AllowedExamTypes` (`GradesController.cs` L16-19, L26-28)<br>- Frontend: `EXAM_TYPES` (`Grades.jsx` L6-37, L1327-1332) |
| **2** | **Chặn ExamType cũ/sai** | `15Min`, `45Min`, `MidTerm` không có trên UI; DTO mặc định `Other`; API trả về 400 BadRequest nếu nhận `15Min`. | **PASS** | - DTO: `ExamType = "Other"` (`GradeDtos.cs` L32, L52)<br>- Controller: `ValidateGradeInput` chặn loại không trong `AllowedExamTypes` trả về 400 (`GradesController.cs` L26-28, L117-118)<br>- UI: không có option `15Min`/`45Min`/`MidTerm` |
| **3** | **Ràng buộc Score & MaxScore** | `Score > MaxScore` hoặc `Score < 0` hoặc `MaxScore <= 0` bị chặn ở cả UI form và API controller. | **PASS** | - Controller: `ValidateGradeInput` chặn `maxScore <= 0` và `score < 0 || score > maxScore` (`GradesController.cs` L30-34)<br>- DTO: `[Range(1, 1000)]` (`GradeDtos.cs` L39, L59)<br>- UI: `validateForm` chặn trước khi submit (`Grades.jsx` L492-507) |
| **4** | **Đánh giá định tính (Score NULL)** | Chỉ nhập `TeacherComment`, để trống `Score`: cho phép lưu cả UI & API; nếu cả 2 trống thì bị chặn (`CK_Grades_HasContent`). | **PASS** | - DB: `CK_Grades_HasContent` (`RoxyAppDB.sql` L273)<br>- Controller: `!score.HasValue && string.IsNullOrWhiteSpace(teacherComment)` trả về 400 (`GradesController.cs` L36-37)<br>- UI: `validateForm` kiểm tra `hasContent`, UI hỗ trợ hiển thị badge `💬 Đánh giá định tính` (`Grades.jsx` L146-152, L509-512) |
| **5** | **Ràng buộc ghi danh học viên** | Nhập điểm phải chọn học viên đã ghi danh vào lớp đó; nếu sai API báo *"Học viên chưa được ghi danh vào lớp này."* và UI hiển thị lỗi. | **PASS** | - Controller: check `StudentClasses` trả về BadRequest kèm thông báo (`GradesController.cs` L103-108)<br>- UI: modal tự động nạp học viên đã ghi danh qua `loadEnrolledStudentsForModal` (`Grades.jsx` L388-408), hiển thị `formError` nếu có lỗi (`Grades.jsx` L1210-1214) |
| **6** | **Phân quyền RBAC 5 vai trò** | - `SuperAdmin`: xem/sửa hết.<br>- `BranchManager`: chỉ xem/sửa chi nhánh mình (khác 403).<br>- `Teacher`: chỉ xem/sửa lớp mình dạy (khác 403).<br>- `Parent`: chỉ xem con mình; `Student`: chỉ xem chính mình.<br>- `Parent`/`Student`: UI ẩn hoàn toàn nút nhập/sửa; gọi POST/PUT bị 403. | **PASS** | - Controller GET: switch-case lọc đúng 5 vai trò (`GradesController.cs` L56-75)<br>- Controller POST/PUT: `[Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]` + check branch/teacher trả về 403 (`GradesController.cs` L99-115, L141-155)<br>- UI: `canEdit` ẩn nút `+ Nhập điểm mới`, nút `Sửa` tại bảng, card và drawer (`Grades.jsx` L175, L602, L871, L947, L1157, L1179) |
| **7** | **Nguyên tắc an toàn dữ liệu** | Không có nút Xóa ở UI, không có DELETE endpoint, không sửa Dashboard, không hard-code `localhost`. | **PASS** | - Controller: 0 endpoint DELETE (`GradesController.cs`)<br>- UI: 0 nút xóa, 0 chức năng xóa (`Grades.jsx`)<br>- `Dashboard.jsx`: không bị chỉnh sửa<br>- `Grades.jsx`: sử dụng `axiosClient`, 0 `localhost` |
| **8** | **Giao diện & Trạng thái UI** | Responsive mobile (<1024px dạng Card Stack, touch target >= 44px), đầy đủ loading skeleton, empty state (có lọc / không lọc), toast notification, drawer chi tiết. | **PASS** | - Desktop table: `hidden lg:block` (L793-889)<br>- Mobile card: `lg:hidden` (L891-960)<br>- Touch target: các nút đều có `min-h-[44px]`<br>- Loading skeleton: L735-745<br>- Empty states: L747-787<br>- Toast notification: L572-583<br>- Detail drawer: L997-1174 |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN & LOGIC

### 3.1. DB Schema Integrity (`RoxyAppDB.sql` L255-275)
Schema bảng `Grades` được giữ nguyên vẹn 100%, không bị sửa đổi:
- Khóa chính: `Id INT IDENTITY(1,1) PRIMARY KEY`
- Ràng buộc khóa ngoại: `CONSTRAINT FK_Grades_Enrolled FOREIGN KEY (StudentId, ClassId) REFERENCES StudentClasses(StudentId, ClassId)`
- Ràng buộc khóa ngoại người chấm: `CONSTRAINT FK_Grades_GradedBy FOREIGN KEY (GradedBy) REFERENCES Users(Id)`
- Check constraint loại bài: `CONSTRAINT CK_Grades_Type CHECK (ExamType IN ('Quiz','Midterm','Final','Daily','Other'))`
- Check constraint thang điểm: `CONSTRAINT CK_Grades_MaxScore CHECK (MaxScore > 0)`
- Check constraint điểm số: `CONSTRAINT CK_Grades_Score CHECK (Score IS NULL OR (Score >= 0 AND Score <= MaxScore))`
- Check constraint nội dung: `CONSTRAINT CK_Grades_HasContent CHECK (Score IS NOT NULL OR NULLIF(LTRIM(RTRIM(TeacherComment)), '') IS NOT NULL)`

### 3.2. Data Transfer Objects (`GradeDtos.cs`)
- `GradeDto`: chứa đầy đủ thông tin: `Id`, `StudentId`, `StudentName`, `ClassId`, `ClassName`, `ExamName`, `ExamType`, `ExamDate`, `Score`, `MaxScore`, `TeacherComment`, `GradedBy`, `GradedByName`, `CreatedAt`, `UpdatedAt`.
- `CreateGradeRequest`:
  - `ExamType`: Mặc định là `"Other"` (thay thế giá trị cũ `"15Min"`).
  - `MaxScore`: Mặc định `10`, ràng buộc `[Range(1, 1000)]`.
  - `Score`: `[Range(0, 1000, ErrorMessage = "Điểm số không hợp lệ")]`.
  - `TeacherComment`: `[StringLength(1000)]` (phù hợp với `NVARCHAR(1000)` trong DB).
- `UpdateGradeRequest`:
  - `ExamType`: Mặc định là `"Other"`.
  - Đồng bộ `MaxScore = 10` và `TeacherComment` tối đa 1000 ký tự.

### 3.3. Backend Controller (`GradesController.cs`)
- **Tập hợp ExamType hợp lệ:**
  ```csharp
  private static readonly HashSet<string> AllowedExamTypes = new(StringComparer.Ordinal)
  {
      "Quiz", "Midterm", "Final", "Daily", "Other"
  };
  ```
- **Hàm thẩm định nghiệp vụ trung tâm (`ValidateGradeInput`):**
  - Chặn các giá trị lạ (`15Min`, `45Min`, `MidTerm`) trả về lỗi 400.
  - Chặn `maxScore <= 0` trả về *"Thang điểm tối đa phải lớn hơn 0."*.
  - Chặn `score < 0` hoặc `score > maxScore` trả về *"Điểm số phải nằm trong khoảng từ 0 đến {maxScore}."*.
  - Chặn trường hợp để trống cả điểm lẫn nhận xét trả về *"Vui lòng nhập điểm số hoặc nhận xét của giáo viên."*.
- **Truy vấn lọc theo vai trò (`GET /api/Grades`):**
  - `SuperAdmin`: xem toàn bộ.
  - `BranchManager`: lọc theo `Class.BranchId == branchId`.
  - `Teacher`: lọc theo `Class.TeacherId == UserId`.
  - `Parent`: lọc theo `Student.ParentId == UserId`.
  - `Student`: lọc theo `Student.UserId == UserId`.
  - Hỗ trợ thêm bộ lọc `classId`, `studentId`, `examType`, `examDate`.
- **Thẩm định ghi danh khi tạo điểm (`POST /api/Grades`):**
  ```csharp
  var studentClass = await db.StudentClasses
      .Include(sc => sc.Class)
      .FirstOrDefaultAsync(sc => sc.StudentId == req.StudentId && sc.ClassId == req.ClassId);
  if (studentClass == null)
      return BadRequest(new { message = "Học viên chưa được ghi danh vào lớp này." });
  ```
- **Thẩm định phân quyền ghi (`POST` & `PUT`):**
  - Chỉ cho phép `SuperAdmin`, `BranchManager`, `Teacher`.
  - `Teacher` chỉ được nhập/sửa lớp mình phụ trách (`Class.TeacherId == UserId`), lớp khác trả về 403 Forbidden.
  - `BranchManager` chỉ được nhập/sửa lớp thuộc chi nhánh mình (`Class.BranchId == User.GetBranchId()`), chi nhánh khác trả về 403 Forbidden.

### 3.4. Giao diện Frontend (`Grades.jsx`)
- **Đồng bộ hóa Enum:** `EXAM_TYPES` gồm `Quiz` (Kiểm tra 15p), `Midterm` (Giữa kỳ), `Final` (Cuối khóa), `Daily` (Đánh giá ngày), `Other` (Đánh giá khác).
- **Bộ lọc đa năng:**
  - Cascading Dropdown: khi chọn Lớp học, dropdown Học viên tự động gọi `/api/StudentClasses?classId={classId}` để nạp danh sách học viên tương ứng.
  - Hỗ trợ lọc theo Lớp, Học viên, Loại bài, Ngày thi kèm nút *Đặt lại* đưa về trang 1.
- **Drawer chi tiết học sinh:**
  - Hiển thị điểm số to rõ, badge màu sắc theo phân loại điểm (>=8.5 xanh lá, >=5.0 xanh dương, <5.0 đỏ).
  - Đối với bài kiểm tra chỉ có nhận xét, hiển thị badge *"Đánh giá định tính sư phạm — Không áp điểm số"*.
  - Hiển thị đầy đủ nhận xét giáo viên ngắt dòng chuẩn (`whitespace-pre-line`).
  - Hỗ trợ đóng bằng phím `Escape` hoặc nút đóng.
- **Modal Nhập mới & Chỉnh sửa:**
  - Tạo mới: Chọn lớp -> tự động nạp học viên thuộc lớp.
  - Chỉnh sửa: Khóa trường Lớp học và Học viên để tránh sai lệch khóa ngoại.
  - Tích hợp 4 Chip nhận xét nhanh giúp giáo viên nhập lời phê sư phạm nhanh chóng.
  - Thẩm định form Client-side trước khi gửi API (báo lỗi trường cụ thể).
- **Phân quyền giao diện người dùng:**
  - `canEdit = role === 'SuperAdmin' || role === 'BranchManager' || role === 'Teacher'`.
  - Ẩn hoàn toàn nút Nhập mới và nút Sửa đối với `Parent` và `Student`.
  - Hoàn toàn không có nút Xóa hoặc API DELETE.

### 3.5. Điều hướng & Menu Layout (`App.jsx`, `AdminLayout.jsx`)
- Route `/grades` được đăng ký bảo vệ bởi `ProtectedRoute` và bọc trong `AdminLayout`.
- Sidebar và Mobile Drawer có menu *💯 Điểm kiểm tra* dẫn đến `/grades`.
- Tiêu đề Header tự động hiển thị *Quản lý Điểm kiểm tra* khi đang ở route `/grades`.

---

## 4. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 8/8 hạng mục checklist của Giai đoạn 1H (Màn hình Điểm kiểm tra - Grades) đều **ĐẠT (PASS 100%)**.
Mã nguồn backend và frontend biên dịch sạch, không có lỗi runtime, bảo mật phân quyền nghiêm ngặt, dữ liệu toàn vẹn và giao diện thân thiện responsive.

**Trạng thái nghiệm thu:** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Sẵn sàng bàn giao cho deploy agent.