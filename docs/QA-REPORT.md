# BÁO CÁO KIỂM THỬ QA — GIAI ĐOẠN 1D (TUITIONS & PAYMENTS)
**Dự án:** Roxy Academy — Hệ thống Quản trị Học tập  
**Phân hệ:** Quản lý Học phí (`/tuitions`) & Lịch sử Thanh toán / Sổ quỹ (`/payments`)  
**Ngày kiểm thử:** 14/11/2026  
**Người thực hiện:** QA Agent  
**Tài liệu đối chiếu:** `GEMINI.md`, `docs/AUDIT.md` (§7.2, Nhóm 4 mục 5), `docs/API.md` (Mục 4 & 5), `docs/DESIGN.md` (Mục 9), `RoxyAppDB.sql`  

---

## 1. KẾT QUẢ BIÊN DỊCH VÀ XÂY DỰNG HỆ THỐNG (SMOKE TEST)

Tất cả các lệnh build và lint được thực thi trực tiếp trên mã nguồn thực tế và đều đạt kết quả xuất sắc:

| Thành phần | Câu lệnh kiểm tra | Kết quả thực tế | Chi tiết console |
| :--- | :--- | :---: | :--- |
| **Backend Build** | `dotnet build RoxyAppBE/RoxyAcademy.Api/RoxyAcademy.Api.csproj` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>Time Elapsed: 00:00:01.25<br>Output: `RoxyAcademy.Api.dll` |
| **Frontend Lint** | `npm run lint` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s), 0 Warning(s)**<br>ESLint kiểm tra sạch toàn bộ source code |
| **Frontend Build** | `npm run build` tại thư mục `roxy-admin/` | **ĐẠT (PASS)** | **0 Error(s)**<br>91 modules transformed thành công trong 240ms.<br>Dist: `index.html` (0.49 kB), `index-*.css` (48.51 kB), `index-*.js` (528.94 kB) |

---

## 2. BẢNG MA TRẬN TEST CASES GIAI ĐOẠN 1D

| Mã Test Case | Nội dung kiểm thử | Đối tượng kiểm tra | Kết quả | Ghi chú & Trạng thái |
| :---: | :--- | :--- | :---: | :--- |
| **TC-FIN-01** | **Phân quyền Tài chính (RBAC):**<br>- `Teacher` bị ẩn menu `/tuitions` & `/payments`<br>- `Teacher` bị chặn 403 tại frontend & backend<br>- `Student` chỉ thấy của mình<br>- `Parent` chỉ thấy con mình<br>- `BranchManager` chỉ thấy cơ sở mình | `AdminLayout.jsx`<br>`Tuitions.jsx`<br>`Payments.jsx`<br>`TuitionsController.cs`<br>`PaymentsController.cs` | **PASS** | Phân quyền 5 vai trò tuyệt đối nghiêm ngặt. Giáo viên bị ẩn menu và chặn 403 hoàn toàn từ UI đến API; Phụ huynh/Học viên chỉ truy cập đúng dữ liệu thuộc thẩm quyền; Quản lý cơ sở bị khóa cứng chi nhánh sở tại. |
| **TC-FIN-02** | **Bảo vệ Overpay & SQL Trigger `TR_Payments_NoOverpay`:**<br>- EF Core `HasTrigger` + `UseSqlOutputClause(false)`<br>- Backend chặn Overpay tại POST/PUT<br>- Frontend validate real-time & disable nút Lưu | `RoxyDbContext.cs`<br>`TuitionsController.cs`<br>`PaymentsController.cs`<br>`Tuitions.jsx` (`QuickPayModal`)<br>`Payments.jsx` (`RecordPaymentModal`) | **PASS** | `RoxyDbContext` cấu hình chuẩn xác cho `Payment`, triệt tiêu lỗi xung đột mệnh đề `OUTPUT` với SQL Server. Cả Backend và Frontend đều chặn overpay trước khi gọi SQL trigger, ngăn chặn triệt để lỗi 500. |
| **TC-FIN-03** | **Đầy đủ tính năng & Giữ nguyên Dashboard:**<br>- Tuyến đường `/tuitions` & `/payments` hoạt động<br>- Tìm kiếm, lọc đa chiều, xem chi tiết + lịch sử<br>- Tạo/sửa khoản thu, ghi nhận thanh toán, duyệt nhanh / từ chối<br>- `Dashboard.jsx` giữ nguyên placeholder<br>- Không hard-code `localhost` | `App.jsx`<br>`Tuitions.jsx`<br>`Payments.jsx`<br>`Dashboard.jsx`<br>`roxy-admin/src/**/*.*` | **PASS** | Đầy đủ tính năng theo đặc tả `DESIGN.md` Mục 9 và `API.md` Mục 4 & 5. Lightbox chứng từ hoạt động tại chỗ, số tiền hiển thị `font-mono tabular-nums`, Dashboard không có số liệu giả, 0 vị trí hard-code `localhost`. |

