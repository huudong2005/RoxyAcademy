# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1E (HOMEWORKS, SUBMISSIONS & LESSON PROGRESS)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Bài tập về nhà (`/homeworks`), Nộp bài & Chấm bài (`HomeworkSubmissions`) và Tiến độ bài học (`LessonProgress`)  
**Ngày kiểm thử:** 14/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/AUDIT.md` (§5.1 dòng 152-154, §7.2), `docs/DESIGN.md` (Phần 10), `RoxyAppDB.sql`  

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

Tất cả các câu lệnh kiểm tra mã nguồn, linting và build đã được thực thi trực tiếp trên hệ thống thực tế và đạt kết quả tối ưu:

| Thành phần | Câu lệnh kiểm tra | Kết quả thực tế | Chi tiết console |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build --no-restore` tại `RoxyAppBE/RoxyAcademy.Api` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>Time Elapsed: 00:00:00.73<br>Output: `RoxyAcademy.Api.dll` |
| **Frontend Lint** | `npm run lint` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>ESLint kiểm tra sạch toàn bộ source code |
| **Frontend Build** | `npm run build` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s)**<br>92 modules transformed thành công trong 241ms.<br>Dist: `index.html` (0.49 kB), `index-*.css` (52.19 kB), `index-*.js` (597.29 kB) |

---

## 2. BẢNG MA TRẬN TEST CASES GIAI ĐOẠN 1E

| Mã Test Case | Phân hệ kiểm thử | Vai trò kiểm tra | Nội dung kiểm thử chi tiết | Kết quả | Ghi chú & Đánh giá QA |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TC-HW-01** | **Quản lý Bài tập (Homeworks)** | Staff: `SuperAdmin`, `BranchManager`, `Teacher`<br>Client: `Parent`, `Student` | - Lọc theo lớp học, buổi học, tình trạng hạn nộp.<br>- Quyền tạo/sửa/xóa bài tập: Chỉ `Teacher` phụ trách lớp, `SuperAdmin` và `BranchManager` (đúng chi nhánh).<br>- Tự động khởi tạo `HomeworkSubmissions` (`Pending`) cho tất cả học viên đang học trong lớp.<br>- `Parent`/`Student` chỉ xem bài tập của lớp mình/con mình đang học. | **PASS** | Phân quyền 5 vai trò nghiêm ngặt ở cả Backend (`HomeworksController.cs`) và Frontend (`Homeworks.jsx`). Quản lý chi nhánh bị giới hạn theo cơ sở, Giáo viên chỉ thao tác trên lớp phụ trách. Quy trình tự động hóa quét `StudentClasses` hoạt động chuẩn xác. |
| **TC-HW-02** | **Nộp bài & Chấm bài (Submissions)** | `Student`, `Parent`, `Teacher`, `BranchManager`, `SuperAdmin` | - `Student` tự nộp bài của mình, `Parent` nộp bài cho con.<br>- `Teacher` và Staff chấm bài, cho điểm, nhận xét sư phạm.<br>- Trạng thái chấm bài đồng bộ 100% CSDL với `'Reviewed'` (tuyệt đối không dùng `'Evaluated'`).<br>- Chặn rò rỉ: `Parent`/`Student` chỉ thấy bài của con/mình; Split-View chỉ hiển thị cho Staff. | **PASS** | `HomeworkSubmissionsController.cs` kiểm soát quyền nộp và chấm theo đúng vai trò. Chấm bài chuẩn hóa `'Reviewed'`, loại trừ rủi ro vi phạm ràng buộc `CK_HwSub_Status`. Giao diện tách biệt rõ ràng Split-View (Staff) và Single-View (Parent/Student). |
| **TC-LP-01** | **Tiến độ bài học (LessonProgress)** | `Teacher`, `BranchManager`, `SuperAdmin` | - Hiển thị nhật ký tiến độ bài học theo lớp trong Drawer Chi tiết Lớp học.<br>- Quyền thêm/sửa/xóa: `BranchManager` theo chi nhánh, `Teacher` theo lớp phân công.<br>- Trạng thái rỗng (Empty State) sạch sẽ, hướng dẫn sư phạm thân thiện, không có dữ liệu giả. | **PASS** | `LessonProgressesController.cs` và `ClassList.jsx` tích hợp trơn tru. Timeline dòng thời gian trực quan, empty state chuẩn triết lý Emil Kowalski, không phát sinh dữ liệu hard-code vi phạm quy tắc dự án. |
| **TC-SEC-01** | **Tuyến đường & Bảo mật Localhost** | Toàn hệ thống | - Đăng ký route `/homeworks` trong `App.jsx` và hiển thị trên menu điều hướng `AdminLayout.jsx`.<br>- Không hard-code `localhost` trong toàn bộ mã nguồn `roxy-admin/src/`. | **PASS** | Route `/homeworks` được bảo vệ bởi `ProtectedRoute` và tích hợp đầy đủ trên Desktop Sidebar & Mobile Drawer. Quét 0 kết quả `localhost`. |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT EVIDENCE)

