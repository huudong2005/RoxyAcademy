# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1G & 1G MỞ RỘNG (BRANCHES UI, API & CHI TIẾT CHI NHÁNH)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Chi nhánh Cơ sở (`/branches`) & Chi tiết Chi nhánh (`/branches/:id`), Thống kê Vận hành & Phân quyền SuperAdmin  
**Ngày kiểm thử:** 16/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/API.md` (Mục 8), `docs/DESIGN.md` (Mục 12 & Mục 13), `RoxyAppDB.sql`  

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

Tất cả các câu lệnh kiểm tra mã nguồn, linting và build đã được thực thi trực tiếp trên hệ thống thực tế và đạt kết quả 100% không lỗi:

| Thành phần | Câu lệnh kiểm tra | Kết quả thực tế | Chi tiết console |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build` tại `RoxyAppBE/RoxyAcademy.Api` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>Time Elapsed: 00:00:01.22<br>Output: `RoxyAcademy.Api.dll` (net9.0)<br>*(Đã xác nhận không có tiến trình RoxyAcademy.Api nào chạy ngầm trước khi build)* |
| **Frontend Lint** | `npm run lint` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>ESLint kiểm tra sạch toàn bộ source code (bao gồm `BranchDetail.jsx`, `BranchModals.jsx`, `Branches.jsx`, `ClassList.jsx`, `Students.jsx`) |
| **Frontend Build** | `npm run build` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s)**<br>96 modules transformed thành công trong **252ms**.<br>Dist: `index.html` (0.49 kB), `index-*.css` (62.43 kB), `index-*.js` (716.81 kB) |

---

## 2. BẢNG MA TRẬN TEST CASES GIAI ĐOẠN 1G & 1G MỞ RỘNG

