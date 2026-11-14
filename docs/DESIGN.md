# HỆ THỐNG THIẾT KẾ GIAO DIỆN (ADMIN DESIGN SYSTEM) — ROXY ACADEMY
**Giai đoạn:** 1B — Quản trị Web Admin (Dành cho Staff: SuperAdmin, BranchManager, Teacher)  
**Tài liệu tham chiếu:** `GEMINI.md`, `PROJECT.md`, `BRIEF-ADMIN-WEB.md`, `docs/AUDIT.md` (§6), `RoxyAppDB.sql`  
**Phiên bản:** 1.0 (13/11/2026)  
**Tác giả:** Designer Agent  

---

## 1. MỤC TIÊU & ĐỊNH HƯỚNG THIẾT KẾ

Hệ thống quản trị **Roxy Academy Admin Web** là công cụ làm việc tác vụ cao mỗi ngày cho đội ngũ nhân sự trung tâm (Ban giám đốc / SuperAdmin, Quản lý chi nhánh / BranchManager, Giáo viên / Teacher). 

### Tiêu chí cốt lõi
1. **Rõ ràng & Minh bạch (Clarity):** Trực quan hóa dữ liệu giáo dục trẻ em, phân tách rõ ràng vai trò và quyền hạn chi nhánh.
2. **Nhanh & Tối ưu năng suất (High Velocity):** Mật độ thông tin hợp lý (Compact/Standard), tốc độ phản hồi tức thì, không hiệu ứng rườm rà cản trở thao tác.
3. **Bảo mật dữ liệu nhạy cảm (Data Privacy):** Đặc thù giáo dục trẻ mầm non, tiểu học và can thiệp đặc biệt/tự kỷ đòi hỏi ghi chú nội bộ (`Note`) phải được bảo vệ nghiêm ngặt trên giao diện.
4. **Chuẩn Responsive Mobile-Native:** Vận hành mượt mà trên cả máy tính bàn và điện thoại di động (màn hình phổ thông 375px – 414px) khi giáo viên, quản lý mở trên điện thoại tại cơ sở.
5. **Tiếng Việt 100%:** Ngữ cảnh sư phạm thân thiện, chỉn chu, đúng đối tượng trẻ em.

---

## 2. NGUYÊN LÝ THIẾT KẾ & CHUYỂN ĐỘNG (APPLE DESIGN & EMIL KOWALSKI)

Hệ thống chắt lọc 7 nguyên lý từ **Apple Design Guidelines** (*Designing Fluid Interfaces*) và triết lý **Emil Kowalski** (*Design Engineering / Polish UI*), được tùy biến riêng cho công cụ Admin Tool:

| STT | Nguyên lý | Quy tắc ứng dụng thực tế trên Roxy Admin Web |
| :-: | :--- | :--- |
| **1** | **Phản hồi tức thì trên Pointer-Down** *(Response - Kill Latency)* | Nút bấm, menu và card kích hoạt phản hồi `:active` ngay khoảnh khắc ngón tay/chuột chạm xuống (`scale(0.98)` trong 100ms), không đợi nhả chuột (`click`/touch-up) mới đổi màu. |
| **2** | **Tiết chế chuyển động công cụ** *(Restraint & Purpose)* | Thao tác lặp lại trên 50 lần/ngày (gõ phím, chuyển tab, phân trang, lọc nhanh) **tuyệt đối không dùng animation trễ nải**. Chỉ cho phép micro-transition từ 150ms – 200ms `ease-out` cho hover, mở modal và drawer trượt ngang. |
| **3** | **Không bao giờ xuất hiện từ hư vô** *(Never animate from scale 0)* | Mọi Modal và Popover xuất hiện từ `scale(0.96) + opacity: 0` chuyển sang `scale(1) + opacity: 1` với đường cong `cubic-bezier(0.23, 1, 0.32, 1)`. Modals luôn neo ở trung tâm màn hình (`transform-origin: center`). |
| **4** | **Tính nhất quán không gian** *(Spatial Consistency)* | Drawer điều hướng trên mobile trượt vào từ mép trái (`-translate-x-full` → `translate-x-0`) thì khi đóng cũng rút lui về đúng mép trái. Không bao giờ vào một đường, ra một nẻo. |
| **5** | **Chỉ chuyển động trên GPU** *(Compositor-Only Performance)* | Mọi animation chỉ tác động vào 2 thuộc tính: `transform` và `opacity`. Tuyệt đối không animate `width`, `height`, `margin`, `padding` để tránh gây reflow giật khung hình. |
| **6** | **Tôn trọng tùy chọn giảm chuyển động** *(Reduced Motion)* | Khi người dùng bật `@media (prefers-reduced-motion: reduce)`, toàn bộ chuyển động trượt và co giãn bị vô hiệu hóa, chỉ giữ lại crossfade độ mờ `opacity: 150ms ease` để bảo vệ thị giác. |
| **7** | **Quang học & Mật độ phông chữ** *(Optical Hierarchy & Tracking)* | Tiêu đề lớn dùng Tracking âm nhẹ (`-0.02em` đến `-0.015em`) để chữ kết nối chặt chẽ; nhãn dữ liệu nhỏ dùng tracking chuẩn `0` hoặc dương nhẹ (`+0.01em`) giúp phụ huynh/nhân viên đọc mã số, số điện thoại không bị dính nét. |

---

## 3. THIẾT KẾ CƠ SỞ & DESIGN TOKENS CHO TAILWIND CSS 4

### 3.1. Bảng màu thương hiệu & Trạng thái (Color Palette)

Thương hiệu Roxy Academy gần 20 năm gắn liền với uy tín sư phạm, sự ấm áp và bảo bọc trẻ em. Giao diện quản trị sử dụng hệ màu xanh đậm chủ đạo (Royal Educational Blue) kết hợp điểm nhấn vàng ấm áp (Warm Sunbeam):

```
       [Primary Brand]              [Warm Accent]              [Canvas Dark Slate]
   #1D4ED8 (blue-700, Main)      #F59E0B (amber-500)          #0F172A (slate-900, Text)
   #2563EB (blue-600, Hover)     #FEF3C7 (amber-100, Light)   #334155 (slate-700, Body)
   #EFF6FF (blue-50, Surface)    #B45309 (amber-700, Dark)    #64748B (slate-500, Muted)
```

#### Bảng chi tiết mã màu (Tokens):

| Nhóm màu | Tên Token | Mã Hex | Tailwind 4 Class | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `brand-blue-700` | `#1D4ED8` | `bg-blue-700`, `text-blue-700` | Màu thương hiệu chính, nút CTA, thanh điều hướng active |
| | `brand-blue-600` | `#2563EB` | `bg-blue-600`, `hover:bg-blue-700` | Nút hành động chính, link hover, focus ring |
| | `brand-blue-50` | `#EFF6FF` | `bg-blue-50` | Nền menu active, nền badge sắp mở, highlight hàng |
| **Accent** | `brand-amber-500`| `#F59E0B` | `bg-amber-500` | Điểm nhấn chú ý, cảnh báo dữ liệu nhạy cảm |
| | `brand-amber-50` | `#FFFBEB` | `bg-amber-50` | Khung cảnh báo ghi chú nội bộ, badge tạm dừng |
| **Neutral Canvas**| `slate-900` | `#0F172A` | `text-slate-900` | Tiêu đề trang, chữ quan trọng, tên học viên |
| | `slate-700` | `#334155` | `text-slate-700` | Chữ nội dung chính trong bảng, nhãn form input |
| | `slate-500` | `#64748B` | `text-slate-500` | Phụ đề, ngày giờ, tên phụ huynh, placeholder mờ |
| | `slate-200` | `#E2E8F0` | `border-slate-200` | Đường kẻ bảng, viền ô nhập liệu, đường ngăn cách |
| | `slate-100` | `#F1F5F9` | `bg-slate-100` | Nền header bảng, nền chip tag phụ |
| | `slate-50` | `#F8FAFC` | `bg-slate-50` | Màu nền toàn màn hình dashboard & app canvas |

#### Badges Trạng thái Nghiệp vụ (Khớp 100% Database Constraints):

| Nghiệp vụ / Đối tượng | Mã DB / DTO | Nhãn hiển thị Tiếng Việt | Nền & Viền | Màu chữ | Dot chỉ thị |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Học viên / Lớp học** | `Active` / `Ongoing` | **Đang hoạt động** / **Đang học** | `bg-emerald-50 border-emerald-200` | `text-emerald-800` | `bg-emerald-500` |
| **Lớp học** | `Upcoming` | **Sắp mở** | `bg-blue-50 border-blue-200` | `text-blue-800` | `bg-blue-500` |
| **Học viên** | `Paused` | **Tạm dừng** | `bg-amber-50 border-amber-200` | `text-amber-800` | `bg-amber-500` |
| **Học viên / Lớp học** | `Graduated` / `Completed` | **Đã hoàn thành** / **Tốt nghiệp**| `bg-purple-50 border-purple-200` | `text-purple-800` | `bg-purple-500` |
| **Lớp học / Học viên** | `Finished` / `Dropped` | **Đã kết thúc** / **Thôi học** | `bg-slate-100 border-slate-200` | `text-slate-600` | `bg-slate-400` |
| **Đăng ký lớp** | `Pending` | **Chờ xếp lớp** | `bg-amber-50 border-amber-300` | `text-amber-700` | `bg-amber-500` |
| **Đăng ký lớp** | `Rejected` | **Từ chối** | `bg-rose-50 border-rose-200` | `text-rose-800` | `bg-rose-500` |

#### Badges Phân quyền Vai trò (User Roles):
- `SuperAdmin` (👑 Quản trị cấp cao): `bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-xs`
- `BranchManager` (🏢 Quản lý cơ sở): `bg-blue-100 text-blue-900 border border-blue-300 font-semibold px-2.5 py-0.5 rounded-full text-xs`
- `Teacher` (👩‍🏫 Giáo viên): `bg-indigo-100 text-indigo-900 border border-indigo-300 font-medium px-2.5 py-0.5 rounded-full text-xs`

---

### 3.2. Hệ thống Typography

Để đảm bảo hiệu năng tối đa (tải 0ms, không phụ thuộc font mạng bên ngoài, hiển thị tiếng Việt UTF-8 chuẩn xác 100% không bị lỗi bể dấu), hệ thống sử dụng **Native High-Quality System UI Font Stack**:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```
*Ghi chú bản quyền:* Bộ font này được cấp phép bản quyền sẵn trên các hệ điều hành (macOS, iOS, Windows, Android, Linux). Không cần nhúng font bên thứ ba.

| Cấp bậc | Cỡ chữ / Line-height | Tracking | Weight | Áp dụng trên giao diện |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | `24px` (`1.5rem`) / `1.25` | `-0.02em` | `700` (Bold) | Tiêu đề màn hình chính (Quản lý Học viên, Lớp học) |
| **Section Title (H2)**| `18px` (`1.125rem`) / `1.35`| `-0.015em`| `600` (Semibold)| Tiêu đề Modal, tiêu đề card lớn |
| **Card / Subtitle (H3)**| `15px` (`0.9375rem`) / `1.4`| `-0.01em` | `600` (Semibold)| Nhóm phân loại, tiêu đề cột bảng |
| **Body Standard** | `14px` (`0.875rem`) / `1.5` | `0` | `400` / `500` | Dòng dữ liệu trong bảng, văn bản form nhập liệu |
| **Caption & Meta** | `12px` (`0.75rem`) / `1.4` | `+0.01em` | `500` (Medium) | Nhãn phụ, ngày sinh, mã ID, badge trạng thái |
| **Numeric Code** | `13px` (`0.8125rem`) / `1.4`| `0` | `600` (Semibold)| Mã học viên `#STU-102`, số điện thoại, sĩ số `18/20` |

---

### 3.3. Bo góc (Radius), Đổ bóng (Shadow) & Độ nổi khối

Theo ngôn ngữ Apple & Modern Admin:
- **Radius:**
  - `rounded-lg` (`8px`): Nút bấm, ô input form, dropdown select, badge trạng thái.
  - `rounded-xl` (`12px`): Container thẻ nội dung, khung modal, drawer panel.
  - `rounded-full` (`9999px`): Avatar người dùng, chấm trạng thái (dot status).
- **Shadows:**
  - `shadow-xs`: Đường viền nổi nhẹ cho buttons và input: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`.
  - `shadow-sm`: Thẻ card dữ liệu, bảng danh sách: `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)`.
  - `shadow-xl`: Modal trung tâm, Popover: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`.

---

### 3.4. KHẮC PHỤC TRIỆT ĐỂ LỖI CSS TRONG `roxy-admin/src/index.css`

> [!CAUTION]
> **LỖI VỠ BỐ CỤC HIỆN TẠI TRONG CODE:**  
> File `roxy-admin/src/index.css` dòng 58-68 đang chứa đoạn code mẫu của Vite:  
> ```css
> #root {
>   width: 1126px;
>   max-width: 100%;
>   margin: 0 auto;
>   text-align: center;
>   border-inline: 1px solid var(--border);
>   min-height: 100svh;
>   display: flex;
>   flex-direction: column;
>   box-sizing: border-box;
> }
> ```
> Đoạn mã này **bó cứng độ rộng màn hình**, khiến giao diện admin bị kẹp ở giữa, canh giữa toàn bộ văn bản và sinh ra 2 viền xám thừa.

#### Giải pháp chuẩn hóa thay thế cho `roxy-admin/src/index.css`:
```css
@import "tailwindcss";

@layer base {
  :root {
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color-scheme: light;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    background-color: #f8fafc; /* slate-50 */
    color: #0f172a; /* slate-900 */
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Xóa bỏ hoàn toàn định dạng co cụm và text-align: center của Vite starter */
  #root {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
  }
}
```

---

## 4. QUY CHUẨN CÁC THÀNH PHẦN GIAO DIỆN CHUNG (CORE UI COMPONENTS)

### 4.1. Hệ thống Nút bấm (Button System)

Mọi nút bấm đều tuân thủ nguyên lý phản hồi tức thì (`active:scale-[0.98]`), tối ưu chiều cao ngón tay chạm (`min-h-[40px]` trên desktop, `min-h-[44px]` trên mobile):

```
+-----------------------------------------------------------------------------------+
| 1. Primary CTA: [ + Thêm học viên ]                                               |
|    bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98]       |
+-----------------------------------------------------------------------------------+
| 2. Secondary:   [ Đóng / Hủy bỏ ]                                                 |
|    bg-white border border-slate-300 text-slate-700 hover:bg-slate-50              |
+-----------------------------------------------------------------------------------+
| 3. Destructive: [ Khóa / Thôi học ]                                              |
|    bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100              |
+-----------------------------------------------------------------------------------+
| 4. Loading:     [ (Spinner) Đang lưu dữ liệu... ]                                 |
|    cursor-not-allowed opacity-70 pointer-events-none                              |
+-----------------------------------------------------------------------------------+
```

- **Mã lớp Tailwind chuẩn:**
  - **Primary:** `inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`
  - **Secondary:** `inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1`
  - **Danger:** `inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg hover:bg-rose-100 hover:border-rose-300 active:scale-[0.98] transition-all duration-150`
  - **Icon Button:** `p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg active:scale-95 transition-all`

---

### 4.2. Khung nhập liệu (Form Inputs & Selects)