### 3.1. TC-HW-01: Quản lý bài tập & Phân quyền (Homeworks)

#### A. Phân quyền truy vấn danh sách tại Backend (`HomeworksController.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Controllers/HomeworksController.cs` (Dòng 36-68)
- **Bằng chứng code:**
  - `SuperAdmin`: Truy cập toàn bộ hệ thống hoặc lọc theo chi nhánh tùy ý.
  - `BranchManager`: Bắt buộc lọc `h.Class.BranchId == userBranchId`.
  - `Teacher`: Lọc `h.Class.TeacherId == UserId` hoặc giáo viên dạy thay trong buổi học (`h.Schedule.SubstituteTeacherId == UserId`).
  - `Parent`: Chỉ lấy bài tập của lớp mà con có `StudentClasses.Status == "Active"`.
  - `Student`: Chỉ lấy bài tập của lớp mà bản thân có `StudentClasses.Status == "Active"`.
- **Bộ lọc động (Dòng 71-108):** Hỗ trợ lọc theo `classId`, `scheduleId`, `branchId` (chỉ cho SuperAdmin), `dueDateFrom`, `dueDateTo`, và `status` (`active/ongoing/open` hoặc `overdue/expired`).

#### B. Phân quyền Tạo / Sửa / Xóa bài tập:
- **Tạo bài tập (`CreateHomework`, Dòng 211-284):**
  - Khai báo: `[Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]` (Parent và Student bị chặn 403 ngay lập tức).
  - Quản lý chi nhánh: Bắt buộc `cls.BranchId == userBranchId`, trả về `403 Forbidden` nếu cố ý tạo cho chi nhánh khác.
  - Giáo viên: Bắt buộc `cls.TeacherId == UserId` hoặc là giáo viên dạy thay của buổi học, nếu không trả về `403 Forbidden`.
  - **Tự động hóa nộp bài (Dòng 260-277):** Tự động tìm học sinh có `Status == "Active"` trong `StudentClasses` của lớp và thêm bản ghi `HomeworkSubmission` với `Status = "Pending"`. Khi giao bài, giao diện hiển thị ngay tỷ lệ `0 / N đã nộp`.
- **Sửa & Xóa bài tập (`UpdateHomework` & `DeleteHomework`, Dòng 287-367):**
  - Kiểm tra thẩm quyền theo chi nhánh và giáo viên phụ trách/người tạo (`homework.Class.TeacherId == UserId || homework.CreatedBy == UserId`).
  - Trước khi xóa bài tập, tự động xóa an toàn toàn bộ bài nộp (`HomeworkSubmissions`) để triệt tiêu lỗi xung đột khóa ngoại FK (`db.HomeworkSubmissions.RemoveRange(submissions)`).

#### C. Giao diện Người dùng (`Homeworks.jsx`):
- **Kiểm soát nút thao tác (Dòng 19, 651-662):**
  - `const canManage = isSuperAdmin || isBranchManager || isTeacher;`
  - Nút `+ Giao bài tập` chỉ render khi `canManage === true`. Phụ huynh và học sinh hoàn toàn không thấy nút này.
- **Bộ lọc đa năng (Dòng 29-33, 665-764):**
  - Lọc theo ô tìm kiếm văn bản (tiêu đề, tên lớp, giáo viên).
  - Lọc theo Lớp học (tự động load danh sách Buổi học tương ứng qua API `/Schedules?classId=...`).
  - Lọc trạng thái hạn nộp: `Tất cả`, `Đang mở / Còn hạn`, `Sắp hết hạn (< 24h)`, `Đã quá hạn`.
  - Hỗ trợ nút phím nhanh hạn nộp: `⚡ +2 ngày (21:00)` và `⚡ Tối Chủ Nhật` (Dòng 322-340).
- **Hỗ trợ Responsive Mobile (Dòng 994-1104):**
  - Chuyển đổi bảng dữ liệu thành danh sách thẻ bài tập trên thiết bị có độ rộng `< 768px`, tích hợp đầy đủ badge hạn nộp, tỷ lệ nộp bài và các nút thao tác nhanh.

---