| Mã Test Case | Phân hệ kiểm thử | Vai trò kiểm tra | Nội dung kiểm thử chi tiết | Kết quả | Ghi chú & Đánh giá QA |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TC-BRA-01** | **Quản lý Chi nhánh Cơ sở (Branches UI & API)** | `SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student` | - **API Backend (`BranchesController.cs`, `BranchDtos.cs`):**<br>  * `GET /api/Branches` & `GET /api/Branches/{id}`: Trả về đầy đủ 9 trường (`id`, `branchName`, `address`, `phone`, `isActive`, `createdAt`, `classCount`, `studentCount`, `teacherCount`).<br>  * Quyền ghi (`POST`, `PUT`, `DELETE`): Gắn chặt `[Authorize(Roles = "SuperAdmin")]`. Các vai trò khác bị chặn 403 Forbidden.<br>  * Guardrail chặn ngừng chi nhánh: Khi `DELETE` hoặc `PUT` với `isActive: false` mà còn lớp đang mở (`Status != "Finished"`) hoặc học viên đang học (`Status == "Active"`), API trả về `400 Bad Request` kèm thông báo chi tiết số lớp và số học viên.<br>- **Giao diện Frontend (`Branches.jsx`, `AdminLayout.jsx`):**<br>  * Route `/branches` đăng ký chuẩn trong `App.jsx` bọc trong `ProtectedRoute` & `AdminLayout`.<br>  * Menu `Quản lý chi nhánh` trên Sidebar và Mobile Drawer CHỈ hiển thị với `SuperAdmin` (ẩn hoàn toàn với 4 role còn lại).<br>  * Màn hình chặn 403 hiển thị trang trọng khi role khác truy cập trực tiếp URL `/branches`.<br>  * Danh sách dạng Card Grid / Mobile Stack trực quan; hiển thị đủ hotline click-to-call, 3 KPI mini-cards thời gian thực; hỗ trợ thêm, sửa, ngừng hoạt động, kích hoạt lại.<br>  * Xử lý lỗi 400 tận gốc: Giữ hộp thoại và hiển thị `DeactivationBlockedAlert` kèm 2 nút lối tắt sang `/classes` và `/students`. | **PASS** | Đáp ứng 100% đặc tả API Mục 8 và Design Mục 12. Bảo vệ toàn vẹn dữ liệu hệ thống, ngăn chặn triệt để rủi ro ngừng nhầm chi nhánh đang hoạt động. |
| **TC-BRA-02** | **Màn hình Chi tiết Chi nhánh Cơ sở (`/branches/:id`) & Điều hướng Lối tắt** | `SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student` | - **Điều hướng & Breadcrumb:**<br>  * Từ `/branches`, bấm vào thẻ chi nhánh hoặc nút `[ 👁️ Xem chi tiết ]` điều hướng chuẩn xác sang `/branches/:id`.<br>  * Breadcrumb Wayfinding: `← Quay lại Quản lý chi nhánh` / `{Tên chi nhánh}` kèm mã `#BR-{id}`.<br>- **Phân quyền RBAC & Ngắt chặn 403:**<br>  * Chỉ `SuperAdmin` được xem trang; các vai trò khác (`BranchManager`, `Teacher`, `Parent`, `Student`) bị chặn ngay tại Client bằng màn hình 403 trang trọng và **TUYỆT ĐỐI KHÔNG GỌI BẤT KỲ API NÀO** (`GET /api/Branches/{id}`, `GET /Classes`, `GET /Users`, `GET /Students`).<br>- **Header & 3 Thẻ KPI Thống kê:**<br>  * Header hiển thị tên cơ sở, mã `#BR-{id}`, ngày tạo `DD/MM/YYYY`, địa chỉ, hotline `tel:` click-to-call, badge trạng thái `isActive` kèm pulse animation.<br>  * 3 Thẻ KPI: Lớp đang mở (`classCount`), Học viên đang học (`studentCount`), Giáo viên cơ sở (`teacherCount`). Nhấp vào từng thẻ tự động kích hoạt tab tương ứng.<br>- **Hệ thống 3 Tabs Danh sách & Bảo vệ Dữ liệu:**<br>  * **Tab Lớp học:** Lấy danh sách lớp thuộc chi nhánh, hiển thị tên lớp, mã `#CLS-{id}`, khóa học, hình thức, giáo viên, sĩ số tối đa, thời gian, badge trạng thái; có tìm kiếm, lọc trạng thái; nút `[ ↗ Quản lý tại trang Lớp học ]` dẫn sang `/classes?branchId={id}`.<br>  * **Tab Giáo viên:** Hiển thị danh sách giáo viên cơ sở (`fullName`, avatar chữ viết tắt, hotline `tel:`, email `mailto:`, trạng thái tài khoản, ngày tham gia); có tìm kiếm.<br>  * **Tab Học viên:** Hiển thị danh sách học viên (`fullName`, trường học, mã `#STU-{id}`, ngày sinh/tuổi, phụ huynh & hotline `tel:`, trạng thái); **TUYỆT ĐỐI KHÔNG LỘ `Note` nhạy cảm**; nút `[ ↗ Quản lý tại trang Học viên ]` dẫn sang `/students?branchId={id}`.<br>- **Tích hợp Bộ lọc Sẵn (`searchParams`):**<br>  * `ClassList.jsx` và `Students.jsx` đọc `searchParams.get('branchId')` và thiết lập sẵn bộ lọc cơ sở.<br>- **Thao tác Sửa & Ngừng hoạt động:**<br>  * Sử dụng chung `BranchModals.jsx`, giữ đúng ràng buộc chặn `400 Bad Request` kèm thông báo và 2 nút lối tắt khi còn lớp/học viên active. | **PASS** | Đáp ứng 100% tiêu chí nghiệm thu tại `docs/DESIGN.md` Mục 13.9. Tối ưu hóa toàn diện theo triết lý Emil Kowalski & Apple Design Guidelines. |
| **TC-SEC-01** | **Tuyến đường, Không sửa Dashboard & Bảo mật Localhost** | Toàn hệ thống | - Đăng ký route `/branches` và `/branches/:id` trong `App.jsx` được bảo vệ an toàn bởi `ProtectedRoute` và bọc trong `AdminLayout`.<br>- Không hard-code `localhost` trong toàn bộ mã nguồn `roxy-admin/src/` (0 kết quả quét qua `Select-String`).<br>- `Dashboard.jsx` giữ sạch nguyên bản (không sửa đổi, không phát sinh số liệu giả). | **PASS** | Tuân thủ tuyệt đối quy tắc chung tại `GEMINI.md`. |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT EVIDENCE)

