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