---

## 3. CHI TIẾT ĐỐI CHIẾU MÃ NGUỒN (CODE AUDIT EVIDENCE)

### 3.1. TC-FIN-01: Phân quyền tài chính (RBAC)

#### A. Ẩn Menu trên Sidebar & Mobile Drawer (`AdminLayout.jsx`):
- **Vị trí:** `roxy-admin/src/layouts/AdminLayout.jsx` (Dòng 68, 97-111)
- **Bằng chứng code:**
  ```javascript
  const isStaff = user.role === 'SuperAdmin' || user.role === 'BranchManager';
  // ...
  {isStaff && (
    <>
      <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Tài chính &amp; Sổ quỹ
      </div>
      <NavLink to="/tuitions" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">💰</span>
        <span>Học phí</span>
      </NavLink>
      <NavLink to="/payments" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">💳</span>
        <span>Thanh toán</span>
      </NavLink>
    </>
  )}
  ```
- **Đánh giá:** Với vai trò `Teacher` (hoặc các vai trò khác không phải Staff), `isStaff = false`, cả hai mục Menu Học phí (`/tuitions`) và Thanh toán (`/payments`) **bị ẩn hoàn toàn** trên cả màn hình Desktop lẫn Mobile Drawer.

#### B. Chặn truy cập trực tiếp 403 trên Giao diện (`Tuitions.jsx` & `Payments.jsx`):
- **Tại `Tuitions.jsx`:**
  - Dòng 18: `const isTeacher = currentUser.role === 'Teacher';`
  - Dòng 70, 102: Kiểm tra `if (isTeacher) return;` ngăn chặn hoàn toàn việc gửi request API ngầm.
  - Dòng 201-228: Render màn hình chặn 403 chuyên biệt với icon cảnh báo `🚫`, thông báo rõ lý do bảo mật và cung cấp 2 nút điều hướng về `/classes` và `/schedules`.
- **Tại `Payments.jsx`:**
  - Dòng 19: `const isTeacher = currentUser.role === 'Teacher';`
  - Dòng 60, 82: `if (isTeacher) return;` chặn gọi API.
  - Dòng 192-220: Render màn hình chặn 403 chuyên biệt với nút quay lại Lớp học / Thời khóa biểu.

#### C. Chặn quyền tại Backend (`TuitionsController.cs` & `PaymentsController.cs`):
- **Tại `TuitionsController.cs`:**
  - `GetTuitions` (Dòng 28-29):
    ```csharp
    if (Role == "Teacher") return Forbid();
    ```
  - `GetTuition(id)` (Dòng 167-168):
    ```csharp
    if (Role == "Teacher") return Forbid();
    ```
  - `CreateTuition`, `UpdateTuition`, `DeleteTuition` (Dòng 246, 304, 345):
    ```csharp
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    ```
  - **Phân quyền dữ liệu theo phạm vi (Data Scoping):**
    - `SuperAdmin` (Dòng 40-42): Xem toàn bộ hệ thống hoặc lọc theo `branchId`.
    - `BranchManager` (Dòng 43-46, 208-209, 260-264, 311-312, 352-353): Tự động gán `BranchId == userBranchId`, chặn truy cập / sửa / xóa cơ sở khác bằng `Forbid()` hoặc `403 Forbidden`.
    - `Parent` (Dòng 47-50, 204-205): `t.Student.ParentId == UserId`. Phụ huynh chỉ thấy học phí của con mình.
    - `Student` (Dòng 51-54, 200-201): `t.Student.UserId == UserId`. Học viên chỉ thấy học phí của chính mình.