### 3.1. TC-BRA-01: Phân quyền API & Thống kê Chi nhánh Backend

#### A. Cấu trúc dữ liệu DTO chuẩn hóa (`BranchDtos.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Dtos/BranchDtos.cs` (Dòng 6-44)
- **Bằng chứng code:**
  ```csharp
  public record BranchDto(
      int Id,
      string BranchName,
      string Address,
      string? Phone,
      bool IsActive,
      DateTime CreatedAt,
      int ClassCount = 0,
      int StudentCount = 0,
      int TeacherCount = 0
  );
  ```
  DTO trả về đầy đủ 9 trường thông tin theo đúng đặc tả `docs/API.md` Mục 8.
- Validation đầu vào chặt chẽ:
  - `CreateBranchRequest`: `BranchName` (bắt buộc, tối đa 150 ký tự), `Address` (bắt buộc, tối đa 300 ký tự), `Phone` (tối đa 20 ký tự).
  - `UpdateBranchRequest`: Kế thừa đầy đủ validation và bổ sung trường `IsActive` (bool).

#### B. API Truy vấn Danh sách & Chi tiết (`BranchesController.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Controllers/BranchesController.cs` (Dòng 16-58)
- **Bằng chứng code:**
  - `GET /api/Branches` & `GET /api/Branches/{id}`:
    ```csharp
    b.Id,
    b.BranchName,
    b.Address,
    b.Phone,
    b.IsActive,
    b.CreatedAt,
    db.Classes.Count(c => c.BranchId == b.Id && c.Status != "Finished"),
    db.Students.Count(s => s.BranchId == b.Id && s.Status == "Active"),
    db.Users.Count(u => u.BranchId == b.Id && u.Role == "Teacher" && u.IsActive)
    ```
  - **Đánh giá nghiệp vụ:** Số lượng lớp học tính trên các lớp chưa kết thúc (`Status != "Finished"`), số học viên tính trên học viên đang học (`Status == "Active"`), và giáo viên tính trên tài khoản đang hoạt động (`Role == "Teacher" && IsActive == true`).

#### C. Phân quyền Thao tác Ghi (`POST`, `PUT`, `DELETE`):
- **Vị trí:** `BranchesController.cs` (Dòng 62, 83, 106)
- **Bằng chứng code:**
  - Cả 3 endpoint đều được bảo vệ bởi attribute:
    ```csharp
    [Authorize(Roles = "SuperAdmin")]
    ```
  - Bất kỳ tài khoản nào có role khác `SuperAdmin` (`BranchManager`, `Teacher`, `Parent`, `Student`) khi gọi vào đều bị ASP.NET Core chặn ngay ở tầng middleware và trả về HTTP `403 Forbidden`.

---

### 3.2. TC-BRA-01: Guardrail Chặn Ngừng Hoạt Động Chi Nhánh (Lỗi 400)

#### A. Hàm Kiểm Tra An Toàn Vận Hành (`ValidateBranchDeactivationAsync`):
- **Vị trí:** `BranchesController.cs` (Dòng 122-136)
- **Bằng chứng code:**
  ```csharp
  private async Task<IActionResult?> ValidateBranchDeactivationAsync(int branchId)
  {
      var openClassesCount = await db.Classes.CountAsync(c => c.BranchId == branchId && c.Status != "Finished");
      var activeStudentsCount = await db.Students.CountAsync(s => s.BranchId == branchId && s.Status == "Active");

      if (openClassesCount > 0 || activeStudentsCount > 0)
      {
          return BadRequest(new
          {
              message = $"Không thể ngừng hoạt động chi nhánh vì còn {openClassesCount} lớp đang mở và {activeStudentsCount} học viên đang học. Vui lòng chuyển hoặc kết thúc toàn bộ lớp và học viên trước khi ngừng chi nhánh."
          });
      }

      return null;
  }
  ```

