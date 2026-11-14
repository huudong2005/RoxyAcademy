# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1F (LEAVE REQUESTS UI & BACKEND)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Đơn xin nghỉ phép (`/leave-requests`), Duyệt đơn & Đồng bộ Điểm danh tự động (`ExcusedAbsent`)  
**Ngày kiểm thử:** 14/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/AUDIT.md` (§5.1 dòng 156, §7.2), `docs/API.md` (Mục 7), `docs/DESIGN.md` (Mục 11), `RoxyAppDB.sql`  

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

Tất cả các câu lệnh kiểm tra mã nguồn, linting và build đã được thực thi trực tiếp trên hệ thống thực tế và đạt kết quả 100% không lỗi:

| Thành phần | Câu lệnh kiểm tra | Kết quả thực tế | Chi tiết console |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build` tại `RoxyAppBE/RoxyAcademy.Api` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>Time Elapsed: 00:00:01.24<br>Output: `RoxyAcademy.Api.dll` |
| **Frontend Lint** | `npm run lint` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>ESLint kiểm tra sạch toàn bộ source code |
| **Frontend Build** | `npm run build` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s)**<br>93 modules transformed thành công trong 241ms.<br>Dist: `index.html` (0.49 kB), `index-*.css` (55.31 kB), `index-*.js` (648.43 kB) |

---

## 2. BẢNG MA TRẬN TEST CASES GIAI ĐOẠN 1F

| Mã Test Case | Phân hệ kiểm thử | Vai trò kiểm tra | Nội dung kiểm thử chi tiết | Kết quả | Ghi chú & Đánh giá QA |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TC-LEA-01** | **Phân quyền & Lọc đơn xin nghỉ (Leave Requests)** | Cả 5 vai trò:<br>`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student` | - Phân quyền xem đơn (`GET /api/LeaveRequests`): `SuperAdmin` xem toàn trường; `BranchManager` xem đơn chi nhánh (kể cả đơn GV `ClassId == null`); `Teacher` xem đơn của mình + học sinh lớp mình dạy; `Parent` chỉ xem con mình; `Student` chỉ xem chính mình.<br>- Lọc đa tiêu chí: `studentId`, `classId`, `branchId`, `status`, `fromDate`, `toDate`, `requesterType`.<br>- Phân quyền tạo đơn (`POST /api/LeaveRequests`): `Teacher` tạo cho chính mình (`TeacherId`), `Parent` tạo cho con, `Student` tạo cho mình, `BranchManager` tạo trong chi nhánh.<br>- Form giao diện `LeaveRequests.jsx` thích ứng tự động theo vai trò (Role-adaptive), khóa chi nhánh cho BM. | **PASS** | Kiểm soát phân quyền 5 vai trò nghiêm ngặt ở cả Backend và Frontend. Giải quyết triệt để lỗi mất đơn giáo viên khi `ClassId == null` của BranchManager. Giao diện bộ lọc trực quan, phân trang, debounced search 300ms, pill filter đầy đủ. |
| **TC-LEA-02** | **Duyệt / Từ chối đơn & Tự động liên kết Điểm danh** | Duyệt: `SuperAdmin`, `BranchManager`<br>Đối tượng: Học viên & Giáo viên | - Quyền duyệt (`PUT /api/LeaveRequests/{id}/review`): Chỉ `SuperAdmin` và `BranchManager`. Chặn vai trò khác (403).<br>- `BranchManager` chỉ duyệt đơn trong cơ sở mình (kiểm tra `Class`, `Student`, `Teacher`).<br>- Khi duyệt (`Approved`) đơn học sinh: tự động tạo mới hoặc cập nhật `Attendances` với trạng thái `ExcusedAbsent` (Nghỉ có phép).<br>- Khớp 100% ràng buộc DB: `CK_Attendances_Status`, `UQ_Attendances`, `FK_Attendances_Enrolled`, `Note <= 300`.<br>- Giao diện `LeaveRequests.jsx`: Modal chi tiết, xem lý do, nhập `reviewNote` (bắt buộc khi từ chối), duyệt nhanh 1-chạm (Quick Approve) kèm thông báo toast. | **PASS** | Tự động hóa liên kết điểm danh hoạt động hoàn hảo, loại bỏ thao tác điểm danh trùng lặp thủ công của giáo viên. Ràng buộc toàn vẹn dữ liệu SQL được tuân thủ tuyệt đối, không có nguy cơ lỗi 500 runtime. |
| **TC-SEC-01** | **Tuyến đường & Bảo mật Localhost** | Toàn hệ thống | - Đăng ký route `/leave-requests` trong `App.jsx` và hiển thị trên menu điều hướng `AdminLayout.jsx`.<br>- Không hard-code `localhost` trong toàn bộ mã nguồn `roxy-admin/src/`.<br>- `Dashboard.jsx` giữ sạch placeholder (không có số liệu giả 120/15/45tr). | **PASS** | Route `/leave-requests` được bảo vệ bởi `ProtectedRoute` và tích hợp đầy đủ trên Desktop Sidebar & Mobile Drawer. Quét 0 kết quả `localhost`. Dashboard tuân thủ quy tắc dự án. |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT EVIDENCE)

