# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1I (DASHBOARD DỮ LIỆU THẬT & ĐIỀU HƯỚNG TỔNG HỢP)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Bảng tổng quan thông minh đa vai trò (/ & /dashboard)  
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** GEMINI.md, docs/DESIGN.md, docs/API.md, RoxyAppDB.sql

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

| Thành phần | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Database Schema** | Đối chiếu RoxyAppDB.sql | **PASS** | 0 thay đổi schema DB, không tạo bảng mới, 0 migration thừa |
| **Backend Build** | dotnet build RoxyAppBE/RoxyAcademy.Api | **PASS** | **0 Warning(s), 0 Error(s)**, target net9.0 |
| **Frontend Build** | 
pm run build (roxy-admin) | **PASS** | **0 Error(s)**, Vite built sạch 97 modules (415ms) |
| **Kiểm tra Localhost** | Đối chiếu chuỗi localhost / IP MSI | **PASS** | 0 hard-code localhost, toàn bộ API frontend qua xiosClient |
| **Dữ liệu nhạy cảm** | Kiểm tra bảo mật ghi chú Students.Note | **PASS** | DTO Dashboard không chứa Note, an toàn cho mọi vai trò |

---

## 2. BẢNG TỔNG HỢP CHECKLIST KIỂM THỬ GIAI ĐOẠN 1I

| STT | Hạng mục kiểm tra | Tiêu chí yêu cầu | Kết quả | Dòng code đối chiếu cụ thể |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Phân quyền 5 vai trò (RBAC)** | - SuperAdmin: Thấy số liệu toàn hệ thống.<br>- BranchManager: Lọc chính xác chi nhánh (BranchId == userBranchId).<br>- Teacher: Chỉ thấy học viên/lớp/buổi học mình dạy; ctiveTeachers = null; 	uition = null.<br>- Parent: Chỉ thấy số liệu con mình; ẩn nút quản trị staff.<br>- Student: Chỉ thấy số liệu chính mình; ẩn nút quản trị staff. | **PASS** | - Backend: DashboardController.cs L23-24, L37-42, L54-77, L180-254<br>- Frontend: Dashboard.jsx L103-110, L182, L192-194, L283-315 |
| **2** | **Khớp số liệu danh sách** | - ctiveStudents khớp StudentsController (Status == Active).<br>- ongoingClasses khớp ClassesController (Status == Ongoing).<br>- pendingLeaveRequests khớp LeaveRequestsController (Status == Pending).<br>- 	uition khớp TuitionsController (tháng hiện tại giờ VN UTC+7, NetAmount, Confirmed Payments).<br>- 	odayAttendance & 	odaySchedules khớp giờ VN UTC+7. | **PASS** | - Học viên: DashboardController.cs L31 & StudentsController.cs L131<br>- Lớp học: DashboardController.cs L34 & ClassesController.cs L19-39<br>- Đơn nghỉ: DashboardController.cs L44 & LeaveRequestsController.cs L109-113<br>- Học phí: DashboardController.cs L57-76 & TuitionsController.cs L80-101, L125-135<br>- Lịch & Điểm danh: DashboardController.cs L26-29, L79-167 |
| **3** | **Điều hướng & Query Params** | - Bấm card nhảy đúng route và query param (/students?status=Active, /classes?status=Ongoing, /leave-requests?status=Pending, /tuitions?status=Unpaid, /attendance, /attendance?scheduleId={id}).<br>- Các trang danh sách đọc searchParams.get('status') và lọc sẵn ngay khi mount. | **PASS** | - Dashboard.jsx L211, L227, L254, L381, L439, L532-535<br>- Students.jsx L29-44, L132, L478<br>- ClassList.jsx L30-41, L170, L598<br>- LeaveRequests.jsx L67-80, L199, L774<br>- Tuitions.jsx L30-44, L119, L428<br>- Attendance.jsx L56-77 |
| **4** | **Ràng buộc kiến trúc & an toàn** | - Không đổi DB schema, chỉ dùng HTTP GET.<br>- Không hard-code localhost.<br>- Không làm Messages/Newsfeed ở bước này.<br>- Xử lý chuẩn phân chia 0 (	uitionPercent khi 	otalExpected = 0). | **PASS** | - Controller chỉ có duy nhất [HttpGet(summary)] L20<br>- 	uitionPercent kiểm tra 	otalExpected > 0 (Dashboard.jsx L258-261)<br>- Empty state đẹp mắt khi không có lịch học hôm nay (Dashboard.jsx L507-525) |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN VÀ LOGIC BẢO MẬT

### 3.1. Dữ liệu tổng quan và phân quyền Backend (DashboardController.cs)
1. **Lớp bảo vệ Role Guard:**
   - Dòng 23-24: if (Role is not (SuperAdmin or BranchManager or Teacher or Parent or Student)) return Forbid();
   - Chỉ cho phép 5 vai trò hợp lệ, từ chối mọi yêu cầu lạ.

2. **Bảo mật dữ liệu tài chính (Học phí):**
   - Dòng 55-77: Nếu Role == Teacher, trường 	uition hoàn toàn là 
ull. Giáo viên không thể thấy thông tin tài chính hoặc công nợ.
   - Đối với BranchManager: chỉ tính học phí của các học viên thuộc chi nhánh mình phụ trách (	.BranchId == UserBranchId).
   - Đối với Parent: chỉ tính học phí con mình (	.Student.ParentId == UserId).
   - Đối với Student: chỉ tính học phí của chính mình (	.Student.UserId == UserId).
   - Công thức tính:
     - NetAmount = Amount - Discount
     - PaidAmount = SUM(Confirmed Payments)
     - TotalRemaining = Math.Max(0, NetAmount - PaidAmount)
     - Lọc theo tháng và năm hiện tại theo giờ Việt Nam UTC+7 (DateTime.UtcNow.AddHours(7)).

3. **Bảo mật thông tin nhân sự (Giáo viên):**
   - Dòng 37-42: Số lượng giáo viên ctiveTeachers chỉ được tính cho SuperAdmin (toàn hệ thống) và BranchManager (thuộc chi nhánh). Đối với Teacher, Parent, Student giá trị trả về là 
ull.

4. **Lịch dạy và Lịch học hôm nay:**
   - Dòng 241-254: Lọc chính xác theo ngày hôm nay giờ Việt Nam (DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7))).
   - Teacher: Thấy lịch mình dạy chính HOẶC dạy thay (s.Class.TeacherId == UserId || s.SubstituteTeacherId == UserId).
   - Parent / Student: Chỉ thấy lịch các lớp đang theo học tích cực (sc.Status == Active).

5. **Thống kê Điểm danh hôm nay:**
   - Dòng 117-158: Đếm chính xác theo các lớp có lịch hôm nay (	odayClassIds).
   - Tính tổng lượt dự kiến (TotalExpected) dựa trên số lượng học sinh Active trong lớp.
   - Phân loại rõ 4 nhóm: Present, Late, ExcusedAbsent, UnexcusedAbsent.

### 3.2. Giao diện Frontend và Điều hướng (Dashboard.jsx)
1. **Trạng thái Skeleton & Xử lý lỗi:**
   - Có component DashboardSkeleton hiển thị khi đang tải dữ liệu.
   - Xử lý handleRetry và hiển thị khối báo lỗi thân thiện khi có lỗi mạng / máy chủ.

2. **Tùy biến hiển thị theo vai trò:**
   - isStaff: Hiển thị 4 Card tổng quan (Học viên, Lớp học, Giáo viên, Đơn xin nghỉ) + Nút thao tác nhanh trên Header (+ Xem Học viên, Quản lý Lớp học).
   - isTeacher: Hiển thị 3 Card (Học viên, Lớp đang phụ trách, Đơn xin nghỉ) + Nút thao tác nhanh (Điểm danh hôm nay, Xem Lịch dạy). Card Học phí và Card Giáo viên được ẩn hoàn toàn.
   - isFamily (Parent/Student): Hiển thị nhãn thân thiện (Con đang theo học, Hồ sơ của tôi, Lớp đang học), không thấy nút staff, không thấy card Giáo viên. Nút bấm tại mục lịch hôm nay điều hướng về /schedules với nhãn Xem lịch →.

3. **Điều hướng chính xác với Query Params:**
   - Card Học viên: 	o: isFamily ? '/students' : '/students?status=Active'
   - Card Lớp học: 	o: '/classes?status=Ongoing'
   - Card Đơn xin nghỉ: 	o: '/leave-requests?status=Pending'
   - Card Học phí: 	o: '/tuitions?status=Unpaid'
   - Card Điểm danh hôm nay: 	o: '/attendance'
   - Lịch học hôm nay: Staff/Teacher dẫn đến /attendance?scheduleId={id}; Family dẫn đến /schedules.

### 3.3. Đồng bộ bộ lọc tại các trang danh sách
1. **Students.jsx:**
   - Đọc searchParams.get('status'), gán vào statusFilter nếu thuộc alidStatuses = ['Active', 'Paused', 'Graduated', 'Dropped'].
   - Gọi GET /Students?status=Active ngay khi mở trang, dropdown trạng thái hiển thị Đang học.
2. **ClassList.jsx:**
   - Đọc searchParams.get('status'), gán vào statusFilter nếu thuộc alidStatuses = ['Upcoming', 'Ongoing', 'Finished'].
   - Bộ lọc Client-side ilteredClasses lọc ngay các lớp có cls.status === 'Ongoing', dropdown hiển thị Đang diễn ra.
3. **LeaveRequests.jsx:**
   - Đọc searchParams.get('status'), gán vào statusFilter nếu thuộc alidStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'].
   - Gửi query param params.status = statusFilter tới GET /LeaveRequests?status=Pending.
   - Tab Chờ duyệt tự động active.