#### B. Tích hợp trong luồng PUT và DELETE:
- **Khi PUT cập nhật (`UpdateBranch` - Dòng 89-93):**
  ```csharp
  if (branch.IsActive && !req.IsActive)
  {
      var validationError = await ValidateBranchDeactivationAsync(id);
      if (validationError != null) return validationError;
  }
  ```
- **Khi DELETE ngừng hoạt động mềm (`DeleteBranch` - Dòng 112-113):**
  ```csharp
  var validationError = await ValidateBranchDeactivationAsync(id);
  if (validationError != null) return validationError;
  ```
- **Đánh giá QA:** Cơ chế bảo vệ 2 tầng bảo đảm tính toàn vẹn hệ thống: không cho phép ngừng cơ sở khi vẫn còn lớp mở hoặc học viên active, thông báo lỗi phản hồi chính xác số lượng thực tế.

---

### 3.3. TC-BRA-02: Điều Hướng Sang Chi Tiết Chi Nhánh & Thanh Breadcrumb Wayfinding

#### A. Điều Hướng Từ `/branches` Sang `/branches/:id` (`Branches.jsx`):
- **Vị trí:** `roxy-admin/src/pages/Branches.jsx` (Dòng 367-380, 438-444, 538-548)
- **Bằng chứng code:**
  - Toàn bộ khung thẻ `BranchCard` (`<article>`) có `cursor-pointer`, `hover:border-blue-300`, `hover:shadow-sm` và `onClick={onViewDetail}` kích hoạt `navigate('/branches/' + branch.id)`.
  - Nút chuyên biệt `[ 👁️ Xem chi tiết ]` ở chân thẻ gọi `onViewDetail()` với `e.stopPropagation()`.
  - Các thao tác con (`tel:`, Sửa, Ngừng HĐ, Kích hoạt) đều dùng `e.stopPropagation()` ngăn chặn kích hoạt nhầm thẻ cha.

#### B. Thanh Breadcrumb Chuẩn Wayfinding (Apple HIG):
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 313-328)
- **Bằng chứng code:**
  ```jsx
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
    <Link
      to="/branches"
      className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-blue-700 active:scale-95 transition-all duration-150 cursor-pointer min-h-[36px]"
    >
      <span>←</span>
      <span>Quay lại Quản lý chi nhánh</span>
    </Link>
    <span className="text-slate-300">/</span>
    <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-md">
      {branch.branchName}
    </span>
    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
      #BR-{branch.id}
    </span>
  </nav>
  ```
- **Đánh giá QA:** Người dùng luôn định vị được ngữ cảnh màn hình, biết rõ cơ sở hiện tại và có nút một chạm quay lại danh sách chi nhánh.

---

### 3.4. TC-BRA-02: Phân Quyền RBAC 403 & Ngắt Gọi API Hoàn Toàn Tại Client

#### A. Màn hình Chặn 403 Trang Trọng (`BranchDetail.jsx`):
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 28, 187-218)
- **Bằng chứng code:**
  ```jsx
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  ...
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4 text-rose-600 shadow-xs">
          🚫
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Bạn không có quyền truy cập Chi tiết Chi nhánh
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Thông tin quản trị chuyên sâu và điều phối vận hành chi nhánh chỉ dành riêng cho Ban Giám Đốc (SuperAdmin)...
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/')} ...>Quay lại Tổng quan</button>
          <button onClick={() => navigate('/classes')} ...>Xem Lớp học</button>
        </div>
      </div>
    );
  }
  ```

#### B. Ngắt Gọi API Hoàn Toàn Khỏi Vòng Đời Component:
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 68-70)
- **Bằng chứng code:**
  ```jsx
  useEffect(() => {
    if (!isSuperAdmin || !isValidBranchId) return;
    ...
  }, [isSuperAdmin, isValidBranchId, branchId, reloadKey]);
  ```