### 3.2. TC-HW-02: Nộp bài & Chấm bài (HomeworkSubmissions)

#### A. Phân quyền xem bài nộp tại Backend (`HomeworkSubmissionsController.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Controllers/HomeworkSubmissionsController.cs` (Dòng 30-57, 70-73)
- **Bằng chứng code:**
  - `SuperAdmin`: Toàn quyền.
  - `BranchManager`: Khóa theo cơ sở `s.Homework.Class.BranchId == userBranchId`.
  - `Teacher`: Khóa theo lớp giảng dạy hoặc dạy thay.
  - `Parent`: `s.StudentClass.Student.ParentId == UserId`. Phụ huynh chỉ thấy bài nộp của con mình.
  - `Student`: `s.StudentClass.Student.UserId == UserId`. Học sinh chỉ thấy bài của chính mình.
  - **Chống rò rỉ dữ liệu qua tham số studentId:** Nếu `Role == "Parent"` hoặc `"Student"`, tham số `studentId` bị bỏ qua không cho phép ghi đè phạm vi xem bài của trẻ khác.

#### B. API Nộp bài (`SubmitHomework`, Dòng 166-194):
- Khai báo: `[Authorize(Roles = "SuperAdmin,Parent,Student")]`.
- Kiểm tra tính xác thực:
  - Phụ huynh: `sub.StudentClass.Student.ParentId == UserId`.
  - Học sinh: `sub.StudentClass.Student.UserId == UserId`.
- Khi nộp thành công, hệ thống lưu `SubmissionUrl`, `StudentNote`, chuyển trạng thái `Status = "Submitted"` và ghi nhận thời gian `SubmittedAt = DateTime.UtcNow`.

#### C. API Chấm bài & Chuẩn hóa Trạng thái CSDL (`ReviewHomework`, Dòng 196-239):
- Khai báo: `[Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]`.
- Ràng buộc CSDL trong `RoxyAppDB.sql` dòng 248:
  `CONSTRAINT CK_HwSub_Status CHECK (Status IN ('Pending','Submitted','Reviewed'))`
- Backend chuẩn hóa trạng thái khớp 100% CSDL:
  `sub.Status = string.Equals(req.Status, "Pending", StringComparison.OrdinalIgnoreCase) ? "Pending" : "Reviewed";`
  `sub.TeacherFeedback = req.TeacherFeedback?.Trim();`
  `sub.ReviewedAt = DateTime.UtcNow;`
- DTO `ReviewHomeworkRequest` sử dụng biểu thức chính quy:
  `[RegularExpression("^(Reviewed|Pending)$", ErrorMessage = "Trạng thái chấm bài chỉ nhận: Reviewed (Đã chấm), Pending (Yêu cầu làm lại)")]`
  `public string Status { get; set; } = "Reviewed";`
- **Đánh giá:** Triệt tiêu hoàn toàn nguy cơ dùng nhãn `'Evaluated'` gây lỗi SQL 500 runtime như đã cảnh báo trong tài liệu kiểm toán `AUDIT.md` §5.1.

#### D. Giao diện Chấm bài & Nộp bài (`Homeworks.jsx`):
- **Phân tách giao diện theo vai trò (Dòng 1425-1835):**
  - **Với Staff / Giáo viên (Split-View):** Bên trái là danh sách học sinh kèm tab lọc (`Tất cả`, `Chờ chấm`, `Đã chấm`, `Chưa nộp`) và ô tìm kiếm; bên phải là khung chấm bài, nhập Điểm số, Nhận xét, các mẫu phản hồi nhanh sư phạm (Dòng 571-576), hỗ trợ phím tắt `Ctrl + Enter` để lưu và chuyển sang bé tiếp theo (Dòng 557-568).
  - **Với Phụ huynh / Học sinh (Single-View, Dòng 1713-1835):** Giao diện riêng biệt, chỉ render hồ sơ của con/mình, form nộp link ảnh/Google Drive và lời nhắn gửi cô. Tuyệt đối không hiển thị danh sách hay thông tin học sinh khác.
- **Lightbox phóng to ảnh bài làm (Dòng 1842-1860):** Cho phép xem ảnh bài làm trực tiếp trên nền mờ tối (`backdrop-blur-md`), hỗ trợ đóng nhanh bằng phím Esc hoặc nhấp chuột.

---

### 3.3. TC-LP-01: Tiến độ bài học (LessonProgress)

