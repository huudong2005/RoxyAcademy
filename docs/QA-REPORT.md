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