- **Đánh giá QA:** Khi tài khoản không phải `SuperAdmin` truy cập route `/branches/:id`, component ngắt ngay từ dòng đầu tiên của effect, **hoàn toàn không phát sinh bất kỳ request mạng nào** (`GET /api/Branches/{id}`, `GET /Classes`, `GET /Users`, `GET /Students`), triệt tiêu triệt để nguy cơ rò rỉ dữ liệu hoặc gây tải vô ích lên backend server.

---

### 3.5. TC-BRA-02: Hero Header, 3 Thẻ KPI Thống Kê & Đồng Bộ DTO

#### A. Header Nhận Diện Chi Nhánh:
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 331-420)
- Hiển thị đầy đủ thông tin nhận diện:
  - Tên cơ sở (H1 in đậm) kèm icon 🏢 và mã `#BR-{branch.id}`.
  - Ngày tạo định dạng `DD/MM/YYYY` (`formatDate(branch.createdAt)`).
  - Địa chỉ đầy đủ (`branch.address`) kèm icon 📍.
  - Hotline liên hệ: Nếu có số, hiển thị link `tel:{phone}` click-to-call màu xanh kèm nút `📱 Gọi hotline`; nếu rỗng hiển thị nhãn mờ *(Chưa cập nhật số hotline)*.
  - Badge trạng thái `isActive`: Xanh ngọc có chấm tròn `animate-pulse` khi đang hoạt động; xám mờ khi ngừng hoạt động.
  - Cặp nút hành động: `[ ✏️ Chỉnh sửa thông tin ]` và `[ 🚫 Ngừng hoạt động cơ sở ]` / `[ ✓ Kích hoạt lại cơ sở ]`.

#### B. 3 Thẻ KPI Thống Kê Thời Gian Thực:
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 423-486)
- Lấy trực tiếp từ 3 trường đếm của DTO `GET /api/Branches/{id}`:
  1. **Lớp đang mở (`classCount`):** Nền xanh dương, font mono to bản; click kích hoạt chuyển sang **Tab 1: Lớp học cơ sở**.
  2. **Học viên đang học (`studentCount`):** Nền xanh lá, font mono to bản; click kích hoạt chuyển sang **Tab 3: Học viên cơ sở**.
  3. **Giáo viên cơ sở (`teacherCount`):** Nền tím chàm, font mono to bản; click kích hoạt chuyển sang **Tab 2: Giáo viên cơ sở**.

---

### 3.6. TC-BRA-02: Hệ Thống 3 Tabs Danh Sách Trực Quan & Bảo Vệ Dữ Liệu `Note`

#### A. Chuyển Đổi Tab Mượt Mà Không Giật (Emil Kowalski Spec):
- **Vị trí:** `roxy-admin/src/pages/BranchDetail.jsx` (Dòng 491-569), `roxy-admin/src/index.css` (Dòng 37-52)
- Animation `tabEnter` chuẩn `150ms cubic-bezier(0.23, 1, 0.32, 1)` với `opacity: 0 -> 1` và `translateY(4px) -> translateY(0)`.
- Badge đếm số lượng thực thể hiển thị tức thì trên từng tab header.

#### B. Tab 1: Danh Sách Lớp Học Cơ Sở (`ClassesTabContent` - Dòng 612-791):
- Lọc từ danh sách lớp có `c.branchId === branchId`.
- Cột hiển thị: Tên lớp, mã `#CLS-{id}`, Khóa học / Hình thức (`Kèm 1-1` hoặc `Lớp nhóm`), Giáo viên phụ trách (`teacherName` hoặc nhãn `Chưa phân công GV`), Sĩ số tối đa (`maxStudents`), Thời gian (`startDate` – `endDate`), Badge trạng thái (`Ongoing`, `Upcoming`, `Finished`).
- Có ô tìm kiếm và bộ lọc nhanh 4 trạng thái (`Tất cả`, `Đang học`, `Sắp mở`, `Đã kết thúc`).
- Hỗ trợ hiển thị bảng Desktop và Card Stack trên Mobile.