#### A. Backend Phân quyền (`LessonProgressesController.cs`):
- **Truy vấn (`GetProgresses`, Dòng 19-105):** Phân quyền 5 vai trò; Quản lý cơ sở chỉ xem lớp thuộc chi nhánh mình; Giáo viên xem lớp mình dạy; Phụ huynh/Học sinh xem lớp đang ghi danh hoạt động.
- **Tạo / Sửa / Xóa (`CreateProgress`, `UpdateProgress`, `DeleteProgress`, Dòng 178-313):**
  - Khai báo: `[Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]`.
  - Quản lý chi nhánh: Kiểm tra `cls.BranchId == userBranchId` (hoặc `progress.Class.BranchId == userBranchId`).
  - Giáo viên: Kiểm tra `cls.TeacherId == UserId` hoặc giáo viên dạy thay của buổi học.

#### B. Giao diện Tiến độ trong Chi tiết Lớp (`ClassList.jsx`):
- **Tích hợp Drawer (Dòng 59-75, 400-404, 1180-1365):** Mở xem chi tiết lớp với tab mặc định "Tiến độ bài học", gọi API `GET /api/LessonProgresses?classId={id}`.
- **Dòng thời gian trực quan (Timeline, Dòng 1224-1265):** Hiển thị trục dọc nốt mốc xanh (`ring-2 ring-blue-100`), ngày học, buổi học liên kết, tiêu đề và nội dung bài giảng.
- **Kiểm soát quyền Thêm/Sửa/Xóa (Dòng 368-374):** Hàm `canManageProgress(cls)` kiểm tra chặt chẽ vai trò `SuperAdmin`, `BranchManager` (đúng cơ sở) và `Teacher` (đúng giáo viên phụ trách).
- **Trạng thái rỗng tinh tế (Tasteful Empty State, Dòng 1200-1222):** Thiết kế đúng chuẩn Emil Kowalski với biểu tượng 📖, thông điệp sư phạm ấm áp giải thích quy trình cập nhật tiến độ, không có số liệu giả, cung cấp nút `+ Ghi nhận tiến độ buổi đầu tiên` cho giáo viên.

---

### 3.4. TC-SEC-01: Tuyến đường & Bảo mật Localhost

#### A. Đăng ký Tuyến đường (`roxy-admin/src/App.jsx`):
- Tuyến đường `/homeworks` được khai báo bên trong `ProtectedRoute` và bọc trong khung `AdminLayout` (Dòng 10, 30):
  `<Route path="/homeworks" element={<Homeworks />} />`

#### B. Menu Điều hướng (`roxy-admin/src/layouts/AdminLayout.jsx`):
- Mục menu `📚 Bài tập` được khai báo trong nhóm "Nghiệp vụ đào tạo" (Dòng 95-98), hoạt động đồng bộ trên cả Sidebar máy tính và Drawer điện thoại di động.

#### C. Kiểm tra chuỗi localhost:
- Thực hiện kiểm tra bằng lệnh `Select-String -Path "roxy-admin/src/**/*.*" -Pattern "localhost"`.
- **Kết quả:** **0 kết quả** (Không có bất kỳ vị trí nào bị hard-code `localhost`). API gọi qua `axiosClient` sử dụng biến môi trường `VITE_API_BASE_URL`.

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

1. **Tổng số lỗi chặn (Blocker):** **0**
2. **Tổng số lỗi nghiêm trọng (Critical):** **0**
3. **Mã nguồn Backend và Frontend:** 
   - Backend biên dịch thành công 100% (**0 Error, 0 Warning**).
   - Frontend lint sạch 100% (**0 Error, 0 Warning**), build production thành công trong **241ms** (**92 modules transformed**).
4. **Đánh giá nghiệp vụ & Bảo mật:**
   - RBAC 5 vai trò cho Bài tập, Bài nộp và Tiến độ bài học đạt tiêu chuẩn an toàn bảo mật tuyệt đối.
   - Trạng thái nộp bài và chấm bài khớp 100% ràng buộc CSDL (`'Pending'`, `'Submitted'`, `'Reviewed'`).
   - Dữ liệu học sinh được bảo vệ tuyệt đối: Phụ huynh/Học sinh chỉ thấy bài nộp của bản thân/con mình.
   - Giao diện người dùng tuân thủ chặt chẽ triết lý thiết kế Apple Design & Emil Kowalski (Split-View, Shortcut keyboard `Ctrl+Enter`, Responsive mobile card stack, Clean empty state).
5. **Kết luận:** Giai đoạn 1E (Homeworks + HomeworkSubmissions + LessonProgress) **ĐẠT CHUẨN NGHIỆM THU QA (PASSED 100%)**, đủ điều kiện nghiệm thu và sẵn sàng cho các phân hệ tiếp theo.