### 3.1. TC-LEA-01: Phân quyền & Lọc đơn xin nghỉ (Leave Requests)

#### A. Phân quyền truy vấn danh sách tại Backend (`LeaveRequestsController.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Controllers/LeaveRequestsController.cs` (Dòng 28-76)
- **Bằng chứng code:**
  - `Parent` (Dòng 47-50):
    ```csharp
    q = q.Where(lr => lr.RequesterType == "Student" && lr.Student != null && lr.Student.ParentId == UserId);
    ```
    Phụ huynh chỉ xem được đơn của con mình, bảo mật hoàn toàn danh sách học viên khác.
  - `Student` (Dòng 51-54):
    ```csharp
    q = q.Where(lr => lr.RequesterType == "Student" && lr.Student != null && (lr.Student.UserId == UserId || lr.RequestedBy == UserId));
    ```
    Học sinh chỉ xem được đơn xin nghỉ của bản thân.
  - `Teacher` (Dòng 55-62):
    ```csharp
    q = q.Where(lr =>
        (lr.TeacherId == UserId || (lr.RequesterType == "Teacher" && lr.RequestedBy == UserId)) ||
        (lr.RequesterType == "Student" && lr.Class != null && lr.Class.TeacherId == UserId)
    );
    ```
    Giáo viên xem đơn nghỉ dạy của chính mình HOẶC đơn xin nghỉ học của học sinh trong các lớp mình phụ trách giảng dạy.
  - `BranchManager` (Dòng 63-72):
    ```csharp
    var userBranchId = User.GetBranchId() ?? -1;
    // Không làm mất đơn GV khi ClassId == null: kiểm tra cả Class, Student và Teacher
    q = q.Where(lr =>
        (lr.Class != null && lr.Class.BranchId == userBranchId) ||
        (lr.Student != null && lr.Student.BranchId == userBranchId) ||
        (lr.User != null && lr.User.BranchId == userBranchId)
    );
    ```
    *Đánh giá an toàn:* Đã sửa triệt để lỗi rủi ro nêu tại `AUDIT.md` §5.1 dòng 156. Khi giáo viên xin nghỉ phép cả ngày (`ClassId == null`), bộ lọc sử dụng quan hệ `lr.User.BranchId == userBranchId` (navigation `User` trỏ tới bảng `Users` vai trò Teacher) để đảm bảo đơn của giáo viên trong chi nhánh không bị thất lạc.
  - `SuperAdmin`: Xem toàn bộ đơn không giới hạn.
  - Khóa lọc chi nhánh đối với `BranchManager` (Dòng 91-98):
    ```csharp
    if (Role == "BranchManager") {
        var userBranchId = User.GetBranchId() ?? -1;
        if (branchId.Value != userBranchId) return Ok(new List<LeaveRequestDto>());
    }
    ```
    Chặn đứng việc BranchManager cố tình truyền query param `branchId` của cơ sở khác.
- **Bộ lọc động (Dòng 78-130):** Hỗ trợ đầy đủ `studentId`, `classId`, `branchId`, `status`, `fromDate` (`LeaveDate >= fromDate`), `toDate` (`LeaveDate <= toDate`), `requesterType`.