- Chiều cao chuẩn `h-10` (`40px`), padding ngang `px-3`, bo góc `rounded-lg`.
- Viền mặc định: `border-slate-300`, nền `bg-white`, chữ `text-slate-800 text-sm`.
- Focus state: `focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none`.
- Lỗi xác thực (Validation Error): `border-rose-400 focus:border-rose-600 focus:ring-rose-100` kèm dòng text báo lỗi màu đỏ `text-xs text-rose-600 mt-1`.

---

### 4.3. Bảng dữ liệu Quản trị (Admin Data Table)

- Bọc trong container: `w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs`.
- Cho phép cuộn ngang mượt mà trên thiết bị di động: `overflow-x-auto min-w-full`.
- **Header (`<thead>`):** `bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold tracking-wider text-left`. Chiều cao dòng `h-10`.
- **Hàng dữ liệu (`<tbody> <tr>`):** Chiều cao tối thiểu `56px`, ngăn cách bởi `divide-y divide-slate-100`. Hover hiệu ứng tinh tế: `hover:bg-slate-50/80 transition-colors duration-100`.
- **Phân trang (Pagination Bar):** Đặt cố định ở đáy bảng với thông tin `Hiển thị 1 - 20 trên tổng số 85 học viên`, các nút `Trước`, số trang `1, 2, 3`, `Sau`.

---

### 4.4. Hộp thoại nổi (Modal & Slide-Over Drawer Specs)

Theo triết lý Emil Kowalski:
- **Modal Entry:** Bắt đầu từ `opacity: 0, scale: 0.96` và chuyển sang `opacity: 1, scale: 1` trong `180ms ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`).
- **Modal Scrim (Backdrop):** Nền đen mờ nhẹ `bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-180`.
- **Mobile Drawer:** Trượt từ trái qua phải `translate-x-0` từ vị trí ban đầu `-translate-x-full` trong `200ms ease-out`.

---

## 5. THIẾT KẾ CHI TIẾT 5 MÀN HÌNH / LAYOUT

### 5.1. Khung Giao Diện Quản Trị (`AdminLayout`)

#### Yêu cầu bố cục:
1. **Desktop (`lg: >= 1024px`):** Thanh Sidebar cố định bên trái (`w-64`), nền trắng, viền phải `border-r border-slate-200`. Nội dung chính cuộn dọc độc lập (`flex-1 overflow-y-auto`).
2. **Mobile (`< 768px` / `375px – 414px`):** Sidebar thu gọn thành Drawer ẩn ngoài màn hình. Header xuất hiện nút Hamburger `☰` (44px x 44px) để mở drawer.
3. **Active Nav Link:** Tự động phát hiện theo route hiện tại (`useLocation().pathname`). Menu active được làm nổi bật với nền xanh nhạt `bg-blue-50`, chữ đậm xanh `text-blue-700`, vạch định vị bên trái `border-l-4 border-blue-600`.
4. **Header thanh trên (Topbar):**
   - Bên trái: Tiêu đề trang động + nút Hamburger trên mobile.
   - Bên phải: Avatar tròn (chữ cái đầu) + Tên đầy đủ (`fullName`) + Badge quyền (`SuperAdmin` / `BranchManager` / `Teacher`) + Tên chi nhánh + Nút `Đăng xuất`.

#### Bản vẽ cấu trúc (Wireframe Layout):

```
+----------------------------------------------------------------------------------------------------+
|  ROXY ACADEMY LOGO               |  [☰]  Hồ sơ học viên                  (User: Nguyễn Hữu Đông)   |
|  Quản trị học tập v1.0           |                                  [👑 SuperAdmin] [Đăng xuất]   |
+----------------------------------+-----------------------------------------------------------------+
|  NAVIGATION:                     |  MAIN CONTENT AREA (Scrollable, bg-slate-50, p-4 md:p-8)       |
|  -------------------------       |                                                                 |
|  [📊] Tổng quan                  |  +-----------------------------------------------------------+  |
|  [🎓] Học viên  (Active Pill)    |  | Page Header: Tiêu đề + Thống kê + Nút CTA Action           |  |
|  [🏫] Lớp học                    |  +-----------------------------------------------------------+  |
|                                  |  | Filter Toolbar: Search + Chi nhánh + Lớp + Trạng thái     |  |
|  -- PHÂN HỆ SẮP RA MẮT --        |  +-----------------------------------------------------------+  |
|  [📅] Lịch & Điểm danh (Khóa)    |  | Data Table: Responsive overflow-x-auto                    |  |
|  [💰] Học phí & Thu tiền (Khóa)  |  |                                                           |  |
|  [📝] Bài tập (Khóa)             |  |                                                           |  |
|  [📋] Nghỉ phép (Khóa)           |  | Pagination Bar                                            |  |
|                                  |  +-----------------------------------------------------------+  |
+----------------------------------+-----------------------------------------------------------------+
```

---

### 5.2. Màn Hình Đăng Nhập (`Login`)

#### Đặc tả thành phần:
- Bố cục: Thẻ đăng nhập căn giữa màn hình (`max-w-md w-full`), nền thẻ trắng nổi bật trên nền canvas `bg-slate-100`.
- **Nhận diện:** Logo Roxy Academy lớn, kèm dòng phụ đề "Hệ thống quản lý học tập dành cho cán bộ & giáo viên".
- **Form đăng nhập:**
  1. Số điện thoại: Ô nhập `type="tel"`, placeholder `0900000000`, có icon điện thoại bên trái.
  2. Mật khẩu: Ô nhập `type="password"`, có icon con mắt bên phải để bật/tắt hiển thị mật khẩu.
  3. Khối thông báo lỗi (Alert): Nền `bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg flex items-center gap-2`.
  4. Nút bấm Đăng Nhập:
     - Bình thường: `bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg active:scale-[0.98]`.
     - Đang gửi (Loading): Nút bị disable, xuất hiện spinner xoay tròn, đổi text thành `Đang xác thực...`.
- **Lưu trữ phiên an toàn:** Lưu đầy đủ `token` (JWT) VÀ đối tượng `user` (`id`, `fullName`, `role`, `branchId`) vào `localStorage` để các màn hình sau đọc dữ liệu tức thì.

---

### 5.3. Màn Hình Tổng Quan (`Dashboard`)

> [!IMPORTANT]
> **TIÊU CHUẨN NGHIỆM THU: TUYỆT ĐỐI XÓA BỎ DỮ LIỆU GIẢ!**  
> Màn hình Dashboard hiện tại trong code đang bịa số liệu: 120 học viên, 15 lớp, 45,000,000đ. Phải dọn sạch toàn bộ các số liệu này.

#### Bố cục Thiết kế Chuẩn (Clean State / Không bịa số):
1. **Banner Chào Mừng:**
   - Lời chào cá nhân hóa: `Chào mừng trở lại, [Họ và tên]!`.
   - Phụ đề thông tin: `Hôm nay là Thứ Sáu, ngày 13/11/2026 • Cơ sở: [Tên chi nhánh hoặc Tất cả cơ sở]`.
2. **Khung thẻ số liệu chuẩn bị sẵn (Ready-to-fill Metric Cards):**
   - Thẻ 1: **Tổng số học viên** → Giá trị: `—` (Nhãn phụ: *Đang cập nhật từ hệ thống*).
   - Thẻ 2: **Lớp đang mở** → Giá trị: `—` (Nhãn phụ: *Chưa có lớp kích hoạt*).
   - Thẻ 3: **Điểm danh hôm nay** → Giá trị: `—` (Nhãn phụ: *Chưa có buổi học nào*).
   - Thẻ 4: **Học phí chờ thu** → Giá trị: `—` (Nhãn phụ: *Dữ liệu Giai đoạn 1C*).
3. **Khu vực Empty State Thông Báo:**
   - Một khối thông tin sạch sẽ ở giữa trang:
     - Icon biểu tượng: 🎓 hoặc 📊 màu `text-slate-400`.
     - Dòng thông điệp chính: `Trung tâm đang trong quá trình cập nhật dữ liệu khóa học`.
     - Dòng giải thích: `Hệ thống thống kê tự động sẽ hiển thị trực quan ngay khi danh sách học viên và lớp học được tạo đầy đủ.`
     - 2 Nút Lối tắt Hành động Nhanh (Quick Actions):
       - `[ + Quản lý Học viên ]` (Trỏ về `/students`)
       - `[ + Quản lý Lớp học ]` (Trỏ về `/classes`)

---

### 5.4. Màn Hình Quản Lý Học Viên (`Students` — ƯU TIÊN SỐ 1)

Màn hình trọng tâm của Giai đoạn 1, tích hợp bảo mật thông tin trẻ em và phân quyền 3 tầng nhân sự:

#### 1. Header Trang & Phân quyền Nút Thao tác:
- Tiêu đề: `Hồ sơ học viên` kèm chip đếm số lượng: `(Tổng số: 48 học viên)`.
- **Nút CTA `+ Thêm học viên`:**
  - `SuperAdmin` và `BranchManager`: **HIỂN THỊ** nút Primary Blue nổi bật.
  - `Teacher`: **ẨN HOÀN TOÀN** nút này (Giáo viên chỉ được phép xem học sinh lớp mình dạy theo quy định tại `GEMINI.md`).

#### 2. Thanh Công Cụ Lọc Nâng Cao (Filter Toolbar):
- **Ô Tìm kiếm:** Input có icon kính lúp, placeholder `Tìm theo họ tên học viên...`, độ trễ debounce `300ms`.
- **Bộ lọc Chi nhánh (`BranchId`):**
  - Đối với `SuperAdmin`: Dropdown cho phép chọn: `Tất cả cơ sở`, `Cơ sở 1 - 21/11 Đường 49`, `Cơ sở 2 - Bình Trưng`.
  - Đối với `BranchManager`: Dropdown bị khóa cứng hoặc cố định tên cơ sở của người quản lý (không xem chéo chi nhánh).
  - Đối với `Teacher`: Tự động ẩn hoặc hiển thị cơ sở của lớp giáo viên phụ trách.
- **Bộ lọc Lớp học (`ClassId`):** Dropdown lọc danh sách các lớp đang hoạt động để xem học viên theo lớp.
- **Bộ lọc Trạng thái (`Status`):** Dropdown chọn: `Tất cả trạng thái`, `Đang học (Active)`, `Tạm dừng (Paused)`, `Tốt nghiệp (Graduated)`, `Thôi học (Dropped)`.

#### 3. Bảng Danh Sách Học Viên (`Students Table`):
Bảng có thuộc tính `overflow-x-auto` chống tràn màn hình mobile, cấu trúc 7 cột chuẩn:

| Cột | Tiêu đề | Kiểu hiển thị | Quy tắc & Dữ liệu hiển thị |
| :-: | :--- | :--- | :--- |
| **1** | **Học viên** | Avatar + Tên + Mã | Avatar tròn nền xanh nhạt + Chữ cái đầu; Họ tên đậm `text-slate-900 font-semibold`; Mã ID phụ `#STU-{id}`. |
| **2** | **Ngày sinh & Giới tính** | Text + Chip | Định dạng `DD/MM/YYYY` (Tính tuổi kèm theo, VD: `7 tuổi`); Chip giới tính: `Nam` (xanh nhạt) / `Nữ` (hồng nhạt) / `Khác`. |
| **3** | **Phụ huynh & SĐT** | 2 dòng | Dòng 1: Tên phụ huynh (`ParentName`); Dòng 2: SĐT phụ huynh dạng click-to-call `tel:{ParentPhone}` màu `text-blue-600`. |
| **4** | **Cơ sở** | Text badge | Tên cơ sở (`BranchName`), VD: `Cơ sở 1 (Bình Trưng)`. |
| **5** | **Trường / Lớp ở trường**| Text | Tên trường tiểu học (`School`) và Khối lớp (`Grade`), VD: `TH An Phú - Lớp 2A`. |
| **6** | **Trạng thái** | Status Pill | Sử dụng đúng màu token: Active (Xanh lá), Paused (Vàng hổ phách), Graduated (Tím), Dropped (Xám). |
| **7** | **Thao tác** | Nhóm nút bấm | - **Nút `Xem chi tiết` (Mắt / Chi tiết):** Mọi staff đều bấm được.<br>- **Nút `Sửa` & `Khóa/Thôi học`:** CHỈ hiện cho `SuperAdmin` và `BranchManager`. Bị ẩn với `Teacher`. |

#### 4. Drawer / Modal "Xem Chi Tiết Học Viên" (Chi Tiết & Bảo Mật `Note`):
- **Phần đầu:** Ảnh đại diện/Avatar lớn, Họ và tên học viên, Mã hồ sơ, Trạng thái hoạt động.
- **Khung thông tin gia đình & học tập:** Phụ huynh bảo hộ, Số điện thoại liên lạc khẩn cấp, Cơ sở đăng ký, Trường lớp bên ngoài.
- **Lịch sử đăng ký lớp:** Danh sách các lớp học bé đã và đang tham gia.
- **MỤC ĐẶC BIỆT: GHI CHÚ NỘI BỘ (`Note`) — DỮ LIỆU NHẠY CẢM:**
  ```
  +---------------------------------------------------------------------------------+
  |  ⚠️  GHI CHÚ NỘI BỘ (CHỈ NHÂN SỰ TRUNG TÂM XEM)                                 |
  |  -----------------------------------------------------------------------------  |
  |  "Bé tiếp thu nhanh môn Vẽ và Logic, tuy nhiên giai đoạn đầu cần hỗ trợ kiên    |
  |   nhẫn khi tập trung. Có dấu hiệu nhạy cảm tiếng ồn lớn, giáo viên tránh nói to |
  |   đột ngột. Phụ huynh mong muốn kèm thêm kỹ năng giao tiếp."                    |
  |  -----------------------------------------------------------------------------  |
  |  🔒 Dữ liệu được bảo mật tuyệt đối. Phụ huynh và học viên không xem được mục này|
  +---------------------------------------------------------------------------------+
  ```
  - **Quy chuẩn styling:** Bọc trong thẻ viền nổi bật: `bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900`.
  - Tiêu đề có icon cảnh báo ⚠️ hoặc 🔒, font chữ `font-bold text-amber-800 text-sm uppercase`.
  - Nội dung text hiển thị đầy đủ, không bị cắt bớt.

#### 5. Modal "Thêm / Chỉnh Sửa Học Viên":
- Tiêu đề modal: `Thêm học viên mới` hoặc `Cập nhật hồ sơ học viên`.
- Bố cục lưới 2 cột trên Desktop (`md:grid-cols-2 gap-4`), 1 cột trên Mobile:
  - Cột trái: Họ và tên học viên (*bắt buộc*), Ngày sinh (`type="date"`), Giới tính (Select: Nam / Nữ / Khác).
  - Cột phải: Chọn Phụ huynh (*bắt buộc* - Dropdown tìm kiếm từ danh sách User role `Parent`), Chọn Cơ sở (*bắt buộc* đối với SuperAdmin, tự điền với Quản lý cơ sở).
  - Hàng ngang: Trường học đang học (`School`), Khối lớp (`Grade`).
  - Hàng ngang: **Ghi chú nội bộ (`Note`)** (Textarea 3 dòng, có dòng cảnh báo: *Lưu ý về tâm lý, sức khỏe, can thiệp đặc biệt... chỉ staff xem*).
  - Trạng thái hồ sơ (Chỉ hiện khi Sửa): Select `Active`, `Paused`, `Graduated`, `Dropped`.