#### C. Tab 2: Danh Sách Giáo Viên Cơ Sở (`TeachersTabContent` - Dòng 795-943):
- Gọi API `GET /api/Users?role=Teacher&branchId={id}&pageSize=100`.
- Cột hiển thị: Avatar tròn với 2 chữ cái đầu (`getInitials`), Họ tên giáo viên, Số điện thoại (link click-to-call `tel:`), Email tài khoản (link `mailto:`), Trạng thái tài khoản (`● Hoạt động` / `● Đã khóa`), Ngày tham gia.
- Có ô tìm kiếm theo họ tên, SĐT, email; Mobile Card Stack kèm nút gọi điện to 44px.

#### D. Tab 3: Danh Sách Học Viên Cơ Sở (`StudentsTabContent` - Dòng 946-1159) & Bảo Mật `Note`:
- Gọi API `GET /api/Students?branchId={id}&pageSize=100`.
- Cột hiển thị: Họ tên bé, trường học / khối lớp, mã `#STU-{id}`, Ngày sinh & tính tuổi tự động (`calcAge`), Phụ huynh bảo hộ & hotline `tel:`, Badge trạng thái (`Active`, `Paused`, `Graduated`, `Dropped`).
- **BẢO VỆ DỮ LIỆU NHẠY CẢM TUYỆT ĐỐI:** Trường ghi chú sức khỏe, can thiệp đặc biệt / tự kỷ (`Note`) **HOÀN TOÀN KHÔNG HIỂN THỊ** trong danh sách học viên này theo đúng luật đạo đức sư phạm và an toàn dữ liệu tại `GEMINI.md`.
- Có ô tìm kiếm và bộ lọc 5 trạng thái; Mobile Card Stack trực quan.

---

### 3.7. TC-BRA-02: Điều Hướng Ngữ Cảnh (`/classes?branchId={id}`, `/students?branchId={id}`)

#### A. Lối Tắt Ngữ Cảnh Từ Trang Chi Tiết:
- Nút CTA `[ ↗ Quản lý tại trang Lớp học ]` dẫn thẳng tới:
  ```jsx
  <Link to={`/classes?branchId=${branchId}`} ...>Quản lý tại trang Lớp học</Link>
  ```
  Đồng thời khi click vào từng hàng lớp học cũng điều hướng tới `/classes?branchId={branch.id}`.
- Nút CTA `[ ↗ Quản lý tại trang Học viên ]` dẫn thẳng tới:
  ```jsx
  <Link to={`/students?branchId=${branchId}`} ...>Quản lý tại trang Học viên</Link>
  ```
  Đồng thời khi click vào từng hàng học viên cũng điều hướng tới `/students?branchId={branch.id}`.

#### B. Đọc & Khởi Tạo Bộ Lọc Phía Nhận:
- **Tại `roxy-admin/src/pages/ClassList.jsx` (Dòng 30-35, 164):**
  ```jsx
  const [searchParams] = useSearchParams();
  const initialBranchId = searchParams.get('branchId');
  const [branchFilter, setBranchFilter] = useState(
    initialBranchId && /^\d+$/.test(initialBranchId) ? initialBranchId : ''
  );
  ...
  if (branchFilter && cls.branchId !== Number(branchFilter)) return false;
  ```
- **Tại `roxy-admin/src/pages/Students.jsx` (Dòng 29-37, 126):**
  ```jsx
  const [searchParams] = useSearchParams();
  const initialBranchId = searchParams.get('branchId');
  const [branchFilter, setBranchFilter] = useState(
    isBranchManager && currentUser.branchId
      ? currentUser.branchId
      : initialBranchId && /^\d+$/.test(initialBranchId)
      ? initialBranchId
      : ''
  );
  ...
  if (branchFilter) params.branchId = branchFilter;
  ```