4. **Tuitions.jsx:**
   - Đọc searchParams.get('status'), gán vào statusFilter nếu thuộc alidStatuses = ['Unpaid', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'].
   - Gửi query param params.status = statusFilter tới GET /Tuitions?status=Unpaid.
   - Tab Chưa thanh toán tự động active.
5. **Attendance.jsx:**
   - Đọc searchParams.get('scheduleId'), nạp chi tiết buổi học và tự động chuyển đúng ngày và chọn buổi học đó để điểm danh.

---

## 4. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 4 nhóm checklist của Giai đoạn 1I (Dashboard dữ liệu thật cho Roxy Academy) đều **ĐẠT (PASS 100%)**:
1. Phân quyền RBAC 5 vai trò nghiêm ngặt, dữ liệu học phí và nhân sự được bảo vệ tuyệt đối.
2. Số liệu tổng quan khớp 100% với các API và trang danh sách nghiệp vụ.
3. Điều hướng và query parameters (?status=..., ?scheduleId=...) hoạt động đồng bộ, mượt mà.
4. Không thay đổi DB schema, không hard-code localhost, code biên dịch sạch cả backend và frontend.

**Trạng thái nghiệm thu:** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Đủ điều kiện bàn giao cho Giai đoạn tiếp theo / Deploy agent.

---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1K (TIN NHẮN & BẢNG TIN — MESSAGES & NEWSFEED)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Tin nhắn trao đổi (`/messages`) & Bảng tin trung tâm (`/newsfeed`)  
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/DESIGN.md`, `docs/API.md`, `RoxyAppDB.sql`

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT VÀ SMOKE TEST API

| Thành phần | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Database Schema** | Đối chiếu `RoxyAppDB.sql` | **PASS** | 0 thay đổi schema DB; `TargetAudience` khớp `CK_Newsfeed_Target CHECK (TargetAudience IN ('All','Parents','Teachers'))`; `Messages` khớp `CK_Messages_Target` |
| **Backend Build** | `dotnet build` tại `RoxyAppBE/RoxyAcademy.Api/` | **PASS** | **0 Warning(s), 0 Error(s)**, target `net9.0` (đã tắt `RoxyAcademy.Api` trước khi build) |
| **Frontend Lint** | `npm run lint` tại `roxy-admin/` | **PASS** | **0 Error(s)** (`eslint .` sạch) |
| **Frontend Build** | `npm run build` tại `roxy-admin/` | **PASS** | **0 Error(s)**, Vite transformed 103 modules (276ms) |
| **API Smoke Test (no token)** | `curl.exe` trên local SQL Server | **PASS** | `GET /api/Messages` → `401`, `GET /api/Messages/recipients` → `401`, `POST /api/Newsfeeds` → `401`, `GET /api/Newsfeeds` (`[AllowAnonymous]`) → `200` (đã tắt API sau khi test) |
| **Kiểm tra Localhost & Zalo** | Quét toàn bộ 11 file Giai đoạn 1K | **PASS** | 0 hard-code `localhost`; không có code Zalo Mini App (chỉ giữ mục placeholder "Zalo Mini App - Giai đoạn 2" bị disable ở `AdminLayout.jsx` L182) |

---

## 2. BẢNG TỔNG HỢP CHECKLIST KIỂM THỬ GIAI ĐOẠN 1K

| STT | Hạng mục kiểm tra | Tiêu chí yêu cầu | Kết quả | Dòng code đối chiếu cụ thể |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Messages — 3 tab & phân quyền 5 vai trò** | - 3 tab `inbox`, `outbox`, `class` lọc đúng theo `SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student` ở Backend và hiển thị đúng ở Frontend.<br>- Các `type` lạ / mặc định không bao giờ trả toàn bộ tin nhắn. | **PASS** | - `MessagesController.cs` L20-67<br>- `Messages.jsx` L6-10, L89-91, L284-309 |
| **2** | **Messages — `recipients` & `POST /api/Messages` (403)** | - `GET /api/Messages/recipients` chỉ trả user/lớp trong phạm vi vai trò & chi nhánh.<br>- `POST /api/Messages` kiểm tra `GetAllowedReceiverUsersQuery()` và `GetAllowedClassesQuery()`, chặn `403 Forbidden` nếu ngoài phạm vi; kiểm tra `CK_Messages_Target` (`400 BadRequest`).<br>- `ComposeMessageModal` chỉ cho chọn từ `recipients`. | **PASS** | - `MessagesController.cs` L82-197<br>- `MessageModals.jsx` L48-70, L248-286 |
| **3** | **Messages — Đánh dấu đã đọc & Không xóa** | - `PUT /api/Messages/{id}/read` kiểm tra `msg.ReceiverId != UserId` → `403 Forbidden`, chỉ người nhận đích danh mới đánh dấu được.<br>- Không có API `DELETE` và không có nút xóa tin nhắn trên UI. | **PASS** | - `MessagesController.cs` L223-241<br>- `Messages.jsx` L126-168, L543-555<br>- `MessageModals.jsx` L344-499 |
| **4** | **Newsfeed — `TargetAudience` khớp DB** | - `CreateNewsfeedRequest` & `UpdateNewsfeedRequest` chỉ nhận `All`, `Parents`, `Teachers` khớp `CK_Newsfeed_Target` trong `RoxyAppDB.sql`.<br>- Frontend dropdown & `NEWSFEED_AUDIENCE_META` khớp 3 giá trị trên. | **PASS** | - `RoxyAppDB.sql` L418<br>- `NewsfeedDtos.cs` L33-35, L52-54<br>- `formatters.js` L116-129<br>- `NewsfeedModals.jsx` L362-370 |
| **5** | **Newsfeed — Phân quyền tạo / sửa / xóa** | - Chỉ `SuperAdmin` và `BranchManager` thấy nút Đăng bài / Sửa / Xóa ở Frontend.<br>- `Teacher` / `Parent` / `Student` không thấy nút và bị Backend `[Authorize(Roles = "SuperAdmin,BranchManager")]` chặn `403`.<br>- `BranchManager` chỉ đăng/sửa/xóa bài chi nhánh mình; `UpdateNewsfeed` chặn đổi `BranchId` sang chi nhánh khác hoặc `null` bằng `403`. | **PASS** | - `NewsfeedsController.cs` L64-69, L92-100, L117-125<br>- `Newsfeed.jsx` L25-27, L58-68, L192, L419-439<br>- `NewsfeedModals.jsx` L178-187, L255-259, L377-394 |
| **6** | **Newsfeed — Quyền đọc theo vai trò & chi nhánh** | - Mọi vai trò đọc được bài chung (`BranchId == null`) và bài chi nhánh mình.<br>- Lọc đúng `TargetAudience` và chỉ trả bài `IsPublished == true` với `Teacher`/`Parent`/`Student`. | **PASS** | - `NewsfeedsController.cs` L30-47 |

---

## 3. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 6 hạng mục kiểm thử code, phân quyền và build/smoke test cho Giai đoạn 1K (Messages & Newsfeed) đều **ĐẠT (PASS 100%)**.  
**Trạng thái nghiệm thu:** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Đủ điều kiện bàn giao cho bước tiếp theo.


---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1L (GHI DANH HỌC VIÊN VÀO LỚP & TÀI KHOẢN PHỤ HUYNH / HỌC VIÊN)
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Phạm vi:** `StudentClassesController.cs`, `StudentClassDtos.cs`, `StudentsController.cs`, `UsersController.cs`, `SchedulesController.cs`, `AuthController.cs`, `ClassList.jsx`, `Students.jsx`

## 1. KẾT QUẢ KIỂM TRA BUILD & SCHEMA
| Hạng mục | Kết quả | Chi tiết |
| :--- | :---: | :--- |
| **Database Schema** | **PASS** | Không thay đổi `RoxyAppDB.sql`, giữ nguyên 18 bảng và ràng buộc `UQ_StudentClasses (StudentId, ClassId)` |
| **Frontend Lint (`npm run lint`)** | **PASS** | 0 error(s), 0 warning(s) |
| **Frontend Build (`npm run build`)** | **PASS** | Vite built 103 modules trong 407ms |

## 2. KẾT QUẢ 7 TEST CASES BẮT BUỘC (ĐỐI CHIẾU MÃ NGUỒN)

1. **Thêm học viên vào lớp (`POST /api/StudentClasses`) → `Status = Active` (khi staff thêm) → Phụ huynh thấy lịch (`GET /api/Schedules`) — PASS**
   - `StudentClassesController.cs` (`IsStaff`, `RegisterClass`, `isApproved = IsStaff`, `Status = isApproved ? "Active" : "Pending"`, `ApprovedBy`/`ApprovedAt`).
   - `SchedulesController.cs` (`Parent` lọc `sc.Status == "Active" && sc.Student.ParentId == UserId`; `Student` lọc `sc.Status == "Active" && sc.Student.UserId == UserId`).
   - `ClassList.jsx` (`POST /StudentClasses` trong tab `Học viên trong lớp`).

2. **Chặn ghi danh trùng (`409 Conflict` cho cả `Active`/`Pending` lẫn `Dropped`/`Rejected` — khớp `UQ_StudentClasses`); UI lọc dropdown & nhắc duyệt lại — PASS**
   - `RoxyAppDB.sql` (`CONSTRAINT UQ_StudentClasses UNIQUE (StudentId, ClassId)`).
   - `StudentClassesController.cs` kiểm tra `(req.StudentId, req.ClassId)`: trả `409 Conflict` cả khi đã `Dropped`/`Rejected` (kèm hướng dẫn duyệt lại) và khi đang `Active`/`Pending`/`Completed`.
   - `ClassList.jsx` lọc bỏ học viên đã có bản ghi danh khỏi dropdown thêm mới và hiển thị nhắc bấm **Duyệt lại** nếu học viên đang `Dropped`/`Rejected`.

3. **Học viên sang `Dropped` → ghi danh `Active`/`Pending` thành `Dropped`; đưa về `Active` → ghi danh giữ `Dropped` tới khi duyệt lại (`PUT /api/StudentClasses/{id}/status`); chặn duyệt nếu học viên đang `Dropped` (`400 BadRequest`); UI hiển thị thông báo nghiệp vụ — PASS**
   - `StudentsController.cs` (`ApplyStatusAsync`: `newStatus == "Dropped"` chuyển `StudentClasses` `Active`/`Pending` → `Dropped` và đặt `User.IsActive = false`; đưa về `Active` không tự khôi phục `StudentClasses`).
   - `StudentClassesController.cs` (`UpdateStatus`: `Include(s => s.Student)`, trả `400 BadRequest` nếu duyệt `Active` khi `sc.Student.Status == "Dropped"`, cập nhật `ApprovedBy`/`ApprovedAt` khi duyệt `Active`).
   - `ClassList.jsx` hiển thị khung lưu ý nghiệp vụ và nút **Duyệt**/**Duyệt lại**/**Ngừng ghi danh** kèm modal ghi chú.

4. **Tạo tài khoản Phụ huynh ngay trong form Học viên (`POST /api/Users`, role `Parent`, mật khẩu nhập hoặc `null`) → tự thêm vào danh sách & chọn `formData.parentId`; chỉ `SuperAdmin`/`BranchManager` thấy — PASS**
   - `UsersController.cs` (`[Authorize(Roles = "SuperAdmin,BranchManager")]`, `CreatableRoles` gồm `Parent`, `Password` tùy chọn).
   - `Students.jsx` hiển thị nút `+ Tạo tài khoản phụ huynh mới` chỉ với `!editingStudent && isStaff`, tạo xong tự thêm vào `parents` và chọn `parentId`.

5. **Tạo tài khoản Học viên (`POST /api/Students/{id}/account`, SĐT + mật khẩu hoặc `null`) → đăng nhập `POST /api/Auth/login` (khi có MK & `IsActive = true`); hiện `Đã có TK` + nút `Đặt lại MK` (`POST /api/Students/{id}/account/reset-password`); chỉ `SuperAdmin`/`BranchManager` thấy — PASS**
   - `StudentsController.cs` (`CreateAccount`, `ResetAccountPassword` với `[Authorize(Roles = "SuperAdmin,BranchManager")]`).
   - `AuthController.cs` (`Login` kiểm tra `IsActive` & `PasswordHash`).
   - `Students.jsx` hiển thị cột `Tài khoản` + trong modal chi tiết với badge `Đã có TK`/`Chưa có` và nút `Tạo tài khoản`/`Đặt lại MK` chỉ cho `isStaff`.

6. **Phân quyền `Teacher`: xem tab `Học viên trong lớp` của lớp mình dạy; KHÔNG thấy `+ Thêm học viên vào lớp`, `Duyệt`, `Duyệt lại`, `Ngừng ghi danh`; backend trả `403` cho `POST /StudentClasses` và `PUT /StudentClasses/{id}/status` — PASS**
   - `StudentClassesController.cs` (`Teacher` chỉ xem `sc.Class.TeacherId == UserId`; `POST` và `PUT .../status` chặn `Teacher`).
   - `ClassList.jsx` (`canManageEnrollments` trả `false` cho `Teacher`).

7. **Không có đăng ký công khai, không có Zalo Mini App — PASS**
   - Không có trang/route đăng ký công khai hay mã nguồn Zalo Mini App trong `roxy-admin/src`.

---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1L (BỔ SUNG — PHỤ HUYNH TỰ ĐĂNG KÝ LỚP CHO CON)
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Phạm vi:** `ClassesController.cs`, `StudentClassesController.cs`, `SchedulesController.cs`, `StudentsController.cs`, `Students.jsx`, `ClassList.jsx`, `index.css`, `docs/API.md`  
**Phương thức:** Kiểm tra tĩnh đối chiếu mã nguồn & hợp đồng API/DB + Build verification (chưa chạy runtime với DB/API live).

## 1. KẾT QUẢ BIÊN DỊCH & BẢO MẬT (SMOKE TEST)

| Thành phần | Lệnh / Phạm vi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build RoxyAppBE/RoxyAcademy.Api/RoxyAcademy.Api.csproj` | **PASS** | `0 Warning(s), 0 Error(s)` (target `net9.0`, 3.96s) |
| **Frontend Build** | `npm run build` (`roxy-admin/`) | **PASS** | `0 Error(s)`, 103 modules transformed, built in 285ms |
| **Hard-code `localhost`** | Quét `roxy-admin/src/**` & `Controllers/*.cs`, `Dtos/*.cs` | **PASS** | 0 kết quả hard-code `localhost` trong code sản phẩm |
| **Bảo mật `Students.Note`** | `StudentsController.cs` & `Students.jsx` | **PASS** | Backend `Mask()` đặt `Note = null` khi `Role` không phải `SuperAdmin`/`BranchManager`/`Teacher` (`L20, L71`); Frontend ẩn khối ghi chú nội bộ với `Parent`/`Student` (`L19, L1432`) |
| **UI Motion & Accessibility** | `roxy-admin/src/index.css` | **PASS** | Có `.modal-panel`, `.modal-backdrop` (`L54-81`) và `@media (prefers-reduced-motion: reduce)` (`L84-91`) |

## 2. CHECKLIST 6 TIÊU CHÍ BẮT BUỘC (GIAI ĐOẠN 1L BỔ SUNG)

| STT | Tiêu chí kiểm tra | Kết quả | Dẫn chứng file & dòng code cụ thể |
| :-: | :--- | :-: | :--- |
| **1** | **Phụ huynh đăng ký lớp cho con → `Pending`; nhân viên duyệt → `Active` và phụ huynh thấy lịch** | **PASS** | - `StudentClassesController.cs` L58, L93, L99-102: `POST /api/StudentClasses` tạo `Status = "Pending"`, `ApprovedBy = null` khi `Parent` gọi.<br>- `StudentClassesController.cs` L113-140 & `ClassList.jsx` L502-522: Nhân viên (`SuperAdmin`/`BranchManager`) duyệt qua `PUT /api/StudentClasses/{id}/status` → `Active` (gán `ApprovedBy`, `ApprovedAt`).<br>- `SchedulesController.cs` L48-53, L144-149: `Parent` chỉ thấy lịch học của lớp có `StudentClasses.Status == "Active"` và `sc.Student.ParentId == UserId`. |
| **2** | **Phụ huynh đăng ký cho con người khác bị chặn `403 Forbidden`** | **PASS** | - `StudentClassesController.cs` L65-66: Kiểm tra `if (Role == "Parent" && student.ParentId != UserId)` trả về `403 Forbidden` (`"Bạn chỉ có thể đăng ký lớp cho con của mình."`). |
| **3** | **Lớp không mở đăng ký (hoặc khác chi nhánh) thì không chọn được** | **PASS** | - `ClassesController.cs` L64-83: `GET /api/Classes/open-for-registration` chỉ trả `IsOpenForRegistration && Status != "Finished"`, với `Parent` lọc thêm `Student.ParentId == UserId && Student.Status != "Dropped" && Student.BranchId == Class.BranchId`.<br>- `Students.jsx` L661-665, L772-778: Lọc `cls.isOpenForRegistration === true && cls.branchId === selectedRegisterChild.branchId` và chặn trước khi submit.<br>- `StudentClassesController.cs` L70, L79-80: Chặn `!cls.IsOpenForRegistration` và khác `BranchId` bằng `400 Bad Request`. |
| **4** | **Đăng ký trùng bị chặn (`409 Conflict`)** | **PASS** | - `Students.jsx` L668-674, L780-783, L800-801, L2038-2042: Hiển thị badge `Đã đăng ký`, chặn trước khi submit và bắt `409 Conflict` hiển thị rõ `"Học viên đã đăng ký lớp này rồi. Vui lòng chọn lớp khác."`<br>- `StudentClassesController.cs` L82-90: Trả `409 Conflict` khi đã tồn tại bản ghi `(StudentId, ClassId)` (cả `Pending`/`Active` lẫn `Dropped`/`Rejected`). |
| **5** | **`Teacher` / `Student` (và Staff) không thấy nút đăng ký** | **PASS** | - `Students.jsx` L18, L210, L246, L851-862, L1180-1321, L1916-2121: Chỉ render nút `Đăng ký lớp cho con`, khu vực `Đơn đăng ký lớp của con`, modal đăng ký và chỉ gọi API khi `isParent` (`currentUser.role === 'Parent'`).<br>- `StudentClassesController.cs` L58 & `ClassesController.cs` L65: `[Authorize(Roles = "SuperAdmin,BranchManager,Parent")]` chặn `Teacher`, `Student` ở backend (`403 Forbidden`). |
| **6** | **Build, bảo mật & tài liệu API** | **PASS** | - `dotnet build` và `npm run build` đều PASS 0 lỗi.<br>- `docs/API.md` L936-1033 mô tả đầy đủ Mục 9 (`open-for-registration`, `GET/POST StudentClasses`) khớp mã nguồn thực tế. |

## 3. DANH SÁCH LỖI & KẾT LUẬN

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

**Trạng thái nghiệm thu Giai đoạn 1L (Bổ sung):** **ĐẠT (PASSED)** — Sẵn sàng bàn giao.


---

---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1M-1 (3 HẠNG MỤC MÀN HÌNH: CHUÔNG THÔNG BÁO, TÀI CHÍNH & HỌC PHÍ, QUẢN LÝ KHÓA HỌC)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Ngày kiểm thử:** 16/11/2026 (Re-test sau khi fix lint: 16/11/2026)  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/DESIGN.md`, `docs/API.md`, `RoxyAppDB.sql`  
**Phạm vi kiểm thử:**
1. Chuông thông báo cá nhân (`NotificationsController.cs`, `NotificationBell.jsx`, `AdminLayout.jsx`)
2. Phụ huynh xem học phí + gửi thanh toán & Phân quyền Tài chính (`TuitionsController.cs`, `PaymentsController.cs`, `Tuitions.jsx`, `Payments.jsx`, `AdminLayout.jsx`)
3. Quản lý Khóa học (`CoursesController.cs`, `Courses.jsx`, `App.jsx`, `AdminLayout.jsx`)
4. Kiểm tra Biên dịch, Linting & Ràng buộc bảo mật

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT VÀ SMOKE TEST API

| Thành phần | Lệnh thực thi / Phương thức | Kết quả | Chi tiết đối chiếu |
| :--- | :--- | :---: | :--- |
| **Database Schema** | Đối chiếu `RoxyAppDB.sql` | **PASS** | 0 thay đổi schema DB; giữ nguyên 18 bảng, không phát sinh migration thừa |
| **Backend Build** | `dotnet build RoxyAppBE/RoxyAcademy.Api/RoxyAcademy.Api.csproj` | **PASS** | **0 Warning(s), 0 Error(s)**, target `net9.0` (đã tắt process trước khi build) |
| **Frontend Lint** | `npm run lint` tại `roxy-admin/` | **PASS** | **0 problems (0 errors, 0 warnings)** — Đã khắc phục triệt để `react-hooks/rules-of-hooks` và `react-hooks/set-state-in-effect` |
| **Frontend Build** | `npm run build` tại `roxy-admin/` | **PASS** | **0 Error(s)**, Vite production build transformed 105 modules trong 366ms |
| **API Smoke Test** | `curl.exe http://localhost:5123/api/...` | **PASS** | Không token: `GET /api/Notifications` → `401`, `GET /api/Courses` → `401`, `GET /api/Payments` → `401` |
| **Bảo mật & Localhost** | Quét toàn bộ mã nguồn | **PASS** | 0 hard-code `localhost`, 0 `[CẦN XÁC MINH]` hiển thị trong code UI, toàn bộ gọi qua `axiosClient` |

---

## 2. MA TRẬN PHÂN QUYỀN RBAC (5 VAI TRÒ)

| Nghiệp vụ / Hành động | SuperAdmin | BranchManager | Teacher | Parent | Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Notifications (Thông báo)** | | | | | |
| - Xem thông báo (`GET /api/Notifications`) | Của mình | Của mình | Của mình | Của mình | Của mình |
| - Đánh dấu đã đọc (`PUT /api/Notifications/{id}/read`) | Của mình | Của mình | Của mình | Của mình | Của mình |
| - Đánh dấu đọc tất cả (`PUT /api/Notifications/read-all`) | Của mình | Của mình | Của mình | Của mình | Của mình |
| - Nhận thông báo tự động khi nộp/duyệt học phí | — | — | — | **Tự động nhận** | — |
| **2. Phân hệ Học phí (`/tuitions`)** | | | | | |
| - Menu "Học phí" trên thanh điều hướng | Hiển thị | Hiển thị | **Ẩn hoàn toàn** | Hiển thị | Hiển thị |
| - Danh sách học phí (`GET /api/Tuitions`) | Toàn hệ thống | Theo chi nhánh | **403 Chặn** | Chỉ con mình | Chỉ bản thân |
| - Xem Banner công nợ gia đình | KPI Quản trị | KPI Quản trị | Không | **Banner gia đình** | Thẻ cá nhân |
| - Nút "Thanh toán" gửi giao dịch nộp phí | Không | Không | Không | **Hiển thị (Nợ > 0)** | **Không hiển thị** |
| - Tạo / Chỉnh sửa / Hủy khoản thu | Có | Chi nhánh mình | **403 Chặn** | **403 Chặn** | **403 Chặn** |
| **3. Phân hệ Thanh toán (`/payments`)** | | | | | |
| - Menu "Thanh toán" trên thanh điều hướng | Hiển thị ("Thanh toán") | Hiển thị ("Thanh toán") | **Ẩn hoàn toàn** | Hiển thị ("Lịch sử TT") | **Ẩn hoàn toàn** |
| - Danh sách giao dịch (`GET /api/Payments`) | Toàn hệ thống | Theo chi nhánh | **403 Chặn** | Chỉ con mình | Chỉ bản thân |
| - Ghi nhận thanh toán trực tiếp (Thu tiền) | **Có (Confirmed)** | **Có (Confirmed)** | **403 Chặn** | Không | **403 Chặn** |
| - Duyệt / Từ chối giao dịch (`PUT .../confirm`) | **Có** | **Chi nhánh mình** | **403 Chặn** | Không | Không |
| - Gửi thanh toán mới (`POST /api/Payments`) | **Confirmed** | **Confirmed** | **403 Chặn** | **PendingConfirm** | **403 Chặn** |
| **4. Phân hệ Khóa học (`/courses`)** | | | | | |
| - Menu "Khóa học" trên thanh điều hướng | Hiển thị | Hiển thị | **Ẩn hoàn toàn** | **Ẩn hoàn toàn** | **Ẩn hoàn toàn** |
| - Truy cập màn hình `/courses` | Cho phép | Cho phép | **Redirect Dashboard** | **Redirect Dashboard** | **Redirect Dashboard** |
| - Tạo / Cập nhật khóa học | Có | Có | **403 Chặn** | **403 Chặn** | **403 Chặn** |
| - Xóa khóa học (`DELETE /api/Courses/{id}`) | **Có (khi an toàn)** | **Có (khi an toàn)** | **403 Chặn** | **403 Chặn** | **403 Chặn** |

---

## 3. KẾT QUẢ KIỂM THỬ CHI TIẾT THEO TỪNG HẠNG MỤC

### 3.1. Hạng mục 1: Chuông thông báo (Notifications) — PASS
1. **API Endpoints & Phân quyền nghiêm ngặt theo UserId: PASS**
   - `NotificationsController.cs` (L16, L20-33, L58-72, L74-90): Mọi câu truy vấn đều gán `n.UserId == UserId`. Người dùng chỉ đọc và thao tác trên thông báo của chính mình.
   - Khi đánh dấu đọc `PUT /api/Notifications/{id}/read`: Kiểm tra `n.Id == id && n.UserId == UserId`, trả về `404 Not Found` nếu không tìm thấy hoặc thông báo thuộc người khác, triệt tiêu nguy cơ lộ ID hay can thiệp chéo.
2. **Giao diện chuông thông báo & Popover (`NotificationBell.jsx`): PASS**
   - Icon chuông hiển thị chuẩn SVG trên Top Header Bar (`AdminLayout.jsx` L348).
   - Badge số lượng chưa đọc: Ẩn hoàn toàn khi `unreadCount === 0`; định dạng `99+` khi `unreadCount > 99` (L219-223).
   - Popover dropdown: Hiển thị danh sách thông báo nổi phía trên giao diện (z-50) kèm hiệu ứng mở mượt mà; hỗ trợ đóng khi click outside và bấm phím Escape (L89-110).
   - Empty state: Hiển thị icon 🔕 "Không có thông báo mới" khi rỗng (L264-273).
   - Đánh dấu đã đọc khi click: Gọi `PUT /api/Notifications/{id}/read`, cập nhật tức thì trạng thái local, đóng popover và điều hướng chính xác đến trang nghiệp vụ tương ứng (`Tuition` → `/tuitions`, `Schedule` → `/schedules`, `Attendance` → `/attendance`, `Grade` → `/grades`, `Newsfeed` → `/newsfeed`...) (L139-192).
   - Đánh dấu đọc tất cả: Nút "Đánh dấu tất cả đã đọc" gọi `PUT /api/Notifications/read-all` và chuyển toàn bộ thông báo về trạng thái đã đọc (L123-136).
3. **Tự động sinh thông báo cho Phụ huynh: PASS**
   - Khi nhân viên ghi nhận thanh toán trực tiếp (`POST /api/Payments`): `PaymentsController.cs` (L206-226) tự động thêm bản ghi `Notification` cho phụ huynh (`tuition.Student.ParentId`) với tiêu đề *"Biên nhận học phí mới"* và nội dung chi tiết số tiền, tên học viên.
   - Khi nhân viên duyệt hoặc từ chối giao dịch chuyển khoản (`PUT /api/Payments/{id}/confirm`): `PaymentsController.cs` (L289-310) tự động tạo thông báo gửi phụ huynh với tiêu đề *"Thanh toán học phí thành công"* hoặc *"Thanh toán học phí bị từ chối"* kèm lý do ghi chú.

---

### 3.2. Hạng mục 2: Phụ huynh xem học phí + gửi thanh toán & Phân quyền Tài chính — PASS
1. **Phụ huynh (`Parent`): PASS**
   - Menu Tài chính: `AdminLayout.jsx` (L158-174) hiển thị mục *"Học phí & Thanh toán"* với 2 liên kết: `/tuitions` (Học phí) và `/payments` (Lịch sử thanh toán).
   - Vào `/tuitions`: Backend `TuitionsController.cs` (L48) lọc strictly `t.Student.ParentId == UserId`. Phụ huynh chỉ thấy danh sách học phí của các con mình, không thấy học viên khác.
   - Banner công nợ gia đình: `Tuitions.jsx` (L297-348) hiển thị banner cao cấp nền xanh gradient đậm *"Tổng quan học phí gia đình"*, cảnh báo số khoản nợ, 3 thẻ tổng học phí - đã nộp - còn nợ.
   - Nút "Thanh toán": Hiển thị ở cả bảng Desktop (L707-717) và Mobile Card (L816-824) đối với khoản thu còn nợ (`remainingAmount > 0` và chưa hủy).
   - Modal nộp học phí trực tuyến (`ParentPaymentModal` L2163-2415):
     - Hiển thị đầy đủ thông tin tài khoản ngân hàng Roxy: Vietcombank, STK `0326538824`, Chủ TK `TRUNG TAM ROXY ACADEMY`, Cú pháp `HP {id} {studentName}` kèm nút Sao chép 1 chạm.
     - Kiểm soát số tiền thanh toán: Không cho nhập <= 0; chặn nộp vượt quá số nợ còn lại; có phiên âm số tiền thành chữ tiếng Việt (`numberToVietnameseWords`).
     - Gửi yêu cầu qua `POST /api/Payments`: Tạo bản ghi với trạng thái `PendingConfirm` (L183: `IsStaff ? "Confirmed" : "PendingConfirm"`), chờ nhân viên kiểm tra sao kê.
2. **Nhân sự (`SuperAdmin` / `BranchManager`): PASS**
   - Nút "Tạo khoản thu" và "Ghi nhận thanh toán" / "Thu tiền nhanh": Chỉ hiển thị cho staff (`canManage = isSuperAdmin || isBranchManager`).
   - Duyệt giao dịch (`Payments.jsx` L509-530): Cụm nút "✓ Duyệt" và "✕ Từ chối" chỉ hiển thị cho staff khi giao dịch ở trạng thái `PendingConfirm`.
   - Kiểm tra overpay nghiêm ngặt: `PaymentsController.cs` (L160-178 và L258-274) kiểm tra tổng số tiền đã đóng không được vượt quá số phải thu (`netAmount`), ngăn ngừa lỗi trigger `TR_Payments_NoOverpay`.
   - Tự động lưu vết người duyệt (`ConfirmedBy = UserId`, `ConfirmedAt = DateTime.UtcNow`) thỏa mãn ràng buộc `CK_Payments_Reviewed`.
3. **Học viên (`Student`): PASS**
   - Menu Sidebar: `AdminLayout.jsx` (L167) chỉ hiện liên kết `/tuitions` ("Học phí"), ẩn hoàn toàn mục "Thanh toán" (`/payments`).
   - Vào `/tuitions`: Backend lọc `t.Student.UserId == UserId` (L52). Học viên chỉ thấy học phí của chính mình; giao diện hiển thị 3 thẻ thống kê đơn giản (L350-363).
   - Không có nút thanh toán: Học viên KHÔNG thấy nút "Thanh toán" hay "Thu tiền", chỉ có nút xem chi tiết `👁️` (L706-731).
   - Backend chặn cứng 403: `PaymentsController.cs` (L137-139) kiểm tra nếu `Role == "Student"` lập tức trả về `403 Forbidden` kèm thông báo *"Học viên chỉ có quyền xem học phí, không được phép thực hiện giao dịch thanh toán. Vui lòng liên hệ phụ huynh hoặc trung tâm."*.
4. **Giáo viên (`Teacher`): PASS**
   - Menu Sidebar: `AdminLayout.jsx` (L158) ẩn toàn bộ nhóm Tài chính / Sổ quỹ đối với giáo viên (`!isTeacher`).
   - Backend chặn cứng 403: `TuitionsController.cs` (L28, L167) và `PaymentsController.cs` (L27, L89, L133, L238) chặn `Forbid()` (403) trên toàn bộ endpoints đọc/ghi tài chính.
   - Giao diện chặn an toàn: Cả `Tuitions.jsx` (L216-244) và `Payments.jsx` (L194-222) đều trang bị màn hình chặn 403 chuyên biệt với icon 🚫 và nút quay về Lớp học / Thời khóa biểu.

---

### 3.3. Hạng mục 3: Quản lý Khóa học (`/courses`) — PASS
1. **Phân quyền truy cập: PASS**
   - Thanh điều hướng: `AdminLayout.jsx` (L96-101) chỉ hiển thị menu "Khóa học" cho SuperAdmin và BranchManager (`isStaff`).
   - Bảo vệ màn hình: `Courses.jsx` (L105-107) tự động redirect các vai trò khác (`Teacher`, `Parent`, `Student`) về `/dashboard`.
   - Backend: Các API tạo (`POST`), sửa (`PUT`), xóa (`DELETE`) đều có thuộc tính `[Authorize(Roles = "SuperAdmin,BranchManager")]` (L35, L62, L85).
2. **CRUD Khóa học hoàn chỉnh: PASS**
   - Tạo mới khóa học (`CourseFormModal` L503-741): Nhập tên, mã khóa học, mô tả, số buổi học, học phí tiêu chuẩn (có phiên âm tiếng Việt), trạng thái hoạt động. Bắt lỗi trùng mã khóa học với mã lỗi `409 Conflict` (L41, L572).
   - Đọc & Hiển thị danh sách: Thống kê 3 thẻ KPI (Tổng số, Đang kích hoạt, Tạm ngưng); ô tìm kiếm theo tên hoặc mã khóa; 3 tab lọc trạng thái (Tất cả, Đang kích hoạt, Tạm ngưng); hỗ trợ hiển thị kép Desktop Table và Mobile Card stack (L281-432).
   - Cập nhật khóa học: Form cập nhật đầy đủ thông tin, kiểm tra không bị trùng mã với khóa khác (`409 Conflict`).
3. **Ràng buộc xóa an toàn nghiệp vụ: PASS**
   - `CoursesController.cs` (L91-96):
     ```csharp
     bool hasActiveClasses = await db.Classes.AnyAsync(c => c.CourseId == id && (c.Status != "Finished" || c.IsOpenForRegistration));
     if (hasActiveClasses)
     {
         return BadRequest(new { message = "Không thể xóa khóa học đang có lớp học đang mở hoặc đang diễn ra." });
     }
     course.IsActive = false;
     await db.SaveChangesAsync();
     return NoContent();
     ```
   - Nếu khóa học đang có lớp chưa kết thúc (`Status != "Finished"`) hoặc đang mở đăng ký (`IsOpenForRegistration == true`), backend chặn xóa bằng mã `400 Bad Request`.
   - Nếu an toàn, hệ thống thực hiện xóa mềm (`IsActive = false`), giữ nguyên lịch sử dữ liệu liên kết.
   - Frontend `Courses.jsx` (L119-139, L451-497) hiển thị Modal xác nhận cảnh báo nguy hiểm và bắt chính xác thông báo lỗi nghiệp vụ từ API để hiển thị cho người dùng.

---

## 4. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

### ✅ LỖI 1 (BLOCKER — ĐÃ KHẮC PHỤC TRIỆT ĐỂ / RESOLVED): Vi phạm quy tắc React Hook (`react-hooks/rules-of-hooks`) trong `Courses.jsx`
- **Mã lỗi Lint:** `react-hooks/rules-of-hooks`
- **Mô tả ban đầu:** `useMemo` được gọi sau câu lệnh early return `if (!isStaff) return ...`.
- **Khắc phục:** Frontend sub-agent đã di chuyển hai hook `useMemo` (`stats` và `filteredCourses`) lên trước câu lệnh early return (L77, L85 trước L105).
- **Kết quả Re-test:** **PASS** (chạy `npm run lint` đạt 0 error).

---

### ✅ LỖI 2 (MINOR — ĐÃ KHẮC PHỤC / RESOLVED): Cảnh báo `setState` đồng bộ trong `useEffect` (`react-hooks/set-state-in-effect`)
- **Mã lỗi Lint:** `react-hooks/set-state-in-effect`
- **Mô tả ban đầu:** Gọi `setState` đồng bộ ngay đầu `useEffect` khi gọi `fetchNotifications()` / `fetchCourses()`.
- **Khắc phục:** Frontend sub-agent đã chuẩn hóa pattern khai báo fetcher bên trong `useEffect` với cờ hủy `let ignore = false;` ở cả `Courses.jsx` và `NotificationBell.jsx`.
- **Kết quả Re-test:** **PASS** (chạy `npm run lint` đạt 0 warning).

---

### Thống kê lỗi hiện tại:
- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

- **Nghiệp vụ, Thiết kế & Bảo mật API/RBAC:** **ĐẠT (PASS 100%)** — Toàn bộ logic chuông thông báo, gửi và duyệt thanh toán học phí, bảo mật công nợ và ràng buộc xóa khóa học an toàn đều được xây dựng chặt chẽ, khớp 100% tài liệu `docs/API.md` và `docs/DESIGN.md`.
- **Biên dịch & Lint hệ thống:** **ĐẠT (PASS 100%)** — Backend (`net9.0`) 0 lỗi, Frontend `npm run lint` 0 lỗi 0 cảnh báo, `npm run build` Vite built 105 modules trong 366ms.
- **Chất lượng mã nguồn (Code Quality):** **ĐẠT (PASS 100%)** — Không còn vi phạm Rules of Hooks, không hard-code localhost, không lộ thông tin nhạy cảm.

> [!TIP]
> **KẾT QUẢ NGHIỆM THU: ĐẠT CHUẨN NGHIỆM THU (PASSED 100%)**  
> Toàn bộ 4 nhóm tiêu chí (Chuông thông báo, Tài chính & Học phí, Quản lý Khóa học, Biên dịch/Linting/RBAC) đều đạt chuẩn nghiệm thu theo `GEMINI.md`. Không còn lỗi chặn.  
> **HỆ THỐNG ĐÃ SẴN SÀNG ĐỂ BÀN GIAO CHO DEPLOY SUB-AGENT.**


---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1M-2 (SỬA CÁC LUỒNG CHƯA HỢP LÝ TRƯỚC GO-LIVE — GUARDRAIL UX & EDGE CASES)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/DESIGN.md` (Mục 16), `docs/API.md` (Mục 4, 5, 6, 7, 9, 12), `RoxyAppDB.sql`  
**Phạm vi kiểm thử:**
1. Xóa/sửa/tạo lớp & Ràng buộc phụ thuộc (`ClassesController.cs`, `ClassDtos.cs`, `ClassList.jsx`, `docs/API.md`)
2. Đơn xin nghỉ của giáo viên & Hủy đơn đã duyệt (`LeaveRequestsController.cs`, `LeaveRequestDtos.cs`, `LeaveRequests.jsx`, `Schedules.jsx`, `docs/API.md`)
3. Thanh toán trùng chờ duyệt, Hủy (Void) thanh toán & Cấm hủy học phí đã thu (`PaymentsController.cs`, `TuitionsController.cs`, `PaymentDtos.cs`, `TuitionDtos.cs`, `Tuitions.jsx`, `Payments.jsx`, `docs/API.md`)
4. Nộp lại bài tập không xóa điểm & nhận xét cũ (`HomeworkSubmissionsController.cs`, `Homeworks.jsx`, `docs/API.md`)
5. Kiểm tra cấu hình seed SuperAdmin ở Production (`Program.cs`, `docs/API.md`)
6. Kiểm tra Build, Lint & An toàn chung (`RoxyAppDB.sql`, localhost, migrations)

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT VÀ KIỂM TRA AN TOÀN HỆ THỐNG

| Thành phần | Lệnh thực thi / Phương thức | Kết quả | Chi tiết đối chiếu |
| :--- | :--- | :---: | :--- |
| **Database Schema** | `git diff RoxyAppDB.sql` & kiểm tra thư mục `Migrations` | **PASS** | 0 thay đổi trên `RoxyAppDB.sql`, không tạo EF Migration mới |
| **Backend Build** | `dotnet build` tại `RoxyAppBE/RoxyAcademy.Api/` | **PASS** | **0 Warning(s), 0 Error(s)**, target `net9.0` (đã dừng `RoxyAcademy.Api` trước khi build) |
| **Frontend Lint** | `npm run lint` tại `roxy-admin/` | **PASS** | **0 problems (0 errors, 0 warnings)** |
| **Frontend Build** | `npm run build` tại `roxy-admin/` | **PASS** | **0 Error(s)**, Vite production build transformed 105 modules trong 296ms |
| **Kiểm tra Localhost** | Quét `roxy-admin/src/**/*.jsx` & `Controllers/*.cs` | **PASS** | 0 hard-code `localhost` trong code sản phẩm |

---

## 2. BẢNG TỔNG HỢP CHECKLIST KIỂM THỬ GIAI ĐOẠN 1M-2

| STT | Hạng mục kiểm tra | Tiêu chí nghiệm thu | Kết quả | Dẫn chứng file & dòng code cụ thể |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Xóa/Đóng lớp (`DELETE /Classes/{id}`)** | - Chặn `400 Bad Request` khi còn: (1) học viên `Active`, (2) lịch học tương lai `Scheduled`, (3) bài tập chưa kết thúc/chấm xong, (4) học phí chưa thu đủ; trả về cả `message` và mảng `reasons`.<br>- UI mở `Blocking Dependencies Modal` liệt kê rõ từng lý do (không dùng `window.alert`). | **PASS** | - `ClassesController.cs` L249-312<br>- `ClassList.jsx` L54, L340-376, L2099-2190<br>- `docs/API.md` L1052-1070 |
| **2** | **Sửa lớp (`PUT /Classes/{id}`) & Tạo lớp (`POST /Classes`)** | - Hạ `MaxStudents < activeStudentsCount` bị chặn ở cả Backend (`400`) & UI inline validation.<br>- Gán giáo viên đã khóa (`IsActive == false`) bị chặn.<br>- Đổi `Status` từ `Finished` → `Ongoing`/`Upcoming` bị chặn.<br>- Đổi `TuitionFee` khi đã có học phí phát sinh (`!IsCancelled`) bị chặn.<br>- Tạo lớp kiểm tra `Course.IsActive` và `Branch.IsActive`. | **PASS** | - `ClassesController.cs` L117-135, L176-223<br>- `ClassDtos.cs` L24<br>- `ClassList.jsx` L202-203, L280-294, L868-882, L1047-1106, L1131-1181, L1219-1235, L1281-1285<br>- `docs/API.md` L1031-1049 |
| **3** | **Đơn xin nghỉ của Giáo viên (`PUT /LeaveRequests/{id}/review`)** | - Khi duyệt (`Approved`) đơn nghỉ của GV: nếu GV là `SubstituteTeacherId` thì gỡ `null`; nếu buổi học `Scheduled` chưa có GV dạy thay thì chuyển sang `Cancelled` kèm tag `[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{id}]`.<br>- Hiển thị rõ cảnh báo trên `LeaveRequests.jsx` và badge `⚠️ Cần GV dạy thay` trên `Schedules.jsx`. | **PASS** | - `LeaveRequestsController.cs` L556-616<br>- `LeaveRequests.jsx` L1057-1061, L1758-1767<br>- `Schedules.jsx` L425-429<br>- `docs/API.md` L823-827 |
| **4** | **Hủy đơn xin nghỉ đã duyệt (`PUT /LeaveRequests/{id}/cancel`)** | - Cho phép `SuperAdmin`/`BranchManager` hủy đơn `Approved` (bắt buộc nhập lý do `Reason`).<br>- Đơn Học viên: hoàn tác điểm danh `ExcusedAbsent` về trạng thái cũ (`[Prev:...]`) hoặc xóa bản ghi nếu trước đó chưa điểm danh (`[Prev:NONE]`).<br>- Đơn Giáo viên: khôi phục buổi học từ `Cancelled` về `Scheduled` và gỡ tag khỏi `Schedule.Note`. | **PASS** | - `LeaveRequestsController.cs` L521-530, L637-793<br>- `LeaveRequestDtos.cs` L62-69<br>- `LeaveRequests.jsx` L460, L530-593, L1130-1139, L1258-1266, L1859-1867, L1918-2002<br>- `docs/API.md` L848-872 |
| **5** | **Chặn nộp trùng chờ duyệt (`PendingConfirm`) & Hủy (Void) thanh toán** | - `POST /Payments` tính `availableToPay = netAmount - currentConfirmedPaid - currentPendingPaid`; chặn `400` nếu nộp vượt.<br>- `TuitionDto` trả kèm `PendingAmount`; Frontend tính `payableAmount = remainingAmount - pendingAmount` ở cả 3 modal thanh toán.<br>- `PUT /Payments/{id}/cancel` (và `/void`) cho phép `SuperAdmin`/`BranchManager` hủy giao dịch `PendingConfirm` kèm lý do bắt buộc, có nút và modal trên cả `Payments.jsx` & `Tuitions.jsx`. | **PASS** | - `PaymentsController.cs` L160-192, L334-395<br>- `TuitionsController.cs` L122, L158, L196, L245<br>- `TuitionDtos.cs` L26, `PaymentDtos.cs` L57-64<br>- `Tuitions.jsx` L647-653, L1063-1093, L1176-1189, L1286-1369, L2070-2102, L2354-2406<br>- `Payments.jsx` L58-64, L189-221, L570-578, L670-676, L782-853, L909-959<br>- `docs/API.md` L286-290, L425-434, L494-515 |
| **6** | **Cấm hủy học phí (`IsCancelled = true`) khi đã thu tiền** | - Backend `PUT /Tuitions/{id}` chặn `400 Bad Request` khi `req.IsCancelled && paidAmount > 0` (và khi còn `PendingConfirm`).<br>- Frontend `EditTuitionModal` disable checkbox `isCancelled` kèm thông báo giải thích rõ ràng. | **PASS** | - `TuitionsController.cs` L325-347<br>- `Tuitions.jsx` L1821-1822, L1991-2020<br>- `docs/API.md` L336-339 |
| **7** | **Nộp lại bài tập không xóa điểm & nhận xét cũ** | - `PUT /HomeworkSubmissions/{id}/submit` giữ nguyên `Score`, `TeacherFeedback`, `ReviewedAt` cũ, chỉ cập nhật bài nộp mới và đặt `Status = "Submitted"`.<br>- Frontend `Homeworks.jsx` hiển thị cảnh báo *"Nộp lại sẽ gửi lại cho giáo viên chấm, điểm cũ và nhận xét cũ vẫn được giữ nguyên cho tới khi giáo viên chấm lại"* và hiển thị điểm + lời phê cũ ở cả màn hình Học viên/Phụ huynh lẫn Giáo viên khi bài đang `Submitted`. | **PASS** | - `HomeworkSubmissionsController.cs` L189-202<br>- `Homeworks.jsx` L652-667, L1517-1522, L1604-1611, L1676-1716, L1930-2008, L2017-2024<br>- `docs/API.md` L649-671 |
| **8** | **Cấu hình Seed `SuperAdmin` ở Production** | - Chỉ seed khi có `Seed:AdminPassword`.<br>- Ghi `LogWarning` (`CẢNH BÁO BẢO MẬT [PRODUCTION]`) khi `Seed:AdminPassword` tồn tại / chạy trên môi trường không phải Development.<br>- `docs/API.md` Mục 12 có checklist xóa `Seed:AdminPassword` khỏi `web.config` / biến môi trường sau lần đăng nhập đầu tiên. | **PASS** | - `Program.cs` L96-135<br>- `docs/API.md` L1251-1263 |

---

## 3. PHÂN TÍCH CHI TIẾT TỪNG LUỒNG NGHIỆP VỤ

### 3.1. Luồng 1: Xóa / Sửa / Tạo Lớp học (`ClassesController.cs`, `ClassDtos.cs`, `ClassList.jsx`) — PASS
- **Đóng/xóa lớp (`DELETE /api/Classes/{id}`):**
  - Kiểm tra đủ 4 điều kiện độc lập: học viên `Active` (`activeEnrollmentsCount`), lịch học tương lai `Scheduled` (`futureSchedulesCount`), bài tập chưa hết hạn hoặc còn bài nộp chưa `Reviewed` (`unfinishedHomeworksCount`), và khoản học phí chưa thu đủ (`unpaidTuitionsCount`).
  - Trả về `400 Bad Request` chứa cả chuỗi tổng hợp `message` và mảng `reasons`.
  - Trên `ClassList.jsx`, thao tác bấm **Đóng lớp** mở modal xác nhận và khi bị chặn sẽ hiển thị danh sách bullet (`<ul className="list-disc">`) liệt kê từng lý do trong modal, tuyệt đối không dùng `window.alert`.
- **Sửa lớp (`PUT /api/Classes/{id}`) & Tạo lớp (`POST /api/Classes`):**
  - `ClassDto` trả kèm `ActiveStudentsCount`.
  - Khi tạo lớp mới: kiểm tra `Course.IsActive`, `Branch.IsActive`, và `Teacher.IsActive`.
  - Khi sửa lớp: chặn hạ `MaxStudents < activeStudentsCount` (cả Backend `400` và UI inline validation + disable nút Lưu); chặn gán giáo viên `IsActive == false`; chặn mở lại lớp đã `Finished` (dropdown `status` bị `disabled` trên UI và chặn `400` ở Backend); chặn đổi `TuitionFee` khi lớp đã có bản ghi `Tuitions` chưa hủy.

### 3.2. Luồng 2: Đơn xin nghỉ của Giáo viên & Hủy đơn đã duyệt (`LeaveRequestsController.cs`, `LeaveRequests.jsx`, `Schedules.jsx`) — PASS
- **Duyệt đơn nghỉ của Giáo viên (`PUT /api/LeaveRequests/{id}/review`):**
  - Khi `req.Status == "Approved"` và `leave.TeacherId.HasValue`, Backend tìm các buổi học liên quan: nếu giáo viên xin nghỉ đang là `SubstituteTeacherId` thì gỡ về `null`; nếu buổi học đang `Scheduled` và không có giáo viên dạy thay thì chuyển `Status = "Cancelled"` và nối tag `[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{leave.Id}]` vào `Schedule.Note`.
  - Trên `LeaveRequests.jsx`, modal duyệt đơn của giáo viên hiển thị hộp cảnh báo màu hổ phách giải thích rõ cơ chế tự động chuyển buổi học sang `Cancelled` (Cần giáo viên dạy thay).
  - Trên `Schedules.jsx`, thẻ buổi học có ghi chú `CẦN GIÁO VIÊN DẠY THAY` hiển thị nổi bật badge `⚠️ Cần GV dạy thay` bên cạnh badge trạng thái.
- **Hủy đơn đã duyệt (`PUT /api/LeaveRequests/{id}/cancel`):**
  - Chỉ `SuperAdmin` và `BranchManager` (đúng chi nhánh) được hủy đơn ở trạng thái `Approved`, bắt buộc phải có lý do (`cancelReason`), nếu thiếu trả về `400 Bad Request`.
  - Khi duyệt đơn Học viên trước đó, hệ thống lưu hậu tố `[Prev:{prevStatus}]` (hoặc `[Prev:NONE]`) trong `Attendance.Note`. Khi hủy đơn đã duyệt: nếu có trạng thái cũ hợp lệ thì khôi phục `att.Status = restoredStatus`, nếu là `[Prev:NONE]` thì xóa bản ghi `Attendance` để về trạng thái chưa điểm danh.
  - Khi hủy đơn đã duyệt của Giáo viên: khôi phục các buổi học bị ảnh hưởng từ `Cancelled` về `Scheduled` và xóa tag `[CẦN GIÁO VIÊN DẠY THAY ...]` khỏi `Schedule.Note`.

### 3.3. Luồng 3: Thanh toán trùng chờ duyệt, Hủy (Void) thanh toán & Cấm hủy học phí đã thu (`PaymentsController.cs`, `TuitionsController.cs`, `Tuitions.jsx`, `Payments.jsx`) — PASS
- **Chặn nộp trùng khi đang có giao dịch `PendingConfirm`:**
  - `POST /api/Payments` tính `availableToPay = Math.Max(0m, netAmount - currentConfirmedPaid - currentPendingPaid)`. Nếu `availableToPay <= 0` hoặc `req.Amount > availableToPay` thì chặn ngay bằng `400 Bad Request` kèm thông tin chi tiết số tiền đã xác nhận và số tiền đang chờ duyệt.
  - `GET /api/Tuitions` và `GET /api/Tuitions/{id}` trả thêm `PendingAmount` trong `TuitionDto`.
  - Trên `Tuitions.jsx` và `Payments.jsx`, cả 3 modal (`ParentPaymentModal`, `QuickPayModal`, `RecordPaymentModal`) đều tính `payableAmount = Math.max(0, remainingAmount - pendingAmount)`, giới hạn `max={payableAmount}` và hiển thị hộp cảnh báo màu vàng cam khi `pendingAmount > 0`.
- **Hủy (Void) giao dịch `PendingConfirm` (`PUT /api/Payments/{id}/cancel` hoặc `/void`):**
  - Cho phép `SuperAdmin` và `BranchManager` (đúng chi nhánh) hủy giao dịch đang ở trạng thái `PendingConfirm`, bắt buộc nhập lý do (`Reason` hoặc `Note`), lưu `[Hủy giao dịch]: {reason}` và gửi thông báo cho phụ huynh.
  - Có nút `🚫 Hủy (Void)` và modal nhập lý do bắt buộc trên cả trang `Payments.jsx` lẫn bảng lịch sử thanh toán trong `TuitionDetailModal` (`Tuitions.jsx`).
- **Cấm hủy khoản học phí đã có tiền thu (`paidAmount > 0`):**
  - Backend `PUT /api/Tuitions/{id}` chặn `400 Bad Request` nếu `req.IsCancelled && paidAmount > 0` (cũng như khi còn giao dịch `PendingConfirm`).
  - Frontend `EditTuitionModal` khóa checkbox `disabled={hasConfirmedPayments || hasPendingPayments}` kèm hộp giải thích rõ số tiền đã xác nhận / đang chờ xác nhận.

### 3.4. Luồng 4: Nộp lại bài tập không xóa điểm (`HomeworkSubmissionsController.cs`, `Homeworks.jsx`) — PASS
- Backend `PUT /api/HomeworkSubmissions/{id}/submit` chỉ cập nhật `SubmissionUrl`, `StudentNote`, `Status = "Submitted"`, `SubmittedAt = DateTime.UtcNow`, hoàn toàn không gán `null` vào `Score`, `TeacherFeedback` hay `ReviewedAt`, đồng thời trả lại `score`, `teacherFeedback`, `reviewedAt` trong response.
- Frontend `Homeworks.jsx`:
  - Hiển thị hộp cảnh báo màu vàng cam trong form nộp lại: *"Lưu ý: Nộp lại sẽ gửi lại cho giáo viên chấm, điểm cũ và nhận xét cũ vẫn được giữ nguyên cho tới khi giáo viên chấm lại."*
  - Ở cả màn hình Học viên/Phụ huynh (`KẾT QUẢ CHẤM LẦN TRƯỚC`) lẫn màn hình Giáo viên chấm bài (`📋 Điểm & Nhận xét lần chấm trước` + badge danh sách trái `Điểm cũ: X/10`), điểm số và lời phê cũ đều được hiển thị đầy đủ khi bài đang ở trạng thái `Submitted` chờ chấm lại.

### 3.5. Luồng 5: Cấu hình Seed `SuperAdmin` ở Production (`Program.cs`, `docs/API.md`) — PASS
- `Program.cs` (L96-135) chỉ chạy khối seed khi `!string.IsNullOrWhiteSpace(seedPassword)`.
- Khi `!app.Environment.IsDevelopment()`, ứng dụng ghi `app.Logger.LogWarning("CẢNH BÁO BẢO MẬT [PRODUCTION]: Cấu hình 'Seed:AdminPassword' vẫn đang tồn tại trên môi trường Production...")`.
- `docs/API.md` (Mục 12, L1251-1263) ghi rõ quy trình 3 bước khi Go-Live Production, yêu cầu xóa ngay `Seed:AdminPassword` (`Seed__AdminPassword`) khỏi `web.config` / biến môi trường sau lần đăng nhập `SuperAdmin` đầu tiên.

---

## 4. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 6 nhóm tiêu chí nghiệm thu của **Giai đoạn 1M-2 (Sửa các luồng chưa hợp lý trước Go-Live)** đều **ĐẠT (PASS 100%)** cả ở Backend, Frontend lẫn Tài liệu (`docs/API.md`, `docs/DESIGN.md`). Không phát sinh lỗi biên dịch hay cảnh báo ESLint.

**Trạng thái nghiệm thu Giai đoạn 1M-2:** **ĐẠT CHUẨN NGHIỆM THU (PASSED 100%)** — Sẵn sàng bàn giao cho Deploy Agent.

---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1N-1 (PHỤ HUYNH CẬP NHẬT THÔNG TIN LIÊN HỆ HỌC VIÊN & HỒ SƠ CÁ NHÂN)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Ngày kiểm thử:** 17/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/DESIGN.md`, `docs/API.md`, `RoxyAppDB.sql`  
**Phạm vi kiểm thử:**
- Backend: `RoxyAppBE/RoxyAcademy.Api/Controllers/StudentsController.cs`, `RoxyAppBE/RoxyAcademy.Api/Dtos/StudentDtos.cs`, `RoxyAppBE/RoxyAcademy.Api/Controllers/AuthController.cs`, `RoxyAppBE/RoxyAcademy.Api/Dtos/AuthDtos.cs`
- Frontend: `roxy-admin/src/pages/Students.jsx`, `roxy-admin/src/components/ProfileModal.jsx`, `roxy-admin/src/layouts/AdminLayout.jsx`

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT & KIỂM TRA MÔI TRƯỜNG RUNTIME

| Thành phần | Lệnh thực thi / Phương thức | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build --no-restore` tại `RoxyAppBE/RoxyAcademy.Api/` | **PASS** | **0 Warning(s), 0 Error(s)**, target `net9.0` (`RoxyAcademy.Api.dll` built in 1.21s) |
| **Frontend Lint** | `npm --prefix roxy-admin run lint` (`eslint .`) | **PASS** | **0 Error(s), 0 Warning(s)** |
| **Frontend Build** | `npm --prefix roxy-admin run build` (`vite build`) | **BỊ CHẶN SANDBOX (EPERM)** | Không chạy được trong sandbox do lỗi quyền ghi file tạm `EPERM: operation not permitted, open '.../node_modules/.vite-temp/vite.config.js.timestamp-*.mjs'`. (Theo ghi nhận bàn giao từ agent trước ngoài sandbox: `npm run build` đã pass 0 error). |
| **API Runtime Test** | `dotnet run --no-build --urls http://127.0.0.1:5199` + `curl.exe` | **CHƯA CHẠY ĐƯỢC TRONG SANDBOX** | Sandbox chặn bind port / kết nối mạng local & MSSQL (`curl.exe` exit code 1, không kết nối được `127.0.0.1:5199`). Đã dừng tiến trình `dotnet run` ngay sau khi kiểm tra. Toàn bộ logic API được đối chiếu chi tiết từng dòng code bên dưới. |
| **Hard-code `localhost` & `[CẦN XÁC MINH]`** | Quét 7 file Backend & Frontend trong phạm vi | **PASS** | **0** kết quả `localhost` hoặc `[CẦN XÁC MINH]`. |

---

## 2. BẢNG TỔNG HỢP CHECKLIST 5 HẠNG MỤC BẮT BUỘC (GIAI ĐOẠN 1N-1)

| STT | Hạng mục kiểm tra | Tiêu chí nghiệm thu | Kết quả (Code Audit) | Dẫn chứng file & dòng code cụ thể |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Phụ huynh sửa `School`, `Grade`, `AvatarUrl` của con & `PhoneNumber`, `Email`, `AvatarUrl` của chính mình** | - `PUT /api/Students/{id}` cho phép role `Parent` sửa `School`, `Grade`, `AvatarUrl` của con mình (không bắt buộc gửi `FullName`).<br>- `PUT /api/Auth/me` cho phép user đã đăng nhập (bao gồm `Parent`) sửa `PhoneNumber` (`^0\d{9}$`, kiểm tra trùng `409 Conflict`), `Email`, `AvatarUrl`, trả về `UserInfo` mới. | **PASS** | - `StudentsController.cs` L199-219<br>- `StudentDtos.cs` L43-65 (`FullName` là `string?`, không `[Required]`)<br>- `AuthController.cs` L44-76 (`Me`, `UpdateMe`, `ToInfo`)<br>- `AuthDtos.cs` L14-38 (`UserInfo`, `UpdateMeRequest`) |
| **2** | **Phụ huynh gửi `FullName` / `Status` / `Note` / `DOB` / `Gender` / `BranchId` khác đi ở `PUT /api/Students/{id}` thì Backend không ghi nhận** | - Khi `Role == "Parent"`, backend chỉ gán `School`, `Grade`, `AvatarUrl`, `UpdatedAt` rồi `SaveChangesAsync()` và `return NoContent()`, bỏ qua hoàn toàn các trường nhạy cảm/quản trị khác. | **PASS** | - `StudentsController.cs` L203-219: Nhánh `if (Role == "Parent")` chỉ cập nhật `ownStudent.School`, `ownStudent.Grade`, `ownStudent.AvatarUrl`, `ownStudent.UpdatedAt` (L212-215) và thoát sớm bằng `return NoContent();` (L218), không đi xuống khối staff (L221-264). |
| **3** | **Phụ huynh sửa hồ sơ con người khác (`student.ParentId != UserId`) bị chặn `403 Forbidden`** | - Kiểm tra `ownStudent.ParentId != User.GetUserId()` và trả về HTTP `403 Forbidden`. | **PASS** | - `StudentsController.cs` L205-209: `if (ownStudent.ParentId != User.GetUserId()) return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền chỉnh sửa thông tin học viên này." });` |
| **4** | **`SuperAdmin` và `BranchManager` vẫn sửa đầy đủ như cũ ở `PUT /api/Students/{id}`** | - Giữ nguyên kiểm tra `VisibleStudents()`, bắt buộc `FullName`, validate `DOB`, cập nhật `Gender`, `Note`, `BranchId` (chỉ `SuperAdmin`, kiểm tra đăng ký lớp), `Status` (`ApplyStatusAsync`) trong transaction. | **PASS** | - `StudentsController.cs` L221-264 |
| **5** | **Frontend `Students.jsx`, `ProfileModal.jsx`, `AdminLayout.jsx`** | - `Students.jsx`: Phụ huynh thấy nút `"Cập nhật thông tin liên hệ"`, form modal chỉ có 3 trường `AvatarUrl`, `School`, `Grade` (không hiện họ tên, ngày sinh, giới tính, ghi chú, chi nhánh, trạng thái).<br>- `ProfileModal.jsx` + `AdminLayout.jsx`: Phụ huynh mở modal hồ sơ cá nhân từ sidebar/header/mobile drawer, sửa được `PhoneNumber`, `Email`, `AvatarUrl` (không hiện/sửa `Role`, `BranchId`, `IsActive`). | **PASS** | - `Students.jsx` L136-201, L1225-1235, L1564-1572, L2239-2371<br>- `ProfileModal.jsx` L52-345 (L214-237 card read-only, L252-339 form 3 trường)<br>- `AdminLayout.jsx` L4, L10-11, L77-96, L247-260, L300-314, L387-397, L420-427 |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT)

### 3.1. Backend (`StudentsController.cs`, `StudentDtos.cs`, `AuthController.cs`, `AuthDtos.cs`)
1. **`PUT /api/Students/{id}` (`StudentsController.cs` L199-265, `StudentDtos.cs` L43-65):**
   - Attribute `[Authorize(Roles = "SuperAdmin,BranchManager,Parent")]` cho phép `Parent` gọi endpoint.
   - `UpdateStudentRequest.FullName` đổi sang `string?` (bỏ `[Required]`) để payload 3 trường từ `Parent` không bị lỗi model validation 400; đồng thời nhánh `SuperAdmin`/`BranchManager` vẫn kiểm tra `string.IsNullOrWhiteSpace(req.FullName)` ở L224-225.
   - Nhánh `if (Role == "Parent")` (L203-219) tìm học viên theo `id`, trả `404` nếu không tồn tại, trả `403 Forbidden` nếu `ownStudent.ParentId != User.GetUserId()`, và chỉ cập nhật `School`, `Grade`, `AvatarUrl`, `UpdatedAt` rồi trả `204 No Content`. Mọi trường khác (`FullName`, `DOB`, `Gender`, `Note`, `Status`, `BranchId`) nếu bị gửi kèm đều bị bỏ qua hoàn toàn.
   - Nhánh Staff (L221-264) giữ nguyên toàn bộ logic cũ, có `BeginTransactionAsync()`, `VisibleStudents()`, `ApplyStatusAsync()`, và chuyển cơ sở cho `SuperAdmin`.
2. **`GET/PUT /api/Auth/me` (`AuthController.cs` L44-76, `AuthDtos.cs` L14-38):**
   - `UserInfo` bổ sung `PhoneNumber`, `Email`, `AvatarUrl` (L14-23), được trả về đồng nhất ở `Login`, `Me`, và `UpdateMe`.
   - `UpdateMeRequest` validate `PhoneNumber` (`[Required]`, `^0\d{9}$`), `Email` (`[EmailAddress]`, max 150), `AvatarUrl` (max 500).
   - `UpdateMe` kiểm tra user tồn tại & `IsActive`, kiểm tra trùng SĐT với user khác (`409 Conflict`), chỉ cập nhật `PhoneNumber`, `Email`, `AvatarUrl`, `UpdatedAt` và trả `200 OK` với `UserInfo` mới. Không cho phép thay đổi `Role`, `BranchId`, `IsActive`, `FullName`.

### 3.2. Frontend (`Students.jsx`, `ProfileModal.jsx`, `AdminLayout.jsx`)
1. **`Students.jsx`:**
   - Trong bảng danh sách (L1226-1235) và modal chi tiết học viên (L1564-1572), chỉ khi `isParent` mới hiển thị nút `"Cập nhật thông tin liên hệ"`. Nút `"Sửa"` của staff (L1214-1223) ẩn với `Parent`.
   - Modal `parentEditOpen` (L2240-2371) hiển thị tiêu đề + tên/mã học viên ở dạng read-only, và form chỉ có đúng 3 trường: `Ảnh đại diện (URL)` (kèm live preview `StudentAvatar`), `Trường học`, `Khối / Lớp`. Không có trường họ tên, ngày sinh, giới tính, ghi chú nội bộ, chi nhánh, trạng thái.
   - `handleSubmitParentEdit` (L158-201) kiểm tra URL `http://`/`https://` nếu có nhập, gửi `PUT /Students/${parentEditStudent.id}` chỉ với `{ school, grade, avatarUrl }`, cập nhật lại state `selectedStudent` (nếu đang mở modal chi tiết) và reload danh sách.
2. **`ProfileModal.jsx` & `AdminLayout.jsx`:**
   - `AdminLayout.jsx` gắn sự kiện mở `ProfileModal` tại cả 3 vị trí: footer sidebar desktop (L247-260), mobile drawer (L300-314), và top header bar (L387-397), đồng thời hiển thị avatar từ `user.avatarUrl` (L77-96).
   - `ProfileModal.jsx` gọi `GET /Auth/me` khi mở, hiển thị phần trên read-only (Avatar, `FullName`, badge `Role`), phần dưới là form chỉ gồm 3 trường: `Số điện thoại *`, `Email (tùy chọn)`, `Ảnh đại diện (URL) (tùy chọn)`. Không hiển thị hay cho sửa `Role`, `BranchId`, `IsActive`.
   - Khi lưu (`PUT /Auth/me`), cập nhật `localStorage.setItem('user', ...)` và gọi `onUserUpdated(updatedUser)` để đồng bộ ngay trên `AdminLayout`.

---

## 4. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**
- **Lưu ý môi trường kiểm thử:** Trong sandbox hiện tại, `vite build` bị chặn ghi vào `node_modules/.vite-temp` (`EPERM`) và `dotnet run` không bind được port / kết nối MSSQL local để test HTTP trực tiếp; khuyến nghị kiểm tra lại 1 lượt smoke test E2E trên máy dev có MSSQL + trình duyệt trước khi deploy production.

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 5 hạng mục kiểm thử bắt buộc của **Giai đoạn 1N-1** đều **ĐẠT (PASS)** qua đối chiếu mã nguồn chi tiết, `dotnet build --no-restore` (0 error, 0 warning) và `npm run lint` (0 error, 0 warning). Không phát sinh lỗi chặn hay vi phạm phân quyền/bảo mật theo `GEMINI.md`.

**Trạng thái nghiệm thu Giai đoạn 1N-1:** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Đủ điều kiện bàn giao.


---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1N-1 (ĐỢT 2 — 5 TÍNH NĂNG BỔ SUNG & SEED DANH MỤC)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Ngày kiểm thử:** 17/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/API.md`, `RoxyAppDB.sql`, `RoxyAppDB.Seed.Catalog.sql`  
**Phạm vi kiểm thử:**
- Backend: `AuthDtos.cs`, `AuthController.cs`, `SeedController.cs`, `SchedulesController.cs`, `StudentsController.cs`, `TuitionsController.cs`
- Frontend: `App.jsx`, `ProtectedRoute.jsx`, `AuthProvider.jsx`, `ChangePasswordModal.jsx`, `AdminLayout.jsx`, `Schedules.jsx`, `Students.jsx`, `Tuitions.jsx`, `Login.jsx`
- Script DB: `RoxyAppDB.Seed.Catalog.sql`

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT & GIỚI HẠN MÔI TRƯỜNG RUNTIME

| Thành phần | Lệnh thực thi / Phương thức | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build --no-restore` tại `RoxyAppBE/RoxyAcademy.Api/` | **PASS** | **0 Warning(s), 0 Error(s)**, target `net9.0` (`RoxyAcademy.Api.dll`) |
| **Frontend Lint** | `npm --prefix roxy-admin run lint` (`eslint .`) | **PASS** | **0 Error(s), 0 Warning(s)** |
| **Frontend Build** | `npm run build` (`roxy-admin/`) | **PASS** | **109 modules transformed, built in 356ms** (0 Error) |
| **Runtime API / DB** | Môi trường sandbox hiện tại | **CHƯA CHẠY E2E TRONG SANDBOX** | Sandbox không kết nối MSSQL local & giới hạn bind port/ghi file tạm ngoài phạm vi cho phép; toàn bộ 6 hạng mục được kiểm chứng chi tiết qua đối chiếu mã nguồn Backend, Frontend, SQL script và tài liệu `docs/API.md`. |
| **Hard-code `localhost` & `[CẦN XÁC MINH]`** | Quét toàn bộ file Backend & Frontend trong phạm vi đợt 2 | **PASS** | **0** kết quả `localhost` hoặc `[CẦN XÁC MINH]`. |

---

## 2. BẢNG TỔNG HỢP CHECKLIST 6 HẠNG MỤC BẮT BUỘC

| STT | Hạng mục kiểm tra | Tiêu chí nghiệm thu | Kết quả | Dẫn chứng file & dòng code cụ thể |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Đổi mật khẩu (`POST /api/Auth/change-password`)** | - Sai mật khẩu cũ bị chặn `400 Bad Request`.<br>- Mật khẩu mới tối thiểu 8 ký tự.<br>- Đổi xong cập nhật `PasswordHash`, đăng nhập lại bằng mật khẩu mới được.<br>- Menu người dùng có mục `"Đổi mật khẩu"` cho mọi vai trò đã đăng nhập; không có chức năng quên mật khẩu. | **PASS** | - `AuthDtos.cs` L40-50 (`ChangePasswordRequest`, `[MinLength(8)]`)<br>- `AuthController.cs` L75-94 (`VerifyHashedPassword` sai → `400 Bad Request`, đúng → băm mới & lưu DB)<br>- `ChangePasswordModal.jsx` L62-110<br>- `AdminLayout.jsx` L293-300, L355-365, L488-499<br>- `Login.jsx` (0 kết quả quên mật khẩu) |
| **2** | **Giáo viên tự xếp lịch (`Schedules`)** | - `Teacher` tạo/sửa được lịch lớp mình dạy và bị chặn `403` nếu tạo/sửa lịch lớp người khác.<br>- Trên UI `Schedules.jsx`, dropdown lớp chỉ hiện lớp của giáo viên đó và ẩn nút xóa. | **PASS** | - `SchedulesController.cs` L183-201 (`POST` chặn `Teacher` nếu `cls.TeacherId != UserId` → `403`), L240-258 (`PUT` chặn `Teacher` nếu không dạy chính/dạy thay → `403`), L284-285 (`DELETE` chỉ `SuperAdmin,BranchManager`)<br>- `Schedules.jsx` L19-21, L242-247 (`availableModalClasses`), L511-520 (`canDelete` ẩn nút `🗑️`) |
| **3** | **Xóa học viên (`DELETE /api/Students/{id}`)** | - Chỉ `SuperAdmin`/`BranchManager` thấy nút xóa.<br>- Modal xác nhận cảnh báo đúng hành vi backend: chuyển sang `Dropped`, đăng ký lớp sang `Dropped`, khóa tài khoản học viên nếu có, giữ nguyên học phí. | **PASS** | - `StudentsController.cs` L102-122 (`ApplyStatusAsync`), L267-284 (`[Authorize(Roles = "SuperAdmin,BranchManager")]`)<br>- `Students.jsx` L1252-1262 (`isStaff && stu.status !== 'Dropped'`), L2413-2492 (`deleteConfirmModal` liệt kê đủ 4 tác động) |
| **4** | **Xóa học phí (`DELETE /api/Tuitions/{id}`)** | - Chỉ `SuperAdmin`/`BranchManager` thấy nút xóa.<br>- Khoản thu đã có thanh toán bị chặn xóa ở backend (`400`) và disable/chặn ở UI. | **PASS** | - `TuitionsController.cs` L369-389 (`[Authorize(Roles = "SuperAdmin,BranchManager")]`, kiểm tra `db.Payments.AnyAsync(p => p.TuitionId == id)` → `400`)<br>- `Tuitions.jsx` L742-763 (desktop), L882-903 (mobile), L1038-1108 (`hasPayments` disable nút `🗑️`) |
| **5** | **`ProtectedRoute` chặn theo vai trò** | - Tải app luôn xác thực lại bằng `GET /Auth/me` (không tin `role` trong `localStorage`).<br>- Vào route sai vai trò thì thấy trang `403` và KHÔNG gọi API trang con. | **PASS** | - `AuthProvider.jsx` L4-12 (`user` khởi tạo `null`)<br>- `ProtectedRoute.jsx` L11-50 (gọi `GET /Auth/me`), L56-65 (chờ xác thực, chưa render `<Outlet />`), L67-88 (hiển thị trang `403`, không render `<Outlet />`)<br>- `App.jsx` L23-70 (phân nhóm `ALL_ROLES`, `STAFF_ROLES`, `TUITION_ROLES`, `PAYMENT_ROLES`, `SUPERADMIN_ONLY`) |
| **6** | **Seed danh mục (`RoxyAppDB.Seed.Catalog.sql` & `POST /api/Seed/catalog`)** | - Chạy 1 lần ra đúng 2 chi nhánh + 8 khóa học theo `roxy.edu.vn`.<br>- Chạy lại không nhân đôi (idempotent), không seed học viên/giáo viên/tài khoản giả.<br>- Có tài liệu rõ trong `docs/API.md`. | **PASS** | - `RoxyAppDB.Seed.Catalog.sql` L1-63 (`IF NOT EXISTS` cho 2 chi nhánh Bình Trưng + 8 khóa học)<br>- `SeedController.cs` L13-79 (`[Authorize(Roles = "SuperAdmin")]`, `AnyAsync` idempotent)<br>- `docs/API.md` L1300-1325 (Mục 13.2 & 13.3) |

---

## 3. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**
- *Ghi chú tài liệu (không chặn):* `docs/API.md` chưa có mục mô tả riêng cho `DELETE /api/Students/{id}` (có thể bổ sung ở lần cập nhật docs tiếp theo).

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ 6 hạng mục kiểm thử bắt buộc của **Giai đoạn 1N-1 (Đợt 2 — 5 tính năng bổ sung & Seed danh mục)** đều **ĐẠT (PASS 100%)** qua đối chiếu mã nguồn chi tiết, `dotnet build --no-restore` (0 Warning, 0 Error), `npm run lint` (0 Error, 0 Warning) và `npm run build` (109 modules transformed, built in 356ms). Không có lỗi chặn.

**Trạng thái nghiệm thu Giai đoạn 1N-1 (Đợt 2):** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Đủ điều kiện bàn giao.


---

# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1N-2 (8 BẪY ĐỒNG BỘ)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Ngày kiểm thử:** 17/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/API.md`, `docs/QA-REPORT.md`  
**Phạm vi kiểm thử:**
- Backend: `LeaveRequestsController.cs`, `StudentsController.cs`, `UsersController.cs`, `BranchesController.cs`, `StudentClassesController.cs`, `PaymentsController.cs`, `HomeworkSubmissionsController.cs`, `HomeworksController.cs`, `AttendancesController.cs`, `SchedulesController.cs`, `DashboardController.cs`, `ScheduleAndAttendanceDtos.cs`, `DashboardDtos.cs`
- Frontend: `LeaveRequests.jsx`, `ClassList.jsx`, `BranchModals.jsx`, `Schedules.jsx`, `Homeworks.jsx`, `Dashboard.jsx`

---

## 1. KẾT QUẢ BIÊN DỊCH, LINT & GIỚI HẠN MÔI TRƯỜNG RUNTIME

| Thành phần | Lệnh thực thi / Phương thức | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build --no-restore` tại `RoxyAppBE/RoxyAcademy.Api/` | **PASS** | **0 Warning(s), 0 Error(s)** |
| **Frontend Lint** | `npm --prefix roxy-admin run lint` (`eslint .`) | **PASS** | **0 Error(s), 0 Warning(s)** |
| **Frontend Build** | `npm run build` (`roxy-admin/`) | **PASS** | **109 modules transformed, built in 324ms** (0 Error) |
| **Runtime API / DB** | Môi trường sandbox hiện tại | **CHƯA CHẠY E2E TRONG SANDBOX** | Sandbox không kết nối MSSQL local & chặn bind port; toàn bộ 8 luồng nghiệp vụ được kiểm chứng chi tiết qua đối chiếu từng dòng code Backend, Frontend và tài liệu `docs/API.md`. |

---

## 2. BẢNG TỔNG HỢP CHECKLIST 8 HẠNG MỤC ĐỒNG BỘ

| STT | Hạng mục kiểm tra | Tiêu chí nghiệm thu | Kết quả | Dẫn chứng file & dòng code cụ thể |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Duyệt đơn nghỉ không ghi đè điểm danh đã chấm** | - Chỉ đổi sang `ExcusedAbsent` khi buổi chưa chấm (chưa có bản ghi hoặc `Status` trống).<br>- Buổi đã chấm `Present`/`Late` giữ nguyên và báo rõ cho người duyệt.<br>- Từ chối đơn nghỉ giữ nguyên điểm danh. | **PASS** | - `LeaveRequestsController.cs` L214-275 (`existingAttendance.Status` khác rỗng -> tăng `attendanceSkipped`, thêm vào `skippedDates`; `Rejected` không đụng `Attendances`)<br>- `LeaveRequests.jsx` L176-184, L204-212, L256-277 (`skippedBanner` màu `amber-50` không tự tắt, hiện `message` + `skippedDates`) |
| **2** | **Đổi giáo viên & quy tắc lịch sử lớp** | - Giáo viên mới xem được toàn bộ lịch sử lớp; giáo viên cũ mất quyền ngay khi bị thay.<br>- Quy tắc ghi rõ trong `docs/API.md`.<br>- Form sửa lớp hiện chú thích khi đổi giáo viên. | **PASS** | - `docs/API.md` Mục 9.3 L683-687<br>- Kiểm tra động theo `Class.TeacherId == UserId` trong DB ở các controller đào tạo<br>- `ClassList.jsx` L323-332 (callout `amber-50` hiện khi `teacherId` đổi so với `editingClass.teacherId`) |
| **3** | **Đổi chi nhánh đồng bộ** | - Đổi chi nhánh học viên đồng bộ `User.BranchId` + `BranchId` học phí chưa thu đủ & chưa hủy (vẫn chặn khi còn ghi danh `Active`/`Pending`).<br>- Đổi `BranchId` GV còn lớp chưa kết thúc hoặc PH còn con `Active` bị chặn. | **PASS** | - `StudentsController.cs` L245-282 (chặn `409` nếu còn `Active`/`Pending`; đồng bộ `User.BranchId` & `Tuitions` chưa thu đủ)<br>- `UsersController.cs` L156-180 (chặn `409 Conflict` cho GV còn lớp `Status != "Finished"` và PH còn con `StudentClasses.Status == "Active"`) |
| **4** | **Ngừng chi nhánh chặn đủ** | - Chặn khi còn lớp mở, học viên `Active`, GV `IsActive`, học phí chưa thu đủ, thanh toán `PendingConfirm`, đơn nghỉ `Pending`, bài nộp `Pending` với lý do rõ.<br>- UI render danh sách lý do. | **PASS** | - `BranchesController.cs` L122-215 (`ValidateBranchDeactivationAsync` kiểm tra đủ 7 điều kiện, trả `409 Conflict` kèm `message` + mảng `reasons`)<br>- `BranchModals.jsx` L5-25, L144-149, L234-239 (`DeactivationBlockedAlert` render bullet list `reasons`) |
| **5** | **Khóa tài khoản đồng bộ** | - Khóa tài khoản học viên -> `Students.Status = "Paused"` (không phải `Dropped`).<br>- Khóa tài khoản phụ huynh -> cảnh báo con đang học và chặn đăng ký lớp/thanh toán mới. | **PASS** | - `UsersController.cs` L207-237, L268-286 (`Students.Status = "Paused"`; đếm `activeChildEnrollments` & trả `warning` khi khóa PH)<br>- `StudentClassesController.cs` L132-136 & `PaymentsController.cs` L143-147 (chặn `403 Forbidden` khi `Parent.IsActive == false`) |
| **6** | **Chấm bài & xóa bài tập** | - Chấm bài chỉ được khi `Status == "Submitted"`, chưa nộp thì chặn.<br>- Xóa bài tập đã có bài nộp được chấm (`Reviewed` hoặc có `Score`) bị chặn. | **PASS** | - `HomeworkSubmissionsController.cs` L214-216 (chặn `400` nếu `sub.Status != "Submitted"`)<br>- `HomeworksController.cs` L336-340 (chặn `409 Conflict` nếu có `Status == "Reviewed" || Score != null`)<br>- `Homeworks.jsx` L176-181, L215-218, L629-650 (`deleteError` inline & khóa nút chấm khi chưa nộp) |
| **7** | **Học viên ghi danh muộn** | - Duyệt ghi danh `Pending -> Active` (hoặc tạo `Active` mới) tự tạo `HomeworkSubmission` (`Pending`) cho các bài tập chưa hết hạn của lớp. | **PASS** | - `StudentClassesController.cs` L160-163, L204-207, L242-270 (`AssignOpenHomeworksAsync` tạo `HomeworkSubmission` `Pending` với `DueDate == null || DueDate >= DateTime.UtcNow`) |
| **8** | **Điểm danh bulk & Dashboard quá hạn** | - Điểm danh bulk chỉ chuyển `Schedule.Status = "Completed"` khi điểm danh đủ sĩ số `Active` của lớp.<br>- Buổi đã có điểm danh không sửa được ngày/giờ/trạng thái.<br>- Dashboard tính & hiện riêng mục học phí quá hạn trên tất cả các tháng trước. | **PASS** | - `AttendancesController.cs` L184-199 (chỉ `Completed` khi số đã chấm >= tổng `Active`)<br>- `SchedulesController.cs` L109, L178, L262-269 (`HasAttendance`, chặn `400` khi sửa ngày/giờ/trạng thái)<br>- `Schedules.jsx` L237, L582-629 (`isAttendanceLocked` disable 4 trường)<br>- `DashboardController.cs` L69-83 & `DashboardDtos.cs` L20-26 (`OverdueTuitionCount`, `OverdueTuitionAmount` mọi khoản `DueDate < today`)<br>- `Dashboard.jsx` L208-246 (thẻ riêng `Học phí quá hạn (tất cả các tháng)`) |

---

## 3. DANH SÁCH LỖI VÀ VẤN ĐỀ CẦN XỬ LÝ (DEFECT LOG)

- **Lỗi chặn (Blocker):** **0**
- **Lỗi nghiêm trọng (Critical):** **0**
- **Lỗi nhỏ (Minor):** **0**

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

Toàn bộ **8/8 hạng mục** của **Giai đoạn 1N-2 (8 bẫy đồng bộ)** đều **ĐẠT (PASS 100%)** qua đối chiếu mã nguồn chi tiết, `dotnet build --no-restore` (0 Warning, 0 Error), `npm run lint` (0 Error, 0 Warning) và `npm run build` (109 modules transformed, built in 324ms).

**Trạng thái nghiệm thu Giai đoạn 1N-2:** **ĐẠT CHUẨN NGHIỆM THU (PASSED)** — Sẵn sàng commit và bàn giao.


---

# BÁO CÁO QA — FIX ĐỢT 1: MODAL XÁC NHẬN & CHUẨN HÓA THAO TÁC (`ConfirmModal`)
**Ngày kiểm tra:** 17/11/2026 (đối chiếu bổ sung ngày 18/11/2026)  
**Commit tham chiếu:** `747f48a` (`update 25`)  
**Phạm vi:** Frontend `roxy-admin/` (`ConfirmModal.jsx`, `Payments.jsx`, `Attendance.jsx`, `BranchDetail.jsx`, `ClassList.jsx`, `Homeworks.jsx`, `LeaveRequests.jsx`, `Schedules.jsx`, `Tuitions.jsx`).

## 1. Nội dung kiểm tra đối chiếu mã nguồn
| Hạng mục | Kết quả | Dẫn chứng |
| :--- | :---: | :--- |
| Tạo component `ConfirmModal.jsx` dùng chung (thay thế `window.confirm` / xác nhận thiếu nhất quán) | **PASS** | `roxy-admin/src/components/ConfirmModal.jsx` (L1–87) |
| Luồng Duyệt / Từ chối / Hủy (Void) trên `Payments.jsx` sử dụng `ConfirmModal` | **PASS** | `Payments.jsx` (`handleConfirmPayment`, `handleOpenReject`/`handleConfirmReject`, `handleOpenVoid`/`handleConfirmVoid`, `<ConfirmModal />`) |
| Áp dụng `ConfirmModal` nhất quán trên các màn hình nghiệp vụ khác | **PASS** | `Attendance.jsx`, `BranchDetail.jsx`, `ClassList.jsx`, `Homeworks.jsx`, `LeaveRequests.jsx`, `Schedules.jsx`, `Tuitions.jsx` |

## 2. Kết luận Đợt 1
- **Kết quả:** **PASS** (đã tích hợp vào nhánh `main` tại commit `747f48a`).


---

# BÁO CÁO QA — FIX ĐỢT 2A: DROPDOWN HỌC VIÊN TRỐNG (`Tuitions`, `LeaveRequests`, `Grades`)
**Ngày kiểm tra:** 17/11/2026  
**Phạm vi:** Chỉ sửa frontend (`roxy-admin/`), giữ nguyên backend & DB.

## 1. Nguyên nhân gốc (Root Cause)
- Tại backend `RoxyAppBE/RoxyAcademy.Api/Dtos/StudentDtos.cs` (dòng 88–89), thuộc tính `StudentQuery.PageSize` gắn `[Range(1, 100)]`.
- Các màn hình gọi `GET /api/Students` với `pageSize > 100` đều bị ASP.NET Core trả về **`400 Bad Request`** (lỗi validation `PageSize must be between 1 and 100`), trong khi:
  1. `Tuitions.jsx` (dòng 90) gọi `GET /Students?pageSize=300` qua `Promise.allSettled` và chỉ kiểm tra `studentRes.status === 'fulfilled'`, nên lỗi `400` bị bỏ qua lặng lẽ khiến `students = []` ở cả bộ lọc lẫn modal **"Tạo khoản thu"**.
  2. `LeaveRequests.jsx` (dòng 141) gọi `GET /Students?pageSize=200`, bắt lỗi trong `catch (sErr)` và chỉ `console.warn(...)` không hiện lỗi ra UI, khiến dropdown học viên trống ở cả **Phụ huynh** và **SuperAdmin** (trong khi dropdown Giáo viên gọi `/Users?role=Teacher&pageSize=100` vẫn hợp lệ nên có dữ liệu, và trang Hồ sơ học viên dùng `pageSize <= 100` nên chạy bình thường).
  3. `Grades.jsx` (dòng 293) gọi `GET /Students` với `pageSize: 200` nên cũng bị `400` và rơi vào nhánh fallback `/StudentClasses`.

## 2. Giải pháp đã áp dụng
- Tạo helper dùng chung `roxy-admin/src/utils/fetchAllStudents.js`: phân trang `GET /Students` với `pageSize = 100` (`page = 1, 2, ...` đến khi đủ `total`), bảo đảm luôn nằm trong giới hạn `[1, 100]` của `StudentQuery`.
- Cập nhật `Tuitions.jsx`, `LeaveRequests.jsx`, `Grades.jsx` sử dụng `fetchAllStudents()`.
- Chuẩn hóa ép kiểu `Number(...)` khi so sánh `parentId`, `userId`, `branchId` trong `LeaveRequests.jsx`.
- Bổ sung state `studentsLoadError` hiển thị thông báo lỗi rõ ràng ngay trên UI (`CreateTuitionModal` và form tạo đơn trong `LeaveRequests.jsx`) nếu API tải học viên thất bại, không để dropdown trống lặng lẽ.

## 3. Kết quả kiểm tra
- Quét toàn bộ `roxy-admin/src` với pattern `pageSize\s*[:=]\s*(200|300|500|1000)`: **0 kết quả**.
- `npm --prefix roxy-admin run lint`: **PASS** (0 error, 0 warning).
- `npm run build` (`roxy-admin/`): **PASS** (`111 modules transformed, built in 375ms`).
- **Giới hạn môi trường sandbox:** Không thể chạy trình duyệt / API + MSSQL local trong sandbox để thực thi trực tiếp thao tác tạo & duyệt đơn xin nghỉ test cho phụ huynh `0922222222` (Nguyễn Văn B) và `SuperAdmin`; cần kiểm chứng E2E bước này trên máy dev có MSSQL đang chạy.


---

# BÁO CÁO QA — FIX ĐỢT 2B: BẢNG THANH TOÁN & BẢNG HỌC PHÍ (`Payments.jsx`, `Tuitions.jsx`)
**Ngày kiểm tra:** 17/11/2026  
**Người thực hiện:** QA Agent  
**Phạm vi:** Chỉ sửa frontend (`roxy-admin/src/pages/Payments.jsx`, `roxy-admin/src/pages/Tuitions.jsx`), giữ nguyên backend, DB và luồng nghiệp vụ.

## 1. Kết quả Lint & Build
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm run build` tại `roxy-admin/`: **PASS** (`111 modules transformed, built in 304ms`).

## 2. Kết quả đối chiếu mã nguồn & CSS/Layout
| Màn hình | Hạng mục kiểm tra | Kết quả | Dẫn chứng file & dòng code |
| :--- | :--- | :---: | :--- |
| **`Payments.jsx`** | Ghim cột **Thao tác** (`sticky right-0`) với nền đặc, `z-index` và bóng trái | **PASS** | - `<th>` (L454–456): `sticky right-0 z-20 bg-slate-50 px-3 py-3 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]`<br>- `<td>` (L550): `sticky right-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-3 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)] transition-colors` (trên `<tr className="group hover:bg-slate-50/70 ...">` L464) |
| **`Payments.jsx`** | Xuống dòng các cột dễ dài (`max-w-...` + `break-words`, bỏ `truncate`/`whitespace-nowrap`) | **PASS** | - Học viên & Khoản thu (`<td>` L476–483): `max-w-[200px]`, `studentName` và `tuitionTitle` dùng `break-words`<br>- Trạng thái & Lý do từ chối (`<td>` L521–531): `max-w-[160px]`, `p.note` dùng `break-words`<br>- Người xác nhận (`<td>` L534–547): `max-w-[140px]`, `confirmedByName` dùng `break-words` |
| **`Payments.jsx`** | Giữ nguyên nút thao tác & `ConfirmModal` | **PASS** | - L553–596: Giữ nguyên đủ nút Xem chi tiết (`👁️`), `✓ Duyệt`, `✕ Từ chối`, `🚫 Hủy (Void)` theo đúng điều kiện `canManage && isPending`.<br>- `ConfirmModal` (L5, L137–173, L907–917) giữ nguyên không đổi. |
| **`Tuitions.jsx`** | Ghim cột **Thao tác** (`sticky right-0`) với nền đặc, `z-index` và bóng trái | **PASS** | - `<th>` (L616–618): `sticky right-0 z-20 bg-slate-50 px-3 py-3 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]`<br>- `<td>` (L731): `sticky right-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-3 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)] transition-colors` (trên `<tr className="group hover:bg-slate-50/70 ...">` L628) |
| **`Tuitions.jsx`** | Xuống dòng các cột dễ dài (`max-w-...` + `break-words`, bỏ `truncate`/`whitespace-nowrap`) | **PASS** | - Học viên (`<td>` L630–642): `max-w-[200px]`, `min-w-0`, `studentName` dùng `break-words`<br>- Khoản thu & Lớp (`<td>` L645–658): `max-w-[210px]`, `t.title` và badge `t.className` dùng `break-words`<br>- Cơ sở (`<td>` L661–663): `max-w-[120px] break-words` |
| **`Tuitions.jsx`** | Giữ nguyên nút thao tác & luồng nghiệp vụ | **PASS** | - L733–804: Giữ nguyên đủ nút Xem chi tiết (`👁️`), Sửa (`✏️`), Xóa (`🗑️` disable khi `hasPayments`), `💳 Thanh toán` (Phụ huynh), `⚡ Thu tiền` (Staff). |

## 3. Giới hạn môi trường sandbox & Kết quả test tay ngày 17/11/2026
- **Giới hạn môi trường sandbox:** Khi nghiệm thu Đợt 2B trên sandbox chưa mở được trình duyệt/DB thực tế.
- **Kết quả test tay thực tế ngày 17/11/2026 (phát hiện lỗi hiển thị cần sửa tiếp):**
  - Do tổng bề rộng bảng vẫn lớn hơn khung nội dung ở màn hình `1280px–1440px`, ở vị trí chưa cuộn ngang cột **Thao tác** (`sticky right-0`) dính đè che mất các cột ngay trước nó:
    - Trang Thanh toán (`Payments.jsx`): cột **Trạng thái** chỉ còn chữ `"T."` với nửa badge, cột **Người xác nhận** bị che hoàn toàn; badge `"Chờ xác nhận"` sau khi cuộn bị ngắt vụn thành 3 dòng trong một ô oval cao.
    - Trang Học phí (`Tuitions.jsx`): cột **Hạn nộp** và **Trạng thái** bị che hết; cột **Cơ sở** bị bóp hẹp nên `"Cơ sở 1"` ngắt thành 3 dòng, tiêu đề `"Khoản thu & Lớp"` ngắt 3 dòng.
- **Trạng thái Đợt 2B:** **CHƯA ĐẠT HIỂN THỊ 1280–1440px** — chuyển sang **Fix Đợt 2B-2** để thu hẹp tổng bề rộng bảng.


---

# BÁO CÁO QA — FIX ĐỢT 2B-2: THU HẸP BẢNG THANH TOÁN & BẢNG HỌC PHÍ (`Payments.jsx`, `Tuitions.jsx`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Phạm vi:** Chỉ sửa frontend (`roxy-admin/src/pages/Payments.jsx`, `roxy-admin/src/pages/Tuitions.jsx`), giữ nguyên backend, DB và luồng nghiệp vụ.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 111 modules transformed`, `✓ built in 325ms`). *(Lưu ý: lệnh chạy trong sandbox Windows gặp `EPERM` khi Vite ghi `node_modules/.vite-temp/`, đã xác minh build thành công ngoài sandbox).*

## 2. Kết quả đối chiếu mã nguồn & ước lượng bề rộng ở 3 cỡ màn hình
*(Khung nội dung ước lượng sau khi trừ sidebar + padding ~320px: `1280px` ≈ **960px**, `1440px` ≈ **1120px**, `1920px` ≈ **1600px**.)*

| Màn hình | Hạng mục kiểm tra | Kết quả | Chi tiết kỹ thuật & dòng code |
| :--- | :--- | :---: | :--- |
| **`Payments.jsx`** | Thu gọn padding & độ rộng 8 cột để vừa khung `1280–1440px` | **PASS** | - Giảm padding các ô `<th>`/`<td>` xuống `px-1.5 py-2.5` (L447–550)<br>- `Học viên & Khoản thu`: `max-w-[140px]`, `text-xs` (L448, L476)<br>- `Chứng từ`: `gap-1`, thumbnail `w-7 h-7`, `text-[11px]` (L500–513)<br>- `Người xác nhận`: `max-w-[105px]` (L534)<br>- Tổng bề rộng ước lượng: **~698px** (thường) / **~920–985px** (có ảnh + `PendingConfirm`) → vừa khít `1440px`/`1920px` và gần như vừa khít ở `1280px`. |
| **`Payments.jsx`** | Badge `"Chờ xác nhận"` & các badge trạng thái không ngắt 3 dòng | **PASS** | - `Trạng thái` (`min-w-[110px] max-w-[135px]`, L452, L521)<br>- `renderPaymentMethodBadge` & `renderPaymentStatusBadge` đều gắn `whitespace-nowrap`, `px-2 py-0.5 text-[11px]` (L1366–1425). |
| **`Payments.jsx`** | Giữ nguyên `sticky right-0`, đủ 4 nút thao tác & `ConfirmModal` Đợt 1 | **PASS** | - `sticky right-0` nền đặc + shadow giữ nguyên (L454, L550); cụm nút `max-w-[162px]` giữ đủ `👁️`, `✓ Duyệt`, `✕ Từ chối`, `🚫 Hủy (Void)` (L551–598) và `ConfirmModal` (L907–918). |
| **`Tuitions.jsx`** | Thu gọn padding & độ rộng 9 cột để vừa khung `1280–1440px` | **PASS** | - Giảm padding `<th>`/`<td>` xuống `px-1.5 py-2.5` (L608–726)<br>- `Học viên`: `max-w-[140px]`, bỏ avatar ở bảng desktop (L630–637)<br>- Các cột tiền (`Phải thu`, `Đã đóng`, `Còn nợ`): `px-1.5`, `text-xs`, progress bar `w-14` (L661–707)<br>- Tổng bề rộng ước lượng: **~951px** (tiêu chuẩn, vừa khít `1280px` ~960px) / **~1105px** (tối đa có cả giảm giá + chờ duyệt, vừa khít `1440px` ~1120px & `1920px` ~1600px). |
| **`Tuitions.jsx`** | Chống ngắt 3 dòng (`Cơ sở 1`, `Khoản thu & Lớp`, badge) & không che `Hạn nộp`/`Trạng thái` | **PASS** | - `Khoản thu & Lớp`: `<th>` `min-w-[115px]`, `<td>` `min-w-[115px] max-w-[145px]` (L609, L640)<br>- `Cơ sở`: `min-w-[76px] max-w-[95px]` (L610, L656)<br>- `Hạn nộp`: `min-w-[78px]` (L614, L709); `Trạng thái`: `min-w-[110px]` (L615, L721) + `whitespace-nowrap` trong `renderStatusBadge` (L1161–1204). |
| **`Tuitions.jsx`** | Giữ nguyên `sticky right-0` & đủ nút thao tác | **PASS** | - `sticky right-0` nền đặc + shadow giữ nguyên (L616, L726); giữ đủ `👁️`, `✏️`, `🗑️`, `💳 Thanh toán`, `⚡ Thu tiền` (L726–800). |

## 3. Kiểm tra tay 3 cỡ màn hình (`1280px`, `1440px`, `1920px`) & Kết luận
- **Giới hạn môi trường sandbox:** Không thể chạy trình duyệt + API (`5123`) + MSSQL thực tế trong sandbox để mở trang Thanh toán (giao dịch `TEST17112026` 51.000đ) và trang Học phí ở `1280px`, `1440px`, `1920px`.
- **Trạng thái hiện tại:** **ĐẠT kiểm tra mã nguồn + `npm run lint` + `npm run build`**; **CHỜ XÁC NHẬN TEST TAY TRÊN TRÌNH DUYỆT (3 cỡ màn hình `1280px`, `1440px`, `1920px`, không bấm Duyệt thật)** trước khi thực hiện commit `"Fix đợt 2B-2: thu hẹp bảng thanh toán"`.


---

# BÁO CÁO QA — FIX ĐỢT 2B-3: GIÃN CỘT SỐ TIỀN – PHƯƠNG THỨC (`Payments.jsx`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `e561f5e` (sau Fix đợt 2B-2)  
**Phạm vi:** Chỉ sửa 2 cột `Số tiền` và `Phương thức` trong `roxy-admin/src/pages/Payments.jsx`; không sửa `Tuitions.jsx`, backend hay DB.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 111 modules transformed`, `✓ built in 379ms`).

## 2. Kết quả kiểm tra mã nguồn & bề rộng ở 2 cỡ màn hình (`1280px`, `1440px`)
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Phạm vi sửa đúng 2 cột `Số tiền` & `Phương thức` | **PASS** | - `<th>` `Số tiền` (L449) & `<td>` `Số tiền` (L486): `px-1.5` → `pl-1.5 pr-3.5` (`pr-3.5` = 14px)<br>- `<th>` `Phương thức` (L450) & `<td>` `Phương thức` (L493): `px-1.5` → `pl-3.5 pr-1.5` (`pl-3.5` = 14px)<br>- Khe hở giữa số tiền canh phải và badge phương thức tăng từ `12px` lên **28px** (`+16px` tổng bề rộng); `Tuitions.jsx` giữ nguyên không sửa. |
| Không làm tràn bảng ở `1280px` & `1440px` | **PASS (Static)** | - Tổng bề rộng bảng ước tính sau `+16px`: **~874–950px** (8 cột), nằm gọn trong vùng khả dụng `1280px` (~960px) và dư rộng ở `1440px` (~1120px). |
| Giữ nguyên `sticky right-0`, badge 1 dòng, nút `Duyệt` & `ConfirmModal` | **PASS** | - `sticky right-0` (L454, L550), badge `"Chờ xác nhận"` `whitespace-nowrap` (L1406), nút `Duyệt` (L568–576) và `ConfirmModal` Đợt 1 (L907–918) giữ nguyên. |

## 3. Kiểm tra tay 2 cỡ màn hình (`1280px`, `1440px`) & Kết luận
- **Giới hạn môi trường sandbox:** Không thể mở trình duyệt/API (`5123`) để kiểm tra trực quan giao dịch `TEST17112026` (`51.000đ`) trên viewport `1280px` và `1440px`.
- **Trạng thái hiện tại:** **ĐẠT kiểm tra tĩnh + `npm run lint` + `npm run build`**; **CHỜ XÁC NHẬN MẮT THƯỜNG TRÊN TRÌNH DUYỆT (1280px & 1440px, không bấm Duyệt thật)** trước khi commit `"Fix đợt 2B-3: giãn cột số tiền - phương thức"`.


---

# BÁO CÁO QA — FIX ĐỢT 2C: DASHBOARD THÁNG (`GET /api/Dashboard/summary`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `1c1b8f2` (sau Fix đợt 2B-3)  
**Phạm vi:** Kiểm tra logic `DashboardController.cs`, đối chiếu `TuitionsController.cs` & `Dashboard.jsx`, bổ sung tài liệu quy tắc vào `docs/API.md` (không sửa code backend/frontend, không đổi DB).

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 111 modules transformed`, `✓ built in 381ms`).

## 2. Kết quả đối chiếu quy tắc Dashboard tháng & nợ quá hạn
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Quy tắc tính tổng tháng (`totalExpected`, `totalPaid`, `totalRemaining`) | **PASS** | - `DashboardController.cs` (L26–29, L57–68) lọc `!t.IsCancelled && t.DueDate.Month == month && t.DueDate.Year == year` theo giờ VN (UTC+7).<br>- Tính theo **hạn nộp (`DueDate`)**, không tính theo `CreatedAt` và không gộp nợ quá hạn các tháng trước → khi tháng 11/2026 không có khoản đến hạn thì 3 chỉ số bằng `0đ` là đúng thiết kế. |
| Tách riêng nợ quá hạn (`overdueTuitionCount`, `overdueTuitionAmount`) | **PASS** | - `DashboardController.cs` (L70–81) query riêng `!t.IsCancelled && t.DueDate < today && PaidAmount < NetAmount` trên **tất cả các tháng**.<br>- `Dashboard.jsx` (L437–499) hiển thị riêng card **"Học phí quá hạn (tất cả các tháng)"** ngay dưới card học phí tháng. |
| Khớp scoping & công thức `Parent` với trang Học phí | **PASS** | - Cả `DashboardController.VisibleTuitionsQuery()` (L250) và `TuitionsController.GetTuitions()` (L48) đều lọc `t.Student.ParentId == UserId`, dùng cùng công thức `NetAmount - PaidAmount` (`Status == "Confirmed"`) và điều kiện quá hạn `DueDate < today`. |
| Cập nhật tài liệu `docs/API.md` | **PASS** | - Bổ sung mục **14.1 (`GET /api/Dashboard/summary`)** vào `docs/API.md`, ghi rõ quy tắc tính theo `DueDate` tháng hiện tại và tách riêng `overdueTuitionCount`/`overdueTuitionAmount`. |

## 3. Kiểm chứng tài khoản Phụ huynh Trần Thị D & Kết luận (Cập nhật Fix đợt 2C-2 — 18/11/2026)
- **Kết quả kiểm chứng thực tế bằng tài khoản Phụ huynh Trần Thị D (18/11/2026):**
  - **Thẻ Học phí quá hạn (tất cả các tháng):** Khớp **2 khoản / 1.350.000đ** (gồm `100.000đ` hạn `23/10/2026` và `1.250.000đ` còn nợ hạn `30/10/2026`).
  - **Thẻ Học phí tháng 11/2026:** Hiển thị **Đã thu 0đ / Chưa thu 100.000đ / Tổng phải thu 100.000đ**, khớp khoản `"TEST Học phí đợt 2A"` hạn nộp `30/11/2026` — xác nhận logic tính theo **`DueDate`** đúng 100%.
- **Cập nhật tài liệu (`docs/API.md` §14.1, Fix đợt 2C-2):**
  - Sửa ví dụ JSON (`totalExpected: 100000`, `totalPaid: 0`, `totalRemaining: 100000`, `overdueTuitionCount: 2`, giữ `overdueTuitionAmount: 1350000`).
  - Sửa câu giải thích khớp với dữ liệu thực tế hiện tại và ghi chú thẻ học phí tháng chỉ hiện `0đ / 0đ / 0đ` khi không có khoản nào có hạn nộp trong tháng đó.
- **Kết luận cuối cùng (Đợt 2C & 2C-2):** **PASS 100%** — Sẵn sàng commit `"Fix đợt 2C-2: sửa số liệu ví dụ dashboard"`.


---

# BÁO CÁO QA — GIAI ĐOẠN 3A: TỰ ĐỘNG TẠO KHOẢN THU THÁNG (`MonthlyBillingService` + `POST /api/Billing/generate-monthly`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `4dd5e80` (sau Fix đợt 2C-2)  
**Phạm vi:** Chỉ Backend (`RoxyAppBE/`) + `docs/API.md` §15.1; không sửa DB/migration, không sửa frontend (`roxy-admin/`).

## 1. Kết quả Build (`RoxyAppBE/RoxyAcademy.Api`)
- `dotnet build RoxyAppBE/RoxyAcademy.Api --no-restore`: **PASS** (**0 Warning(s), 0 Error(s)**, `RoxyAcademy.Api.dll` biên dịch thành công).

## 2. Kết quả đối chiếu mã nguồn (7/7 quy tắc & 4/4 yêu cầu)
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Quy tắc 1 & 2 (Tháng UTC+7, validate `month`/`year`, `DueDate` cuối tháng) | **PASS** | - `MonthlyBillingService.cs`: dùng `DateTime.UtcNow.AddHours(7)`, validate `month` `[1..12]`, `year` `[2000..2100]`; `DueDate = new DateOnly(targetYear, targetMonth, DateTime.DaysInMonth(targetYear, targetMonth))`. |
| Quy tắc 3 & 4 (Phạm vi `Active`/`!= Finished`, `TuitionFee ?? DefaultFee`, `UncreatedItems`) | **PASS** | - Lọc `sc.Status == "Active" && sc.Class.Status != "Finished"` (+ `BranchId` nếu `BranchManager`).<br>- `Class.TuitionFee ?? Course.DefaultFee`; nếu `null` hoặc `< 0` thì bỏ tạo và ghi vào `UncreatedItems`. |
| Quy tắc 5 & 6 (`Discount = 0`, tiêu đề, ghi chú, chi nhánh) | **PASS** | - `Discount = 0m` (không tỷ lệ), `Title = "Học phí tháng {MM/yyyy} – {ClassName}"`, `Note = "Tự động tạo bởi hệ thống ngày {dd/MM/yyyy}"`, `BranchId = sc.Class.BranchId`. |
| Quy tắc 7 (Chống trùng `(StudentId, ClassId)` mọi trạng thái) | **PASS** | - Kiểm tra tồn tại trên `db.Tuitions` (kể cả `IsCancelled == true`) theo `(StudentId, ClassId)` với `DueDate.Year == targetYear && DueDate.Month == targetMonth`. |
| Dùng lại logic `ITuitionService` & Endpoint `POST /api/Billing/generate-monthly` | **PASS** | - `TuitionsController.CreateTuition` và `MonthlyBillingService` cùng gọi `ITuitionService.CreateTuitionAsync` (`TuitionService.cs`).<br>- `BillingController.cs`: `[Authorize(Roles = "SuperAdmin,BranchManager")]`, hỗ trợ body rỗng/`{}`, giới hạn chi nhánh cho `BranchManager`, đã đăng ký DI trong `Program.cs`. |
| Thông báo phụ huynh & Logging | **PASS** | - Chỉ tạo `Notification` (`UserId = Student.ParentId`, `Type = "Tuition"`, `RefId = tuition.Id`) khi tạo khoản thu thành công và `ParentId > 0`, bọc `try/catch`; ghi log `ILogger` mỗi lần chạy. |
| Tài liệu `docs/API.md` (§15.1) | **PASS** | - Đầy đủ mô tả quyền, request/response và quy tắc cho `POST /api/Billing/generate-monthly`. |

## 3. Kiểm thử thủ công trên `http://localhost:5123` & Kết luận
- **Giới hạn môi trường sandbox:** Không thể kết nối `http://localhost:5123` / MSSQL local từ trong sandbox (`Unable to connect to the remote server`), nên chưa thực thi trực tiếp 5 kịch bản HTTP thủ công (tạo lần 1, gọi lần 2 chống trùng, lớp `Finished`/ghi danh không `Active`, lớp chưa đặt học phí, kiểm tra thông báo bằng tài khoản Phụ huynh).
- **Trạng thái hiện tại:** **ĐẠT `dotnet build` (0 warning, 0 error) & đối chiếu mã nguồn 100%**; **CHỜ TEST THỦ CÔNG ENDPOINT TRÊN `http://localhost:5123`** trước khi commit `"Tính năng tự động tạo khoản thu (3A): logic + endpoint thủ công"`.


---

# BÁO CÁO QA — GIAI ĐOẠN 3B: CHẠY NỀN & THÔNG BÁO ADMIN (`MonthlyBillingBackgroundService`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `5504cdc` (sau Giai đoạn 3A)  
**Phạm vi:** Chỉ Backend (`RoxyAppBE/`) + `docs/API.md` §15.1; không sửa DB/migration, không sửa dữ liệu test, không sửa quy tắc tính phí 3A, không sửa frontend (`roxy-admin/`).

## 1. Kết quả Build & Đăng ký Hosted Service (`RoxyAppBE/RoxyAcademy.Api`)
- `dotnet build RoxyAppBE/RoxyAcademy.Api --no-restore`: **PASS** (**0 Warning(s), 0 Error(s)**, `RoxyAcademy.Api.dll` biên dịch thành công).
- `Program.cs` (L58): đã đăng ký `builder.Services.AddHostedService<MonthlyBillingBackgroundService>();`.

## 2. Kết quả đối chiếu mã nguồn & tài liệu (4/4 yêu cầu)
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Yêu cầu 1 (`BackgroundService`, `06:00` UTC+7, scope riêng, gọi service 3A) | **PASS** | - `MonthlyBillingBackgroundService.cs`: dùng `IServiceScopeFactory.CreateScope()` mỗi lần chạy (không giữ `DbContext` chung), tính `vnNow = DateTime.UtcNow.AddHours(7)`, lập lịch `06:00:00` UTC+7 tiếp theo.<br>- Lúc khởi động chỉ ghi `LogInformation` chờ tới `06:00` và `Task.Delay(delay, stoppingToken)` — không chạy tạo khoản thu ngay.<br>- Gọi đúng `IMonthlyBillingService.GenerateMonthlyTuitionsAsync(null, null, "SuperAdmin", null, stoppingToken)` của 3A. |
| Yêu cầu 2 (Thông báo tổng hợp `SuperAdmin` & từng `BranchManager`, giữ nguyên JSON contract) | **PASS** | - Tạo `Notification` (`Type = "Tuition"`, `RefId = null`, `Title = "Đã tạo khoản thu tháng {MM/yyyy}"`) cho mọi user `IsActive`: `SuperAdmin` nhận tổng hợp toàn hệ thống; `BranchManager` (`BranchId.HasValue`) lọc đúng theo chi nhánh (`CreatedItems`, `UncreatedItems`, `SkippedDuplicateCountByBranch`), `Body` ghi rõ số khoản tạo + tổng tiền, số bỏ qua vì trùng, số chưa tạo kèm tên lớp.<br>- `[property: JsonIgnore]` trong `BillingDtos.cs` giữ nguyên 100% JSON response của `POST /api/Billing/generate-monthly`. |
| Yêu cầu 3 (Logging & xử lý lỗi) | **PASS** | - Ghi `LogInformation` sau mỗi lần chạy xong; toàn bộ lần chạy bọc `try/catch` (`OperationCanceledException` vs `Exception`), lỗi chỉ ghi `LogError` và không tạo thông báo tổng hợp sai lệch. |
| Yêu cầu 4 (Ghi chú `docs/API.md` §15.1) | **PASS** | - Bổ sung đầy đủ ghi chú vận hành: chạy nền `06:00` UTC+7, cần bật **Always On** trên hosting khi deploy production, cơ chế tự tạo bù hôm sau nếu dừng lúc `06:00`, và chạy tay qua `POST /api/Billing/generate-monthly`. |

## 3. Kiểm thử runtime trên localhost & Kết luận
- **Giới hạn môi trường sandbox:** Không thể khởi chạy API bind port `localhost` / kết nối SQL Server local trong sandbox để quan sát trực tiếp log console lúc khởi động và gọi `POST /api/Billing/generate-monthly` trên server đang chạy.
- **Trạng thái hiện tại:** **ĐẠT `dotnet build` (0 warning, 0 error) & đối chiếu mã nguồn 100%**; **CHỜ XÁC MINH RUNTIME TRÊN LOCALHOST** (khởi động API kiểm tra log chờ `06:00` + gọi thử `POST /api/Billing/generate-monthly`) trước khi commit `"Tính năng tự động tạo khoản thu (3B): chạy nền + thông báo admin"`.


---

# BÁO CÁO QA — UPLOAD ẢNH (2D-1): ENDPOINT UPLOAD & PHỤC VỤ FILE TĨNH
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `dbb5036` (sau Tính năng 3B)  
**Phạm vi:** Chỉ Backend (`RoxyAppBE/RoxyAcademy.Api/Program.cs`, `Controllers/UploadsController.cs`) + `docs/API.md` §16.1; không đổi DB/migration, không đổi dữ liệu test, không sửa frontend.

## 1. Kết quả Build (`RoxyAppBE/RoxyAcademy.Api`)
- `dotnet build RoxyAppBE/RoxyAcademy.Api --no-restore`: **PASS** (**0 Warning(s), 0 Error(s)**, `RoxyAcademy.Api.dll` biên dịch thành công).

## 2. Kết quả đối chiếu mã nguồn & tài liệu (5/5 yêu cầu)
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| `UseStaticFiles` & tạo sẵn `wwwroot/uploads/` | **PASS** | - `Program.cs` (L15–26, L156–165): tạo sẵn `wwwroot/uploads` trước `CreateBuilder` và theo `ContentRootPath`, gán `WebRootPath`/`WebRootFileProvider` nếu null; `app.UseStaticFiles()` đặt trước `UseCors`, `UseAuthentication`, `UseAuthorization`, `MapControllers`. |
| `UploadsController` & phân quyền | **PASS** | - `UploadsController.cs` (L6–57): `POST /api/Uploads/image`, `[Authorize]` (mọi tài khoản đăng nhập đều dùng được, không token trả `401`). Nhận `IFormFile? file` và `folder` (`payments`, `newsfeed`, mặc định `general`; giá trị lạ trả `400`). |
| Validate loại file & dung lượng | **PASS** | - `UploadsController.cs` (L11, L20–34, L59–81): tối đa `5MB`, kiểm tra cả đuôi file (`.jpg`, `.jpeg`, `.png`, `.webp`) và `Content-Type` (`image/jpeg`, `image/jpg`, `image/png`, `image/webp`); thiếu file, quá 5MB hoặc sai định dạng đều trả `400` tiếng Việt rõ ràng. |
| Lưu file tên `Guid` & trả URL tuyệt đối | **PASS** | - `UploadsController.cs` (L83–99): lưu `{Guid.NewGuid():N}{ext}` vào `wwwroot/uploads/{safeFolder}/`, trả `{ "url": "<Scheme>://<Host><PathBase>/uploads/{safeFolder}/{safeFileName}" }`. |
| Tài liệu `docs/API.md` (§16.1) | **PASS** | - Ghi đầy đủ endpoint, giới hạn loại file/dung lượng, ví dụ response `200`/`400`/`401`, và lưu ý deploy FTP không xóa/ghi đè thư mục `wwwroot/uploads/`. |

## 3. Kiểm thử runtime trên `http://localhost:5123` & Kết luận
- **Giới hạn môi trường sandbox:** `http://localhost:5123` chưa có server chạy trong sandbox, nên chưa thực thi trực tiếp 4 case HTTP runtime (upload ảnh `.jpg` thật & mở URL tĩnh, upload `.txt`/`.exe`, upload file >5MB, upload không token `401`).
- **Trạng thái hiện tại:** **ĐẠT `dotnet build` (0 warning, 0 error) & đối chiếu mã nguồn 100%**; **CHỜ TEST UPLOAD THẬT TRÊN `http://localhost:5123`** trước khi commit `"Upload ảnh (2D-1): endpoint upload + phục vụ file tĩnh"`.


---

# BÁO CÁO QA — UPLOAD ẢNH (2D-2): CHỌN FILE & XEM TRƯỚC Ở FORM THANH TOÁN VÀ BẢNG TIN
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `9516e03` (sau Upload ảnh 2D-1)  
**Phạm vi:** Chỉ Frontend (`roxy-admin/src/components/ImageUpload.jsx`, `pages/Tuitions.jsx`, `components/NewsfeedModals.jsx`); không sửa backend, không đổi DB/luồng nghiệp vụ.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 112 modules transformed`, `✓ built in 390ms`; chạy ngoài sandbox do sandbox Windows chặn `EPERM` tại `node_modules/.vite-temp/`).

## 2. Kết quả đối chiếu mã nguồn (3/3 yêu cầu)
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Component dùng chung `ImageUpload.jsx` | **PASS** | - `<input type="file" accept="image/*" />` (L92–95), validate client-side `.jpg/.jpeg/.png/.webp` & MIME type + dung lượng `<= 5MB` với thông báo tiếng Việt rõ ràng (L4–6, L37–49).<br>- Gửi `FormData` (`file`, `folder`) tới `POST /api/Uploads/image` qua `axiosClient.post` ghi đè `headers: { 'Content-Type': 'multipart/form-data' }` (L51–59).<br>- Hiện `"Đang tải lên..."`, thumbnail xem trước + nút `Xóa ảnh` để chọn lại; khi lỗi không gọi `onChange` (không ghi URL sai vào form). |
| Tích hợp vào 2 form thanh toán (`Tuitions.jsx`) | **PASS** | - `QuickPayModal` (L2460–2470) và `ParentPaymentModal` (L2776–2786) dùng `<ImageUpload folder="payments" value={proofImageUrl} onChange={setProofImageUrl} ... />`, giữ nguyên logic submit và hiển thị ảnh bằng chứng cũ. |
| Tích hợp vào bảng tin (`NewsfeedModals.jsx`) | **PASS** | - `CreateEditNewsfeedModal` (L423–433) dùng `<ImageUpload folder="newsfeed" value={imageUrl} ... />`; `validate()` (L230) chấp nhận URL tuyệt đối `http://...` / `https://...` trả về từ `UploadsController`; giữ nguyên `NewsfeedDetailModal`. |

## 3. Kiểm thử runtime E2E trên `http://localhost:5173` & Kết luận
- **Giới hạn môi trường sandbox:** Cổng `5173` (Vite) và `5123` (API) không chạy trong sandbox, nên chưa test thực tế trên trình duyệt 4 kịch bản (Phụ huynh nộp thanh toán upload `.jpg` thật, SuperAdmin đăng bảng tin upload ảnh thật, thử file `.txt` & file `>5MB`).
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu mã nguồn 100%**; **CHỜ TEST UPLOAD THẬT TRÊN `http://localhost:5173` + `http://localhost:5123`** trước khi commit `"Upload ảnh (2D-2): chọn file + xem trước ở form thanh toán và bảng tin"`.


---

# BÁO CÁO QA — FIX ĐỢT 2E: GIỜ THÔNG BÁO, NGƯỜI DUYỆT, LỚP/CHI NHÁNH ĐƠN NGHỈ
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `38c9172` (sau Upload ảnh 2D-2)  
**Phạm vi:** Backend (`NotificationsController.cs`, `LeaveRequestsController.cs`) + Frontend (`NotificationBell.jsx`, `LeaveRequests.jsx`); không đổi DB/migration, không đổi dữ liệu test, không đổi luồng duyệt đơn.

## 1. Kết quả Build & Lint
- `dotnet build RoxyAppBE/RoxyAcademy.Api --no-restore`: **PASS** (**0 Warning(s), 0 Error(s)**).
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 112 modules transformed`, `✓ built in 406ms`).

## 2. Kết quả đối chiếu mã nguồn (3/3 lỗi)
| Lỗi | Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :--- | :---: | :--- |
| **Lỗi 1** | Giờ thông báo (`NotificationsController.cs` + `NotificationBell.jsx`) | **PASS** | - `NotificationsController.cs` (L27–41): ép `DateTime.SpecifyKind(..., DateTimeKind.Utc)` cho `CreatedAt` và `ReadAt` trong `GET /api/Notifications` để JSON serialize có hậu tố `Z`.<br>- `NotificationBell.jsx` (L5–27): `formatRelativeTime` tự thêm `'Z'` khi chuỗi ISO có `'T'` nhưng chưa có thông tin múi giờ, tránh lệch 7 giờ. |
| **Lỗi 2** | Cột Người duyệt ở Phụ huynh (`LeaveRequestsController.cs` + `LeaveRequests.jsx`) | **PASS** | - `LeaveRequestsController.cs` (L150–151, L229–230): `Include(lr => lr.ReviewedByNavigation)` và trả `ReviewedBy`, `ReviewedByName` cho mọi vai trò (kể cả `Parent`).<br>- `LeaveRequests.jsx` (L260–283, L1177–1220): bổ sung listener `focus` / `visibilitychange` (throttle 2000ms) tự làm mới danh sách khi quay lại tab; chỉ hiện `"— (Đang chờ xét duyệt)"` khi `status === 'Pending'`, trạng thái đã xử lý thiếu tên hiện `"Đã xử lý"`. |
| **Lỗi 3** | Lớp & chi nhánh đơn xin nghỉ (`LeaveRequestsController.cs` + `LeaveRequests.jsx`) | **PASS** | - `LeaveRequestsController.cs` (L360–390): trong `CreateLeaveRequest`, khi đơn học viên không có `ScheduleId`/`ClassId`, tự suy ra lớp nếu có đúng 1 lớp `Active` (`Status != "Finished"`); nếu >1 lớp `Active`, chọn lớp duy nhất có lịch học ngày `LeaveDate` (`Status != "Cancelled"`); ngược lại giữ `null`. Giữ nguyên logic duyệt đơn & đồng bộ điểm danh.<br>- `LeaveRequests.jsx` (L1127–1129, L1336, L1854, L1860): hiển thị `"Nghỉ cả ngày — tất cả các lớp đang học"` khi `!className` và `branchName || 'Trung tâm'` ở modal chi tiết. |

## 3. Kiểm thử runtime trên `localhost:5123` + `localhost:5173` & Kết luận
- **Giới hạn môi trường sandbox:** Cổng `5123` (API) và `5173` (Web) không chạy trong sandbox, nên chưa tái hiện/test trực tiếp trên trình duyệt 3 kịch bản runtime (tạo thông báo mới kiểm tra chuông, tạo→duyệt→xem lại bằng Phụ huynh, tạo đơn cho học viên 1 lớp vs đơn cũ không có lớp).
- **Trạng thái hiện tại:** **ĐẠT `dotnet build` + `npm run lint` + `npm run build` & đối chiếu mã nguồn 100%**; **CHỜ TEST RUNTIME CẢ 3 LỖI TRÊN LOCALHOST (`5123` + `5173`)** trước khi commit `"Fix đợt 2E: giờ thông báo, người duyệt, lớp/chi nhánh đơn nghỉ"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R1: DESIGN TOKENS + SHELL
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `4adc5ac` (sau Fix đợt 2E)  
**Phạm vi:** Chỉ R1 (`docs/DESIGN.md` Mục 17, `roxy-admin/src/index.css`, `src/components/ui.jsx`, `src/layouts/AdminLayout.jsx`, `src/pages/Dashboard.jsx`, `src/pages/Login.jsx`); không lan sang trang khác, không đổi API/DB/logic/phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 309ms`).

## 2. Kết quả đối chiếu thiết kế & mã nguồn R1
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Phạm vi R1 (`git status -s`) | **PASS** | - Chỉ sửa/tạo đúng 6 file R1 (`docs/DESIGN.md`, `index.css`, `ui.jsx`, `AdminLayout.jsx`, `Dashboard.jsx`, `Login.jsx`); không đụng các trang khác hay backend. |
| Tokens `@theme` (`index.css` vs `docs/DESIGN.md` Mục 17) | **PASS** | - Khớp 100%: `--color-teal` (`#2F4F4A`), `--color-gold` (`#D9A441`), `--color-mint-canvas` (`#F3F6F4`), `--color-surface` (`#FFFFFF`), `--color-ink` (`#1E2E2B`), `--radius-card` / `--radius-card-lg` / `--radius-pill`, `--shadow-card` / `--shadow-card-hover` / `--shadow-modal`; `html, body` dùng `var(--color-mint-canvas)`. |
| Luật tương phản & không còn nút chính xanh dương/indigo | **PASS** | - Mọi nền `bg-gold` (`PrimaryButton`, badge logo `R`) đều dùng chữ `text-teal` (0 trường hợp `text-white` trên nền vàng).<br>- 0 nút chính `bg-blue-600`, `bg-blue-700` hay `bg-indigo-*` trong 5 file R1 (chỉ giữ màu ngữ nghĩa trạng thái/badge). |
| Shell & 2 trang mẫu (`AdminLayout`, `Dashboard`, `Login`) | **PASS** | - `AdminLayout.jsx`: sidebar & mobile drawer `bg-teal`, active item `bg-white/[0.14] text-gold font-semibold`, nền chính `bg-mint-canvas`, giữ nguyên phân quyền menu & drawer mobile.<br>- `Dashboard.jsx` & `Login.jsx`: dùng `PageHeader`, `PrimaryButton`/`SecondaryButton`, `InputPill`, `Card`, `StatCard` (nhãn uppercase nhỏ + số đậm lớn `tabular-nums`); giữ nguyên toàn bộ logic, API (`/Dashboard/summary`, `/Auth/login`, `/Auth/me`) và route. |

## 3. Kiểm tra trình duyệt ở `1440px` & `1280px` & Kết luận
- **Giới hạn môi trường sandbox:** Không mở được trình duyệt/API local trong sandbox để kiểm tra trực quan `Dashboard` và `Login` ở `1440px` và `1280px`.
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu design system 100%**; **CHỜ XEM TRỰC QUAN TRÊN TRÌNH DUYỆT (`1440px` & `1280px`)** trước khi commit `"Trùng tu giao diện R1: design tokens + shell"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2a: `Students.jsx` + `ClassList.jsx`
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `b54198d` (sau Đợt trùng tu R1)  
**Phạm vi:** Chỉ `roxy-admin/src/pages/Students.jsx` và `roxy-admin/src/pages/ClassList.jsx`; không sửa `Dashboard.jsx`, `Login.jsx`, `AdminLayout.jsx`, `index.css`, `ui.jsx` hay trang khác; không đổi API/DB/logic/phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 393ms`).

## 2. Kết quả đối chiếu thiết kế & mã nguồn R2a
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Phạm vi R2a (`git status -s`) | **PASS** | - Trong `roxy-admin/` chỉ sửa đúng 2 file `Students.jsx` và `ClassList.jsx`; không lan sang file khác. |
| Màu sắc, tương phản & component R1 | **PASS** | - Dùng đồng bộ `PageHeader`, `PrimaryButton`, `SecondaryButton`, `InputPill`, `Badge`, `Card` từ `components/ui.jsx`.<br>- 0 nút chính `bg-blue-600`, `bg-blue-700`, `bg-indigo-*`; mọi `PrimaryButton`/`bg-gold-soft` đều dùng chữ `text-teal` (không có `text-white` trên `bg-gold`).<br>- Giữ nguyên màu ngữ nghĩa ở badge trạng thái (`emerald`, `amber`, `rose`, `blue`/`purple`, `neutral`), chip giới tính, hộp ghi chú nội bộ `amber`, cảnh báo xóa/đóng `rose` và huy hiệu phân biệt vai trò. |
| Logic, API, phân quyền & dữ liệu test | **PASS** | - Giữ nguyên toàn bộ API (`/Students`, `/Classes`, `/StudentClasses`, `/LessonProgresses`, `/Schedules`, `/Branches`, `/Courses`, `/Users`), phân quyền vai trò (`canViewInternalNote` ẩn/hiện `Note`), route và dữ liệu test (`TEST #CLS-7`). |

## 3. Kiểm tra trình duyệt ở `1440px` & `1280px` & Kết luận
- **Giới hạn môi trường sandbox:** Cổng `5123` (API) và `5173` (Web) không chạy trong sandbox, nên chưa mở được trình duyệt kiểm tra trực quan `Students` + `ClassList` ở `1440px` & `1280px` (và đối chiếu số liệu tải từ API `localhost:5123`).
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu design system 100%**; **CHỜ KIỂM TRA TRỰC QUAN TRÊN TRÌNH DUYỆT (`1440px` & `1280px`, API `localhost:5123` đang chạy)** trước khi commit `"Trùng tu giao diện R2a: Students + Classes"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2a-fix: LỌC + BẢNG + NÚT THÊM (`Students.jsx` + `ClassList.jsx`)
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `9c55dd2` (sau Đợt trùng tu R2a)  
**Phạm vi:** Chỉ sửa 3 lỗi bố cục ở `roxy-admin/src/pages/Students.jsx` và `roxy-admin/src/pages/ClassList.jsx`; không đổi logic, API, dữ liệu hay phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 316ms`).

## 2. Kết quả đối chiếu 3 lỗi trên mã nguồn & ước lượng ở `1440px`
| Lỗi | Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :--- | :---: | :--- |
| **Lỗi 1** | Nút thêm thừa dấu `+` | **PASS** | - `Students.jsx` (L982–985): giữ 1 icon `<svg>` `+` và `<span>Thêm học viên</span>`.<br>- `ClassList.jsx` (L687–690): giữ 1 icon `<svg>` `+` và `<span>Tạo lớp học mới</span>`. |
| **Lỗi 2** | Select lọc & placeholder ô tìm kiếm bị cắt chữ | **PASS** | - Cả 2 trang (`Students.jsx` L1004–1080, `ClassList.jsx` L698–781) chuyển sang `flex flex-wrap items-center gap-3`, ô tìm kiếm `flex-1 min-w-[240px]`, các `<select>` đứng độc lập với `min-w-[165px]` (`statusFilter` `min-w-[175px]`), tách khỏi nút `Đặt lại` (`shrink-0`). |
| **Lỗi 3** | Bảng ở `1440px` (~1120px khả dụng) | **PASS (Static)** | - Siết padding `px-2 py-2.5`, thu gọn nút thao tác `px-2 py-1 text-[11px]`, giữ `overflow-x-auto` + `sticky right-0` cho cột `Thao tác`.<br>- `Students.jsx` (8 cột): ước lượng **~955–1140px** (vừa khung với dữ liệu thông thường; dữ liệu dài cực đại cuộn nhẹ có `sticky right-0`).<br>- `ClassList.jsx` (9 cột): ước lượng **~1025–1205px** (vừa khung với dữ liệu ngắn–trung bình; khi nhiều cột chạm `max-w-*` cùng lúc vẫn cần cuộn ngang nội bộ nhẹ với `sticky right-0` giữ cột `Thao tác`). |

## 3. Kiểm tra trực quan trên trình duyệt ở `1440px` & Kết luận
- **Giới hạn môi trường sandbox:** Không có dev server + API đăng nhập chạy trong sandbox để mở trình duyệt xem trực quan ở `1440px`.
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu 3 lỗi trên mã nguồn**; **CHỜ XEM TRỰC QUAN TRÊN TRÌNH DUYỆT Ở `1440px`** trước khi commit `"Trùng tu giao diện R2a-fix: lọc + bảng + nút thêm"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2a-fix2: NÚT THAO TÁC DẠNG ICON
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `2eccc1a` (sau Đợt trùng tu R2a-fix)  
**Phạm vi:** Chỉ `roxy-admin/src/components/ui.jsx` (`IconButton`), cột `Thao tác` trong `roxy-admin/src/pages/Students.jsx` và `roxy-admin/src/pages/ClassList.jsx`; không đổi logic, API, dữ liệu hay phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 328ms`).

## 2. Kết quả đối chiếu mã nguồn & bề rộng tại `1440px` / `1280px`
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| `IconButton` dùng chung (`ui.jsx`) | **PASS** | - `h-9 w-9` (~36px), `rounded-full`, `neutral` (`bg-gold-soft/70 border-gold/30 text-teal`) và `danger` (`bg-rose-50/60 border-rose-200/70 text-rose-600`), hỗ trợ `title` + `aria-label`, `focus-visible:ring-gold/50`. |
| Cột `Thao tác` (`Students.jsx` & `ClassList.jsx`) | **PASS** | - Chỉ còn `<IconButton>` + SVG inline (`h-4 w-4`): mắt (chi tiết), bút chì (sửa / parent cập nhật liên hệ), thùng rác (xóa học viên), khóa (đóng lớp); 0 nút chữ, 0 emoji.<br>- Giữ nguyên nút `"Tạo tài khoản"` / `"Đặt lại MK"` (cột Tài khoản `Students.jsx`), các nút chữ trong panel chi tiết lớp (`ClassList.jsx`), phân quyền và `ConfirmModal`. |
| Bề rộng bảng tại `1440px` & `1280px` | **PASS (Static)** | - Cột `Thao tác` thu gọn còn ~136px.<br>- **`1440px` (~1120px khả dụng):** `Students` (~906–1171px) và `ClassList` (~951–1176px) hết cuộn ngang với dữ liệu thông thường/ngắn–trung bình (trường hợp nhiều cột cùng chạm `max-w` chỉ cuộn nhẹ ~20–56px có `sticky right-0`).<br>- **`1280px` (~960px khả dụng):** Với dữ liệu trung bình/dài cả 2 bảng vẫn còn cuộn ngang nội bộ nhẹ (~40–216px) trong `overflow-x-auto` với cột `Thao tác` sticky. |

## 3. Kiểm tra trình duyệt ở `1440px` & `1280px` & Kết luận
- **Giới hạn môi trường sandbox:** Không mở được trình duyệt trong sandbox để kiểm tra tooltip hover và đo DOM thực tế ở `1440px` & `1280px`.
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu mã nguồn**; **CHỜ XEM TRỰC QUAN TRÊN TRÌNH DUYỆT (`1440px` & `1280px`)** trước khi commit `"Trùng tu giao diện R2a-fix2: nút thao tác dạng icon"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2b: TEACHERS + BRANCHES + COURSES
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `e64c62b` (sau Đợt trùng tu R2a-fix2)  
**Phạm vi:** 6 file R2b (`Teachers.jsx`, `TeacherModals.jsx`, `Branches.jsx`, `BranchDetail.jsx`, `BranchModals.jsx`, `Courses.jsx`); không đổi R1/R2a hay trang khác; không đổi API/DB/logic/phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 390ms`).

## 2. Kết quả đối chiếu thiết kế, tương phản & bề rộng tại `1440px` / `1280px`
| Hạng mục kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :---: | :--- |
| Phạm vi R2b (`git status -s`) | **PASS** | - Trong `roxy-admin/` chỉ sửa đúng 6 file R2b; không lan sang R1/R2a hay trang khác. |
| Màu sắc, tương phản & component R1/R2a-fix2 | **PASS** | - 0 nút chính `bg-blue-600`, `bg-blue-700`, `bg-indigo-*`; mọi `PrimaryButton`/`bg-gold` dùng chữ `text-teal`; nút CTA thêm mới không lặp dấu `+`.<br>- Cột `Thao tác` trong bảng (`Teachers.jsx`, `Courses.jsx`) và chân card (`Branches.jsx`) dùng `<IconButton>` + SVG inline (`h-4 w-4`) kèm `title` + `aria-label`, không dùng nút chữ hay emoji.<br>- Giữ nguyên huy hiệu phân biệt vai trò, màu ngữ nghĩa badge trạng thái, toàn bộ logic, API, phân quyền (kể cả màn hình 403), dữ liệu test và route. |
| Bề rộng bảng tại `1440px` (~1120px) & `1280px` (~960px) | **PASS (Static)** | - `Teachers.jsx` (~860–940px), `BranchDetail.jsx` (~720–880px), `Courses.jsx` (~800–920px) dùng `px-2.5 py-2.5` → đều nằm gọn trong khung `1440px` và `1280px` không cuộn ngang. |

## 3. Kiểm tra trình duyệt ở `1440px` & `1280px` & Kết luận
- **Giới hạn môi trường sandbox:** Không mở được trình duyệt trong sandbox để kiểm tra trực quan `Teachers`, `Branches` (+ chi tiết 1 chi nhánh), `Courses` ở `1440px` & `1280px`.
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu mã nguồn 100%**; **CHỜ XEM TRỰC QUAN TRÊN TRÌNH DUYỆT (`1440px` & `1280px`)** trước khi commit `"Trùng tu giao diện R2b: Teachers + Branches + Courses"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2b-fix: CĂN LỀ CỘT THAO TÁC + NHÃN THỐNG KÊ
**Ngày kiểm tra:** 18/11/2026  
**Người thực hiện:** QA Agent & Commander  
**Commit gốc:** `7027745` (sau Đợt trùng tu R2b)  
**Phạm vi:** Chỉ 3 file (`roxy-admin/src/pages/Teachers.jsx`, `Courses.jsx`, `Branches.jsx`); không đụng `Students.jsx`, `ClassList.jsx` hay backend; không đổi logic, API, dữ liệu hay phân quyền.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm --prefix roxy-admin run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm --prefix roxy-admin run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 389ms`).

## 2. Kết quả đối chiếu 4 hạng mục sửa trên mã nguồn
| Hạng mục | Kiểm tra | Kết quả | Chi tiết đối chiếu |
| :--- | :--- | :---: | :--- |
| **1. Cột `Thao tác`** | Đồng bộ `<th>` & `<td>` giữa `Teachers.jsx`, `Courses.jsx` với `Students.jsx`, `ClassList.jsx` | **PASS** | - Trước sửa (đo ở `1438px`): `Teachers.jsx` lệch mép phải ~`15px`, `Courses.jsx` lệch ~`30px` (do `text-center w-28` + `justify-center`).<br>- Sau sửa: `Teachers.jsx` & `Courses.jsx` đồng bộ `px-2 py-2.5 text-right whitespace-nowrap sticky right-0` + shadow ở cả `<th>` và `<td>`, cụm icon `inline-flex items-center justify-end gap-1` khớp mẫu `Students.jsx` & `ClassList.jsx`. |
| **2. Thẻ thống kê Chi nhánh** | Bỏ cắt chữ `…` ở `Branches.jsx` | **PASS** | - Bỏ `truncate` ở 4 nhãn (`Chi nhánh hoạt động`, `Lớp đang mở`, `Học viên đang học`, `Giáo viên cơ sở`), thay bằng `leading-snug` để đọc đủ chữ. |
| **3. Tiêu đề Chi nhánh** | Bỏ chữ thừa ở `Branches.jsx` | **PASS** | - L178: đổi `"Quản lý Chi nhánh Cơ sở"` → `"Quản lý Chi nhánh"`. |
| **4. Badge Giáo viên** | Chống ngắt 3 dòng ở `Teachers.jsx` | **PASS** | - 4 `<Badge>` (`Đang hoạt động`, `Đã khóa`, `Đã đặt mật khẩu`, `Chưa có mật khẩu`) gắn `whitespace-nowrap`; `<td>` đặt `min-w-[130px]` / `min-w-[140px]`. |

## 3. Đo `getBoundingClientRect()` trên trình duyệt (`1440px` & `1280px`) & Kết luận
- **Giới hạn môi trường sandbox:** Không có trình duyệt/Playwright trong sandbox để mở trang và đo `getBoundingClientRect()` mép phải `<th>` "Thao tác" vs icon cuối cùng sau khi sửa.
- **Trạng thái hiện tại:** **ĐẠT `npm run lint` + `npm run build` & đối chiếu mã nguồn**; **CHỜ ĐO TRỰC QUAN `getBoundingClientRect()` TRÊN TRÌNH DUYỆT (`1440px` & `1280px`, sai số <= 2px)** trước khi commit `"Trùng tu giao diện R2b-fix: căn lề cột thao tác + nhãn thống kê"`.


---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R2b-fix3: CẮT NGÀY BẢNG GIÁO VIÊN + MENU NGƯỜI DÙNG BỊ ĐÈ
**Ngày kiểm tra:** 20/11/2026  
**Người thực hiện:** QA Agent  
**Commit gốc:** `d05ec32`  
**Phạm vi:** Chỉ 2 file (`roxy-admin/src/pages/Teachers.jsx`, `roxy-admin/src/layouts/AdminLayout.jsx`, chưa commit); không sửa backend, DB hay luồng nghiệp vụ.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 397ms`).

## 2. Nguyên nhân gốc rễ (Root Cause)
1. **Bảng Giáo viên bị tràn khung & cắt ngày tạo (`Teachers.jsx`):** Ở độ rộng màn hình `1438px`/`1440px`, bảng có bề rộng `1147px` > khung chứa `1116px`/`1118px` do đặt `min-w-[130px]` / `min-w-[140px]` ở 2 ô badge (`Trạng thái`, `Mật khẩu`), padding ô `px-2`, và cột `Chi nhánh` không `truncate`. Hệ quả là phát sinh cuộn ngang nội bộ và cột `Thao tác` (`sticky right-0`) trượt đè lên cột `Tạo / Đăng nhập` làm cắt ngày tạo. Cách sửa: bỏ `min-w-[130px]` / `min-w-[140px]`, thu gọn padding ô (`px-1.5` / `pl-2.5 pr-1.5`), thêm `truncate max-w-[110px]` cho `Chi nhánh`, giới hạn `max-w-[140px]` tên giáo viên & `max-w-[135px]` email, và giữ `whitespace-nowrap` cho cột `Tạo / Đăng nhập`.
2. **Menu người dùng bị nút "Đặt lại" ở `/grades` đè lên (`AdminLayout.jsx` + `Grades.jsx`):** `<header>` có `backdrop-filter: blur(8px)` (`backdrop-blur`) nên tự tạo stacking context mới ở trạng thái `position: static; z-index: auto`, giam `div[role="menu"]` (`absolute z-40`) bên trong stacking context của `<header>`. Trong khi đó `<main>` nằm sau `<header>` trong DOM và nút `"Đặt lại"` có `disabled:opacity-50` (`opacity: 0.5`) cũng tạo stacking context ở `z-index: auto`, nên được vẽ đè lên dropdown (che mục `"Đăng xuất"`). Cách sửa: thêm `relative z-40` vào `<header>` trong `AdminLayout.jsx`.

## 3. Kết quả kiểm tra thực tế trên trình duyệt thật (`1440px` & `1280px`)
- **Môi trường đo:** Chrome headless + Playwright, Vite dev server `http://localhost:5174` proxy tới API `http://localhost:5123` (đăng nhập `SuperAdmin`).

| Màn hình & Hạng mục | Kết quả `1440px` | Kết quả `1280px` | Số liệu đo DOM thực tế |
| :--- | :---: | :---: | :--- |
| **`/teachers` — Cuộn ngang nội bộ bảng** | **PASS** | **PASS** | - `1440px`: `clientWidth = 1118px`, `scrollWidth = 1118px`, `table.offsetWidth = 1118px` (tràn `0px`).<br>- `1280px`: `clientWidth = 958px`, `scrollWidth = 958px`, `table.offsetWidth = 958px` (tràn `0px`). |
| **`/teachers` — Cột `TẠO / ĐĂNG NHẬP` ở vị trí mặc định** | **PASS** | **PASS** | - `1440px`: mép phải chữ `"Tạo: 13/11/2026"` = `1126.9px` < mép trái cột `Thao tác` = `1207.8px` (không bị đè/cắt).<br>- `1280px`: mép phải chữ `"Tạo: 13/11/2026"` = `1020.2px` < mép trái cột `Thao tác` = `1076.4px` (không bị đè/cắt). |
| **`/teachers` — Badge trạng thái & mật khẩu 1 dòng** | **PASS** | **PASS** | - `"ĐANG HOẠT ĐỘNG"`: `height = 21.7px`, `1` dòng ở cả `1440px` & `1280px`.<br>- `"ĐÃ ĐẶT MẬT KHẨU"`: `height = 21.7px`, `1` dòng ở cả `1440px` & `1280px`. |
| **`/grades` — Menu người dùng đè lên nút `"Đặt lại"`** | **PASS** | **PASS** | - `<header>`: `position: relative; z-index: 40`.<br>- Dù vùng menu (`y: 60..254`) giao trực tiếp với nút `"Đặt lại"` (`y: 210..254`, `disabled: true`), `document.elementsFromPoint()` tại toàn bộ 9 điểm mẫu & tâm nút `"Đăng xuất"` đều trả về `div[role="menu"]` trên cùng (`logoutTopmost: true`, `occludedPoints: []`). |
| **`/students` & `/teachers` — Menu người dùng trên trang có thanh lọc** | **PASS** | **PASS** | - Mở menu người dùng ở cả 2 độ phân giải: `logoutTopmost: true`, `occludedPoints: []`, không bị thanh lọc hay phần tử nào che khuất. |

## 4. Kết luận R2b-fix3
- **Trạng thái nghiệm thu:** **PASS 100%** ở cả `1440px` và `1280px` (build, lint, bảng `Teachers` hết cuộn ngang & hết cắt ngày, dropdown menu người dùng hiển thị trọn vẹn trên nút `"Đặt lại"` và toàn bộ nội dung). Không còn lỗi chặn, đủ điều kiện để commit.

---

# BÁO CÁO QA — ĐỢT TRÙNG TU GIAO DIỆN R3: DASHBOARD, LỊCH HỌC, ĐIỂM DANH, BÀI TẬP, BẢNG ĐIỂM & ĐƠN XIN NGHỈ
**Ngày kiểm tra:** 20/11/2026  
**Người thực hiện:** QA Agent  
**Commit gốc:** `aa03bd8`  
**Phạm vi:** Kiểm thử 6 file đã sửa (`Dashboard.jsx`, `Schedules.jsx`, `Attendance.jsx`, `Homeworks.jsx`, `Grades.jsx`, `LeaveRequests.jsx`, chưa commit); không sửa `AdminLayout.jsx`, không sửa code nguồn ứng dụng.

## 1. Kết quả Lint & Build (`roxy-admin/`)
- `npm run lint` (`eslint .`): **PASS** (0 error, 0 warning).
- `npm run build` (`vite build`): **PASS** (`✓ 113 modules transformed`, `✓ built in 344ms`).

## 2. Kiểm tra tĩnh trên 6 file đã sửa
- **Nút chính `bg-blue-*` / `bg-indigo-*`:** **PASS** — Không còn `<button>` nào dùng `bg-blue-*` hoặc `bg-indigo-*` trên cả 6 file (chỉ còn badge/link phụ `bg-blue-50` / `bg-indigo-50`).
- **Emoji làm icon trong nút:** **PASS** — Đã dọn sạch toàn bộ emoji màu trong các nút modal ở `Homeworks.jsx` & `LeaveRequests.jsx` (chỉ còn các ký tự văn bản/dingbat đơn giản `✓`, `✕`, `✉`).

## 3. Kết quả kiểm tra thực tế trên trình duyệt thật (`1440px` & `1280px`)
- **Môi trường đo:** Chrome headless + Playwright, Vite dev server `http://localhost:5174` proxy tới API `http://localhost:5123` (đăng nhập `SuperAdmin`).

| Màn hình & Hạng mục | Kết quả `1440px` | Kết quả `1280px` | Số liệu đo DOM thực tế |
| :--- | :---: | :---: | :--- |
| **`/dashboard` — 4 thẻ thống kê & tràn trang** | **PASS** | **PASS** | - `docClientWidth === docScrollWidth` (`1440px` & `1280px`, tràn `0px`).<br>- Cả 4 thẻ thống kê (`HỌC VIÊN ĐANG HỌC`, `LỚP ĐANG MỞ`, `GIÁO VIÊN`, `ĐƠN XIN NGHỈ CHỜ DUYỆT`) đều dùng `border-l-4 border-l-teal`, không còn viền `emerald`/`amber`. |
| **`/schedules` — Không tràn trang & giữ lưới 7 cột `min-w-[1320px]`** | **PASS** | **PASS** | - `1440px`: `docScrollWidth = 1440px` (tràn trang `0px`); `.overflow-x-auto` (`clientWidth = 1120px`, `scrollWidth = 1322px`) chứa lưới 7 cột `min-w-[1320px]` (`offsetWidth = 1320px`).<br>- `1280px`: `docScrollWidth = 1280px` (tràn trang `0px`); `.overflow-x-auto` (`clientWidth = 960px`, `scrollWidth = 1322px`) chứa lưới 7 cột `min-w-[1320px]` (`offsetWidth = 1320px`). |
| **`/attendance` — Cuộn ngang nội bộ bảng** *(buổi `2026-10-20`)* | **PASS** | **PASS** | - `1440px`: `clientWidth = 1118px`, `scrollWidth = 1118px`, `table.offsetWidth = 1118px` (tràn `0px`).<br>- `1280px`: `clientWidth = 958px`, `scrollWidth = 958px`, `table.offsetWidth = 958px` (tràn `0px`). |
| **`/homeworks` — Cuộn ngang nội bộ bảng** | **PASS** | **PASS** | - `1440px`: `clientWidth = 1118px`, `scrollWidth = 1118px`, `table.offsetWidth = 1118px` (tràn `0px`).<br>- `1280px`: `clientWidth = 958px`, `scrollWidth = 958px`, `table.offsetWidth = 958px` (tràn `0px`). |
| **`/homeworks` — Căn giữa cột `THAO TÁC`** | **PASS** | **PASS** | - `1440px`: `thCenter = 1325.4px`, `btnsCenter = 1325.4px` (`deltaPx = 0px`).<br>- `1280px`: `thCenter = 1173.0px`, `btnsCenter = 1173.0px` (`deltaPx = 0px`). |
| **`/grades` — Cuộn ngang nội bộ bảng** *(sau khi `frontend` sửa)* | **PASS** | **PASS** | - `1440px`: `clientWidth = 1118px`, `scrollWidth = 1118px`, `table.offsetWidth = 1118px` (tràn `0px`).<br>- `1280px`: `clientWidth = 958px`, `scrollWidth = 958px`, `table.offsetWidth = 958px` (tràn `0px`). |
| **`/grades` — Căn giữa cột `THAO TÁC`** | **PASS** | **PASS** | - `1440px`: `thCenter = 1347.9px`, `btnsCenter = 1347.9px` (`deltaPx = 0px`).<br>- `1280px`: `thCenter = 1196.4px`, `btnsCenter = 1196.4px` (`deltaPx = 0px`). |
| **`/leave-requests` — Cuộn ngang nội bộ bảng** | **PASS** | **PASS** | - `1440px`: `clientWidth = 1118px`, `scrollWidth = 1118px`, `table.offsetWidth = 1118px` (tràn `0px`).<br>- `1280px`: `clientWidth = 958px`, `scrollWidth = 958px`, `table.offsetWidth = 958px` (tràn `0px`). |
| **`/leave-requests` — Căn giữa cột `THAO TÁC`** | **PASS** | **PASS** | - `1440px`: `thCenter = 1353.0px`, `btnsCenter = 1353.0px` (`deltaPx = 0px`).<br>- `1280px`: `thCenter = 1193.0px`, `btnsCenter = 1193.0px` (`deltaPx = 0px`). |
| **`/grades` & `/homeworks` — Menu người dùng** | **PASS** | **PASS** | - `<header>`: `position: relative; z-index: 40`.<br>- `elementsFromPoint()` tại 9 điểm mẫu & tâm nút `"Đăng xuất"` đều trả về `div[role="menu"]` trên cùng (`logoutTopmost: true`, `occludedPoints: []`) ở cả `1440px` & `1280px`. |

## 4. Kết luận R3
- **Trạng thái nghiệm thu:** **PASS 100%** ở cả `1440px` và `1280px` (build, lint, kiểm tra tĩnh 6 file sạch nút `bg-blue-*`/`bg-indigo-*` và sạch emoji trong nút, 4 bảng `Attendance`/`Homeworks`/`Grades`/`LeaveRequests` đều `0px` cuộn ngang nội bộ, `Schedules` giữ lưới 7 cột `min-w-[1320px]` không tràn trang, cột `THAO TÁC` căn giữa `deltaPx = 0px`, `Dashboard` chỉ dùng `teal`+`gold`, menu người dùng nằm trên mọi nội dung). Không còn lỗi chặn, đủ điều kiện để commit.
