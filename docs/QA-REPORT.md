# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1C (SCHEDULES & ATTENDANCE)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Lịch học (`/schedules`) & Điểm danh (`/attendance`)  
**Ngày kiểm thử:** 14/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/AUDIT.md` (§7.2), `docs/API.md`, `docs/DESIGN.md` (Mục 8), `RoxyAppDB.sql`  

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

Tất cả các lệnh build và lint được thực thi trực tiếp trên mã nguồn thực tế và đều đạt kết quả xuất sắc:

| Thành phần | Câu lệnh kiểm tra | Kết quả thực tế | Chi tiết console |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build RoxyAppBE/RoxyAcademy.Api/RoxyAcademy.Api.csproj` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>Time Elapsed: 00:00:04.87 |
| **Frontend Lint** | `npm run lint` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>ESLint kiểm tra sạch toàn bộ source |
| **Frontend Build** | `npm run build` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s)**<br>88 modules transformed thành công trong 204ms.<br>Dist: `index.html` (0.49 kB), `index-*.css` (38.98 kB), `index-*.js` (431.32 kB) |

---

## 2. BẢNG MA TRẬN TEST CASES GIAI ĐOẠN 1C

| Mã Test Case | Nội dung kiểm thử | Đối tượng kiểm tra | Kết quả | Ghi chú & Trạng thái |
| :---: | :--- | :--- | :---: | :--- |
| **TC-SCH-01** | Lọc lịch theo tuần / chi nhánh / lớp / giáo viên & RBAC | `SchedulesController.GetSchedules`<br>`roxy-admin/src/pages/Schedules.jsx` | **PASS** | Phân quyền 5 vai trò chặt chẽ; `BranchManager` tự động khóa chi nhánh mình; `Teacher` chỉ thấy lớp mình dạy hoặc dạy thay; Lọc ngày ISO theo tuần thứ Hai đến Chủ Nhật. |
| **TC-SCH-02** | Tạo buổi học: chặn lớp chưa có GV & kiểm soát RBAC | `SchedulesController.CreateSchedule`<br>`roxy-admin/src/pages/Schedules.jsx` | **PASS** | Chặn cả 2 đầu (Frontend disable option + Backend trả 400 Bad Request nếu lớp chưa phân công giáo viên giảng dạy); Chặn `BranchManager` tạo lịch cơ sở khác (403); Kiểm tra `EndTime > StartTime`. |
| **TC-SCH-03** | Cập nhật & Xóa buổi học, bảo vệ khóa ngoại (FK Integrity) | `SchedulesController` (`PUT`, `DELETE`)<br>`roxy-admin/src/pages/Schedules.jsx` | **PASS** | `PUT` kiểm tra RBAC và enum `Scheduled\|Completed\|Cancelled`; `DELETE` kiểm tra 4 ràng buộc FK (`Attendances`, `LessonProgresses`, `Homeworks`, `LeaveRequests`) trước khi cho phép xóa. |
| **TC-ATT-01** | Điểm danh hàng loạt & Phân quyền, chế độ Read-Only | `AttendancesController` (`GET`, `POST /bulk`)<br>`roxy-admin/src/pages/Attendance.jsx` | **PASS** | Khớp 100% DB enum `Present, Late, ExcusedAbsent, UnexcusedAbsent`; `Teacher` phụ trách/dạy thay hoặc Staff đúng chi nhánh mới được chấm; User khác ở chế độ Read-Only với badge tĩnh và cảnh báo rõ ràng. |
| **TC-CLS-01** | Mặc định `teacherId` để trống (`''`) khi tạo lớp mới | `roxy-admin/src/pages/ClassList.jsx` | **PASS** | Modal tạo lớp mở ra có `teacherId: ''`, hiển thị option `-- Chọn giáo viên phụ trách --`, chặn submit nếu chưa chọn. |
| **TC-NAV-01** | Mở tuyến đường `/schedules` và `/attendance` | `roxy-admin/src/App.jsx`<br>`roxy-admin/src/layouts/AdminLayout.jsx` | **PASS** | Đã khai báo 2 route bên trong `ProtectedRoute` + `AdminLayout`; Menu Desktop và Mobile Drawer đều có mục 📅 Lịch học và 📋 Điểm danh. |
| **TC-SEC-01** | Rà soát URL cứng `localhost` trong toàn bộ Frontend | `roxy-admin/src/**/*.*` | **PASS** | 0 vị trí hard-code `localhost`; tất cả đều gọi qua `axiosClient` sử dụng `VITE_API_BASE_URL` hoặc proxy `/api`. |
| **TC-MOB-01** | Giao diện di động Mobile-Native theo chuẩn Apple | `Schedules.jsx`, `Attendance.jsx` | **PASS** | Day picker cuộn ngang, thẻ dọc; Nút bấm touch target đạt chuẩn Apple HIG (`min-h-[44px]`); Bottom sticky action bar trên điện thoại. |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT EVIDENCE)