- **Đánh giá QA:** Luồng tác nghiệp liền mạch không đứt gãy: Ban Giám Đốc bấm lối tắt là danh sách lớp học hoặc học viên đã được lọc đúng ngay cơ sở đang xem, không tốn thao tác chọn lại cơ sở từ đầu.

---

### 3.8. TC-BRA-02: Thao Tác Sửa, Ngừng Hoạt Động & Tái Sử Dụng `BranchModals.jsx` (Guardrail 400)

- Mã nguồn modal đã được tách và module hóa sạch sẽ vào `roxy-admin/src/components/BranchModals.jsx`:
  - `CreateEditBranchModal`: Hỗ trợ cả thêm mới và chỉnh sửa; khi lưu thành công tự động cập nhật dữ liệu trang chi tiết mà không cần reload trang.
  - `DeactivateBranchModal` & `DeactivationBlockedAlert`: Khi backend trả về lỗi `400 Bad Request` (do còn lớp đang mở hoặc học viên active), hộp thoại không bị đóng, hiển thị ngay khối cảnh báo đỏ `DeactivationBlockedAlert` chi tiết số lớp/học viên, vô hiệu hóa nút xác nhận và cung cấp 2 nút lối tắt sang `/classes?branchId={id}` và `/students?branchId={id}`.
  - `ReactivateBranchModal`: Kích hoạt lại chi nhánh (`PUT /api/Branches/{id}` với `isActive: true`) nhanh gọn.

---

### 3.9. TC-SEC-01: Tuyến Đường, Dashboard & Kiểm Tra Localhost

#### A. Tuyến Đường Bảo Vệ (`roxy-admin/src/App.jsx`):
- Route `/branches/:id` được khai báo chặt chẽ:
  ```jsx
  <Route path="/branches" element={<Branches />} />
  <Route path="/branches/:id" element={<BranchDetail />} />
  ```
  Nằm trong cặp `ProtectedRoute` và layout `AdminLayout`.

#### B. Màn Hình Dashboard Không Bị Thay Đổi:
- Lệnh `git status` và `git diff` xác nhận file `roxy-admin/src/pages/Dashboard.jsx` giữ nguyên bản, không hề bị chỉnh sửa, không có số liệu giả tạo.

#### C. Quét Sạch Chuỗi Hard-code Localhost:
- Lệnh quét `Select-String -Path "roxy-admin/src/**/*" -Pattern "localhost"` trả về **0 kết quả**.

---

## 4. BẢNG CHECKLIST NGHIỆM THU ĐỐI CHIẾU `docs/DESIGN.md` (MỤC 13.9)