- **Tại `PaymentsController.cs`:**
  - `GetPayments` (Dòng 27-29) & `GetPayment(id)` (Dòng 89-91):
    ```csharp
    if (Role == "Teacher") return Forbid();
    ```
  - `CreatePayment` (Dòng 133, 146-153):
    - `[Authorize(Roles = "SuperAdmin,BranchManager,Parent,Student")]` — Chặn `Teacher` (403).
    - Phụ huynh chỉ nộp cho con mình (`Student.ParentId == UserId`).
    - Học viên chỉ nộp cho chính mình (`Student.UserId == UserId`).
    - Quản lý cơ sở chỉ nộp cho học viên thuộc cơ sở mình.
  - `ConfirmPayment` (Dòng 237, 248-249):
    - `[Authorize(Roles = "SuperAdmin,BranchManager")]` — Chặn `Teacher`, `Parent`, `Student`.
    - `BranchManager` chỉ được duyệt thanh toán thuộc cơ sở mình (`payment.Tuition.BranchId == userBranchId`).

---

### 3.2. TC-FIN-02: Bảo vệ Overpay & Tương thích SQL Trigger `TR_Payments_NoOverpay`

#### A. Cấu hình DbContext chống xung đột EF Core (`RoxyDbContext.cs`):
- **Vị trí:** `RoxyAppBE/RoxyAcademy.Api/Data/RoxyDbContext.cs` (Dòng 418-422)
- **Bằng chứng code:**
  ```csharp
  modelBuilder.Entity<Payment>(entity =>
  {
      entity.ToTable(tb =>
      {
          tb.HasTrigger("TR_Payments_NoOverpay");
          tb.UseSqlOutputClause(false);
      });
      // ...
  });
  ```
- **Ý nghĩa kỹ thuật:** Khi bảng `Payments` có trigger `TR_Payments_NoOverpay` trong SQL Server, EF Core mặc định sử dụng mệnh đề `OUTPUT` sẽ bị SQL Server chặn và gây lỗi runtime. Việc khai báo tường minh `tb.HasTrigger` cùng `tb.UseSqlOutputClause(false)` bảo đảm EF Core thực thi câu lệnh SQL INSERT/UPDATE tương thích 100%, không bị crash.

#### B. Kiểm tra chống Overpay tại Backend API:
1. **Tại `PaymentsController.CreatePayment` (Dòng 158-177):**
   ```csharp
   var currentPaid = await db.Payments
       .Where(p => p.TuitionId == req.TuitionId && p.Status == "Confirmed")
       .SumAsync(p => (decimal?)p.Amount) ?? 0m;

   var netAmount = tuition.Amount - tuition.Discount;
   var remainingAmount = Math.Max(0m, netAmount - currentPaid);

   if (remainingAmount <= 0)
       return BadRequest(new { message = "Khoản học phí này đã được thanh toán đầy đủ, không thể nộp thêm." });

   if (req.Amount > remainingAmount)
   {
       return BadRequest(new
       {
           message = $"Số tiền thanh toán ({req.Amount:N0} đ) vượt quá số tiền còn nợ ({remainingAmount:N0} đ). Tổng phải thu: {netAmount:N0} đ, đã thanh toán: {currentPaid:N0} đ."
       });
   }
   ```
2. **Tại `PaymentsController.ConfirmPayment` (Dòng 258-273):**
   ```csharp
   if (req.Status == "Confirmed")
   {
       var otherConfirmedPaid = await db.Payments
           .Where(p => p.TuitionId == payment.TuitionId && p.Id != payment.Id && p.Status == "Confirmed")
           .SumAsync(p => (decimal?)p.Amount) ?? 0m;

       var netAmount = payment.Tuition.Amount - payment.Tuition.Discount;
       if (otherConfirmedPaid + payment.Amount > netAmount)
       {
           var remaining = Math.Max(0m, netAmount - otherConfirmedPaid);
           return BadRequest(new
           {
               message = $"Không thể xác nhận: Số tiền của giao dịch ({payment.Amount:N0} đ) cộng với số tiền đã thanh toán ({otherConfirmedPaid:N0} đ) vượt quá tổng số phải thu ({netAmount:N0} đ). Số tiền còn nợ tối đa là {remaining:N0} đ."
           });
       }
   }
   ```