### 3.1. TC-SCH-01: Lọc lịch học theo tuần / chi nhánh / lớp / giáo viên & RBAC
- **Backend:** `RoxyAppBE/RoxyAcademy.Api/Controllers/SchedulesController.cs` (Dòng 19-115)
  - Phân quyền theo vai trò (Role-based scope):
    - `SuperAdmin`: Được xem toàn bộ lịch học hệ thống.
    - `BranchManager` (dòng 39-42): Tự động gán bộ lọc `s.Class.BranchId == userBranchId`. Bỏ qua param `branchId` gửi lên nếu khác chi nhánh của mình (dòng 72).
    - `Teacher` (dòng 44-46): `s.Class.TeacherId == UserId || s.SubstituteTeacherId == UserId`. Chỉ thấy lớp mình dạy chính hoặc được phân công dạy thay.
    - `Parent` (dòng 48-53): Chỉ thấy lịch các lớp có con mình đang theo học với trạng thái `Active`.
    - `Student` (dòng 55-60): Chỉ thấy lịch lớp chính mình đang theo học với trạng thái `Active`.
  - Bộ lọc query dynamic: Lọc chính xác theo `classId`, `branchId`, `teacherId`, `fromDate`, `toDate`.
- **Frontend:** `roxy-admin/src/pages/Schedules.jsx` (Dòng 21-68, 127-189)
  - Quản lý tuần từ Thứ Hai đến Chủ Nhật (`getMonday`), định dạng chuẩn ISO `YYYY-MM-DD`.
  - Bộ lọc Dropdown: Cơ sở (BranchManager tự động khóa theo `branchId`), Lớp học, Giáo viên.
  - Gom lịch học theo từng ngày trong tuần và hiển thị grid 7 cột trên Desktop, thanh Day Picker Pill Tabs trên Mobile.

---

### 3.2. TC-SCH-02: Tạo buổi học & Ràng buộc Giáo viên
- **Backend:** `RoxyAppBE/RoxyAcademy.Api/Controllers/SchedulesController.cs` (Dòng 183-238)
  - Ràng buộc phân quyền: `BranchManager` không thể tạo lịch cho lớp chi nhánh khác (`cls.BranchId != userBranchId -> Forbid()`).
  - `Teacher` chỉ được tạo lịch cho lớp mình phụ trách chính (`cls.TeacherId != UserId -> 403 Forbidden`).
  - **Chặn lớp chưa có giáo viên (Dòng 204-207):**
    ```csharp
    if (cls.TeacherId <= 0 || !await db.Users.AnyAsync(u => u.Id == cls.TeacherId && u.Role == "Teacher"))
    {
        return BadRequest(new { message = "Lớp học chưa được phân công giáo viên giảng dạy, không thể lên lịch học." });
    }
    ```
  - Kiểm tra giờ kết thúc: `if (req.EndTime <= req.StartTime) return BadRequest(...)`.
  - Kiểm tra tài khoản giáo viên dạy thay nếu có: bắt buộc tồn tại và có vai trò `Teacher`.