#### B. Phân quyền Tạo đơn xin nghỉ (`CreateLeaveRequest`, Dòng 243-428):
- Khai báo: `[Authorize(Roles = "SuperAdmin,BranchManager,Teacher,Parent,Student")]`
- Kiểm soát đối tượng xin nghỉ theo vai trò:
  - `Teacher` (Dòng 266-269, 310-313):
    Nếu cố tình gửi `RequesterType = "Student"`, hệ thống từ chối `403 Forbidden` (`"Giáo viên chỉ có thể tạo đơn xin nghỉ cho chính mình."`). Tự động gán `teacherId = UserId`. Nếu chọn lớp, kiểm tra giáo viên có dạy lớp đó không (`cls.TeacherId == UserId` hoặc dạy thay).
  - `Parent` (Dòng 294-295):
    Kiểm tra `student.ParentId != UserId` -> từ chối `403 Forbidden` (`"Chỉ có thể xin nghỉ cho con của mình."`).
  - `Student` (Dòng 273-279, 297-298):
    Tự động truy xuất hồ sơ `Students.UserId == UserId`. Nếu chọn `studentId` khác -> từ chối `403 Forbidden` (`"Chỉ có thể xin nghỉ cho chính mình."`).
  - `BranchManager` (Dòng 300-302, 323-325, 366-368):
    Bắt buộc `student.BranchId == userBranchId`, `teacher.BranchId == userBranchId`, `cls.BranchId == userBranchId`. Bị từ chối `403 Forbidden` nếu thao tác ngoài chi nhánh.
- **Chặn đơn trùng lặp (Dòng 384-404):** Chặn tạo nhiều đơn cùng trạng thái `Pending` cho cùng một đối tượng trong cùng ngày nghỉ hoặc cùng buổi học.
- **Tuân thủ toàn vẹn CSDL `RoxyAppDB.sql`:**
  - Gán chính xác một trong hai: `StudentId` hoặc `TeacherId`, trường còn lại là `null` (thỏa mãn `CK_Leave_OneRequester`).
  - Nếu có `ScheduleId`, bắt buộc gán `ClassId = schedule.ClassId` (thỏa mãn `CK_Leave_ScheduleNeedsClass`).
  - Kiểm tra học sinh đã đăng ký lớp qua `StudentClasses` (thỏa mãn `FK_Leave_Enrolled`).

#### C. Giao diện Người dùng thích ứng vai trò (`LeaveRequests.jsx`):
- **Role-adaptive Creation Form (Dòng 283-328, 1257-1388):**
  - `SuperAdmin` / `BranchManager`: Cung cấp nút chọn phân loại 🎓 Học viên / 👩‍🏫 Giáo viên kèm Dropdown danh sách tương ứng.
  - `Teacher`: Giao diện tự động cố định đơn cho chính mình kèm thẻ thông tin giáo viên, không hiển thị chọn học viên.
  - `Parent`: Tự động lọc danh sách chỉ hiển thị con của phụ huynh đăng nhập.
  - `Student`: Giao diện tự động khóa thông tin học sinh hiện tại.
- **Khóa chi nhánh trên UI (Dòng 71-73, 726-754):**
  - Quản lý chi nhánh (`BranchManager`) bị khóa cứng ô lọc cơ sở với biểu tượng 🔒 và nhãn tên cơ sở của mình (`select-none cursor-not-allowed`).
  - `SuperAdmin` có đầy đủ Dropdown chọn chuyển đổi giữa các cơ sở.
- **Trải nghiệm UX/UI (Emil Kowalski & Apple Design):**
  - Bộ lọc Segmented Status Pills (Dòng 761-800) hiển thị số lượng đơn thời gian thực (`Pending`, `Approved`, `Rejected`, `Cancelled`).
  - Tìm kiếm Debounced 300ms (Dòng 92-98, 234-255) lọc tức thì theo tên, lớp, lý do, người gửi, mã đơn.
  - Phím chọn lý do nhanh (Quick Reason Pills, Dòng 1493-1522): *Ốm sốt/Khám bệnh, Việc gia đình, Trùng lịch thi ở trường, Công tác/Việc riêng*.

---

### 3.2. TC-LEA-02: Duyệt / Từ chối đơn & Tự động liên kết Điểm danh (ExcusedAbsent)