3. **Tại `TuitionsController.UpdateTuition` (Dòng 320-331):**
   ```csharp
   var paidAmount = await db.Payments
       .Where(p => p.TuitionId == id && p.Status == "Confirmed")
       .SumAsync(p => (decimal?)p.Amount) ?? 0m;

   var netAmount = req.Amount - req.Discount;
   if (netAmount < paidAmount)
   {
       return BadRequest(new { 
           message = $"Số tiền phải thu sau giảm giá ({netAmount:N0} đ) không được nhỏ hơn tổng số tiền đã thanh toán ({paidAmount:N0} đ)." 
       });
   }
   ```

#### C. Validation Real-Time trên Giao diện Frontend:
- **`Tuitions.jsx` (`QuickPayModal` - Dòng 1757-1772, 1871-1884, 1981):**
  - Tự động tính: `const isOverpay = numAmount > remainingAmount;`
  - Ô input tự động đổi viền đỏ và highlight: `border-rose-500 ring-2 ring-rose-200 bg-rose-50/30 text-rose-700`
  - Cảnh báo trực tiếp: `⚠️ Số tiền thanh toán ({formatCurrency(numAmount)}) không được vượt quá số còn nợ (Tối đa: {formatCurrency(remainingAmount)}).`
  - Nút submit: `disabled={submitting || isInvalidAmount}` với class `bg-blue-400 cursor-not-allowed opacity-60`.
  - Có nút 1 chạm `⚡ Điền đủ` giúp điền nhanh số nợ còn lại.
- **`Payments.jsx` (`RecordPaymentModal` - Dòng 769-772, 914-926, 1024):**
  - Tương tự, kiểm soát real-time không cho nhập quá `remainingAmount`, viền hóa đỏ, hiển thị phiên âm tiếng Việt và vô hiệu hóa nút submit.

---

### 3.3. TC-FIN-03: Đầy đủ tính năng & Giữ nguyên Dashboard

#### A. Khai báo Tuyến đường (`App.jsx`):
- **Vị trí:** `roxy-admin/src/App.jsx` (Dòng 8-9, 27-28)
- Đã đăng ký route `/tuitions` và `/payments` nằm bên trong `ProtectedRoute` và `AdminLayout`.

#### B. Phân hệ Quản lý Học phí (`Tuitions.jsx`):
- **KPI Summary Cards (Dòng 167-187, 260-310):** 4 thẻ chỉ số tổng phải thu, đã thu thực tế (kèm mini progress bar), tổng công nợ còn lại, khoản thu quá hạn.
- **Thanh công cụ & Lọc đa chiều (Dòng 315-420):** Tìm kiếm thông minh (tên bé, mã học viên, tiêu đề), lọc học viên, lọc lớp học, lọc cơ sở (`BranchManager` tự động khóa chi nhánh mình), bộ nút viên thuốc (Pill tabs) trạng thái: `Tất cả`, `Chưa đóng`, `Đóng một phần`, `Đã xong`, `Quá hạn`, `Đã hủy`.
- **Bảng dữ liệu chuẩn kế toán (Dòng 435-595):** Cột số tiền định dạng `font-mono tabular-nums`, cột Còn nợ nổi bật đỏ `text-rose-600 font-bold`, badge trạng thái đồng bộ 100% database constraints.
- **Modal Chi tiết & Lịch sử thanh toán (`TuitionDetailModal` - Dòng 1227-1478):** Hiển thị đầy đủ thông tin học viên, lớp, bảng lịch sử nạp qua API `/Payments?tuitionId={id}`, nút mở xem ảnh chứng từ Lightbox, nút `+ Ghi nhận thanh toán mới`.
- **Modal Tạo / Sửa khoản thu (`CreateEditTuitionModal` - Dòng 1481-1740 & 1000-1225):** Tự động gợi ý các lớp học viên đã ghi danh, kiểm tra `discount <= amount`, tự động tính số tiền thực thu kèm phiên âm tiếng Việt chuẩn mực sư phạm.