| Tiêu chuẩn nghiệm thu thiết kế | Hiện trạng thực tế | Kết luận QA |
| :--- | :--- | :---: |
| **Phân Quyền RBAC Nghiêm Ngặt:** Chỉ duy nhất `SuperAdmin` được vào `/branches/:id`; các role khác bị chặn bằng màn hình 403 và KHÔNG gọi bất kỳ API nào. | `BranchDetail.jsx` kiểm tra `role === 'SuperAdmin'`; nếu sai trả về màn hình 403 ngay lập tức; `useEffect` ngắt `if (!isSuperAdmin) return` không gọi API. | **ĐẠT (PASS)** |
| **Điều Hướng & Breadcrumb:** Click thẻ cơ sở hoặc nút `[ 👁️ Xem chi tiết ]` tại `/branches` mở đúng `/branches/:id`. Breadcrumb hiển thị đầy đủ lối quay lại và mã `#BR-{id}`. | `BranchCard` có `onClick={onViewDetail}` và nút chân thẻ; Breadcrumb hiển thị chuẩn kèm nút `← Quay lại Quản lý chi nhánh`. | **ĐẠT (PASS)** |
| **Header Căn Cước Chi Nhánh:** Hiển thị tên, mã `#BR-{id}`, địa chỉ, hotline `tel:`, ngày tạo, badge `isActive` kèm pulse animation. | Đầy đủ 6 trường thông tin, hotline có link `tel:` click-to-call, badge xanh lá/xám chuẩn xác. | **ĐẠT (PASS)** |
| **Cặp Nút Header:** Sửa thông tin mở modal cập nhật tại chỗ; Ngừng HĐ / Kích hoạt lại có dialog xác nhận, giữ đúng Guardrail lỗi 400. | Sử dụng chung `BranchModals.jsx`, bắt lỗi 400 hiển thị `DeactivationBlockedAlert` kèm 2 nút lối tắt. | **ĐẠT (PASS)** |
| **3 Thẻ KPI Thống Kê:** Lấy chính xác từ DTO (`classCount`, `studentCount`, `teacherCount`); click vào thẻ nào kích hoạt tab tương ứng. | Số liệu khớp 100% với DTO Backend; click thẻ tự động chuyển `activeTab`. | **ĐẠT (PASS)** |
| **Hệ Thống 3 Tabs Danh Sách:** Tab 1 Lớp học (`teacherName`, `maxStudents`, `status`); Tab 2 Giáo viên; Tab 3 Học viên. | Đầy đủ 3 tabs với badge đếm số lượng, tìm kiếm, lọc trạng thái, bảng Desktop và Card Stack Mobile. | **ĐẠT (PASS)** |
| **Bảo Vệ Dữ Liệu Nhạy Cảm (`Note`):** Không hiển thị ghi chú can thiệp đặc biệt / tự kỷ ở danh sách học viên. | Cột và thẻ học viên hoàn toàn không chứa `Note`. Bảo mật tuyệt đối. | **ĐẠT (PASS)** |
| **Lối Tắt Ngữ Cảnh:** Nút chuyển sang `/classes?branchId={id}` và `/students?branchId={id}` được `ClassList` và `Students` đọc và lọc sẵn. | Cả 2 trang đều đọc `searchParams.get('branchId')` và khởi tạo `branchFilter` chuẩn xác. | **ĐẠT (PASS)** |
| **Motion & Polish Specs:** Tab transition 150ms cubic-bezier, `:active:scale-[0.98]`, tôn trọng `prefers-reduced-motion`. | `tabEnter` keyframe trong `index.css`, responsive button hover/active mượt mà. | **ĐẠT (PASS)** |
| **Chuẩn Responsive Mobile (375px - 414px):** Nút bấm tối thiểu 44px, bảng tự động chuyển thành Card Stack. | Mọi nút CTA đạt `min-h-[44px]`, Card Stack hiển thị thoáng, không vỡ layout. | **ĐẠT (PASS)** |

---

## 5. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

1. **Tổng số lỗi chặn (Blocker):** **0**
2. **Tổng số lỗi nghiêm trọng (Critical):** **0**
3. **Mã nguồn Backend và Frontend:** 
   - Backend biên dịch thành công 100% (**0 Error, 0 Warning**).
   - Frontend lint sạch 100% (**0 Error, 0 Warning**), build production thành công trong **252ms** (**96 modules transformed**).
4. **Đánh giá nghiệp vụ & Bảo mật:**
   - RBAC phân quyền SuperAdmin cho phân hệ Chi nhánh và Chi tiết Chi nhánh đạt chuẩn bảo mật tuyệt đối.
   - Không gọi API khi 403 Forbidden tại client; bảo vệ toàn vẹn dữ liệu nhạy cảm (`Note`).
   - Guardrail ngăn chặn lỗi 400 khi ngừng chi nhánh hoạt động hoàn hảo, bảo vệ dữ liệu toàn hệ thống.
   - Giao diện người dùng tuân thủ nghiêm ngặt triết lý Apple Design & Emil Kowalski.
5. **Kết luận:** Phân hệ Chi nhánh Cơ sở Giai đoạn 1G và Màn hình Chi tiết Chi nhánh `/branches/:id` **ĐẠT CHUẨN NGHIỆM THU QA (PASSED 100%)**, không có lỗi chặn, sẵn sàng bàn giao cho các giai đoạn kế tiếp.