- **Frontend:** `roxy-admin/src/pages/Schedules.jsx` (Dòng 847-872, 301-313)
  - Dropdown chọn lớp học trong modal tạo mới tự động gắn cờ:
    - Nếu lớp chưa có GV: Khóa thuộc tính `disabled`, hiển thị nhãn `[Chưa gán GV] {Tên lớp} (Không thể chọn)`.
    - Kèm cảnh báo nền hổ phách: `⚠️ Lớp này chưa được phân công giáo viên phụ trách...`
  - Validation trước khi submit: Chặn ngay nếu chưa chọn lớp hoặc lớp chưa có giáo viên.

---

### 3.3. TC-SCH-03: Sửa / Xóa buổi học & Bảo vệ toàn vẹn khóa ngoại (FK Integrity)
- **Backend:** `RoxyAppBE/RoxyAcademy.Api/Controllers/SchedulesController.cs`
  - **Sửa buổi học (`PUT /api/Schedules/{id}` - Dòng 240-282):**
    - Kiểm tra quyền: `BranchManager` chỉ sửa buổi học thuộc cơ sở mình; `Teacher` chỉ sửa buổi học mình dạy chính hoặc dạy thay.
    - Validate `EndTime > StartTime`.
    - Validate trạng thái buổi học theo DTO regex: `^(Scheduled|Completed|Cancelled)$` khớp ràng buộc DB `CK_Schedules_Status`.
  - **Xóa buổi học (`DELETE /api/Schedules/{id}` - Dòng 284-325):**
    - Quyền hạn: Chỉ `SuperAdmin` và `BranchManager` (cùng cơ sở).
    - **Bảo vệ toàn vẹn 4 bảng khóa ngoại tham chiếu đến Schedule:**
      1. `Attendances`: Chặn xóa và thông báo `Không thể xóa buổi học đã có dữ liệu điểm danh. Vui lòng chuyển trạng thái sang Đã hủy (Cancelled).`
      2. `LessonProgresses`: Chặn xóa và thông báo `Không thể xóa buổi học đã gắn tiến độ bài học. Vui lòng xóa hoặc gỡ liên kết bài học trước.`
      3. `Homeworks`: Chặn xóa và thông báo `Không thể xóa buổi học đã gắn bài tập về nhà. Vui lòng xóa bài tập trước.`
      4. `LeaveRequests`: Chặn xóa và thông báo `Không thể xóa buổi học đã có đơn xin nghỉ phép liên kết.`
- **Frontend:** `roxy-admin/src/pages/Schedules.jsx` (Dòng 477-495, 278-293)
  - Chỉ hiển thị nút Sửa (✏️) và Xóa (🗑️) cho `SuperAdmin` hoặc `BranchManager` (`canManage`).
  - Hộp thoại xác nhận trước khi xóa (`window.confirm`) và hiển thị thông báo lỗi chi tiết nếu vi phạm FK.

---

### 3.4. TC-ATT-01: Điểm danh hàng loạt & Phân quyền, Chế độ Read-Only
- **Backend:** `RoxyAppBE/RoxyAcademy.Api/Controllers/AttendancesController.cs`
  - `GET /api/Attendances?scheduleId={id}` (Dòng 19-158):
    - Tự động nạp toàn bộ học viên đang học trong lớp (`StudentClasses.Status == 'Active'`).
    - Nạp bản ghi điểm danh hiện có (`Attendances`) và map với danh sách học viên. Trả về `id: null`, `status: null` cho học viên chưa điểm danh.
    - Phân quyền xem: Phụ huynh/Học viên chỉ thấy dòng của con mình/bản thân.
  - `POST /api/Attendances/bulk` (Dòng 160-231):
    - Quyền chấm: `SuperAdmin`, `BranchManager` (đúng chi nhánh), `Teacher` (giáo viên chính hoặc dạy thay buổi đó). Các đối tượng khác trả về `403 Forbidden`.
    - DTO `BulkAttendanceRequest` ràng buộc regex `^(Present|Late|ExcusedAbsent|UnexcusedAbsent)$` khớp 100% DB Constraint `CK_Attendances_Status`.
    - Tự động chèn mới nếu chưa có hoặc cập nhật nếu đã có. Ghi nhận `MarkedBy = UserId`, `MarkedAt = DateTime.UtcNow`.
    - Tự động chuyển `Schedule.Status` từ `"Scheduled"` thành `"Completed"`.