- Nút bấm chân modal: Nút `Hủy` (Secondary) và `Lưu hồ sơ` (Primary, có loading state).

---

### 5.5. Màn Hình Quản Lý Lớp Học (`ClassList`)

> [!IMPORTANT]
> **SỬA ĐỔI LỖI CHẶN THAO TÁC CỦA GIAO DIỆN CŨ:**  
> 1. Form tạo lớp cũ **thiếu trường Giáo viên (`TeacherId`)** khiến backend từ chối (báo lỗi 400). Thiết kế mới bắt buộc có Dropdown chọn Giáo viên phụ trách.  
> 2. Đổi trường `maxCapacity` thành `MaxStudents` khớp đúng 100% với DTO của Backend.  
> 3. Thay đổi toàn bộ placeholder thành đúng đối tượng trẻ em (Tiền tiểu học, Luyện chữ đẹp, Toán tư duy). Không dùng placeholder "IELTS 6.5".

#### 1. Thanh Công Cụ & Thao Tác:
- Thanh tìm kiếm tên lớp học (`className`).
- Bộ lọc Cơ sở (`BranchId`).
- Bộ lọc Khóa học (`CourseId`).
- Phân trang dữ liệu rõ ràng.
- Nút `+ Tạo lớp học mới` (Hiện diện cho `SuperAdmin` theo quyền Backend hiện hành).

#### 2. Bảng Danh Sách Lớp Học Chuẩn DTO:
Các cột hiển thị khớp hoàn toàn với `ClassDto`:

| Cột | Tiêu đề | Trường DTO hiển thị | Định dạng hiển thị |
| :-: | :--- | :--- | :--- |
| **1** | **Tên lớp** | `className` | Chữ in đậm `text-blue-700 font-semibold`, có mã `#CLS-{id}`. |
| **2** | **Khóa học** | `courseName` | Nhãn khóa học chuẩn (VD: *Luyện chữ đẹp*, *Tiền tiểu học*). |
| **3** | **Giáo viên** | `teacherName` | Icon cô giáo 👩‍🏫 + Họ tên giáo viên phụ trách chính. |
| **4** | **Cơ sở** | `branchName` | Tên chi nhánh tổ chức lớp. |
| **5** | **Sĩ số** | `maxStudents` | Hiển thị: `Tối đa {maxStudents} học viên` (VD: *Tối đa 15 bé*). |
| **6** | **Hình thức & Lịch**| `classType`, `startDate`, `endDate`| Badge: `Lớp nhóm` (`Group`) hoặc `Kèm 1-1` (`OneToOne`); Ngày khai giảng - bế giảng. |
| **7** | **Học phí** | `tuitionFee` | Định dạng tiền VND: `1,500,000 đ` (hoặc `Theo khóa học` nếu null). |
| **8** | **Trạng thái** | `status` | Badge: `Upcoming` (Sắp mở), `Ongoing` (Đang học), `Finished` (Đã kết thúc). |
| **9** | **Thao tác** | Actions | - Nút **Sửa lớp** (Bút chì).<br>- Nút **Đóng lớp / Xóa mềm** (Xóa mềm bằng cách cập nhật trạng thái sang `Finished` theo quy chuẩn `AUDIT.md`). |

#### 3. Modal "Tạo / Sửa Lớp Học Mới":
- Form nhập liệu chuẩn xác với kiểm tra bắt buộc:
  1. **Tên lớp học (*bắt buộc*):** Input text, placeholder chuẩn: `VD: Lớp Tiền tiểu học - Họa Mi 1`, `Lớp Luyện chữ đẹp Tối 2-4`, `Lớp Tư duy logic B1`.
  2. **Khóa học (*bắt buộc*):** Dropdown tải từ danh mục `Courses` (Tiền tiểu học, Luyện chữ, Tư duy logic, Vẽ, v.v.).
  3. **Giáo viên phụ trách (*BẮT BUỘC*):** Dropdown tải danh sách Users có `Role = 'Teacher'`. Nhãn chọn rõ ràng: `Chọn giáo viên phụ trách chính...`.
  4. **Cơ sở tổ chức (*bắt buộc*):** Dropdown chi nhánh.
  5. **Hình thức lớp học (*bắt buộc*):** Radio chọn `Lớp nhóm (Group)` hoặc `Kèm 1-1 (OneToOne)` (Khớp đúng ràng buộc DB `CK_Classes_Type`).
  6. **Sĩ số tối đa (`MaxStudents`):** Ô nhập số từ `1` đến `100` (Khớp validation backend).
  7. **Thời gian khóa học:** Ngày bắt đầu (`StartDate`) và Ngày kết thúc (`EndDate`).
  8. **Học phí lớp (`TuitionFee`):** Ô nhập số tiền (VND).
  9. **Ghi chú lớp học (`Note`):** Textarea ghi chú phòng học, trang thiết bị.

---

## 6. BẢN QUYỀN TÀI SẢN & KIỂM TRA PHÁP LÝ (ASSET & LICENSE)

Để đảm bảo dự án an toàn pháp lý 100%, không bị kiện tụng bản quyền:

| Tài sản thiết kế | Nguồn gốc / Nơi lấy | Trạng thái bản quyền | Ghi chú & Xử lý |
| :--- | :--- | :---: | :--- |
| **Phông chữ UI** | Native System UI Fonts (Apple SF, Segoe UI, Roboto) | **HỢP LỆ (Có sẵn trên OS)** | Không cài cắm font lậu. Hiển thị mượt mà trên mọi thiết bị. |
| **Bộ Icon** | Lucide React / Heroicons (MIT License) | **HỢP LỆ (Mã nguồn mở)** | Sử dụng bộ icon SVG tiêu chuẩn mã nguồn mở thân thiện. |
| **Logo Roxy** | `roxy-admin/src/assets/logo.svg` hoặc trích xuất từ web WordPress của trung tâm | **HỢP LỆ (Tài sản khách hàng)** | Khách hàng là chủ sở hữu thương hiệu Roxy Academy. |
| **Hình ảnh minh họa** | Tránh dùng ảnh stock chưa mua bản quyền | `[CHƯA XÁC MINH BẢN QUYỀN]` | Tạm thời dùng Avatar ký tự viết tắt (`Avatar Fallback`) và icon Vector; không tải ảnh stock trôi nổi. |

---

## 7. HƯỚNG DẪN NGHIỆM THU CHO FRONTEND & QA (ACCEPTANCE CHECKLIST)

Khi triển khai code thực tế, Frontend và QA đối chiếu theo bảng kiểm sau:

- [ ] **Khắc phục CSS Root:** File `roxy-admin/src/index.css` đã xóa bỏ `max-width: 1280px` và `text-align: center`, giao diện hiển thị toàn màn hình chuẩn xác.
- [ ] **Responsive Mobile:** Trên màn hình di động `375px - 414px`, Sidebar biến mất và hiển thị nút Drawer Hamburger mượt mà.
- [ ] **Phản hồi Nút bấm:** Nút có hiệu ứng co nhẹ `scale(0.98)` ngay khi ấn chuột xuống (`:active`).
- [ ] **Bảo vệ Ghi chú Nhạy Cảm:** Màn hình chi tiết học viên đóng khung cảnh báo rõ ràng cho trường `Note`. Phụ huynh hoặc tài khoản không có quyền tuyệt đối không thấy trường này.
- [ ] **Xóa Sạch Dữ Liệu Bịa:** Màn hình Dashboard không còn con số 120 / 15 / 45tr; hiển thị giao diện chờ dữ liệu sạch sẽ.
- [ ] **Form Tạo Lớp Hoạt Động 100%:** Modal tạo lớp có ô chọn Giáo viên bắt buộc (`TeacherId`), trường `MaxStudents`, gửi dữ liệu lên backend thành công (không còn lỗi 400).
- [ ] **Bộ Lọc Phân Quyền Học Viên:** Giáo viên chỉ xem học sinh lớp mình; nút `+ Thêm học viên` ẩn hoàn toàn với vai trò Giáo viên.

---

## 8. THIẾT KẾ CHI TIẾT GIAI ĐOẠN 1C: LỊCH HỌC & ĐIỂM DANH (SCHEDULES & ATTENDANCE)

> [!NOTE]
> Giai đoạn 1C bổ sung 2 màn hình tác nghiệp cốt lõi mỗi ngày của trung tâm: **Lịch học (`/schedules`)** và **Điểm danh (`/attendance`)**.  
> Thiết kế tuân thủ nghiêm ngặt hai bộ kỹ năng:
> - **Apple Design Guidelines** (*Designing Fluid Interfaces* — WWDC): Phản hồi tức thì trên pointer-down, direct manipulation 1 chạm, spring critically damped (damping 1.0), tiêu chuẩn cảm ứng ngón tay mobile (`min-h-[44px]`), thanh tác vụ cố định bottom-sheet glass.
> - **Emil Kowalski Philosophy** (*UI Polish & Design Engineering*): Tiết chế chuyển động (Restraint), không bao giờ animate từ scale 0 (`scale(0.96) -> scale(1)`), custom easing `cubic-bezier(0.23, 1, 0.32, 1)`, tốc độ micro-interaction <= 200ms, tối ưu hóa thao tác lặp lại cao (high-frequency).
> - **Nguyên tắc ưu tiên:** Brand và luật phân quyền trong `GEMINI.md` / `PROJECT.md` luôn thắng phong cách chung.

### 8.1. Đánh giá Thiết kế Kỹ thuật (Emil Kowalski Polish Review)

| Trước (Mẫu chung chung / AI Slop) | Sau (Roxy Academy Polish UI) | Lý do kỹ thuật & Trải nghiệm |
| :--- | :--- | :--- |
| Dùng Dropdown Select để chọn điểm danh từng em | **Segmented Control 4 nút bấm 1 chạm** (`Có mặt`, `Đi trễ`, `Có phép`, `Không phép`) | Thao tác diễn ra 20–30 lần mỗi lớp; dropdown tốn 2 nhịp click mở/đóng, segmented button chỉ tốn đúng 1 chạm (`pointer-down: scale(0.97)`). |
| Bảng lịch tuần 7 cột ép ngang co cụm trên mobile 375px (cột ~45px) | **Day Picker Pill Tabs** cuộn ngang kết hợp **Thẻ buổi học xếp dọc** | Màn hình di động không đủ không gian cho 7 cột; giải pháp mobile-native tách chọn ngày giúp diện tích chạm đạt chuẩn Apple HIG (`>= 44px`). |
| Modal phóng to từ giữa màn hình `scale(0)` | Modal xuất hiện từ `scale(0.96) + opacity: 0` lên `scale(1) + opacity: 1` (`180ms ease-out`) | Không vật thể nào trong thế giới thực sinh ra từ hư vô; xuất hiện từ `scale(0.96)` tạo cảm giác tự nhiên, đầm chắc. |
| Giáo viên phải cuộn trang lên đầu mới bấm được nút "Lưu điểm danh" | **Sticky Bottom Action Bar** neo cố định ở đáy màn hình điện thoại kèm hiệu ứng kính mờ (`backdrop-blur-md`) | Tối ưu công thái học ngón tay cái (Thumb Zone); giáo viên vừa lướt danh sách vừa có thể chốt lưu bất kỳ lúc nào. |
| Form tạo lịch cho phép chọn lớp chưa có giáo viên dẫn tới lỗi DB | Dropdown **Disable lớp chưa có GV** + hiển thị cảnh báo hướng dẫn sang Quản lý Lớp gán GV | Ngăn chặn lỗi từ cấp độ giao diện (Guardrail UX), không để người dùng gửi request rồi mới nhận lỗi 400. |
| Hiệu ứng nảy (bounce) trên toàn bộ nút và thẻ | **Critically Damped Springs (Damping 1.0, không nảy)** cho mọi thao tác công cụ | Giao diện quản trị giáo dục cần độ tin cậy và chính xác cao; chỉ dùng vi mô 150ms `ease-out`, nói KHÔNG với nảy cợt nhả. |

---

### 8.2. Màn Hình Lịch Học (`/schedules`)

Màn hình hiển thị thời khóa biểu giảng dạy theo tuần, hỗ trợ tra cứu nhanh theo cơ sở, lớp học và giáo viên.

#### 1. Thanh Công Cụ & Điều Hướng Tuần (Calendar Toolbar)