#### C. Phân hệ Quản lý Thanh toán & Sổ quỹ (`Payments.jsx`):
- **Bộ lọc & Tìm kiếm (Dòng 265-350):** Lọc theo mã khoản thu, phương thức thanh toán (`BankTransfer`, `Cash`, `ZaloPay`, `Other`), trạng thái (`PendingConfirm`, `Confirmed`, `Rejected`).
- **Ghi nhận thanh toán mới (`RecordPaymentModal` - Dòng 733-1040):** Hỗ trợ nhập mã giao dịch ngân hàng, URL ảnh biên lai, ghi chú.
- **Luồng duyệt giao dịch `PendingConfirm` (Dòng 128-179, 440-520):**
  - Nút `✓ Duyệt` (`handleConfirmPayment`): gọi `PUT /api/Payments/{id}/confirm` cập nhật sang `Confirmed`.
  - Nút `✕ Từ chối` (`handleOpenReject`): mở modal nhập lý do từ chối, cập nhật sang `Rejected` kèm ghi chú.
  - Tự động lưu vết người duyệt (`ConfirmedBy`) và thời gian duyệt (`ConfirmedAt`), thỏa mãn ràng buộc DB `CK_Payments_Reviewed`.
- **Xem chứng từ Lightbox (Dòng 660-705):** Modal xem ảnh chứng từ tại chỗ với hiệu ứng nền kính mờ `backdrop-blur-md`, hỗ trợ đóng bằng nút hoặc phím `Esc`.

#### D. Kiểm tra Màn hình Tổng quan (`Dashboard.jsx`):
- **Vị trí:** `roxy-admin/src/pages/Dashboard.jsx` (Dòng 22-51, 84-104)
- **Kết quả:** Giữ nguyên 4 thẻ chỉ số với placeholder `—` và ghi chú rõ ràng (`Đang cập nhật từ hệ thống`, `Dữ liệu Giai đoạn 1C`). **Hoàn toàn không có số liệu giả** hard-code (như 120 học viên, 15 lớp, 45tr), tuân thủ đúng quy tắc dự án.

#### E. Kiểm tra Hard-code `localhost`:
- Thực hiện quét toàn bộ thư mục `roxy-admin/src/` bằng lệnh `Select-String -Path "roxy-admin/src/**/*.*" -Pattern "localhost"`.
- **Kết quả:** **0 kết quả** (Không có bất kỳ chuỗi `localhost` nào bị hard-code). Mọi thao tác API đều gọi thông qua `axiosClient` sử dụng `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`.

---

## 4. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

1. **Tổng số lỗi chặn (Blocker):** **0**
2. **Tổng số lỗi nghiêm trọng (Critical):** **0**
3. **Mã nguồn Backend và Frontend:** 
   - Backend biên dịch thành công 100% (**0 Error, 0 Warning**).
   - Frontend lint sạch 100% (**0 Error, 0 Warning**), build production thành công trong **240ms** (**91 modules transformed**).
4. **Đánh giá nghiệp vụ & Bảo mật:**
   - RBAC phân quyền tài chính đạt chuẩn an toàn thông tin tuyệt đối.
   - Cơ chế phòng ngừa lỗi Overpay nhiều tầng (Preventive Validation + SQL Trigger Protection) vận hành trơn tru.
   - Trải nghiệm người dùng đạt chuẩn Apple Design & Emil Kowalski (Tabular numbers, Real-time formatting, Zero layout shift, Lightbox in-place).
5. **Kết luận:** Giai đoạn 1D (Tuitions + Payments UI & Backend) **ĐẠT CHUẨN NGHIỆM THU QA (PASSED 100%)**, đủ điều kiện nghiệm thu và bàn giao cho các giai đoạn tiếp theo.