- **Frontend:** `roxy-admin/src/pages/Attendance.jsx`
  - Kiểm tra `canEditAttendance` (dòng 208-222): Đúng vai trò và chi nhánh/buổi học phụ trách.
  - **Chế độ Read-Only:** Nếu không có quyền chấm, toàn bộ nút 1 chạm chuyển thành 1 badge tĩnh chỉ thị trạng thái, ẩn nút `Lưu điểm danh` và `Tất cả có mặt`, hiển thị thanh thông báo: `ℹ️ Chế độ chỉ xem: Bạn không có quyền chỉnh sửa điểm danh của buổi học này...`
  - Thống kê thời gian thực: Đếm số lượng Có mặt, Đi trễ, Nghỉ phép, Không phép, Chưa chấm.
  - Nút `Đánh dấu tất cả Có mặt` cho phép hoàn thành điểm danh lớp trong 1 chạm.
  - Dấu vết kiểm toán (Audit Trail): Hiển thị ở cuối bảng `Điểm danh lần cuối bởi: [MarkedByName] lúc [MarkedAt]`.

---

### 3.5. ClassList.jsx: Mặc định `teacherId` để trống
- **Vị trí kiểm tra:** `roxy-admin/src/pages/ClassList.jsx`
  - Dòng 46: Khởi tạo state ban đầu `teacherId: ''`.
  - Dòng 159: Hàm `handleOpenCreateModal` gán `teacherId: ''` (không lấy `teachers[0].id`).
  - Dòng 724: Thẻ `<select>` có option mặc định đầu tiên `<option value="">-- Chọn giáo viên phụ trách --</option>`.
  - Dòng 223-226: Hàm `handleSubmit` chặn nếu chưa chọn giáo viên:
    ```javascript
    if (!formData.teacherId) {
      setSubmitError('Vui lòng chọn giáo viên phụ trách.');
      return;
    }
    ```

---

### 3.6. App.jsx & AdminLayout.jsx: Mở tuyến đường & Menu
- **`roxy-admin/src/App.jsx`:**
  - Dòng 6-7: Import `Schedules` và `Attendance`.
  - Dòng 23-24: Khai báo route `/schedules` và `/attendance` nằm trong `ProtectedRoute` và `AdminLayout`.
- **`roxy-admin/src/layouts/AdminLayout.jsx`:**
  - Dòng 85-92: Thêm 2 mục menu `📅 Lịch học` (trỏ `/schedules`) và `📋 Điểm danh` (trỏ `/attendance`).
  - Cả Desktop Sidebar và Mobile Drawer đều đồng bộ thông qua hàm `renderNavLinks`.

---

### 3.7. Kiểm tra Hard-code `localhost`
- Thực hiện quét toàn bộ thư mục `roxy-admin/src/` bằng câu lệnh `Select-String -Path "roxy-admin/src/**/*.*" -Pattern "localhost"`.
- **Kết quả:** **0 kết quả** (Không có bất kỳ chuỗi `localhost` nào bị hard-code). Mọi lệnh gọi API đều đi qua `axiosClient` với base URL cấu hình linh hoạt.

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

1. **Tổng số lỗi chặn (Blocker):** **0**
2. **Tổng số lỗi nghiêm trọng (Critical):** **0**
3. **Mã nguồn Backend và Frontend:** Build thành công 100%, Lint sạch 100%, logic đồng bộ tuyệt đối với Database và Design System.
4. **Kết luận:** Giai đoạn 1C (Schedules + Attendance UI & Backend) **ĐẠT CHUẨN NGHIỆM THU QA (PASSED)**, đủ điều kiện để tiếp tục các giai đoạn phát triển tiếp theo hoặc chuẩn bị triển khai.