```
+-------------------------------------------------------------------------------------------------------------------+
|  [ < ] [ Hôm nay ] [ > ]   Tuần 46 • 10/11/2026 – 16/11/2026       [Cơ sở: Cơ sở 1 ▼] [Lớp: Tất cả ▼] [+ Tạo buổi học] |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Bộ điều hướng tuần (Week Navigator):**
  - Cụm 3 nút bấm nhóm lại:
    - Nút `Tuần trước` (Icon `<` ChevronLeft): `p-2 text-slate-600 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform duration-100`.
    - Nút `Hôm nay`: `px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg active:scale-95 transition-transform duration-100`. Nhấn vào sẽ tự động đưa tầm nhìn về tuần chứa ngày hiện tại.
    - Nút `Tuần sau` (Icon `>` ChevronRight): `p-2 text-slate-600 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform duration-100`.
  - Nhãn hiển thị tuần: `Tuần [W] • [DD/MM/YYYY] – [DD/MM/YYYY]` (Ví dụ: `Tuần 46 • 10/11/2026 – 16/11/2026`), font chữ `text-sm font-semibold text-slate-900`.
  - **Chuyển động chuyển tuần:** Grid nội dung lịch đổi dữ liệu với hiệu ứng crossfade trượt ngang tinh tế `opacity: 0.85 -> 1`, `transform: translateX(8px) -> translateX(0)` trong `150ms cubic-bezier(0.23, 1, 0.32, 1)`.

- **Bộ lọc đa tiêu chí (Filter Bar):**
  - **Lọc theo Chi nhánh (`BranchId`):**
    - `SuperAdmin`: Select chọn `Tất cả cơ sở`, `Cơ sở 1 - Bình Trưng`, `Cơ sở 2 - Bình Trưng`.
    - `BranchManager`: Bị khóa cứng (disabled select) hoặc hiển thị text badge cơ sở của mình (không được xem/sửa cơ sở khác theo `GEMINI.md`).
    - `Teacher`: Cố định cơ sở của các lớp mình đang phụ trách.
  - **Lọc theo Lớp học (`ClassId`):** Dropdown tải danh sách các lớp thuộc chi nhánh đang chọn. Mặc định: `Tất cả lớp học`.
  - **Lọc theo Giáo viên (`TeacherId`):** Dropdown tải danh sách giáo viên của trung tâm. Mặc định: `Tất cả giáo viên`.

- **Nút CTA `+ Tạo buổi học`:**
  - **Phân quyền nghiêm ngặt:**
    - `SuperAdmin` & `BranchManager`: **HIỂN THỊ** nút Primary Blue nổi bật (`bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-xs min-h-[40px] px-4`).
    - `Teacher`, `Parent`, `Student`: **ẨN HOÀN TOÀN** nút này.

---

#### 2. Bố Cục Lịch Theo Tuần Trên Desktop (`lg: >= 1024px`)

Lưới 7 cột cố định đại diện cho 7 ngày từ Thứ Hai đến Chủ Nhật.

```
+---------------+---------------+---------------+---------------+---------------+---------------+---------------+
|  Thứ 2 (10/11)|  Thứ 3 (11/11)|  Thứ 4 (12/11)|  Thứ 5 (13/11)|  Thứ 6 (14/11)|  Thứ 7 (15/11)|  Chủ Nhật(16) |
|               |               |               |   [HÔM NAY]   |               |               |               |
+---------------+---------------+---------------+---------------+---------------+---------------+---------------+
| +-----------+ | +-----------+ | (Trống)       | +-----------+ | +-----------+ | +-----------+ | (Trống)       |
| | 08:00-09:30| | | 17:30-19:00| |               | | 08:00-09:30| | | 17:30-19:00| | | 08:30-10:00| |               |
| | Tiền TH 1 | | | ToánLogic1| |               | | Tiền TH 1 | | | ToánLogic1| | | Vẽ Sáng Tạo | |               |
| | P.102     | | | P.105     | |               | | P.102     | | | P.105     | | | P.201     | |               |
| | Cô Mai Anh| | | Thầy Tuấn | |               | | Cô Mai Anh| | | Thầy Tuấn | | | Cô Lan     | |               |
| | [Scheduled| | | [Completed| |               | | [Scheduled| | | [Scheduled| | | [Cancelled] | |               |
| | [Điểm danh| | | [Điểm danh| |               | | [Điểm danh| | | [Điểm danh| | | [Chi tiết]  | |               |
| +-----------+ | +-----------+ |               | +-----------+ | +-----------+ | +-----------+ |               |
+---------------+---------------+---------------+---------------+---------------+---------------+---------------+
```

- **Header cột ngày:**
  - Tiêu đề thứ: `Thứ 2`, `Thứ 3`... `Chủ Nhật` (`text-xs font-semibold uppercase tracking-wider text-slate-500`).
  - Ngày trong tháng: Số ngày to rõ `text-sm font-bold text-slate-900`.
  - **Cột ngày hôm nay (`Today`):**
    - Đường viền đỉnh nổi bật `border-t-4 border-blue-600`.
    - Số ngày nằm trong vòng tròn xanh `bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold`.
    - Nền cột có ánh xanh nhạt tinh tế: `bg-blue-50/20`.
- **Cột ngày trống:** Hiển thị khoảng đệm tối thiểu `min-h-[140px] rounded-lg border border-dashed border-slate-200/80 bg-slate-50/50 flex items-center justify-center text-xs text-slate-400`.

---

#### 3. Thẻ Buổi Học (Schedule Card Component)

Mỗi buổi học là một thẻ độc lập nằm trong cột ngày, kích thước gọn, bố cục khoa học:

```
+-------------------------------------------------------+
| 🕒 08:00 – 09:30                 ● Đã lên lịch (Blue)  |
| Lớp Tiền tiểu học - Họa Mi 1                          |
| 🚪 Phòng 102 • 🏢 Cơ sở 1                             |
| 👩‍🏫 GV: Cô Mai Anh                                   |
| [⚠️ Dạy thay: Thầy Tuấn Anh]                          |
| ----------------------------------------------------- |
| [✓ Điểm danh nhanh]         [✏ Sửa]  [🗑 Hủy buổi]     |
+-------------------------------------------------------+
```

- **Quy chuẩn styling thẻ:**
  - Container: `bg-white rounded-lg p-3 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all duration-150 flex flex-col gap-1.5`.
  - Hàng 1 (Giờ học & Trạng thái):
    - Khung giờ: `text-xs font-semibold text-slate-700 flex items-center gap-1`.
    - Badge Trạng thái buổi học (Khớp 100% DB Constraint `CK_Schedules_Status`):
      * `Scheduled` (Đã lên lịch): `bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1` (Dot `bg-blue-500 w-1.5 h-1.5 rounded-full`).
      * `Completed` (Đã hoàn thành / Đã điểm danh): `bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1` (Dot `bg-emerald-500 w-1.5 h-1.5 rounded-full`).
      * `Cancelled` (Đã hủy buổi): `bg-rose-50 text-rose-700 border border-rose-200 line-through text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1` (Dot `bg-rose-500 w-1.5 h-1.5 rounded-full`).
  - Hàng 2 (Tên lớp học): `font-semibold text-blue-700 text-sm leading-snug hover:underline cursor-pointer`.
  - Hàng 3 (Phòng học & Cơ sở): `text-xs text-slate-500 flex items-center gap-2`.
  - Hàng 4 (Giáo viên phụ trách):
    - Giáo viên chính: `text-xs text-slate-600 flex items-center gap-1`.
    - **Giáo viên dạy thay (`SubstituteTeacherId`):** Nếu có người dạy thay, hiển thị badge màu hổ phách cảnh báo nổi bật: `bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 text-[11px] font-medium flex items-center gap-1`.
  - Hàng 5 (Thanh hành động nhanh trên Card):
    - **Nút `✓ Điểm danh nhanh`:**
      - Nút viền xanh lá nhạt: `inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium rounded-md active:scale-95 transition-all`.
      - Bấm vào sẽ mở thẳng trang `/attendance?scheduleId={id}` để thực hiện điểm danh buổi học này.
    - **Nút `Sửa` (Bút chì) & `Xóa/Hủy` (Thùng rác):**
      - CHỈ HIỂN THỊ cho `SuperAdmin` và `BranchManager`.
      - Bị ẩn hoàn toàn đối với giáo viên và các vai trò khác.

---

#### 4. Bố Cục Responsive Trên Mobile (`375px – 414px`)

Trên màn hình điện thoại, chế độ 7 cột ngang bị loại bỏ để tránh vỡ chữ. Thay vào đó, áp dụng mẫu **Apple Calendar Mobile**:

```
+-------------------------------------------------------+
|  < Tuần 46 • 10/11 - 16/11 >         [+ Tạo buổi học] |
|                                                       |
|  [T2, 10]  [T3, 11]  [T4, 12]  [T5, 13]* [T6, 14] ... |
|   (Trắng)   (Trắng)   (Trắng)   (BLUE)    (Trắng)     |
+-------------------------------------------------------+
|  LỊCH HỌC HÔM NAY (Thứ Năm, 13/11/2026):              |
|                                                       |
|  +-------------------------------------------------+  |
|  | 🕒 08:00 – 09:30             ● Đã lên lịch      |  |
|  | Lớp Tiền tiểu học - Họa Mi 1                    |  |
|  | 🚪 Phòng 102 • 🏢 Cơ sở 1 • Cô Mai Anh          |  |
|  | [✓ Điểm danh nhanh (Touch target 44px)]         |  |
|  +-------------------------------------------------+  |
|  +-------------------------------------------------+  |
|  | 🕒 17:30 – 19:00             ● Đã lên lịch      |  |
|  | Lớp Toán Tư Duy Logic B1                        |  |
|  | 🚪 Phòng 105 • 🏢 Cơ sở 1 • Thầy Tuấn Anh       |  |
|  | [✓ Điểm danh nhanh (Touch target 44px)]         |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

- **Thanh Day Picker Pill Tabs (Cuộn ngang đầu trang):**
  - Chứa 7 pill button đại diện cho 7 ngày trong tuần.
  - Mỗi Pill hiển thị: Tên thứ rút gọn (`T2`, `T3`... `CN`) + Số ngày (`10`, `11`...).
  - Pill ngày đang chọn: `bg-blue-600 text-white font-semibold rounded-xl min-w-[50px] py-2 shadow-sm text-center active:scale-95 transition-transform duration-100`.
  - Pill ngày khác: `bg-white text-slate-700 border border-slate-200 rounded-xl min-w-[50px] py-2 text-center active:scale-95`.
  - Có dấu chấm nhỏ (dot status) bên dưới số ngày nếu ngày đó có ít nhất 1 buổi học.
- **Danh sách buổi học theo ngày (Vertical Card Stack):**
  - Các thẻ buổi học hiển thị chiếm 100% chiều rộng màn hình di động (`w-full`).
  - Mọi nút bấm tương tác (Điểm danh nhanh, Sửa) đều có chiều cao tối thiểu `min-h-[44px]` đạt chuẩn Apple HIG, không bị chạm nhầm.

---

#### 5. Modal Tạo / Sửa Buổi Học (`ScheduleModal`)

- **Hiệu ứng chuyển động (Emil Kowalski Modal Specs):**
  - Entry: `opacity: 0, scale: 0.96` chuyển sang `opacity: 1, scale: 1` trong `180ms cubic-bezier(0.23, 1, 0.32, 1)`. Tâm biến đổi: `transform-origin: center`.
  - Scrim: `bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-180`.

- **Các trường nhập liệu & Ràng buộc logic (Validation Guardrails):**
  1. **Chọn Lớp học (`ClassId` — BẮT BUỘC):**
     - Dropdown select chọn các lớp đang kích hoạt (`Ongoing` hoặc `Upcoming`).
     - **RÀNG BUỘC SỐ 1 (CHẶN LỖI LỚP CHƯA CÓ GIÁO VIÊN):**
       * Hệ thống kiểm tra trường `TeacherId` của lớp.
       * Nếu lớp **chưa có giáo viên phụ trách** (`TeacherId == null` hoặc chưa gán):
         - Tùy chọn trong Dropdown bị khóa cứng (disabled option) có nhãn: `[Chưa gán GV] Lớp Vẽ Cọ Nhí (Không thể chọn)`.
         - Khi hover hoặc chọn trúng, hiển thị thông báo hổ phách:  
           `⚠️ Lớp này chưa được phân công giáo viên phụ trách. Vui lòng vào trang "Quản lý Lớp học" để phân công giáo viên trước khi xếp lịch.`
  2. **Ngày học (`StudyDate` — BẮT BUỘC):**
     - Ô chọn ngày `type="date"`, định dạng `YYYY-MM-DD`. Mặc định lấy theo ngày người dùng vừa nhấn trên lịch.
  3. **Giờ bắt đầu (`StartTime`) & Giờ kết thúc (`EndTime`) — BẮT BUỘC:**
     - Ô nhập giờ `type="time"`, định dạng `HH:mm`.
     - **Ràng buộc nghiệp vụ:** Bắt buộc `EndTime > StartTime` (Khớp DB check constraint `CK_Schedules_Time`). Nếu người dùng chọn giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu, hiển thị báo lỗi màu đỏ ngay lập tức: `Giờ kết thúc phải diễn ra sau giờ bắt đầu.`
  4. **Phòng học (`Room` — Tùy chọn):**
     - Input text, placeholder: `VD: Phòng 101, Phòng Vẽ B, Sân đa năng`. Tối đa 50 ký tự.
  5. **Giáo viên dạy thay (`SubstituteTeacherId` — Tùy chọn):**
     - Dropdown chọn giáo viên dạy thay từ danh sách Users có vai trò `Teacher` thuộc cùng cơ sở.
     - Mặc định: `Không (Giáo viên chính của lớp phụ trách: [Tên GV chính])`.
     - Ghi chú phụ: *Chỉ chọn khi giáo viên chính bận việc hoặc nghỉ phép đột xuất.*
  6. **Trạng thái buổi học (`Status` — Chỉ hiển thị khi Chỉnh sửa):**
     - Select: `Scheduled` (Đã lên lịch), `Completed` (Đã hoàn thành), `Cancelled` (Đã hủy).
  7. **Ghi chú buổi học (`Note` — Tùy chọn):**
     - Textarea 2 dòng, placeholder: `Dặn dò chuẩn bị bài vở, đồ dùng học tập...` (Tối đa 500 ký tự).
- **Chân Modal:**
  - Nút `Hủy` (Secondary Button) + Nút `Lưu buổi học` (Primary Blue CTA có trạng thái spinner `animate-spin`).

---

### 8.3. Màn Hình Điểm Danh (`/attendance`)

Màn hình tác vụ cao (high-frequency) của giáo viên và cán bộ quản lý, thiết kế tối ưu hóa tốc độ ghi nhận với cơ chế **1 chạm (Single-Tap)**, loại bỏ hoàn toàn độ trễ.

#### 1. Thanh Lựa Chọn Buổi Học & Thống Kê (Attendance Selector Bar)

```
+-------------------------------------------------------------------------------------------------------------------+
|  Ngày học: [ 13/11/2026 📅 ] [ Hôm nay ]   |   Buổi học: [ 08:00 - 09:30 • Tiền TH Họa Mi 1 • P.102 • Cô Mai Anh ▼ ] |
|  ---------------------------------------------------------------------------------------------------------------  |
|  Sĩ số lớp: 20 học viên  •  Tiến độ: [✓ 18 Có mặt]  [⏱ 1 Đi trễ]  [✉ 1 Có phép]  [✕ 0 Không phép]                    |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Bộ chọn ngày (`StudyDate`):** Ô nhập `type="date"`, mặc định là Ngày hôm nay. Có nút `Hôm nay` để nhảy nhanh về ngày thực tế.
- **Bộ chọn buổi học trong ngày (`ScheduleId`):**
  - Dropdown hiển thị danh sách các buổi học diễn ra trong ngày đã chọn.
  - Định dạng từng dòng option: `[HH:mm - HH:mm] • [Tên Lớp] • [Phòng] • [Tên GV]` kèm chỉ thị `[Đã điểm danh]` hoặc `[Chưa điểm danh]`.
  - **Tự động nhận diện từ URL:** Nếu người dùng bấm `Điểm danh nhanh` từ trang `/schedules?scheduleId=123`, trang Điểm danh sẽ tự động load đúng ngày và chọn sẵn buổi học đó.
- **Dải chỉ số thống kê nhanh (Metric Pills):**
  - Đếm tự động theo thời gian thực tổng số học viên hiện diện, đi trễ, nghỉ phép giúp giáo viên nắm bắt sĩ số tức thì trước khi bắt đầu dạy.

---

#### 2. Bảng Danh Sách Học Viên & Bộ Chọn Trạng Thái 1 Chạm (Attendance Roster)

- Nguồn dữ liệu: Chỉ tải danh sách học viên có trạng thái đang học (`StudentClasses.Status = 'Active'`) trong lớp của buổi học đó.
- Cấu trúc từng hàng học viên:

```
+----+-----------------------------+------------------------------------------------------+-------------------------+
| STT| Học viên                    | Trạng thái điểm danh (1 Chạm - Segmented Control)    | Ghi chú ngắn            |
+----+-----------------------------+------------------------------------------------------+-------------------------+
| 01 | (Avatar) Nguyễn Minh Khang  | [ ✓ Có mặt ]  [ ⏱ Đi trễ ]  [ ✉ Có phép ] [ ✕ K.phép ]| [ Đi trễ 10p kẹt xe... ]|
|    | #STU-102 • 7 tuổi           |   (EMERALD)      (Muted)       (Muted)      (Muted)  |                         |
+----+-----------------------------+------------------------------------------------------+-------------------------+
| 02 | (Avatar) Trần Bảo Ngọc      | [ ✓ Có mặt ]  [ ⏱ Đi trễ ]  [ ✉ Có phép ] [ ✕ K.phép ]| [ Bé sốt nhẹ, mẹ xin.. ]|
|    | #STU-105 • 7 tuổi           |    (Muted)       (Muted)       (BLUE)       (Muted)  |                         |
+----+-----------------------------+------------------------------------------------------+-------------------------+
```

- **Đặc tả Bộ chọn Trạng thái 1 Chạm (Single-Tap Segmented Control):**
  - Khung bao ngoài: `inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1`.
  - 4 nút bấm trạng thái xếp ngang, tương ứng với 4 giá trị của DB Constraint `CK_Attendances_Status`:
    1. **Có mặt (`Present`):**
       - Mặc định / Chưa chọn: `px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-all`.
       - **KHI ĐƯỢC CHỌN (Active):** `px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md shadow-xs active:scale-95 transition-all duration-100`.
       - Nhãn & Icon: `✓ Có mặt`.
    2. **Đi trễ (`Late`):**
       - **KHI ĐƯỢC CHỌN (Active):** `px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-md shadow-xs active:scale-95 transition-all duration-100`.
       - Nhãn & Icon: `⏱ Đi trễ`.
    3. **Nghỉ có phép (`ExcusedAbsent`):**
       - **KHI ĐƯỢC CHỌN (Active):** `px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md shadow-xs active:scale-95 transition-all duration-100`.
       - Nhãn & Icon: `✉ Có phép`.
    4. **Nghỉ không phép (`UnexcusedAbsent`):**
       - **KHI ĐƯỢC CHỌN (Active):** `px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-md shadow-xs active:scale-95 transition-all duration-100`.
       - Nhãn & Icon: `✕ Không phép`.
  - **Phản hồi tức thì:** Thao tác chạm đổi màu và cập nhật thống kê ngay lập tức (`100ms ease-out`), không có độ trễ bấm.
- **Ô ghi chú ngắn (`Note`):**
  - Input text: `h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-100 placeholder:text-slate-400 w-full`.
  - Placeholder: `Lý do vắng / biểu hiện học tập (tối đa 300 ký tự)`.

---

#### 3. Thanh Hành Động Hàng Loạt & Lưu Điểm Danh (Action Bar)

```
+-------------------------------------------------------------------------------------------------------------------+
|  [✓ Đánh dấu tất cả Có mặt]                                          [ Hủy thay đổi ]  [ Lưu điểm danh (Primary) ]|
+-------------------------------------------------------------------------------------------------------------------+
```

- **Nút `Đánh dấu tất cả Có mặt` (Quick Fill All Present):**
  - Styling: `inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-medium text-sm rounded-lg active:scale-[0.98] transition-transform duration-100`.
  - Ý nghĩa nghiệp vụ: Đa phần các buổi học học sinh đều đi học đủ. Nút này cho phép 1 chạm đặt toàn bộ danh sách thành `Present`. Giáo viên chỉ việc đổi trạng thái cho 1-2 em vắng/trễ, rút ngắn thời gian điểm danh từ 2 phút xuống còn 5 giây.
- **Nút `Lưu điểm danh` (Primary CTA Save):**
  - Styling: `inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all duration-150`.
  - **Trạng thái đang lưu (Loading State):**
    - Vô hiệu hóa nút (`pointer-events-none opacity-80`).
    - Spinner xoay tròn mượt mà (Emil Kowalski fast spin: `animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full`).
    - Nhãn chuyển sang: `Đang lưu điểm danh...`.
    - Khi thành công: Hiển thị thông báo Toast xanh lá `✓ Đã lưu điểm danh thành công!` và tự động đổi trạng thái buổi học trên lịch sang `Completed`.

---

#### 4. Phân Quyền Vai Trò & Chế Độ Chỉ Xem (RBAC & Read-Only Specs)

Tuân thủ nghiêm ngặt quy định tại `GEMINI.md` và logic của `AttendancesController.cs`:

| Vai trò người dùng | Quyền hạn đối với buổi học | Giao diện hiển thị |
| :--- | :--- | :--- |
| **Giáo viên chính** (`Class.TeacherId == UserId`) | Toàn quyền điểm danh & lưu | Hiển thị đầy đủ bộ 4 nút bấm, nút `Đánh dấu tất cả Có mặt` và nút `Lưu điểm danh`. |
| **Giáo viên dạy thay** (`SubstituteTeacherId == UserId`) | Toàn quyền điểm danh & lưu | Hiển thị đầy đủ tính năng điểm danh như giáo viên chính. |
| **SuperAdmin** & **BranchManager** (đúng cơ sở) | Quản trị, duyệt & chỉnh sửa | Hiển thị đầy đủ bộ nút điểm danh và nút lưu. |
| **Giáo viên khác** / **Staff cơ sở khác** | Không có quyền điểm danh | **CHẾ ĐỘ CHỈ XEM (READ-ONLY):**<br>- Ẩn nút `Lưu điểm danh` và nút `Đánh dấu tất cả Có mặt`.<br>- Cụm 4 nút bấm chuyển thành **1 Badge tĩnh duy nhất** hiển thị trạng thái đã điểm danh.<br>- Banners thông báo: `ℹ️ Chế độ xem: Bạn không có quyền chỉnh sửa điểm danh của buổi học này.` |
| **Phụ huynh (`Parent`)** / **Học sinh (`Student`)** | Chỉ xem kết quả của con mình | Chỉ hiển thị dòng thông tin điểm danh của đúng học viên đó, không thấy các bạn khác trong lớp. |

- **Thông tin dấu vết kiểm toán (Audit Trail):**  
  Ở góc dưới bảng điểm danh hiển thị rõ: `Điểm danh lần cuối bởi: [MarkedByName] lúc [MarkedAt: HH:mm, DD/MM/YYYY]`.

---

#### 5. Bố Cục Responsive Trên Mobile (`375px – 414px`)

Giáo viên thường sử dụng điện thoại trực tiếp tại lớp học. Thiết kế chuyển từ bảng sang **Thẻ học viên (Student Cards)** kết hợp **Thanh tác vụ đáy dính kính mờ (Sticky Glass Bottom Bar)**:

```
+-------------------------------------------------------+
|  < Điểm danh • Lớp Tiền TH Họa Mi 1                   |
|  🕒 08:00 - 09:30 • 13/11/2026 • 20 học viên          |
+-------------------------------------------------------+
|                                                       |
|  +-------------------------------------------------+  |
|  | (Avatar) Nguyễn Minh Khang        #STU-102      |  |
|  | +---------------------------------------------+ |  |
|  | | [✓ Có mặt] [⏱ Trễ]  [✉ Có phép] [✕ K.phép]  | |  |
|  | +---------------------------------------------+ |  |
|  | [ Ghi chú: Đi trễ 10p kẹt xe...               ] |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | (Avatar) Trần Bảo Ngọc            #STU-105      |  |
|  | +---------------------------------------------+ |  |
|  | | [✓ Có mặt] [⏱ Trễ]  [✉ Có phép] [✕ K.phép]  | |  |
|  | +---------------------------------------------+ |  |
|  | [ Ghi chú: Bé sốt nhẹ...                      ] |  |
|  +-------------------------------------------------+  |
|                                                       |
+-------------------------------------------------------+
|  [✓ Tất cả có mặt]        [  Lưu điểm danh (44px)  ]  |
|  (STICKY BOTTOM BAR - bg-white/95 backdrop-blur-md)   |
+-------------------------------------------------------+
```

- **Thẻ học viên di động:**
  - Tiêu đề thẻ: Avatar tròn + Họ tên đậm `text-base` + Mã học viên.
  - Cụm 4 nút trạng thái: Dàn đều 4 nút (hoặc lưới 2x2) với chiều cao mỗi nút `min-h-[44px]` chuẩn Apple HIG, dễ ấn bằng ngón tay cái mà không sợ trượt.
  - Ô ghi chú: Chiều rộng 100% thẻ (`w-full`), chiều cao `h-10`.
- **Thanh tác vụ đáy kính mờ (Sticky Bottom Action Bar):**
  - Cố định ở đáy màn hình điện thoại: `sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex gap-2 z-20`.
  - Giáo viên cuộn danh sách đến đâu cũng có thể nhấn `Lưu điểm danh` ngay lập tức mà không cần cuộn ngược lên đầu trang.

---

### 8.4. Tiêu Chuẩn Nghiệm Thu Bổ Sung Cho Giai Đoạn 1C (Acceptance Checklist)

Frontend và QA đối chiếu nghiệm thu 2 màn hình mới theo danh sách kiểm tra sau:

- [ ] **Điều hướng Tuần Mượt Mà (`/schedules`):** Các nút `Tuần trước`, `Hôm nay`, `Tuần sau` chuyển tuần tức thì, có hiệu ứng chuyển cảnh nhẹ `150ms ease-out`, hiển thị đúng khoảng ngày từ Thứ 2 đến Chủ nhật.
- [ ] **Lưới 7 Cột Chuẩn Mực:** Desktop hiển thị đủ 7 ngày; ngày hiện tại (`Today`) được đánh dấu nổi bật với viền xanh và nền tint nhẹ.
- [ ] **Card Buổi Học Đủ Thông Tin:** Card hiển thị đúng giờ học, tên lớp, phòng học, giáo viên chính, trạng thái (`Scheduled`/`Completed`/`Cancelled`), và badge màu hổ phách khi có giáo viên dạy thay.
- [ ] **Nút Điểm Danh Nhanh:** Bấm vào nút `Điểm danh nhanh` trên card sẽ chuyển hướng mượt mà sang `/attendance?scheduleId={id}` và tự động chọn đúng buổi học đó.
- [ ] **Responsive Lịch Học Trên Mobile:** Màn hình di động `375px - 414px` chuyển sang thanh Day Picker Pill Tabs cuộn ngang và danh sách thẻ xếp dọc; chiều cao nút bấm đạt chuẩn tối thiểu 44px.
- [ ] **Ràng Buộc Chặt Chẽ Form Tạo Lịch:** Modal tạo buổi học disable hoặc cảnh báo các lớp chưa có giáo viên phụ trách; kiểm tra hợp lệ `EndTime > StartTime`.
- [ ] **Phân Quyền Nút Tạo Buổi Học:** Chỉ `SuperAdmin` và `BranchManager` nhìn thấy nút `+ Tạo buổi học`; ẩn hoàn toàn với `Teacher`.
- [ ] **Điểm Danh 1 Chạm Tức Thì (`/attendance`):** 4 nút Segmented Control đổi màu ngay khi chạm (`:active:scale-[0.96]`), không dùng dropdown chọn trạng thái.
- [ ] **Nút "Đánh dấu tất cả Có mặt":** 1 chạm gán tất cả học viên trong lớp thành `Present` nhanh chóng.
- [ ] **Trạng Thái Lưu Điểm Danh:** Nút `Lưu điểm danh` hiển thị spinner loading xoay tròn, vô hiệu hóa nút chống submit kép, gọi API bulk thành công và tự động chuyển buổi học sang `Completed`.
- [ ] **Phân Quyền Điểm Danh Nghiêm Ngặt:** Chỉ giáo viên phụ trách/dạy thay của buổi học đó hoặc quản lý mới có nút lưu; người dùng không có quyền truy cập chỉ xem ở chế độ Read-Only với badge tĩnh.
- [ ] **Thanh Bottom Bar Cố Định Trên Mobile:** Trang điểm danh trên điện thoại hiển thị thẻ học viên to rõ và thanh lưu neo cố định ở đáy màn hình với hiệu ứng kính mờ `backdrop-blur-md`.

---

## 9. BỔ SUNG GIAI ĐOẠN 1D — QUẢN LÝ HỌC PHÍ (`/tuitions`) & LỊCH SỬ THANH TOÁN (`/payments`)

> **Phân hệ nghiệp vụ:** Tài chính, Thu học phí, Quản lý công nợ & Đối soát giao dịch thanh toán.  
> **Cơ sở dữ liệu:** Bảng `Tuitions`, `Payments`, View `vw_TuitionSummary`, Ràng buộc Trigger `TR_Payments_NoOverpay`.  
> **Áp dụng bắt buộc:** Skill **Apple Design** (*Designing Fluid Interfaces*) & Skill **Emil Kowalski** (*Design Engineering / Polish UI*).

---

### 9.1. TỔNG QUAN PHÂN HỆ TÀI CHÍNH & TRIẾT LÝ THIẾT KẾ

Phân hệ Tài chính là "xương sống" bảo đảm dòng tiền vận hành của 2 cơ sở Roxy Academy. Thiết kế giao diện tài chính đặt nặng yếu tố **Độ chính xác tuyệt đối (Zero Error Margin)**, **Minh bạch công nợ (Clear Debt Visibility)** và **Tốc độ ghi nhận thu tiền (Swift Operations)**.

#### 1. Triết lý Thiết kế Kế toán & Motion Tinh gọn (Emil & Apple Guidelines):
- **Số liệu dạng Tabular Numbers:** Toàn bộ số tiền (VND), mã hóa đơn, mã giao dịch ngân hàng và tỷ lệ phần trăm đều sử dụng thuộc tính phông chữ `font-mono tracking-tight tabular-nums` để các chữ số có bề rộng bằng nhau, thẳng hàng dọc theo từng cột, giúp mắt quét đối chiếu công nợ nhanh và không bị mỏi.
- **Ràng buộc hiển thị trước Backend (Preventive UI Validation):** Giao diện chủ động ngăn chặn các lỗi vi phạm nghiệp vụ (như nộp tiền vượt quá dư nợ còn lại làm kích hoạt Trigger Rollback `TR_Payments_NoOverpay`, hay chọn học viên chưa ghi danh vào lớp làm vỡ FK `FK_Tuitions_Enrolled`). Thông báo lỗi xuất hiện mượt mà ngay tại chỗ mà không làm dịch chuyển bố cục (Zero Layout Shift).
- **Phản hồi tức thì & Chuyển động vật lý:** Thao tác chạm nút ghi nhận, xác nhận thanh toán, mở modal sử dụng phản hồi pointer-down (`scale(0.98)` trong 100ms) kết hợp Spring critically damped (`damping: 1.0, response: 0.25s`) tạo cảm giác tin cậy, chắc chắn như phím bấm của máy đếm tiền hiện đại.

#### 2. Bảng Đánh giá & Chuẩn hóa Trải nghiệm Tài chính (Emil Kowalski Review Table):

| Trước khi chuẩn hóa (Before) | Sau khi áp dụng Skill (After) | Lý do nghiệp vụ & Cảm giác sử dụng (Why) |
| :--- | :--- | :--- |
| Số tiền hiển thị phông chữ thường, không định dạng (`1500000`) | Định dạng phân cách hàng nghìn rõ ràng kèm ký hiệu: `1.500.000 đ` (`font-mono tabular-nums font-semibold`) | Chống nhìn nhầm số 0, tránh thất thoát tiền bạc, đối chiếu kế toán nhanh hơn 3 lần |
| Cột còn nợ dùng màu xám lẫn lộn với tổng tiền | Cột **Còn nợ** nổi bật với tone đỏ/hổ phách `text-rose-700 font-bold` kèm thanh Mini Progress Bar tiến độ | Báo động tức thì công nợ cần thu, quản lý nắm bắt ngay học viên nào chưa hoàn thành nghĩa vụ học phí |
| Nhập số tiền thanh toán vượt số nợ, đợi ấn "Lưu" mới nhận lỗi 500 từ SQL Trigger | Ô nhập tiền kiểm tra real-time; nếu `Amount > Remaining`, viền hóa đỏ ngay, nút "Lưu" bị vô hiệu hóa (`disabled`) | Chặn lỗi ngay tại đầu ngón tay, tôn trọng thời gian của nhân viên, không làm fail API |
| Nhân viên phải tự gõ lại từng con số nợ lẻ vào ô thanh toán | Bổ sung nút bấm 1 chạm: `⚡ Điền đủ số nợ (xxx.xxx đ)` ngay trên bàn phím/form | Tiết kiệm 90% thao tác gõ số khi phụ huynh thanh toán tròn khoản nợ |
| Bấm vào xem ảnh chứng từ bị mở tab mới hoặc load lại trang | Modal Lightbox Popup mở tại chỗ với nền mờ kính `backdrop-blur-md`, có nút phóng to và đóng bằng Esc / click nền | Giữ nguyên ngữ cảnh làm việc của nhân viên, kiểm tra chứng từ nhanh chóng |
| Menu hiển thị mục "Học phí" cho toàn bộ giáo viên | Menu "Học phí" và "Thanh toán" **ẨN HOÀN TOÀN** với vai trò `Teacher` | Bảo mật tài chính trung tâm; chỉ `SuperAdmin` và `BranchManager` có quyền truy cập |

---

### 9.2. MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC) PHÂN HỆ TÀI CHÍNH

Tuân thủ nghiêm ngặt quy định tại `GEMINI.md`, `TuitionsController.cs` và `PaymentsController.cs`:

| Vai trò người dùng | Truy cập Menu & Đường dẫn (`/tuitions`, `/payments`) | Phạm vi dữ liệu (Data Scope) | Thao tác trên Khoản thu (`Tuitions`) | Thao tác trên Thanh toán (`Payments`) |
| :--- | :---: | :--- | :--- | :--- |
| **SuperAdmin** 👑 | **TOÀN QUYỀN** | Xem toàn bộ chi nhánh. Có dropdown chọn chi nhánh linh hoạt. | - Tạo khoản thu mới cho mọi cơ sở.<br>- Sửa thông tin khoản thu.<br>- Hủy/Xóa khoản thu. | - Tạo phiếu thu tiền trực tiếp (tự động duyệt `Confirmed`).<br>- Duyệt (`Confirm`) / Từ chối (`Reject`) thanh toán `PendingConfirm`. |
| **BranchManager** 🏢 | **TOÀN QUYỀN TẠI CƠ SỞ** | **Khóa cứng chi nhánh** quản lý (`BranchId == User.BranchId`). Không xem được cơ sở khác. | - Tạo khoản thu cho học viên cơ sở mình.<br>- Sửa khoản thu thuộc cơ sở mình.<br>- Không được xóa cứng. | - Tạo phiếu thu tiền (tự động `Confirmed`).<br>- Duyệt / Từ chối thanh toán phụ huynh gửi thuộc cơ sở mình. |
| **Teacher** 👩‍🏫 | 🚫 **BỊ CẤM HOÀN TOÀN (FORBIDDEN)** | **Ẩn hoàn toàn** 2 mục trên Sidebar Menu. Nếu gõ URL trực tiếp → Chặn 403 hoặc tự động redirect về `/classes`. | Không được xem, không được tạo, không được sửa. | Không được xem, không được duyệt. |

---

### 9.3. ĐẶC TẢ CHI TIẾT MÀN HÌNH QUẢN LÝ HỌC PHÍ (`/tuitions`)

#### 1. Bố Cục Tổng Thể & Thẻ Thống Kê Tài Chính Nhanh (KPI Summary Cards)

Phía trên cùng của trang `/tuitions` là 4 thẻ chỉ số tóm tắt dòng tiền giúp quản lý nắm ngay bức tranh công nợ trong tháng:

```
+-------------------------------------------------------------------------------------------------------------------+
|  💰 QUẢN LÝ HỌC PHÍ & CÔNG NỢ                                                                 [ + Tạo khoản thu ] |
|  Theo dõi khoản phải thu, tình trạng đóng học phí và nhắc nợ học viên theo cơ sở.                                 |
+-------------------------------------------------------------------------------------------------------------------+
| [ Tổng học phí phải thu ]  [ Đã thu thực tế ]        [ Tổng công nợ còn lại ]      [ Khoản thu quá hạn ]          |
|    128.500.000 đ              92.300.000 đ               36.200.000 đ                   4 khoản (8.400.000 đ)     |
|    72 khoản thu               Tiến độ: 71.8%             24 học viên còn nợ             Cần gửi thông báo nhắc    |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Thẻ 1: Tổng học phí phải thu (`NetAmount`):** Nền trắng, viền `border-slate-200`, số tiền `text-slate-900 font-bold text-xl font-mono`.
- **Thẻ 2: Đã thu thực tế (`PaidAmount`):** Nền xanh lá nhạt `bg-emerald-50/60`, viền `border-emerald-200`, số tiền `text-emerald-700 font-bold text-xl font-mono`. Kèm thanh mini progress bar màu xanh ngọc.
- **Thẻ 3: Tổng công nợ còn lại (`RemainingAmount`):** Nền hổ phách ấm `bg-amber-50/70`, viền `border-amber-200`, số tiền `text-amber-800 font-bold text-xl font-mono`. Kèm số lượng học viên chưa thanh toán.
- **Thẻ 4: Khoản thu quá hạn (`IsOverdue == 1`):** Nền đỏ nhạt `bg-rose-50/70`, viền `border-rose-200`, số tiền `text-rose-700 font-bold text-xl font-mono`. Icon cảnh báo `⚠️` nhấp nháy tinh tế.

---

#### 2. Thanh Công Cụ & Bộ Lọc Đa Chiều (Toolbar & Filters)

```
+-------------------------------------------------------------------------------------------------------------------+
| [ 🔍 Tìm tên bé, mã STU, tiêu đề... ] [ Chọn học viên ▼ ] [ Tất cả lớp học ▼ ] [ Cơ sở: Nguyễn Duy Trinh 🔒]    |
| [ Trạng thái: Tất cả (72) | Chưa đóng (16) | Đóng một phần (8) | Đã xong (44) | Quá hạn (4) ]                   |
+-------------------------------------------------------------------------------------------------------------------+
```

1. **Ô Tìm kiếm thông minh (`Search Input`):**
   - Class: `h-10 pl-10 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 w-full sm:w-72 transition-all duration-150`.
   - Tìm kiếm kết hợp: Họ tên học viên, Mã học viên (`#STU-xxx`), Tiêu đề khoản thu, Số điện thoại phụ huynh.
2. **Bộ lọc Học viên (`Filter by Student`):** Dropdown hỗ trợ tìm kiếm nhanh tên bé.
3. **Bộ lọc Lớp học (`Filter by Class`):** Danh sách các lớp học hiện có tại cơ sở.
4. **Bộ lọc Chi nhánh (`Filter by Branch`):**
   - Với `SuperAdmin`: Dropdown cho phép chọn `Tất cả cơ sở`, `Cơ sở 1 - Nguyễn Duy Trinh`, `Cơ sở 2 - Bình Trưng Đông`.
   - Với `BranchManager`: Khóa cố định chi nhánh sở tại (`disabled`), hiển thị icon ổ khóa `🔒` và nhãn cơ sở rõ ràng, ngăn chặn việc chọn nhầm cơ sở khác.
5. **Thanh lọc trạng thái (Segmented Pill Filter):**
   - Bộ nút viên thuốc (Pill Tabs) trượt ngang:
     * `Tất cả` (All)
     * `Chưa thanh toán` (`Unpaid` - Xám)
     * `Thanh toán một phần` (`Partial` - Vàng cam)
     * `Đã thanh toán` (`Paid` - Xanh lá)
     * `Quá hạn` (`Overdue` - Đỏ)
     * `Đã hủy` (`Cancelled` - Gạch ngang)
   - Badge số lượng đính kèm trên từng pill cập nhật real-time theo danh sách lọc.
6. **Nút `+ Tạo khoản thu` (Primary CTA):**
   - Chỉ xuất hiện với `SuperAdmin` và `BranchManager`.
   - Styling: `inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all duration-150`.

---

#### 3. Bảng Danh Sách Khoản Thu Học Phí (Desktop Data Grid)

Bảng dữ liệu hỗ trợ cuộn ngang (`overflow-x-auto`) với các cột được bố trí chặt chẽ, hiển thị đầy đủ thông số tài chính:

```
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| HỌC VIÊN              | KHOẢN THU & LỚP           | CƠ SỞ       | PHẢI THU      | ĐÃ ĐÓNG       | CÒN NỢ (NỔI BẬT) | HẠN NỘP    | TRẠNG THÁI | THAO TÁC   |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Bảo Ngọc     | Học phí Tiền TH - T11     | Cơ sở 1     | 2.500.000 đ   | 1.000.000 đ   | 1.500.000 đ      | 20/11/2026 | [Đóng 1 phần| [👁] [✏] [⚡]|
| #STU-102 • Mẹ Lan     | Lớp: Họa Mi 1 (3 buổi/tuần)| (Bình Trưng)| (Gốc: 2.700k) | [======    ]  | (Cần thu thêm)   | (Còn 6 ngày)|            |            |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Minh Khang   | Luyện chữ đẹp K12         | Cơ sở 1     | 1.800.000 đ   | 0 đ           | 1.800.000 đ      | 10/11/2026 | [Quá hạn]  | [👁] [✏] [⚡]|
| #STU-105 • Bố Hùng    | Lớp: Nét Chữ Xinh 2       | (Bình Trưng)| (Ưu đãi: 0đ)  | [          ]  | (Chưa đóng)      | ⚠️ Quá 4 ngày|            |            |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Tuấn Kiệt    | Tư duy logic Toán - T11   | Cơ sở 2     | 3.200.000 đ   | 3.200.000 đ   | 0 đ              | 25/11/2026 | [Đã đóng]  | [👁] [—] [—]|
| #STU-110 • Mẹ Thảo    | Lớp: Toán Tư Duy A        | (Bình Trưng)| (Ưu đãi: 200k)| [==========]  | ✓ Hoàn thành     | (Đã tất toán)|           |            |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
```

##### Chi tiết quy cách từng cột:
1. **Cột Học viên:**
   - Avatar chữ cái viết tắt tròn `w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs`.
   - Họ và tên học viên in đậm `font-semibold text-slate-900 text-sm`.
   - Phụ đề bên dưới: Mã học viên `#STU-xxx` kèm thông tin phụ huynh liên hệ (`Mẹ Lan - 0912...`).
2. **Cột Khoản thu & Lớp:**
   - Tiêu đề khoản thu (`Title`): `text-slate-800 font-medium text-sm`.
   - Badge Lớp học: `bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block`. Nếu khoản thu không gắn với lớp (phí vật dụng, dã ngoại), hiển thị badge xám `Khoản thu ngoài lớp`.
3. **Cột Chi nhánh:**
   - Tên cơ sở ngắn gọn kèm ký hiệu màu định danh cơ sở.
4. **Cột Tổng phải thu (`NetAmount`):**
   - Giá trị thực thu (`Amount - Discount`): `font-mono font-semibold text-slate-900 text-sm`.
   - Nếu có giảm giá (`Discount > 0`), hiển thị giá gốc gạch ngang nhỏ bên dưới: `<span class="line-through text-slate-400 text-xs">2.700.000 đ</span> <span class="text-emerald-600 text-[11px]">(-200k)</span>`.
5. **Cột Đã đóng (`PaidAmount`):**
   - Số tiền đã duyệt thành công: `font-mono font-medium text-emerald-700 text-sm`.
   - Mini Progress Bar tiến độ: Chiều rộng 100%, cao 4px, bo góc `rounded-full bg-slate-100 overflow-hidden mt-1`. Thanh tiến độ xanh lá `bg-emerald-500` chạy theo tỷ lệ `(PaidAmount / NetAmount) * 100%`.
6. **Cột CÒN NỢ (ĐIỂM NHẤN TRỌNG TÂM):**
   - **Khi còn nợ (`RemainingAmount > 0`):**
     * Con số nợ in đậm nổi bật: `font-mono font-bold text-base text-rose-600 tracking-tight`.
     * Nhãn phụ: Nếu chưa đóng đồng nào hiển thị `Chưa đóng`, nếu đã đóng 1 phần hiển thị `Còn thiếu xxx đ`.
   - **Khi đã tất toán (`RemainingAmount == 0`):**
     * Hiển thị: `font-mono font-medium text-slate-400 text-sm` với icon `✓ 0 đ (Hoàn thành)`.
7. **Cột Hạn nộp & Cảnh báo quá hạn:**
   - Ngày hạn nộp: `DD/MM/YYYY`.
   - Khi `IsOverdue == 1`: Chữ ngày màu đỏ, kèm badge cảnh báo đỏ nhỏ `⚠️ Quá hạn X ngày` rung nhẹ khi hover.
   - Khi chưa quá hạn nhưng còn dưới 3 ngày: Badge cảnh báo vàng `⏱ Sắp đến hạn`.
8. **Cột Trạng thái (Status Badges):**
   - Áp dụng hệ thống badge chuẩn hóa tại Mục 3.1 & 9.4:
     * `Paid` (Đã đóng đủ): `bg-emerald-50 border-emerald-300 text-emerald-800` + dot xanh lá.
     * `PartiallyPaid` / `Partial` (Đóng một phần): `bg-amber-50 border-amber-300 text-amber-800` + dot hổ phách.
     * `Unpaid` (Chưa đóng): `bg-slate-100 border-slate-300 text-slate-700` + dot xám.
     * `Overdue` (Quá hạn): `bg-rose-50 border-rose-300 text-rose-700` + dot đỏ nhấp nháy.
     * `Cancelled` (Đã hủy): `bg-slate-100 border-slate-200 text-slate-400 line-through`.
9. **Cột Thao tác (Action Buttons):**
   - **Nút Xem chi tiết (`View Detail`):** Icon mắt `👁️` hoặc kính lúp, mở Modal Chi tiết khoản thu và lịch sử thanh toán.
   - **Nút Sửa (`Edit`):** Icon bút chì `✏️`, cho phép cập nhật tiêu đề, hạn nộp, ghi chú (chỉ mở cho Staff; nếu đã có giao dịch thanh toán xác nhận thì khóa sửa số tiền).
   - **Nút Đóng tiền nhanh (`Quick Pay` - Điểm nhấn nghiệp vụ):**
     * Styling: `inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 font-semibold text-xs rounded-md shadow-2xs active:scale-95 transition-all duration-100`.
     * Nhãn: `⚡ Thu tiền` hoặc icon `💳`.
     * Khi bấm: Mở ngay **Modal Ghi nhận thanh toán (`RecordPaymentModal`)** với `TuitionId` đã được chọn sẵn, số tiền tự động điền bằng đúng số dư nợ còn lại (`RemainingAmount`). Giúp nhân viên hoàn tất thao tác thu tiền chỉ trong 2 cú click chuột!

---

#### 4. Modal Xem Chi Tiết Khoản Thu & Lịch Sử Các Lần Thanh Toán (`TuitionDetailModal`)

Modal thiết kế rộng (`max-w-3xl`), có phân vùng thông tin rõ ràng:

```
+---------------------------------------------------------------------------------------------------+
|  CHI TIẾT KHOẢN THU #TUI-204                                                                 [ ✕ ]|
|  Học phí Tiền tiểu học Tháng 11/2026 • Lớp Họa Mi 1 (Cơ sở 1)                                     |
+---------------------------------------------------------------------------------------------------+
|  [THÔNG TIN HỌC VIÊN]                        |  [TỔNG HỢP TÀI CHÍNH]                              |
|  • Học viên: Trần Bảo Ngọc (#STU-102)        |  • Mức học phí gốc:       2.700.000 đ              |
|  • Phụ huynh: Lê Thị Lan (0912 345 678)      |  • Miễn giảm / Ưu đãi:     -200.000 đ (Anh em học) |
|  • Lớp học: Tiền TH Họa Mi 1 - Phòng 201     |  • Số tiền thực thu:      2.500.000 đ              |
|  • Ngày tạo khoản: 01/11/2026                |  • Đã thanh toán:         1.000.000 đ (40%)        |
|  • Hạn đóng: 20/11/2026 (Còn 6 ngày)         |  • CÒN NỢ LẠI:            1.500.000 đ (Nổi bật đỏ) |
|  • Trạng thái: [ Đang đóng một phần ]        |                                                    |
+---------------------------------------------------------------------------------------------------+
|  LỊCH SỬ CÁC LẦN THANH TOÁN (PAYMENTS)                           [ + Ghi nhận thanh toán mới ]   |
|  +---------------------------------------------------------------------------------------------+  |
|  | MÃ GD      | NGÀY ĐÓNG         | SỐ TIỀN       | P.THỨC      | NGƯỜI THU/DUYỆT  | TRẠNG THÁI  |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | #TX-8831   | 05/11/2026 14:20  | 1.000.000 đ   | CK Ngân hàng| QL. Nguyễn Thảo  | [Đã xác nhận|  |
|  |            | Techcombank MB... |               | [Xem ảnh CK]| Lúc: 05/11 14:25 |             |  |
|  +---------------------------------------------------------------------------------------------+  |
|  (Nếu chưa có giao dịch nào: Hiển thị minh họa trống "Chưa có lượt thanh toán nào được ghi nhận")|
+---------------------------------------------------------------------------------------------------+
|  Ghi chú nội bộ: Phụ huynh xin đóng đợt 1 trước 1 triệu, đợt 2 đóng trước ngày 20/11.             |
+---------------------------------------------------------------------------------------------------+
|  [ In phiếu thu ]                                                [ Sửa khoản thu ]   [ Đóng ]     |
+---------------------------------------------------------------------------------------------------+
```

- **Tính liên kết dữ liệu:** Nếu khoản thu còn nợ (`RemainingAmount > 0`), modal hiển thị ngay nút `+ Ghi nhận thanh toán mới` ở góc phải tiêu đề lịch sử giao dịch. Bấm nút này sẽ mở đè hoặc chuyển tiếp sang form thanh toán mà không làm mất thông tin gốc.
- **Xem chứng từ nhanh:** Mỗi dòng thanh toán có link `[Xem ảnh CK]`; click sẽ mở cửa sổ Lightbox xem trước biên lai chuyển khoản.

---

#### 5. Modal Tạo / Sửa Khoản Thu Học Phí (`CreateEditTuitionModal`)

Modal tạo mới tuân thủ nghiêm ngặt các quy tắc ràng buộc logic database để tránh lỗi backend:

```
+---------------------------------------------------------------------------------------------------+
|  TẠO KHOẢN THU HỌC PHÍ MỚI                                                                   [ ✕ ]|
|  Thiết lập khoản thu cho học viên theo lớp học hoặc thu phí hoạt động giáo dục ngoại khóa.        |
+---------------------------------------------------------------------------------------------------+
|  Cơ sở áp dụng: (*)                                                                               |
|  [ Cơ sở 1 - Nguyễn Duy Trinh (Bình Trưng Đông)                                         🔒/▼ ]    |
|                                                                                                   |
|  Chọn học viên: (*)                                                                               |
|  [ 🔍 Tìm theo tên hoặc mã học viên (VD: Bảo Ngọc, #STU-102)...                        ▼ ]        |
|                                                                                                   |
|  Lớp học liên kết: (Tùy chọn)                                                                     |
|  [ -- Chọn lớp bé đang theo học (Chỉ hiển thị các lớp bé đã đăng ký) --                 ▼ ]        |
|  ℹ️ Hệ thống tự động lọc các lớp học viên đã ghi danh để đảm bảo tính toàn vẹn dữ liệu.           |
|                                                                                                   |
|  Tiêu đề khoản thu: (*)                                                                           |
|  [ Học phí Tháng 11/2026 - Khóa Tiền tiểu học Họa Mi 1                                          ] |
|                                                                                                   |
|  +---------------------------------------+  +---------------------------------------+             |
|  | Mức học phí gốc (VNĐ): (*)            |  | Miễn giảm / Học bổng (VNĐ):           |             |
|  | [ 2.700.000                         ] |  | [ 200.000                           ] |             |
|  +---------------------------------------+  +---------------------------------------+             |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | SỐ TIỀN THỰC THU (Tự động tính):  2.500.000 đ (Hai triệu năm trăm nghìn đồng)               |  |
|  | Công thức: Mức học phí gốc (2.700.000 đ) - Miễn giảm (200.000 đ)                            |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  Hạn đóng học phí: (*)                                                                            |
|  [ 20/11/2026                                                                               📅 ]  |
|                                                                                                   |
|  Ghi chú: (Tùy chọn)                                                                              |
|  [ Phụ huynh đăng ký đóng theo tháng, có áp dụng ưu đãi gia đình 2 con học...                   ] |
+---------------------------------------------------------------------------------------------------+
|  [ Hủy bỏ ]                                                                  [ Lưu khoản thu ]    |
+---------------------------------------------------------------------------------------------------+
```

##### Ràng buộc & Validation trên Form (Apple & Emil Guidelines):
1. **Kiểm tra hợp lệ Học viên & Lớp học (Chặn lỗi FK `FK_Tuitions_Enrolled`):**
   - Khi chọn học viên, dropdown `Lớp học` sẽ tự động gọi API lấy danh sách lớp bé đã đăng ký (`StudentClasses` có trạng thái `Active`/`Pending`).
   - Nếu chọn 1 lớp mà học viên chưa ghi danh, form cảnh báo vàng ngay: `"Học viên chưa ghi danh vào lớp này. Khoản thu sẽ được lưu ở dạng 'Phí tự do' không liên kết lớp."`.
2. **Định dạng tiền tệ thời gian thực (Real-time Currency Formatter):**
   - Khi người dùng gõ số, ô input tự động thêm dấu phân cách hàng nghìn (VD gõ `2700000` hiển thị thành `2.700.000`).
   - Phía dưới hiển thị phiên âm tiếng Việt: `Hai triệu bảy trăm nghìn đồng` để nhân viên rà soát không bị gõ thừa/thiếu số 0.
3. **Validate Miễn giảm (`Discount`):**
   - Ràng buộc: `0 <= Discount <= Amount`.
   - Nếu nhân viên gõ `Discount > Amount`, hiển thị viền đỏ và thông báo lỗi: `"Số tiền miễn giảm không được lớn hơn học phí gốc!"`, đồng thời vô hiệu hóa nút Lưu.
4. **Hạn đóng (`DueDate`):**
   - Mặc định gợi ý: `Ngày hiện tại + 7 ngày` hoặc ngày 15 của tháng.

---

### 9.4. ĐẶC TẢ CHI TIẾT MÀN HÌNH LỊCH SỬ THANH TOÁN (`/payments`)

Màn hình `/payments` đóng vai trò là "Sổ quỹ thu tiền" và trung tâm đối soát giao dịch tài chính cho toàn bộ học phí nộp qua ngân hàng, ZaloPay hoặc tiền mặt.

#### 1. Bố Cục Tổng Thể & Thanh Công Cụ

```
+-------------------------------------------------------------------------------------------------------------------+
|  💳 QUẢN LÝ THANH TOÁN & SỔ QUỸ                                                  [ + Ghi nhận thanh toán mới ]    |
|  Lịch sử giao dịch đóng học phí, đối soát biên lai ngân hàng và phê duyệt thanh toán trực tuyến.                  |
+-------------------------------------------------------------------------------------------------------------------+
| [ 🔍 Tìm mã GD, tên học viên, khoản thu... ] [ Khoản thu: Tất cả ▼ ] [ P.Thức: Tất cả ▼ ] [ Trạng thái: Tất cả ▼]  |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Thanh tìm kiếm:** Tìm theo Mã giao dịch (`TransactionCode` ngân hàng), Tên học viên, Tên khoản thu.
- **Lọc Phương thức thanh toán (`PaymentMethod`):**
  * `Tất cả phương thức`
  * `Chuyển khoản ngân hàng` (`BankTransfer` - icon 🏦)
  * `Tiền mặt tại cơ sở` (`Cash` - icon 💵)
  * `Ví ZaloPay` (`ZaloPay` - icon 📱)
  * `Phương thức khác` (`Other` - icon 🏷️)
- **Lọc Trạng thái thanh toán (`Status` - Khớp DB):**
  * `Tất cả trạng thái`
  * `Chờ xác nhận` (`PendingConfirm` - dành cho giao dịch phụ huynh gửi chuyển khoản cần đối soát)
  * `Đã duyệt thành công` (`Confirmed` - tiền đã vào tài khoản / thu quỹ)
  * `Đã từ chối` (`Rejected` - sai thông tin, không nhận được tiền)

---

#### 2. Bảng Danh Sách Giao Dịch Thanh Toán (Desktop Data Grid)

```
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
| MÃ GIAO DỊCH         | HỌC VIÊN & KHOẢN THU        | SỐ TIỀN       | PHƯƠNG THỨC    | CHỨNG TỪ     | TRẠNG THÁI     | NGƯỜI DUYỆT / TẠO | THAO TÁC     |
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
| #TX-98421            | Trần Bảo Ngọc (#STU-102)    | 1.000.000 đ   | 🏦 Ngân hàng   | [🖼️ Xem ảnh] | [ Đã xác nhận] | Thu bởi: QL.Thảo  | [👁] [🧾]    |
| 13/11 09:15          | Thu: HP Tiền TH Tháng 11    | (Đúng số nợ)  | MBBank...1294  | (Biên lai)   |                | 13/11 09:20       | (In biên nhận|
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
| #TX-98420            | Nguyễn Minh Khang (#STU-105)| 1.800.000 đ   | 🏦 Ngân hàng   | [🖼️ Xem ảnh] | [ Chờ duyệt ]  | Phụ huynh nộp     | [✓ Duyệt]    |
| 13/11 08:30          | Thu: Luyện chữ đẹp K12      | (Toàn phần)   | Vietcombank... | (Biên lai)   | (Cần đối soát) | Qua ứng dụng      | [✕ Từ chối]  |
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
| #TX-98415            | Lê Tuấn Kiệt (#STU-110)     | 3.200.000 đ   | 💵 Tiền mặt    | —            | [ Đã xác nhận] | Thu bởi: QL.Bình  | [👁] [🧾]    |
| 12/11 16:45          | Thu: Tư duy logic T11       | (Toàn phần)   | Nộp tại quầy CS2| (Không có)   |                | 12/11 16:45       | (In biên nhận|
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
| #TX-98402            | Hoàng Gia Bảo (#STU-114)    | 500.000 đ     | 📱 ZaloPay     | [🖼️ Xem ảnh] | [ Đã từ chối ] | Duyệt bởi: QL.Thảo| [👁 Chi tiết]|
| 11/11 11:10          | Thu: Ngoại khóa Vẽ tranh    | (Tạm ứng)     | Mã ZP: 832910  | (Biên lai)   | (Lý do: Sai số)| 11/11 11:30       | (Xem lý do)  |
+-------------------------------------------------------------------------------------------------------------------------------------------------------+
```

##### Chi tiết quy cách các cột:
1. **Mã giao dịch & Thời gian:**
   - Mã giao dịch: `font-mono font-semibold text-blue-700 text-sm`. Nếu là mã chuyển khoản ngân hàng do phụ huynh gửi, hiển thị thêm mã đối soát bên dưới.
   - Thời gian thanh toán (`PaidAt`): `HH:mm, DD/MM/YYYY` màu `text-slate-500 text-xs`.
2. **Học viên & Khoản thu liên kết:**
   - Họ tên học viên in đậm + Mã `#STU-xxx`.
   - Tên khoản thu: `text-slate-600 text-xs truncate max-w-[200px]`.
3. **Số tiền đóng:**
   - Số tiền in to rõ: `font-mono font-bold text-slate-900 text-base`.
   - Phụ đề: `Đóng toàn phần` hoặc `Đóng một phần (còn nợ xxx đ)`.
4. **Phương thức thanh toán:**
   - Huy hiệu có icon định danh:
     * `🏦 Chuyển khoản`: `bg-sky-50 text-sky-800 border-sky-200`.
     * `💵 Tiền mặt`: `bg-emerald-50 text-emerald-800 border-emerald-200`.
     * `📱 ZaloPay`: `bg-blue-50 text-blue-800 border-blue-200`.
5. **Chứng từ / Biên lai chuyển khoản (`ProofImageUrl`):**
   - Nếu có ảnh: Hiển thị thumbnail nhỏ `w-10 h-10 rounded-md border border-slate-200 object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-2xs`. Click chuột sẽ bung Popup Lightbox xem toàn màn hình.
   - Nếu không có ảnh (thu tiền mặt): Hiển thị dấu gạch ngang mờ `—`.
6. **Trạng thái & Thao tác Duyệt nhanh (Pending Approval Flow):**
   - **Khi ở trạng thái `PendingConfirm` (Chờ duyệt):**
     * Badge trạng thái: Màu vàng hổ phách nhấp nháy nhẹ `bg-amber-50 border-amber-300 text-amber-800 font-semibold`.
     * **Cột thao tác hiển thị 2 nút duyệt nhanh:**
       + **Nút `✓ Xác nhận`:** `px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs active:scale-95 transition-all duration-100`. Click gọi API `PUT /api/payments/{id}/confirm` với `{ status: 'Confirmed' }`, cập nhật ngay tức thì không cần reload trang.
       + **Nút `✕ Từ chối`:** `px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-md active:scale-95 transition-all duration-100`. Click mở popover/dialog nhỏ yêu cầu nhập lý do từ chối (lưu vào `Note`).
   - **Khi ở trạng thái `Confirmed` (Đã duyệt):**
     * Badge xanh lá `bg-emerald-50 border-emerald-300 text-emerald-800 font-medium`.
     * Thao tác: Nút in biên nhận thu tiền `🧾 In phiếu thu` và nút xem chi tiết.
   - **Khi ở trạng thái `Rejected` (Đã từ chối):**
     * Badge đỏ `bg-rose-50 border-rose-300 text-rose-800 font-medium`.
     * Hover hiển thị tooltip lý do từ chối đã nhập.

---

#### 3. Modal Ghi Nhận Thanh Toán Mới (`RecordPaymentModal`)

Modal này dùng để nhân viên ghi nhận tiền đóng trực tiếp tại trung tâm hoặc nhập thông tin chuyển khoản từ phụ huynh.

> [!IMPORTANT]
> **RÀNG BUỘC KỸ THUẬT QUAN TRỌNG NHẤT (ZERO RUNTIME DATABASE ROLLBACK):**  
> Database có trigger `TR_Payments_NoOverpay` sẽ tự động hủy giao dịch và ném lỗi SQL Exception nếu `Tổng tiền đóng > Số tiền phải thu của khoản học phí`.  
> Do đó, Modal này **BẮT BUỘC** phải tích hợp tính năng kiểm soát số dư nợ theo thời gian thực (Client-side Real-time Overpay Protection) như thiết kế dưới đây:

```
+---------------------------------------------------------------------------------------------------+
|  GHI NHẬN THANH TOÁN MỚI                                                                     [ ✕ ]|
|  Nhập thông tin thanh toán học phí từ phụ huynh qua chuyển khoản hoặc tiền mặt.                  |
+---------------------------------------------------------------------------------------------------+
|  Chọn khoản thu học phí: (*)                                                                      |
|  [ 🔍 Tìm theo tên học viên, mã STU, tên khoản thu...                                   ▼ ]        |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | THÔNG TIN DƯ NỢ CỦA KHOẢN THU:                                                              |  |
|  | • Học viên: Trần Bảo Ngọc (#STU-102) - Lớp: Tiền TH Họa Mi 1 (Cơ sở 1)                      |  |
|  | • Tổng học phí thực thu:   2.500.000 đ                                                      |  |
|  | • Đã thanh toán trước đó:  1.000.000 đ                                                      |  |
|  | • CÒN NỢ CẦN THU:          1.500.000 đ  [ ⚡ Điền nhanh 1.500.000 đ ]                        |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  Số tiền thanh toán (VNĐ): (*)                                                                    |
|  [ 1.500.000                                                                                    ] |
|  (Một triệu năm trăm nghìn đồng)                                                                  |
|  <!-- KHI NGƯỜI DÙNG NHẬP VƯỢT QUÁ 1.500.000 Đ -> BÁO ĐỎ TỨC THÌ: -->                            |
|  <p class="text-xs text-rose-600 font-medium mt-1">                                               |
|    ⚠️ Số tiền thanh toán không được vượt quá số còn nợ (Tối đa: 1.500.000 đ).                      |
|  </p>                                                                                             |
|                                                                                                   |
|  Phương thức thanh toán: (*)                                                                      |
|  [ 🏦 Chuyển khoản ngân hàng (Active) ] [ 💵 Tiền mặt ] [ 📱 ZaloPay ] [ 🏷️ Khác ]              |
|                                                                                                   |
|  +---------------------------------------+  +---------------------------------------+             |
|  | Mã giao dịch ngân hàng / Đối soát:    |  | Thời gian thanh toán: (*)             |             |
|  | [ MBB1293847291                     ] |  | [ 13/11/2026, 09:30                📅 ] |             |
|  +---------------------------------------+  +---------------------------------------+             |
|                                                                                                   |
|  Ảnh chụp biên lai / Chứng từ chuyển khoản:                                                       |
|  [ Link URL ảnh hoặc tải lên biên lai chuyển khoản...                                         📁 ]|
|  [Thumbnail preview ảnh: 64x64px có nút xóa ✕]                                                    |
|                                                                                                   |
|  Ghi chú thu tiền: (Tùy chọn)                                                                     |
|  [ Phụ huynh chuyển qua Internet Banking MBBank, nội dung: STU102 Bao Ngoc nop hoc phi...      ] |
+---------------------------------------------------------------------------------------------------+
|  Trạng thái ghi nhận: Tự động đánh dấu "Đã xác nhận" (Confirmed) vì thao tác bởi Cán bộ quản lý.  |
+---------------------------------------------------------------------------------------------------+
|  [ Hủy bỏ ]                                                    [ ✓ Lưu & Xác nhận thanh toán ]    |
|                                                  (Nút bị DISABLED và mờ đi nếu số tiền vượt nợ)   |
+---------------------------------------------------------------------------------------------------+
```

##### Chi tiết tính năng nổi bật:
1. **Nút 1 chạm "⚡ Điền nhanh số nợ":**
   - Nằm ngay cạnh dòng hiển thị "CÒN NỢ CẦN THU". Click vào nút này sẽ tự động điền chính xác `RemainingAmount` vào ô số tiền, tiết kiệm tối đa thời gian gõ phím.
2. **Logic chặn thanh toán vượt nợ (Overpay Blocker):**
   - Giả sử số còn nợ là `1.500.000 đ`. Nếu người dùng gõ `1.600.000 đ`:
     * Viền ô input đổi ngay sang đỏ: `border-rose-500 ring-2 ring-rose-200 bg-rose-50/30`.
     * Dòng cảnh báo đỏ xuất hiện mượt mà: `opacity: 1, transform: translateY(0)` trong 150ms.
     * Nút `Lưu & Xác nhận thanh toán` chuyển sang trạng thái: `disabled opacity-40 cursor-not-allowed pointer-events-none`.
     * Khi người dùng sửa số tiền `<= 1.500.000 đ`, viền xanh trở lại và nút Lưu lập tức được kích hoạt trở lại.
3. **Phân quyền tự động gán trạng thái (`Status Automation`):**
   - Đúng logic của `PaymentsController.cs` dòng 115: Khi Staff (`SuperAdmin` hoặc `BranchManager`) tạo phiếu thu, backend tự động gán `Status = "Confirmed"`, `ConfirmedBy = UserId`, `ConfirmedAt = Now`. Giao diện hiển thị ghi chú minh bạch để nhân viên yên tâm rằng giao dịch này có hiệu lực ngay lập tức.

---

#### 4. Trải Nghiệm Lightbox Xem Chứng Từ Chuyển Khoản (Receipt Lightbox Modal)

Khi nhân viên bấm vào thumbnail hoặc nút `[Xem ảnh CK]`:
- **Chuyển động mở:** Nền tối mờ kính phủ toàn màn hình (`fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4`).
- **Khung ảnh:** Phóng to nhẹ từ `scale(0.95)` lên `scale(1)` với đường cong `cubic-bezier(0.16, 1, 0.3, 1)` trong 200ms.
- **Tiện ích:**
  * Nút `✕ Đóng` ở góc trên bên phải (hỗ trợ phím tắt `Esc`).
  * Nút `Mở trong tab mới` và nút `Tải ảnh xuống`.
  * Click bất kỳ vào vùng ngoài ảnh sẽ đóng modal mượt mà.

---

### 9.5. THIẾT KẾ RESPONSIVE TRÊN MOBILE (`375px – 414px`)

Trên màn hình điện thoại (khi quản lý kiểm tra doanh thu cơ sở tại quầy lễ tân hoặc trên đường di chuyển):

#### 1. Màn hình Học phí trên Mobile (`/tuitions`):
- **4 Thẻ thống kê đầu trang:** Thu gọn thành dạng thanh trượt ngang vuốt mượt (Horizontal Scroll Snap Pill Cards) hoặc lưới 2x2 gọn gàng.
- **Bảng danh sách chuyển thành Dạng Thẻ Học Phí (Tuition Card Stack):**

```
+-------------------------------------------------------+
|  🎓 Nguyễn Minh Khang (#STU-105)         [ Quá hạn ]  |
|  Học phí Luyện chữ đẹp K12 • Cơ sở 1                  |
|  +-------------------------------------------------+  |
|  | Phải thu: 1.800.000 đ    | Đã đóng: 0 đ         |  |
|  | CÒN NỢ:   1.800.000 đ (Đỏ đậm)                  |  |
|  | Hạn nộp:  10/11/2026 (⚠️ Đã quá hạn 4 ngày)     |  |
|  +-------------------------------------------------+  |
|  [ 👁 Chi tiết ]   [ ✏ Sửa ]    [ ⚡ Thu tiền (44px) ] |
+-------------------------------------------------------+
```

- Nút bấm `⚡ Thu tiền` cao tối thiểu `min-h-[44px]` chuẩn Apple HIG để dễ thao tác bằng ngón tay cái.

#### 2. Màn hình Thanh toán trên Mobile (`/payments`):
- Các giao dịch hiển thị dưới dạng Thẻ giao dịch (Transaction Cards).
- Với giao dịch `Chờ duyệt` (`PendingConfirm`): Cụm 2 nút `✓ Duyệt` (xanh) và `✕ Từ chối` (đỏ) dàn đều ở đáy thẻ với chiều cao `h-11 (44px)`, bấm rung phản hồi nhẹ.
- Các modal (`Tạo khoản thu`, `Ghi nhận thanh toán`) tự động chuyển thành **Bottom Sheet trượt từ đáy màn hình lên** (`rounded-t-2xl max-h-[92vh] overflow-y-auto`) kèm thanh kéo drag handle tiện dụng.

---

### 9.6. BẢNG MÃ TOKENS & BADGES BỔ SUNG CHO GIAI ĐOẠN 1D

#### 1. Tokens Màu Sắc Nghiệp Vụ Tài Chính (Financial Tokens):

| Mã Token | Mã Màu Hex | Tailwind 4 Utility Class | Ý nghĩa áp dụng |
| :--- | :--- | :--- | :--- |
| `finance-paid-bg` | `#ECFDF5` | `bg-emerald-50` | Nền trạng thái đã hoàn thành học phí, thanh toán thành công |
| `finance-paid-text` | `#047857` | `text-emerald-700` | Chữ số tiền đã thu thực tế |
| `finance-debt-bg` | `#FFFBEB` | `bg-amber-50` | Nền trạng thái còn nợ một phần |
| `finance-debt-text` | `#B45309` | `text-amber-700` | Chữ số tiền còn nợ nhẹ |
| `finance-overdue-bg` | `#FFF1F2` | `bg-rose-50` | Nền cảnh báo quá hạn đóng học phí |
| `finance-overdue-text`| `#BE123C` | `text-rose-700` | Chữ số tiền quá hạn, cảnh báo nguy cơ công nợ xấu |
| `finance-pending-bg` | `#FEF3C7` | `bg-amber-100` | Nền giao dịch thanh toán đang chờ đối soát |

#### 2. Badges Trạng Thái Khớp 100% CSDL (`vw_TuitionSummary` & `Payments`):

| Nghiệp vụ / Bảng | Giá trị Mã CSDL | Nhãn Tiếng Việt trên UI | Styling Badge (Tailwind 4) | Dot chỉ thị |
| :--- | :--- | :--- | :--- | :---: |
| **Khoản thu học phí** | `Paid` | **Đã thanh toán** | `bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-emerald-500` |
| **Khoản thu học phí** | `PartiallyPaid` / `Partial` | **Đóng một phần** | `bg-amber-50 text-amber-800 border border-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-amber-500` |
| **Khoản thu học phí** | `Unpaid` | **Chưa thanh toán** | `bg-slate-100 text-slate-700 border border-slate-300 font-medium px-2.5 py-0.5 rounded-full text-xs` | `bg-slate-400` |
| **Khoản thu học phí** | `IsOverdue == 1` | **⚠️ Quá hạn đóng** | `bg-rose-50 text-rose-800 border border-rose-300 font-bold px-2.5 py-0.5 rounded-full text-xs animate-pulse` | `bg-rose-500` |
| **Khoản thu học phí** | `IsCancelled == 1` | **Đã hủy khoản thu** | `bg-slate-100 text-slate-400 border border-slate-200 line-through px-2.5 py-0.5 rounded-full text-xs` | `bg-slate-300` |
| **Giao dịch thanh toán**| `PendingConfirm` | **Chờ xác nhận** | `bg-amber-50 text-amber-800 border border-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-amber-500` |
| **Giao dịch thanh toán**| `Confirmed` | **Đã xác nhận** | `bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-emerald-500` |
| **Giao dịch thanh toán**| `Rejected` | **Đã từ chối** | `bg-rose-50 text-rose-800 border border-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs` | `bg-rose-500` |

---

### 9.7. TIÊU CHUẨN NGHIỆM THU CHO GIAI ĐOẠN 1D (ACCEPTANCE CHECKLIST)

Frontend Developer và QA đối chiếu nghiệm thu 2 màn hình mới theo danh sách kiểm tra chi tiết sau:

- [ ] **Phân Quyền Vai Trò Nghiêm Ngặt (RBAC):**
  - Tài khoản `Teacher`: Không nhìn thấy mục `Học phí` và `Thanh toán` trên Sidebar Desktop và Mobile Drawer. Cố tình truy cập `/tuitions` hoặc `/payments` bị chặn lại và chuyển hướng an toàn.
  - Tài khoản `BranchManager`: Bị khóa cứng chi nhánh sở tại; dropdown chi nhánh bị disable và chỉ tải dữ liệu thuộc cơ sở mình quản lý.
  - Tài khoản `SuperAdmin`: Có đầy đủ quyền lọc tất cả chi nhánh và thực hiện mọi thao tác tài chính.
- [ ] **Màn Hình Học Phí (`/tuitions`):**
  - [ ] Hiển thị đủ 4 thẻ KPI tóm tắt đầu trang (Tổng phải thu, Đã thu, Còn nợ, Quá hạn).
  - [ ] Bảng danh sách hiển thị đúng các cột: Học viên, Khoản thu & Lớp, Cơ sở, Phải thu, Đã đóng (kèm mini progress bar), **Còn nợ nổi bật** (`text-rose-600 font-bold`), Hạn nộp, Trạng thái, Thao tác.
  - [ ] Nút `⚡ Thu tiền` trên từng hàng mở ngay Modal thanh toán với số dư nợ được điền sẵn chính xác.
  - [ ] Modal Xem chi tiết khoản thu: Hiển thị đầy đủ thông tin tài chính và **bảng lịch sử các lần thanh toán** thuộc khoản thu đó.
  - [ ] Modal Tạo khoản thu: Dropdown lớp học chỉ hiển thị các lớp học viên đã ghi danh (chống lỗi FK CSDL).
  - [ ] Ô nhập số tiền tự động định dạng phân cách hàng nghìn (`1.500.000 đ`) và phiên âm tiếng Việt.
- [ ] **Màn Hình Thanh Toán (`/payments`):**
  - [ ] Bộ lọc phương thức thanh toán (`BankTransfer`, `Cash`, `ZaloPay`, `Other`) và trạng thái (`PendingConfirm`, `Confirmed`, `Rejected`) hoạt động chính xác.
  - [ ] Cột chứng từ hiển thị thumbnail ảnh chuyển khoản; bấm vào bung Lightbox xem toàn màn hình mượt mà.
  - [ ] Duyệt thanh toán nhanh: Giao dịch `PendingConfirm` có 2 nút `✓ Duyệt` và `✕ Từ chối`. Bấm duyệt gọi API cập nhật trạng thái ngay không reload trang.
  - [ ] **Validation Chống Vượt Nợ (Overpay Protection):** Modal ghi nhận thanh toán tự động kiểm tra số tiền nhập với số còn nợ. Nếu `Số tiền > Số còn nợ` → viền đỏ, hiển thị thông báo lỗi và **vô hiệu hóa nút Lưu**.
  - [ ] Nút bấm `⚡ Điền nhanh số nợ` tự động điền đúng số dư nợ còn lại chỉ với 1 chạm.
- [ ] **Chuẩn Responsive Mobile (`375px – 414px`):**
  - [ ] Bảng cuộn ngang mượt mà hoặc chuyển đổi mượt sang dạng danh sách thẻ học phí / giao dịch.
  - [ ] Chiều cao các nút thao tác chạm (Thu tiền, Duyệt, Lưu) đạt tối thiểu `44px` theo chuẩn Apple HIG.
  - [ ] Modals trên mobile chuyển sang dạng Bottom Sheet trượt từ đáy màn hình lên với hiệu ứng trượt êm ái.