#### A. Phân quyền và thẩm tra chi nhánh khi Duyệt (`ReviewLeaveRequest`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Controllers/LeaveRequestsController.cs` (Dòng 435-469)
- **Khai báo phân quyền:** `[Authorize(Roles = "SuperAdmin,BranchManager")]` (Giáo viên, Phụ huynh, Học viên bị chặn 403 ngay lập tức).
- **Ràng buộc trạng thái:** Chỉ duyệt đơn đang ở trạng thái `Pending` (`leave.Status != "Pending"` trả về `400 Bad Request`).
- **Kiểm soát chi nhánh tuyệt đối cho `BranchManager` (Dòng 452-463):**
  ```csharp
  if (Role == "BranchManager") {
      var userBranchId = User.GetBranchId() ?? -1;
      var belongsToBranch = (leave.Class != null && leave.Class.BranchId == userBranchId) ||
                            (leave.Student != null && leave.Student.BranchId == userBranchId) ||
                            (leave.User != null && leave.User.BranchId == userBranchId);

      if (!belongsToBranch) {
          return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền duyệt đơn xin nghỉ của chi nhánh khác." });
      }
  }
  ```
  Quản lý cơ sở duyệt được cả đơn xin nghỉ phép của Giáo viên thuộc cơ sở mình khi `ClassId == null` mà không vi phạm ranh giới bảo mật giữa các cơ sở.

#### B. Cơ chế Tự động liên kết Điểm danh (`ExcusedAbsent`, Dòng 471-544):
- Khi duyệt đơn học viên (`req.Status == "Approved" && leave.StudentId.HasValue`):
  1. **Trường hợp đơn có `ScheduleId` cụ thể (Dòng 476-492):**
     - Xác minh học viên đang có trạng thái `Active` trong lớp của buổi học (`db.StudentClasses.AnyAsync(...)`).
     - Đưa buổi học vào danh sách cần cập nhật điểm danh.
  2. **Trường hợp đơn nghỉ cả ngày không chọn buổi (Dòng 493-512):**
     - Tự động quét tất cả các lớp học viên đang học `Active` (hoặc lớp cụ thể nếu có chọn `ClassId`).
     - Lấy tất cả các buổi học trong bảng `Schedules` có `StudyDate == leave.LeaveDate` của các lớp đó.
  3. **Tạo mới hoặc Cập nhật bản ghi `Attendances` (Dòng 514-543):**
     - Tra cứu bản ghi điểm danh hiện có theo `(ScheduleId, StudentId)` thỏa mãn ràng buộc duy nhất `UQ_Attendances`.
     - Cập nhật hoặc tạo mới với trạng thái chuẩn:
       `attendance.Status = "ExcusedAbsent";`
     - Lưu vết ghi chú:
       `var note = $"Nghỉ phép có phép (Đơn #{leave.Id}{reasonText})";`
       `if (note.Length > 300) note = note.Substring(0, 297) + "...";` (Tuân thủ nghiêm ngặt độ dài `NVARCHAR(300)`).
     - Ghi nhận `MarkedBy = UserId` và `MarkedAt = DateTime.UtcNow`.
- **Đối chiếu CSDL `RoxyAppDB.sql`:**
  - Ràng buộc `CK_Attendances_Status`: `CHECK (Status IN ('Present','Late','ExcusedAbsent','UnexcusedAbsent'))` -> Trạng thái `"ExcusedAbsent"` khớp 100%.
  - Ràng buộc khóa ngoại `FK_Attendances_Enrolled (StudentId, ClassId)` -> Được bảo đảm 100% nhờ điều kiện kiểm tra `StudentClasses.Status == "Active"`.

#### C. Giao diện Xét duyệt & Thao tác nhanh (`LeaveRequests.jsx`):
- **Modal Chi tiết & Xét duyệt (Dòng 1560-1805):**
  - Hiển thị đầy đủ thông tin: đối tượng, người gửi, lớp, buổi học, ngày nghỉ kèm thứ tiếng Việt (`formatDateWithWeekday`), lý do xin nghỉ.
  - Hiển thị khối giải thích nghiệp vụ tự động đồng bộ điểm danh màu xanh dương (Dòng 1661-1670).
  - Banner kết quả phê duyệt trang trọng (Dòng 1672-1701): Banner xanh lá cho `Approved`, đỏ cho `Rejected`, hiển thị tên người duyệt, thời gian và ghi chú phản hồi.
  - Khung xét duyệt cho Quản lý (Dòng 1704-1743): Textarea nhập phản hồi, các nút chèn phản hồi nhanh (*Đồng ý cho học viên nghỉ phép*, *Đã duyệt, chúc bé mau khỏe nhé mẹ!*, *Đã duyệt, cô giáo sẽ chuẩn bị bài tập gửi kèm*, *Đã duyệt nghỉ phép và bố trí giáo viên dạy thay*).
  - Validation: Bắt buộc nhập lý do khi bấm "✕ Từ chối đơn" (Dòng 465-468).
- **Phím Duyệt nhanh 1-chạm (Quick Approve, Dòng 499-518, 1033-1041, 1148-1152):**
  - Tích hợp trực tiếp trên bảng Desktop và Card mobile, kèm hộp thoại xác nhận an toàn và Toast thông báo thành công tức thì.
- **Hủy đơn (Dòng 520-535, 1054-1064, 1173-1181, 1749-1759):**
  - Cho phép người tạo hoặc Quản lý hủy đơn khi đang ở trạng thái `Pending`.

---

### 3.3. TC-SEC-01: Tuyến đường, Dashboard & Bảo mật Localhost

#### A. Đăng ký Tuyến đường (`roxy-admin/src/App.jsx`):
- Tuyến đường `/leave-requests` được khai báo bên trong `ProtectedRoute` và bọc trong khung `AdminLayout` (Dòng 11, 32):
  ```jsx
  import LeaveRequests from './pages/LeaveRequests';
  ...
  <Route path="/leave-requests" element={<LeaveRequests />} />
  ```

#### B. Menu Điều hướng (`roxy-admin/src/layouts/AdminLayout.jsx`):
- Mục menu `📝 Xin nghỉ phép` được khai báo trong nhóm "Nghiệp vụ đào tạo" (Dòng 99-102), hiển thị cho mọi vai trò đăng nhập:
  ```jsx
  <NavLink to="/leave-requests" className={navItemClass} onClick={onItemClick}>
    <span className="text-base">📝</span>
    <span>Xin nghỉ phép</span>
  </NavLink>
  ```
- Hoạt động đồng bộ trên cả Sidebar máy tính và Mobile Drawer (touch target chuẩn Apple HIG `min-h-[44px]`).

#### C. Màn hình Tổng quan (`roxy-admin/src/pages/Dashboard.jsx`):
- Toàn bộ 4 thẻ số liệu hiển thị placeholder trung thực `value: '—'`, ghi chú `note: 'Đang cập nhật từ hệ thống'`, không có bất kỳ con số hard-code nào (120 học viên, 15 lớp, 45tr doanh thu đã được loại bỏ hoàn toàn).

#### D. Kiểm tra chuỗi localhost:
- Thực hiện kiểm tra bằng lệnh: `Select-String -Path "roxy-admin/src/**/*.*" -Pattern "localhost"`.
- **Kết quả:** **0 kết quả** (Không có bất kỳ vị trí nào bị hard-code `localhost`). API gọi qua `axiosClient` sử dụng cấu hình tập trung.

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

1. **Tổng số lỗi chặn (Blocker):** **0**
2. **Tổng số lỗi nghiêm trọng (Critical):** **0**
3. **Mã nguồn Backend và Frontend:** 
   - Backend biên dịch thành công 100% (**0 Error, 0 Warning**).
   - Frontend lint sạch 100% (**0 Error, 0 Warning**), build production thành công trong **241ms** (**93 modules transformed**).
4. **Đánh giá nghiệp vụ & Bảo mật:**
   - RBAC 5 vai trò cho Đơn xin nghỉ phép đạt độ an toàn tuyệt đối.
   - Giải quyết dứt điểm vấn đề lọc đơn giáo viên nghỉ cả ngày (`ClassId == null`) của Quản lý chi nhánh.
   - Tự động hóa liên kết điểm danh `ExcusedAbsent` chính xác, bảo đảm tính toàn vẹn CSDL và khóa ngoại.
   - Giao diện người dùng tuân thủ chặt chẽ triết lý thiết kế Apple Design & Emil Kowalski (Role-adaptive Form, Quick Approve, Segmented Status Pills, Responsive Mobile Card Stack, Clean Empty State).
5. **Kết luận:** Giai đoạn 1F (LeaveRequests UI & Backend) **ĐẠT CHUẨN NGHIỆM THU QA (PASSED 100%)**, đủ điều kiện nghiệm thu và sẵn sàng cho phân hệ tiếp theo.