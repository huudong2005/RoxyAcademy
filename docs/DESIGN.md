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

---

## 10. THIẾT KẾ CHI TIẾT GIAI ĐOẠN 1E — BÀI TẬP VỀ NHÀ, BÀI NỘP & TIẾN ĐỘ BÀI HỌC (`/homeworks`, `/homeworks/:id`, `LessonProgress`)

### 10.1. TỔNG QUAN NGHIỆP VỤ & PHÂN QUYỀN (RBAC MATRIX)

Giai đoạn 1E số hóa toàn bộ chu trình học tập tương tác cốt lõi giữa Trung tâm - Giáo viên - Học viên/Phụ huynh, bao gồm:
1. **Quản lý Bài tập về nhà (`Homeworks`):** Giáo viên giao bài rèn luyện (viết chữ đẹp, bài tập tư duy toán, bài vẽ hoặc bài tập kỹ năng sống) theo Lớp học (`ClassId`) và Buổi học cụ thể (`ScheduleId`).
2. **Theo dõi Bài nộp & Chấm bài (`HomeworkSubmissions`):** Hệ thống tự động khởi tạo danh sách nộp bài cho toàn bộ học sinh đang học trong lớp. Giáo viên chấm bài tập trung, phản hồi lời nhận xét sư phạm tỉ mỉ và cho điểm.
3. **Tiến độ bài học (`LessonProgress`):** Nhật ký giảng dạy từng buổi của lớp học, lưu lại nội dung trọng tâm và tình hình tiếp thu để ban quản lý cơ sở và phụ huynh cùng theo dõi.

#### Ma Trận Phân Quyền (RBAC) Giai đoạn 1E:

| Chức năng / Thao tác | `SuperAdmin` (👑) | `BranchManager` (🏢) | `Teacher` (👩‍🏫) | `Parent` (👨‍👩‍👧) | `Student` (🎒 Lớp 6+) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Xem danh sách bài tập** | Toàn bộ cơ sở | Chỉ lớp thuộc cơ sở mình | Chỉ lớp mình được phân công | Chỉ bài tập lớp con đang học | Chỉ bài tập lớp mình đang học |
| **Giao bài tập mới (`+ Giao bài tập`)** | ✓ Toàn quyền | ✓ Các lớp trong cơ sở | ✓ Các lớp mình phụ trách | ✕ Không | ✕ Không |
| **Sửa / Xóa bài tập** | ✓ Toàn quyền | ✓ Các lớp trong cơ sở | ✓ Bài tập do mình tạo | ✕ Không | ✕ Không |
| **Xem danh sách bài nộp của cả lớp** | ✓ Xem tất cả | ✓ Lớp thuộc cơ sở | ✓ Lớp mình phụ trách | ✕ Chỉ xem bài của con | ✕ Chỉ xem bài của mình |
| **Chấm bài & Phản hồi (`Review`)** | ✓ Toàn quyền | ✓ Lớp thuộc cơ sở | ✓ Lớp mình phụ trách | ✕ Không | ✕ Không |
| **Nộp bài tập (`Submit`)** | ✓ (Hỗ trợ nộp hộ) | ✕ | ✕ | ✓ Nộp bài cho con | ✓ Tự nộp bài làm của mình |
| **Xem tiến độ bài học (`LessonProgress`)**| ✓ Tất cả lớp | ✓ Lớp thuộc cơ sở | ✓ Lớp mình phụ trách | ✓ Lớp con đang học | ✓ Lớp mình đang học |
| **Ghi nhận / Sửa tiến độ bài học** | ✓ Toàn quyền | ✓ Lớp thuộc cơ sở | ✓ Lớp mình phụ trách | ✕ Không | ✕ Không |

> [!NOTE]
> **TÍNH TỰ ĐỘNG HÓA KHI TẠO BÀI TẬP (AUTOMATION LIFECYCLE):**  
> Ngay khi Giáo viên bấm "Giao bài tập", backend `HomeworksController.cs` tự động quét bảng `StudentClasses` để tìm tất cả học viên có trạng thái `Active` trong lớp đó và tạo trước các bản ghi `HomeworkSubmissions` với trạng thái ban đầu là `Pending` (Chưa nộp).  
> Giao diện Admin hiển thị ngay sĩ số `0 / N đã nộp` mà giáo viên không cần phải thêm học sinh thủ công.

---

### 10.2. NGUYÊN LÝ THIẾT KẾ & TƯƠNG TÁC ÁP DỤNG (APPLE DESIGN & EMIL KOWALSKI)

Áp dụng chặt chẽ 2 bộ skill `apple-design` và `emil-design-eng` vào công việc chấm bài và theo dõi học tập:

| STT | Nguyên lý | Đặc tả ứng dụng cụ thể trên Roxy Admin (Giai đoạn 1E) |
| :-: | :--- | :--- |
| **1** | **Tối ưu Tốc độ Chấm bài (High-Velocity Grading Flow)** | Giáo viên thường phải chấm liên tục 15–20 bài tập sau mỗi buổi học. Thiết kế sử dụng bố cục **Split-View** (Bên trái: Danh sách bài nộp; Bên phải: Trình xem bài & Form chấm điểm). Bấm chuyển học viên phản hồi tức thì (`0ms DOM switch`, micro cross-fade `opacity: 120ms ease-out`). Bổ sung nút bấm 1 chạm `⚡ Lưu & Sang bé tiếp theo` kèm phím tắt `Cmd/Ctrl + Enter`. |
| **2** | **Phản hồi tức thì trên Pointer-Down (Response - Kill Latency)** | Các nút chuyển bộ lọc trạng thái bài nộp (`Pending`, `Submitted`, `Reviewed`), nút mở file đính kèm và nút Lưu điểm đều áp dụng phản hồi scale nhẹ `:active:scale-[0.98]` trong `100ms`, mang lại cảm giác chắc chắn, vật lý như ứng dụng native trên iPad/macOS. |
| **3** | **Thị giác Cảnh báo Hạn nộp theo Mức độ Khẩn cấp (Optical Urgency)** | Hạn nộp (`DueDate`) phân hóa trực quan bằng màu sắc và biểu tượng quang học: <br>• **Còn trên 24h:** Xanh lá / Xám trung tính (`text-slate-600`, icon 📅)<br>• **Sắp hết hạn (dưới 24h):** Vàng hổ phách cảnh báo (`text-amber-700 bg-amber-50`, icon ⏳)<br>• **Đã quá hạn nộp:** Đỏ cảnh báo khẩn (`text-rose-700 bg-rose-50 font-bold`, icon ⚠️). |
| **4** | **Tính nhất quán không gian của Drawer & Lightbox (Spatial Consistency)** | Drawer Chi tiết bài nộp & Chấm bài luôn trượt từ cạnh phải màn hình (`translate-x-full` → `translate-x-0` trong `200ms cubic-bezier(0.16, 1, 0.3, 1)`). Khi đóng cũng rút lui về cạnh phải. Lightbox xem ảnh bài làm học sinh bung từ tâm trung tâm (`scale(0.96) + opacity: 0` → `scale(1) + opacity: 1`). |
| **5** | **Trạng thái Rỗng Tinh tế & Ý nghĩa (Emil Kowalski's Tasteful Empty State)** | Khối tiến độ bài học hoặc danh sách bài tập khi chưa có dữ liệu không được để trống trơn hay hiển thị bảng rỗng trơ trọi. Sử dụng hình minh họa nhẹ nhàng, lời hướng dẫn sư phạm thân thiện và nút hành động nhanh giúp giáo viên định hình ngay việc cần làm. |
| **6** | **Chống lỗi Database Constraint (Zero-Runtime DB Rollback)** | Trong CSDL `RoxyAppDB.sql`, `HomeworkSubmissions.Status` có ràng buộc: `CHECK (Status IN ('Pending','Submitted','Reviewed'))`. Mặc dù DTO backend có ghi `Evaluated|Rejected`, giao diện Frontend **BẮT BUỘC** chuẩn hóa gửi đúng mã `'Reviewed'` khi hoàn tất chấm bài, ngăn chặn triệt để lỗi SQL 500 runtime. |

---

### 10.3. ĐẶC TẢ CHI TIẾT MÀN HÌNH BÀI TẬP VỀ NHÀ (`/homeworks`)

Màn hình `/homeworks` là trung tâm quản lý toàn bộ bài tập được giao cho các lớp học tại trung tâm.

#### 1. Bố Cục Tổng Thể & Thanh Công Cụ (Filter Toolbar)

```
+-------------------------------------------------------------------------------------------------------------------+
|  📝 BÀI TẬP VỀ NHÀ                                                                             [ + Giao bài tập ] |
|  Quản lý danh sách bài tập, hạn nộp và theo dõi tiến độ nộp bài của học viên từng lớp.                           |
+-------------------------------------------------------------------------------------------------------------------+
| [ 🔍 Tìm tiêu đề bài tập... ] [ Lớp: Tất cả ▼ ] [ Buổi học: Tất cả ▼ ] [ Hạn nộp: Tất cả ▼ ] [ Xóa bộ lọc ]       |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Tiêu đề trang (H1):** `font-bold text-slate-900 text-xl md:text-2xl tracking-tight`.
- **Nút CTA `+ Giao bài tập`:** 
  - Chỉ hiển thị cho vai trò `SuperAdmin`, `BranchManager`, `Teacher`.
  - Phụ huynh (`Parent`) và Học sinh (`Student`) truy cập sẽ tự động ẩn nút này.
  - Styling: `bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150`.
- **Các bộ lọc tương tác tức thì:**
  - **Ô tìm kiếm (`search`):** Tìm kiếm theo tiêu đề bài tập, tên lớp học. Có icon kính lúp bên trái, nút `✕` xóa nhanh bên phải.
  - **Lọc theo Lớp học (`classFilter`):**
    - Với `Teacher`: Chỉ hiển thị danh sách các lớp do giáo viên đang đăng nhập giảng dạy (`cls.teacherId === currentUser.id`).
    - Với `BranchManager`: Dropdown các lớp thuộc cơ sở mình quản lý.
    - Với `SuperAdmin`: Hiển thị tất cả lớp học trong toàn hệ thống.
  - **Lọc theo Buổi học (`scheduleFilter`):**
    - Phụ thuộc động: Chỉ kích hoạt khi đã chọn 1 Lớp học cụ thể.
    - Hiển thị danh sách buổi học của lớp: `[Ngày DD/MM/YYYY] • [HH:mm - HH:mm] • [Phòng]`.
  - **Lọc theo Tình trạng Hạn nộp (`dueStatusFilter`):**
    - `Tất cả`
    - `Đang mở / Còn hạn` (DueDate >= Now)
    - `Sắp hết hạn (< 24 giờ)` (DueDate - Now <= 24h)
    - `Đã quá hạn` (DueDate < Now)
  - **Nút `Xóa bộ lọc`:** Nút phụ xuất hiện khi có bất kỳ bộ lọc nào khác mặc định, click để reset trạng thái tìm kiếm về ban đầu.

---

#### 2. Bảng Danh Sách Bài Tập (Desktop Data Grid)

Container bảng: `w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto`.

```
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| BÀI TẬP & NGƯỜI GIAO       | LỚP & BUỔI HỌC          | HẠN NỘP BÀI             | TÀI LIỆU ĐÍNH KÈM   | TIẾN ĐỘ NỘP & CHẤM    | THAO TÁC       |
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| Luyện nét khuyết trên & dưới| Tiền TH Họa Mi 1        | 16/11/2026, 21:00       | 📎 [De-bai-tap-1.pdf]| [ 18 / 20 Học viên ]  | [ 👁 Chấm bài ] |
| #HW-104 • Cô Mai Anh        | Buổi 4 (14/11/2026)     | (⏳ Còn 2 ngày)         | (Tải về: 2.4 MB)    | [██████████░░] 90%    | [ ✏ Sửa ]      |
| Tạo lúc: 14/11 10:30        | Cơ sở 1 - P.102         | [ Còn hạn ]             |                     | (14 đã chấm • 4 chờ)  | [ 🗑 Xóa ]      |
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| Bài tập tư duy Toán logic   | Toán Logic K08          | 13/11/2026, 23:59       | 🔗 [Link Drive bài]  | [ 15 / 15 Học viên ]  | [ 👁 Chấm bài ] |
| #HW-101 • Thầy Hoàng Nam    | Buổi 8 (12/11/2026)     | (⚠️ Quá hạn 1 ngày)     | (drive.google.com)  | [████████████] 100%   | [ ✏ Sửa ]      |
| Tạo lúc: 12/11 15:00        | Cơ sở 2 - P.201         | [ ⚠️ Quá hạn ]          |                     | (15/15 đã chấm xong)  | [ 🗑 Xóa ]      |
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| Vẽ tranh phong cảnh quê hương| Lớp Vẽ Nghệ Thuật V03   | 18/11/2026, 18:00       | —                   | [ 5 / 12 Học viên ]   | [ 👁 Chấm bài ] |
| #HW-098 • Cô Bích Phương    | Không gắn buổi riêng    | (⏳ Còn 4 ngày)         | (Không có file)     | [████░░░░░░░░] 42%    | [ ✏ Sửa ]      |
| Tạo lúc: 11/11 09:00        | Cơ sở 1 - P.105         | [ Còn hạn ]             |                     | (2 đã chấm • 3 chờ)   | [ 🗑 Xóa ]      |
+-----------------------------------------------------------------------------------------------------------------------------------------------+
```

##### Đặc tả chi tiết từng cột:
1. **Cột 1: Bài tập & Người giao:**
   - Tiêu đề: `text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors`. Click tiêu đề mở nhanh màn hình chi tiết bài tập.
   - Mã bài tập định danh: `text-[11px] font-mono text-slate-400`.
   - Người giao: Icon `👩‍🏫` hoặc avatar tròn 18px + Tên giáo viên (`CreatedByName`) + Thời gian tạo `HH:mm DD/MM`.
2. **Cột 2: Lớp học & Buổi học liên kết:**
   - Tên lớp học: `text-sm font-semibold text-blue-700`.
   - Buổi học liên kết: Nếu có `ScheduleId`, hiển thị rõ `Buổi [X] ([Ngày]) • [Phòng]`. Nếu không gắn buổi riêng, hiển thị nhãn nhẹ `Toàn khóa học`.
   - Cơ sở: Badge nhỏ `text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 text-xs`.
3. **Cột 3: Hạn nộp bài (`DueDate`):**
   - Thời gian chi tiết: `HH:mm, DD/MM/YYYY` định dạng 24h.
   - Nhãn thời gian tương đối: `(Còn 2 ngày)` hoặc `(⚠️ Quá hạn 1 ngày)`.
   - Badge trạng thái hạn nộp:
     * **Còn hạn:** `bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full`.
     * **Sắp hết hạn (< 24h):** `bg-amber-50 text-amber-800 border-amber-300 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse`.
     * **Quá hạn:** `bg-rose-50 text-rose-800 border-rose-300 text-xs font-bold px-2 py-0.5 rounded-full`.
4. **Cột 4: Tài liệu đính kèm đề bài (`AttachmentUrl`):**
   - Nếu là file URL (PDF, Word, ảnh): Hiển thị icon `📎` kèm tên rút gọn hoặc nút `[Xem đề]`, hover mở liên kết tab mới an toàn `target="_blank" rel="noopener noreferrer"`.
   - Nếu là link Drive/Web: Hiển thị icon `🔗` kèm tên miền rút gọn (`drive.google.com`).
   - Nếu không có file: Ký hiệu dấu gạch ngang mờ `—`.
5. **Cột 5: Tiến độ Nộp & Chấm bài (`Submissions Ratio`):**
   - Tỷ lệ học viên: `font-mono text-xs font-bold text-slate-900` dạng `18 / 20 Học viên đã nộp`.
   - **Thanh Progress Bar Phân Tầng 3 Đoạn (Stacked Mini Progress Bar):**
     * Chiều cao `h-2`, bo tròn `rounded-full`, nền xám nhạt `bg-slate-100`.
     * Đoạn 1 (Xanh lá `bg-emerald-500`): Tỷ lệ bài đã chấm (`Reviewed`).
     * Đoạn 2 (Xanh dương `bg-blue-500`): Tỷ lệ bài đã nộp đang chờ chấm (`Submitted`).
     * Đoạn 3 (Nền xám `bg-slate-200`): Tỷ lệ học viên chưa nộp (`Pending`).
   - Dòng chú thích chi tiết bên dưới: `text-[11px] text-slate-500` (VD: *14 đã chấm • 4 chờ chấm • 2 chưa nộp*).
6. **Cột 6: Thao tác (Action Buttons):**
   - **Nút `👁 Chấm bài` (Primary Row Action):** `inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg active:scale-95 transition-all`. Mở trang chi tiết bài tập & drawer chấm bài.
   - **Nút `✏ Sửa`:** Chỉ hiển thị cho SuperAdmin, BranchManager hoặc chính Giáo viên tạo bài.
   - **Nút `🗑 Xóa`:** Nút icon thùng rác màu hồng nhạt `text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg active:scale-95 transition-all`. Có dialog xác nhận trước khi xóa vĩnh viễn đề bài và toàn bộ bài nộp liên quan (xóa cascading).

---

#### 3. Modal Giao / Sửa Bài Tập Về Nhà (`CreateEditHomeworkModal`)

Modal mở ra từ giữa màn hình theo nguyên tắc Emil Kowalski (`scale(0.96) + opacity: 0` → `scale(1) + opacity: 1` trong 180ms).

```
+---------------------------------------------------------------------------------------------------+
|  📝 GIAO BÀI TẬP VỀ NHÀ MỚI                                                                  [ ✕ ]|
|  Bài tập sẽ được tự động giao cho tất cả học viên đang học trong lớp đã chọn.                    |
+---------------------------------------------------------------------------------------------------+
|  Lớp học áp dụng: (*)                                                                             |
|  [ Tiền TH Họa Mi 1 - Cơ sở 1 (Cô Mai Anh phụ trách)                                    🔒/▼ ]    |
|                                                                                                   |
|  Buổi học liên kết: (Tùy chọn)                                                                    |
|  [ -- Buổi 4: Thứ Sáu, 14/11/2026 (08:00 - 09:30) • P.102 --                            ▼ ]        |
|  ℹ️ Gắn bài tập vào buổi học cụ thể giúp phụ huynh theo dõi sát lộ trình từng ngày.               |
|                                                                                                   |
|  Tiêu đề bài tập: (*)                                                                             |
|  [ Luyện nét khuyết trên & khuyết dưới - Vở thực hành Trang 12-14                                ] |
|                                                                                                   |
|  Hạn nộp bài: (*)                                                                                 |
|  [ 16/11/2026, 21:00                                                                        📅 ]  |
|  [⚡ Gợi ý: +2 ngày (Tối Chủ Nhật) ]  [⚡ Gợi ý: Trước buổi học kế tiếp ]                         |
|                                                                                                   |
|  Tài liệu / Đề bài đính kèm: (Tùy chọn)                                                           |
|  [ https://drive.google.com/file/d/1A2b3c... hoặc link tải file PDF bài mẫu                   🔗 ]|
|  Phụ đề: Hỗ trợ link Google Drive, OneDrive hoặc đường dẫn ảnh/tài liệu bài giảng.                |
|                                                                                                   |
|  Nội dung hướng dẫn & Đề bài chi tiết:                                                            |
|  +---------------------------------------------------------------------------------------------+  |
|  | - Các con viết nắn nót 3 dòng nét khuyết trên và 3 dòng nét khuyết dưới vào vở ô ly.       |  |
|  | - Chú ý điểm dừng bút ở đường kẻ ngang số 2 và lưng nét chữ thẳng thớm.                     |  |
|  | - Ba mẹ chụp ảnh bài viết gửi lên hệ thống trước 21h tối Chủ Nhật để cô kịp chấm điểm nhé!  |  |
|  |                                                                                             |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | ℹ️ TỰ ĐỘNG KHỞI TẠO:                                                                        |  |
|  | Khi bấm "Giao bài tập", hệ thống sẽ tự động tạo 20 chỗ nộp bài (HomeworkSubmissions)         |  |
|  | cho toàn bộ 20 học viên đang học trong lớp "Tiền TH Họa Mi 1".                              |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
|  [ Hủy bỏ ]                                                                  [ ✓ Giao bài tập ]   |
+---------------------------------------------------------------------------------------------------+
```

##### Ràng buộc & Validation trên Form:
1. **Lọc lớp phụ thuộc vai trò:**
   - Giáo viên (`Teacher`) chỉ thấy danh sách các lớp do mình phụ trách trong dropdown.
   - Nếu truy cập từ trang chi tiết lớp học (`ClassList`), trường `Lớp học` được điền sẵn và khóa lại để tránh chọn nhầm.
2. **Buổi học liên kết (`ScheduleId`):**
   - Khi chọn một lớp, dropdown tự động tải danh sách các buổi học của lớp đó từ API `GET /api/Schedules?classId={classId}`.
   - Giáo viên có thể để trống nếu bài tập dành cho cả tuần hoặc dự án dài kỳ.
3. **Phím chọn nhanh Hạn nộp (Quick Due Date Pills):**
   - Nút `⚡ +2 ngày`: Tự động điền ngày hiện tại + 2 ngày, giờ mặc định `21:00`.
   - Nút `⚡ Trước buổi học kế`: Tự động tìm ngày diễn ra buổi học tiếp theo và đặt hạn nộp là `21:00` của đêm hôm trước.
4. **Tự động trim ký tự:** Tiêu đề và nội dung tự động cắt tỉa khoảng trắng đầu/cuối trước khi gửi API.

---

### 10.4. ĐẶC TẢ CHI TIẾT TRANG & DRAWER CHẤM BÀI TẬP (`/homeworks/:id`)

Đây là màn hình trọng tâm giúp giáo viên chấm bài nhanh chóng, xem bài làm học viên và gửi phản hồi sư phạm đến phụ huynh. Màn hình có thể mở dạng toàn trang (`/homeworks/:id`) hoặc dạng Slide-Over Drawer từ danh sách bài tập.

#### 1. Bố Cục Tổng Thể: Tóm Tắt Đề Bài & Bộ Lọc Nộp Bài

```
+-------------------------------------------------------------------------------------------------------------------+
|  [ ← Quay lại danh sách ]          MÃ BÀI TẬP: #HW-104                          [ ✏ Sửa đề bài ]  [ 🗑 Xóa bài ] |
|  LUYỆN NÉT KHUYẾT TRÊN & KHUYẾT DƯỚI - TRANG 12-14                                                                |
|  Lớp: Tiền TH Họa Mi 1 • Cơ sở 1 | Giao bởi: Cô Mai Anh • Tạo lúc: 14/11 10:30 | Hạn nộp: 16/11, 21:00 (Còn 2 ngày) |
|  Tài liệu: 📎 [De-bai-tap-1.pdf] | Hướng dẫn: Viết nắn nót 3 dòng nét khuyết trên và 3 dòng nét khuyết dưới...   |
+-------------------------------------------------------------------------------------------------------------------+
|  TIẾN ĐỘ CHUNG:                                                                                                   |
|  [ Tổng: 20 học viên ]   [ ✉ Chưa nộp: 2 ]   [ 📥 Chờ chấm: 4 ]   [ ✓ Đã chấm: 14 ]   (Đã hoàn thành 70%)         |
+-------------------------------------------------------------------------------------------------------------------+
|  BỘ LỌC BÀI NỘP:                                                                                                  |
|  [ Tất cả (20) ]  [ 📥 Đã nộp chờ chấm (4) (Active) ]  [ ✓ Đã chấm (14) ]  [ ⏳ Chưa nộp (2) ]  [ 🔍 Tìm học viên ] |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Thanh điều hướng quay lại (`Back Link`):** `text-slate-600 hover:text-blue-600 inline-flex items-center gap-1.5 text-sm font-medium`.
- **Dải thẻ KPI tiến độ (Submission Status Cards):**
  - Giúp giáo viên nắm bắt ngay bao nhiêu bé đã nộp, bao nhiêu bé chưa chấm để ưu tiên xử lý.
- **Thanh Segmented Control phân loại bài nộp:**
  - `Tất cả`: Xem toàn bộ danh sách 20 học sinh trong lớp.
  - `Đã nộp chờ chấm`: Lọc nhanh danh sách các bài học sinh đã gửi bài làm (`Status = 'Submitted'`) cần cô nhận xét ngay.
  - `Đã chấm`: Các bài đã có điểm và nhận xét (`Status = 'Reviewed'`).
  - `Chưa nộp`: Các bé chưa gửi bài (`Status = 'Pending'`).

---

#### 2. Giao Diện Chấm Bài Tập Trung (Grading Split-View) Cho Giáo Viên & Staff

Bố cục 2 cột Split-View trên máy tính bàn và máy tính bảng:

```
+----------------------------------------------------+--------------------------------------------------------------+
|  DANH SÁCH BÀI NỘP TRONG LỚP (4 bài chờ chấm)      |  CHI TIẾT BÀI NỘP & CHẤM ĐIỂM HỌC VIÊN                      |
+----------------------------------------------------+--------------------------------------------------------------+
| [✓] Trần Bảo Ngọc (#STU-102)          [ Chờ chấm ] | 🎓 Học viên: Trần Bảo Ngọc (#STU-102) • 6 tuổi               |
|     Nộp lúc: 15/11 14:20 (Đúng hạn)                | Trạng thái: [ 📥 Đã nộp bài ] • Nộp lúc: 15/11/2026, 14:20   |
|     Bài làm: 🖼️ 2 ảnh bài viết vở ô ly             | ------------------------------------------------------------ |
|     (Đang chọn - Viền xanh đậm active)             | 💬 Lời nhắn từ phụ huynh / bé:                               |
|                                                    | "Dạ mẹ gửi bài tập của bé Ngọc, hôm nay bé tự ngồi viết      |
| [ ] Nguyễn Minh Khang (#STU-105)      [ Chờ chấm ] |  hết 3 dòng rất chăm chỉ ạ!"                                 |
|     Nộp lúc: 15/11 16:45 (Đúng hạn)                |                                                              |
|     Bài làm: 🔗 Link Google Drive                  | 📎 BÀI LÀM CỦA BÉ:                                           |
|                                                    | +----------------------------------------------------------+ |
| [ ] Lê Tuấn Kiệt (#STU-110)           [ Chờ chấm ] | | [🖼️ Thumbnail ảnh bài viết trang 12 - Bấm xem lớn 🔍]    | |
|     Nộp lúc: 16/11 08:10 (Đúng hạn)                | | Link file: https://cdn.roxy.edu.vn/submissions/stu102.jpg| |
|     Bài làm: 🖼️ 1 ảnh chụp                          | +----------------------------------------------------------+ |
|                                                    |                                                              |
| [ ] Hoàng Gia Bảo (#STU-114)          [ Chờ chấm ] | 👩‍🏫 GIÁO VIÊN CHẤM BÀI & NHẬN XÉT:                           |
|     Nộp lúc: 16/11 09:30 (Đúng hạn)                |                                                              |
|     Bài làm: 🖼️ 1 ảnh chụp                          | Điểm số đánh giá: (*)                                        |
| -------------------------------------------------- | [ 9.5  ] / Thang điểm 10.0  [ ⚡ Cho 10 ]  [ ⚡ Cho 9 ]       |
|                                                    | (Hoặc: [ ✓ Đạt yêu cầu ]  [ ✕ Chưa đạt ] cho khối Mầm non)   |
| [✓ Đã chấm: 14 học viên - Nhấp để xem]             |                                                              |
| [⏳ Chưa nộp: 2 học viên - Nhấp để xem]             | Nhận xét sư phạm của cô giáo: (*) (Tối đa 1000 ký tự)        |
|                                                    | +----------------------------------------------------------+ |
|                                                    | | Bé Ngọc viết nét khuyết trên rất đều tay, độ cao 2.5 ô ly| |
|                                                    | | chuẩn nét. Nét khuyết dưới ở dòng 2 hơi lệch một chút,   | |
|                                                    | | buổi sau cô sẽ rèn thêm cho con nhé. Cô khen bé rất nỗ   | |
|                                                    | | lực! ⭐⭐⭐⭐⭐                                          | |
|                                                    | +----------------------------------------------------------+ |
|                                                    | [⚡ Mẫu nhận xét: Khen ngợi ] [⚡ Mẫu nhận xét: Cần rèn thêm ]|
|                                                    |                                                              |
|                                                    | [ Yêu cầu nộp lại bài ]        [ ✓ Lưu & Chấm bé tiếp theo ] |
|                                                    |                             (Phím tắt: Ctrl + Enter / ⌘Enter)|
+----------------------------------------------------+--------------------------------------------------------------+
```

##### Chi tiết tính năng Split-View:
1. **Cột trái — Danh sách học viên nộp bài (`Submissions Sidebar`):**
   - Độ rộng cố định `w-80 md:w-96`, cuộn dọc độc lập `overflow-y-auto`.
   - Mỗi item thẻ học viên hiển thị: Tên học viên in đậm, mã `#STU-xxx`, thời gian nộp, badge trạng thái (`Pending` xám, `Submitted` vàng chờ duyệt, `Reviewed` xanh lá kèm điểm số).
   - Thẻ đang được chọn (Active Item): Nền `bg-blue-50/70`, viền trái `border-l-4 border-blue-600`, bóng đổ nhẹ.
2. **Cột phải — Trình chấm điểm & Phản hồi (`Grading Pane`):**
   - **Khu vực xem bài làm:** 
     * Nếu là ảnh (JPG, PNG, WebP): Hiển thị ảnh xem trước sắc nét với nút "🔍 Phóng to toàn màn hình" (bung Lightbox modal) giúp cô giáo soi rõ từng ô ly và nét mực của học sinh.
     * Nếu là liên kết (Google Drive, YouTube bài đọc, file PDF): Nút bấm mở link trong tab mới kèm icon định dạng.
   - **Trường nhập Điểm số (`Score`):**
     * Ô nhập số thực từ `0.0` đến `10.0` (`step="0.5"`), chữ số to rõ `text-lg font-mono font-bold text-blue-700 w-24 text-center`.
     * Bộ nút 1 chạm điền nhanh: `[⚡ 10 điểm]`, `[⚡ 9 điểm]`, `[⚡ 8 điểm]`.
     * Với các lớp Tiền tiểu học hoặc Can thiệp đặc biệt: Có thể chuyển đổi sang chế độ đánh giá định tính `[✓ Đạt]` / `[✕ Cần rèn thêm]`.
     * *Lưu ý kỹ thuật:* Do bảng `HomeworkSubmissions` lưu phản hồi trong `TeacherFeedback` (1000 ký tự), giao diện tự động lưu trữ điểm số vào đầu nội dung nhận xét (VD: `[Điểm: 9.5/10] Bé viết rất nắn nót...`) để đảm bảo không lỗi schema CSDL.
   - **Trường Nhận xét của Giáo viên (`TeacherFeedback`):**
     * Textarea chiều cao tối thiểu 120px, có bộ đếm ký tự `... / 1000`.
     * Thư viện mẫu nhận xét nhanh (Quick Feedback Templates): Bấm 1 chạm để chèn nhanh các câu nhận xét mẫu thân thiện, giúp giáo viên tiết kiệm 80% thời gian gõ phím.
   - **Nút bấm Hành động:**
     * **Nút `✓ Lưu & Chấm bé tiếp theo` (Primary Action):** Lưu kết quả chấm bài (`PUT /api/HomeworkSubmissions/{id}/review`), cập nhật trạng thái `Reviewed`, đồng thời tự động chuyển tiêu điểm sang bài nộp chờ chấm của học viên tiếp theo trong danh sách. Hỗ trợ phím tắt `Ctrl + Enter` (hoặc `Cmd + Enter` trên Mac).
     * **Nút `Yêu cầu nộp lại bài`:** Gửi phản hồi yêu cầu học sinh làm lại kèm lý do (VD: *Ảnh chụp bài bị mờ nét, ba mẹ chụp lại giúp cô nhé*).

---

#### 3. Giao Diện Nộp Bài Dành Cho Phụ Huynh / Học Sinh (`Student/Parent Submission View`)

Khi Phụ huynh đăng nhập (hoặc Học sinh lớp 6+ tự truy cập) xem chi tiết bài tập:
- Giao diện **TUYỆT ĐỐI KHÔNG HIỂN THỊ** danh sách các học viên khác trong lớp (Tuân thủ nghiêm ngặt quy định bảo mật riêng tư sư phạm tại `GEMINI.md`).
- Chỉ hiển thị duy nhất thông tin bài nộp của chính học viên đó:

```
+---------------------------------------------------------------------------------------------------+
|  🎓 BÀI TẬP VỀ NHÀ: Luyện nét khuyết trên & khuyết dưới                                           |
|  Lớp: Tiền TH Họa Mi 1 • Hạn nộp: 16/11/2026, 21:00 (⏳ Còn 2 ngày)                               |
+---------------------------------------------------------------------------------------------------+
|  ĐỀ BÀI CỦA CÔ GIÁO:                                                                              |
|  Các con viết 3 dòng nét khuyết trên và 3 dòng nét khuyết dưới vào vở ô ly trang 12...            |
|  Tài liệu kèm theo: 📎 [De-bai-tap-1.pdf]                                                         |
+---------------------------------------------------------------------------------------------------+
|  HỒ SƠ NỘP BÀI CỦA BÉ: Trần Bảo Ngọc (#STU-102)                                                   |
|                                                                                                   |
|  Trạng thái bài làm: [ ⏳ Chưa nộp bài ]                                                           |
|                                                                                                   |
|  Đường dẫn bài làm / Ảnh chụp bài viết: (*)                                                       |
|  [ https://drive.google.com/file/d/your-homework-image.jpg                                    🔗 ]|
|  ℹ️ Ba mẹ tải ảnh bài làm của bé lên Google Drive / Zalo rồi dán đường dẫn vào đây nhé!           |
|                                                                                                   |
|  Lời nhắn gửi cô giáo: (Tùy chọn)                                                                 |
|  [ Bé Ngọc hôm nay viết bài rất tập trung, mẹ chụp gửi cô chấm giúp bé ạ...                     ] |
+---------------------------------------------------------------------------------------------------+
|                                                                             [ 📤 Gửi bài tập ]    |
+---------------------------------------------------------------------------------------------------+
```

- **Khi giáo viên đã chấm xong (`Status = 'Reviewed'`):**
  - Khung form nộp bài chuyển thành **Thẻ Kết quả Chấm bài** trang trọng:
    * Điểm số to nổi bật: `font-mono text-3xl font-extrabold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl inline-block`.
    * Lời nhận xét ấm áp của cô giáo đóng trong khung viền xanh nhạt `border-blue-200 bg-blue-50/50 p-4 rounded-xl`.
    * Ngày giờ cô chấm: `Đã chấm lúc 15/11/2026, 17:30 bởi Cô Mai Anh`.
    * Nút `Nộp lại bài mới` (nếu cô cho phép nộp cải thiện điểm).

---

### 10.5. ĐẶC TẢ KHỐI TIẾN ĐỘ BÀI HỌC (`LessonProgress`) TRONG CHI TIẾT LỚP HỌC (`ClassList`)

Nhật ký bài học (`LessonProgress`) là công cụ phản ánh thực tế giảng dạy của từng buổi học. Trong trang Quản lý Lớp học (`ClassList`), khi người dùng bấm vào một lớp học hoặc mở **Drawer Chi tiết Lớp (`ClassDetailDrawer`)**, Tab **"Tiến độ bài học"** sẽ hiển thị khối này.

#### 1. Dòng Thời Gian Nhật Ký Bài Học (Lesson Progress Timeline)

```
+-------------------------------------------------------------------------------------------------------------------+
|  [ Thông tin chung ]   [ Danh sách học viên (18) ]   [ 📖 Tiến độ bài học (Active) ]   [ 💰 Học phí lớp ]         |
+-------------------------------------------------------------------------------------------------------------------+
|  NHẬT KÝ TIẾN ĐỘ BÀI DẠY THEO BUỔI                                             [ + Ghi nhận tiến độ mới ]        |
|  Theo dõi nội dung giảng dạy thực tế, mức độ tiếp thu và dặn dò sau từng buổi học của lớp.                        |
+-------------------------------------------------------------------------------------------------------------------+
|                                                                                                                   |
|  (●) BUỔI 4: Thứ Sáu, 14/11/2026 • 08:00 - 09:30 • Phòng 102                                                      |
|   |  Tiêu đề: Luyện viết nhóm nét khuyết trên & khuyết dưới                                                        |
|   |  Người ghi nhận: Cô Mai Anh • Cập nhật lúc: 14/11 10:15                                                       |
|   |  +---------------------------------------------------------------------------------------------------------+  |
|   |  | NỘI DUNG GIẢNG DẠY:                                                                                     |  |
|   |  | 1. Ôn tập nhóm nét móc xuôi, móc ngược và nét móc hai đầu (15 phút).                                   |  |
|   |  | 2. Hướng dẫn kỹ thuật rê bút viết nét khuyết trên: điểm bắt đầu tại đường kẻ ngang 2, lượn cong qua góc.|  |
|   |  | 3. Cho cả lớp thực hành viết bảng con, sau đó chuyển sang viết vở bài tập trang 12.                     |  |
|   |  | TÌNH HÌNH TIẾP THU CHUNG:                                                                               |  |
|   |  | - Đa số các bé (15/18) nắm vững điểm giao nhau của nét khuyết.                                          |  |
|   |  | - Bé Khang và bé Bảo viết hơi vội nên nét khuyết dưới bị méo, cô đã kèm riêng 10 phút cuối giờ.        |  |
|   |  | DẶN DÒ: Đã giao bài tập #HW-104 về nhà, hạn nộp 21h Chủ Nhật.                                          |  |
|   |  +---------------------------------------------------------------------------------------------------------+  |
|   |  [ ✏ Sửa nội dung ]   [ 🗑 Xóa ]                                                                              |
|   |                                                                                                               |
|  (●) BUỔI 3: Thứ Tư, 12/11/2026 • 08:00 - 09:30 • Phòng 102                                                      |
|   |  Tiêu đề: Rèn tư thế ngồi viết chuẩn & kỹ thuật cầm bút 3 ngón                                                |
|   |  Người ghi nhận: Cô Mai Anh • Cập nhật lúc: 12/11 10:00                                                       |
|   |  +---------------------------------------------------------------------------------------------------------+  |
|   |  | NỘI DUNG GIẢNG DẠY:                                                                                     |  |
|   |  | - Chỉnh sửa tư thế ngồi: lưng thẳng, không tì ngực vào cạnh bàn, khoảng cách mắt từ 25 - 30cm.          |  |
|   |  | - Luyện cầm bút bằng 3 ngón (cái, trỏ, giữa), cổ tay thả lỏng linh hoạt.                                 |  |
|   |  +---------------------------------------------------------------------------------------------------------+  |
|   |  [ ✏ Sửa nội dung ]   [ 🗑 Xóa ]                                                                              |
|                                                                                                                   |
+-------------------------------------------------------------------------------------------------------------------+
```

- **Cấu trúc trục thời gian (Timeline Axis):**
  - Trục dọc màu xanh xám `border-l-2 border-slate-200 ml-4 pl-6 relative space-y-8`.
  - Nốt tròn chỉ thị buổi học: `absolute -left-[9px] w-4 h-4 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100`.
  - Khung nội dung từng buổi: `bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs hover:bg-slate-50/80 transition-all`.
- **Thao tác nhanh cho giáo viên:**
  - Nút `+ Ghi nhận tiến độ mới`: Mở modal nhập nhật ký bài dạy.
  - Nút `✏ Sửa` và `🗑 Xóa`: Có quyền phân bổ theo RBAC (chỉ GV phụ trách lớp hoặc Quản lý chi nhánh được sửa).

---

#### 2. Trạng Thái Rỗng Tinh Tế (Tasteful Clean Empty State)

Khi lớp học mới mở hoặc chưa có buổi nào được ghi nhận nhật ký:
> Áp dụng triết lý của **Emil Kowalski**: Không hiển thị hộp xám trơ trọi, trạng thái rỗng phải có tính thẩm mỹ, ấm áp và định hướng thao tác tiếp theo.

```
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|                                         📖                                                        |
|                       Chưa có ghi nhận tiến độ bài học nào                                       |
|                                                                                                   |
|           Giáo viên phụ trách lớp sẽ cập nhật nội dung giảng dạy, mức độ tiếp thu                 |
|           của các bé và dặn dò phụ huynh sau mỗi buổi học tại trung tâm.                         |
|                                                                                                   |
|                             [ + Ghi nhận tiến độ buổi đầu tiên ]                                  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

- Icon trang vở mở nhẹ nhàng: `text-4xl text-blue-400 p-4 bg-blue-50 rounded-full inline-block`.
- Tiêu đề rỗng: `text-base font-semibold text-slate-800 mt-3`.
- Mô tả định hướng: `text-xs text-slate-500 max-w-md mx-auto text-center leading-relaxed`.
- Nút CTA nhanh: `bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg active:scale-95 transition-all mt-4` (Ẩn đối với vai trò `Parent`/`Student`).

---

#### 3. Modal Thêm / Sửa Tiến Độ Bài Học (`CreateEditLessonProgressModal`)

```
+---------------------------------------------------------------------------------------------------+
|  📖 GHI NHẬN TIẾN ĐỘ BÀI HỌC MỚI                                                             [ ✕ ]|
|  Lớp học: Tiền TH Họa Mi 1 (Cơ sở 1 - Bình Trưng Đông)                                            |
+---------------------------------------------------------------------------------------------------+
|  Ngày diễn ra buổi học: (*)                                                                       |
|  [ 14/11/2026                                                                               📅 ]  |
|                                                                                                   |
|  Buổi học trong lịch: (Khuyên dùng)                                                               |
|  [ Buổi 4: Thứ Sáu, 14/11/2026 (08:00 - 09:30) • P.102 • Cô Mai Anh                      ▼ ]        |
|  ℹ️ Chọn buổi học tương ứng để hệ thống đồng bộ với lịch học và bảng điểm danh.                   |
|                                                                                                   |
|  Tiêu đề tóm tắt buổi dạy: (Tùy chọn)                                                             |
|  [ Luyện viết nhóm nét khuyết trên & nét khuyết dưới                                            ] |
|                                                                                                   |
|  Nội dung bài dạy & Tình hình học tập: (*)                                                        |
|  +---------------------------------------------------------------------------------------------+  |
|  | - Nội dung đã dạy: ...                                                                      |  |
|  | - Đánh giá tiếp thu của học sinh trong lớp: ...                                             |  |
|  | - Bài tập / Nhiệm vụ dặn dò về nhà: ...                                                     |  |
|  |                                                                                             |  |
|  +---------------------------------------------------------------------------------------------+  |
|  Phụ đề: Hỗ trợ xuống dòng và các gạch đầu dòng để nội dung dễ đọc.                               |
+---------------------------------------------------------------------------------------------------+
|  [ Hủy bỏ ]                                                                  [ ✓ Lưu tiến độ ]    |
+---------------------------------------------------------------------------------------------------+
```

---

### 10.6. THIẾT KẾ RESPONSIVE TRÊN MOBILE (`375px – 414px`)

Trên màn hình điện thoại di động (khi giáo viên mở điện thoại kiểm tra bài nộp hoặc phụ huynh kiểm tra bài tập về nhà của con):

#### 1. Màn hình Bài tập trên Mobile (`/homeworks`):
- Bảng desktop chuyển thành **Danh sách Thẻ Bài tập (Homework Card Stack)**:

```
+-------------------------------------------------------+
|  📝 Luyện nét khuyết trên & dưới          [ Còn hạn ] |
|  Tiền TH Họa Mi 1 • Buổi 4 (14/11/2026)               |
|  +-------------------------------------------------+  |
|  | ⏰ Hạn: 16/11, 21:00 (Còn 2 ngày)                |  |
|  | 📎 Đề bài: [De-bai-tap-1.pdf]                    |  |
|  | Tiến độ: 18/20 đã nộp (14 đã chấm)               |  |
|  | [██████████████░░] 90%                           |  |
|  +-------------------------------------------------+  |
|  [ 👁 Chấm bài (44px) ]      [ ✏ Sửa ]    [ 🗑 ]       |
+-------------------------------------------------------+
```

- Chiều cao các nút thao tác chạm đạt chuẩn tối thiểu `min-h-[44px]` (Apple HIG) để bấm dễ dàng bằng ngón tay cái mà không bị chạm nhầm nút bên cạnh.

#### 2. Trải nghiệm Chấm bài trên Mobile:
- Split-View desktop tự động chuyển thành **Luồng 2 Bước trên Mobile**:
  - **Bước 1:** Danh sách thẻ học viên nộp bài cuộn dọc mượt mà.
  - **Bước 2:** Chạm vào học viên sẽ mở **Bottom Sheet Chấm bài trượt từ đáy màn hình lên** (`fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl bg-white shadow-2xl overflow-y-auto`):
    * Có thanh kéo vuốt xuống (Drag Handle: `w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2`).
    * Xem ảnh bài làm với cử chỉ zoom 2 ngón tay.
    * Form nhập điểm và nhận xét với bàn phím số tối ưu (`inputmode="decimal"`).
    * Nút `✓ Lưu kết quả` cố định ở đáy màn hình (Sticky Bottom Bar `safe-area-inset-bottom`).

---

### 10.7. BẢNG MÃ TOKENS & BADGES BỔ SUNG CHO GIAI ĐOẠN 1E

#### 1. Badges Trạng thái Bài nộp (Khớp 100% CSDL `HomeworkSubmissions.Status`):

| Giá trị Mã CSDL | Nhãn Tiếng Việt trên UI | Styling Badge (Tailwind CSS 4) | Dot chỉ thị | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :---: | :--- |
| `Pending` | **Chưa nộp** | `bg-slate-100 text-slate-600 border border-slate-300 font-medium px-2.5 py-0.5 rounded-full text-xs` | `bg-slate-400` | Hệ thống tự động tạo khi giao bài, học viên chưa gửi bài |
| `Submitted` | **Đã nộp bài** | `bg-blue-50 text-blue-800 border border-blue-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-blue-500` | Học sinh/Phụ huynh đã gửi link/ảnh bài làm, chờ giáo viên chấm |
| `Reviewed` | **Đã chấm điểm** | `bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-emerald-500` | Giáo viên đã nhận xét và ghi điểm thành công |

#### 2. Badges Trạng thái Hạn nộp Đề bài (`DueDate Status`):

| Phân loại hạn nộp | Nhãn hiển thị Tiếng Việt | Styling Badge | Icon chỉ thị |
| :--- | :--- | :--- | :---: |
| Còn trên 24 giờ | **Còn hạn** | `bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full` | ⏳ |
| Còn dưới 24 giờ | **Sắp hết hạn** | `bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse` | ⚠️ |
| Đã quá thời hạn | **Đã quá hạn** | `bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold px-2.5 py-0.5 rounded-full` | 🚨 |

---

### 10.8. TIÊU CHUẨN NGHIỆM THU CHO GIAI ĐOẠN 1E (ACCEPTANCE CHECKLIST)

Frontend Developer và QA đối chiếu nghiệm thu tính năng theo danh sách kiểm tra chi tiết sau:

- [ ] **Phân Quyền Vai Trò Nghiêm Ngặt (RBAC Matrix):**
  - [ ] Nút `+ Giao bài tập` chỉ hiển thị cho `SuperAdmin`, `BranchManager`, `Teacher`. Phụ huynh và học sinh hoàn toàn không thấy nút này.
  - [ ] Tài khoản `Teacher`: Dropdown chọn lớp chỉ hiển thị các lớp do mình giảng dạy; chỉ xem/chấm bài nộp của lớp mình.
  - [ ] Tài khoản `BranchManager`: Bị khóa cứng dữ liệu theo chi nhánh mình quản lý.
  - [ ] Tài khoản `Parent` / `Student`: Chỉ xem được đề bài và thông tin bài nộp của chính mình/con mình. Không thấy danh sách hay bài làm của học sinh khác.
- [ ] **Màn Hình Bài Tập Về Nhà (`/homeworks`):**
  - [ ] Thanh tìm kiếm và bộ lọc theo Lớp học, Buổi học, Tình trạng hạn nộp hoạt động chính xác.
  - [ ] Bảng danh sách hiển thị đầy đủ thông tin: Tiêu đề bài tập, Người tạo, Lớp & Buổi học, Hạn nộp kèm cảnh báo thời gian tương đối, File/Link đính kèm.
  - [ ] Cột tiến độ nộp & chấm hiển thị đúng tỷ lệ học viên (`x / y`) kèm thanh mini progress bar phân màu chuẩn xác.
  - [ ] Modal Giao bài tập: Khi tạo thành công, hệ thống tự động sinh bản ghi nộp bài `Pending` cho mọi học viên đang học trong lớp.
- [ ] **Chi Tiết Bài Tập & Giao Diện Chấm Bài (`/homeworks/:id`):**
  - [ ] Khung tóm tắt đề bài hiển thị rõ nội dung, link file tải về và thời gian đếm ngược hạn nộp.
  - [ ] Bộ lọc trạng thái bài nộp (`Tất cả`, `Chưa nộp`, `Đã nộp chờ chấm`, `Đã chấm`) phản hồi tức thì không reload trang.
  - [ ] Chấm bài Split-View: Chuyển đổi giữa các học sinh mượt mà; hiển thị thumbnail bài làm và link xem bài ngoài.
  - [ ] Form chấm bài: Cho phép nhập Điểm số (`Score`), Nhận xét (`TeacherFeedback`), bấm `Lưu` gọi API cập nhật trạng thái `Reviewed` thành công.
  - [ ] Phím tắt `Cmd/Ctrl + Enter` hỗ trợ "Lưu & Chuyển sang bé tiếp theo" vận hành chuẩn xác.
- [ ] **Tiến Độ Bài Học (`LessonProgress`) Trong Chi Tiết Lớp (`ClassList`):**
  - [ ] Dòng thời gian hiển thị danh sách các buổi học đã dạy theo thứ tự mới nhất lên đầu.
  - [ ] Nội dung chi tiết buổi dạy, người ghi nhận và thời gian cập nhật hiển thị rõ ràng.
  - [ ] Trạng thái rỗng (Empty state) hiển thị tinh tế, đẹp mắt khi lớp học chưa có buổi ghi nhận nào.
  - [ ] Modal Thêm/Sửa tiến độ: Chọn được ngày dạy, buổi học liên kết và nhập nội dung bài học thuận tiện.
- [ ] **Chuẩn Responsive Mobile (`375px – 414px`):**
  - [ ] Danh sách bài tập chuyển thành dạng thẻ có chiều cao phím bấm tối thiểu `44px` theo chuẩn Apple HIG.
  - [ ] Giao diện chấm bài trên mobile chuyển thành Bottom Sheet trượt từ đáy màn hình lên kèm thanh drag handle trực quan.

---

## 11. BỔ SUNG GIAI ĐOẠN 1F — QUẢN LÝ ĐƠN XIN NGHỈ PHÉP (`/leave-requests`)

> **Phân hệ nghiệp vụ:** Quản lý vắng học, vắng dạy, phê duyệt phép và đồng bộ trạng thái điểm danh học tập.  
> **Cơ sở dữ liệu:** Bảng `LeaveRequests`, Bảng `Attendances` (trạng thái `ExcusedAbsent`), Bảng `Schedules`, Bảng `Students`, Bảng `Classes`, Bảng `Users`.  
> **Áp dụng bắt buộc:** Skill **Apple Design** (*Designing Fluid Interfaces* — WWDC) & Skill **Emil Kowalski** (*Design Engineering / Polish UI*).

---

### 11.1. TỔNG QUAN PHÂN HỆ NGHỈ PHÉP & ĐÁNH GIÁ THIẾT KẾ KỸ THUẬT

Phân hệ Đơn xin nghỉ phép (`/leave-requests`) giải quyết bài toán giao tiếp hàng ngày giữa Phụ huynh, Học viên, Giáo viên và Ban điều hành 2 cơ sở Roxy Academy. Thiết kế giao diện hướng đến **Sự tiện lợi tối đa khi gửi đơn (Frictionless Requesting)**, **Minh bạch tiến trình duyệt (Clear Status Tracking)** và **Tự động hóa đồng bộ điểm danh (Auto Attendance Synchronization)**.

#### 1. Bảng Đánh giá & Chuẩn hóa Trải nghiệm Nghỉ phép (Emil Kowalski Polish Review Table):

| Trước khi chuẩn hóa (Before) | Sau khi áp dụng Skill (After) | Lý do kỹ thuật & Trải nghiệm người dùng (Why) |
| :--- | :--- | :--- |
| Form tạo đơn bắt mọi người dùng phải tự chọn role "Student" hay "Teacher" | **Tự động nhận diện vai trò (Role-Adaptive Form)**: Phụ huynh chỉ thấy danh sách con, Học viên/Giáo viên tự điền chính mình | Giảm 100% lỗi gửi nhầm đối tượng, loại bỏ bước thừa, phụ huynh không phải bối rối phân loại |
| Đơn duyệt xong giáo viên vẫn phải vào trang điểm danh tích tay "Nghỉ có phép" | **Tự động gắn cờ `ExcusedAbsent`** trên bảng điểm danh `/attendance` cho buổi học tương ứng khi đơn được `Approved` | Tự động hóa luồng nghiệp vụ sư phạm, ngăn chặn việc báo nhầm "Vắng không phép" gây lo lắng cho phụ huynh |
| Dropdown chọn trạng thái đơn trong form duyệt tốn nhiều nhịp click | **2 Phím Duyệt nhanh 1 chạm (`✓ Duyệt` / `✕ Từ chối`)** kèm ô nhập ghi chú tại chỗ | Tối ưu thao tác quản trị cho Giám đốc / Quản lý cơ sở; xử lý 1 đơn chỉ mất đúng 3 giây |
| Học viên và Giáo viên hiển thị chung màu sắc, khó phân biệt trên danh sách | **Hệ thống Badge phân loại độc lập**: 🎓 Học viên (Sky Blue) vs 👩‍🏫 Giáo viên (Indigo Purple) | Giúp ban quản lý quét nhanh danh sách bằng mắt; ưu tiên tìm người dạy thay nếu có giáo viên xin nghỉ |
| Bảng ép co cụm các cột ngày giờ trên điện thoại gây tràn khung nhìn | **Responsive Card Stack kết hợp Mobile Bottom Sheet** chuẩn Apple HIG với diện tích chạm `>= 44px` | Đảm bảo phụ huynh gửi đơn bằng 1 tay trên điện thoại thuận tiện tại sảnh chờ hoặc trên đường |
| Modal xuất hiện đột ngột hoặc bung to từ `scale(0)` | Modal xuất hiện từ `scale(0.96) + opacity: 0` chuyển sang `scale(1) + opacity: 1` (`180ms ease-out`) | Tuân thủ triết lý Emil Kowalski: vật thể không sinh ra từ hư vô; tạo cảm giác đầm chắc, tin cậy |

#### 2. Các Nguyên lý Apple Design Ứng Dụng Chuyên Biệt Cho Màn Hình Nghỉ Phép:

1. **Phản hồi tức thì trên Pointer-Down (Response - Kill Latency):** Nút gửi đơn, nút duyệt, nút từ chối phản hồi ngay lập tức (`active:scale-[0.98]` trong 100ms), không đợi nhả chuột mới đổi màu.
2. **Tiết chế chuyển động (Restraint & Purpose):** Không lạm dụng hiệu ứng nảy (bounce) trên giao diện quản trị công việc. Dùng Spring critically damped (`damping: 1.0, response: 0.35s`) tạo cảm giác êm ái, chuyên nghiệp.
3. **Neo điểm trung tâm cho Hộp thoại (Centered Modals):** Hộp thoại chi tiết và hộp thoại tạo đơn neo tại vị trí trung tâm màn hình (`transform-origin: center`), phủ nền mờ kính `bg-slate-900/40 backdrop-blur-[2px]`.
4. **Phân cấp quang học & Typography (Optical Hierarchy):** Mã đơn `#LR-{id}` và ngày xin nghỉ sử dụng phông chữ `font-mono tracking-tight tabular-nums font-semibold` để mắt quét ngày tháng không bị lệch nhịp. Tiêu đề lớn áp dụng tracking âm nhẹ (`-0.02em`).
5. **Hỗ trợ tùy chọn giảm chuyển động (Accessibility & Reduced Motion):** Khi phát hiện `@media (prefers-reduced-motion: reduce)`, toàn bộ chuyển động trượt và co giãn tự động chuyển về dạng crossfade mờ thuần túy `opacity: 150ms ease`.

---

### 11.2. MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC MATRIX) TRÊN MÀN HÌNH NGHỈ PHÉP

Hệ thống tuân thủ chặt chẽ các ràng buộc phân quyền tại `GEMINI.md` và mã nguồn backend `LeaveRequestsController.cs`:

| Vai trò người dùng | Quyền xem danh sách đơn (`GetLeaveRequests`) | Quyền gửi đơn mới (`CreateLeaveRequest`) | Quyền duyệt / từ chối đơn (`ReviewLeaveRequest`) | Phạm vi dữ liệu chi nhánh |
| :--- | :--- | :--- | :--- | :--- |
| **SuperAdmin** 👑 | Toàn bộ đơn xin nghỉ trong toàn hệ sinh thái | Gửi đơn cho bất kỳ Học viên hoặc Giáo viên nào | **Toàn quyền duyệt / từ chối** mọi đơn xin nghỉ | Không giới hạn cơ sở (có dropdown lọc chi nhánh) |
| **BranchManager** 🏢 | Xem toàn bộ đơn thuộc cơ sở mình quản lý | Gửi đơn cho Học viên / Giáo viên thuộc cơ sở mình | **Duyệt / từ chối** các đơn thuộc cơ sở mình quản lý | **Khóa cứng chi nhánh** quản lý (`BranchId == User.BranchId`) |
| **Teacher** 👩‍🏫 | Xem đơn của chính mình + đơn của học sinh trong các lớp mình dạy | Gửi đơn xin nghỉ dạy của **chính mình** | Xem xét đơn của học sinh lớp mình dạy (theo dõi thông tin) | Thuộc các lớp mình được phân công giảng dạy |
| **Parent** 👨‍👩‍👦 | Chỉ xem các đơn xin nghỉ của **con mình** | Gửi đơn xin nghỉ học cho **con mình** | 🚫 Không có quyền duyệt | Giới hạn theo hồ sơ học viên của con |
| **Student** 🎓 | Chỉ xem các đơn xin nghỉ của **chính mình** | Gửi đơn xin nghỉ học cho **chính mình** | 🚫 Không có quyền duyệt | Giới hạn theo hồ sơ học viên của bản thân |

---

### 11.3. THANH CÔNG CỤ & BỘ LỌC ĐA NĂNG (FILTER TOOLBAR)

Thanh công cụ đầu trang hỗ trợ tìm kiếm linh hoạt, kết hợp lọc đa tiêu chí giúp cán bộ quản trị và giáo viên nhanh chóng tra cứu đơn từ:

```
+---------------------------------------------------------------------------------------------------------------------------------------------------+
|  📋 QUẢN LÝ ĐƠN XIN NGHỈ PHÉP                                                                                               [ + Gửi đơn xin nghỉ ]|
|  Theo dõi, tiếp nhận và xét duyệt đơn xin nghỉ học của học viên và nghỉ dạy của giáo viên tại các chi nhánh.                                      |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [ 🔍 Tìm tên người xin, người gửi, lý do... ] [ Đối tượng: Tất cả ▼ ] [ Học viên: Tất cả ▼ ] [ Lớp: Tất cả ▼ ] [ Cơ sở: Cơ sở 1 🔒 ]             |
| [ Trạng thái: Tất cả (24) | ⏳ Chờ duyệt (5) | ✓ Đã duyệt (16) | ✕ Từ chối (3) ]   [ Khoảng ngày: Từ 10/11/2026 📅  đến  20/11/2026 📅 ]          |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
```

#### Chi tiết các thành phần bộ lọc:

1. **Ô Tìm kiếm thông minh (`Search Input`):**
   - Lớp CSS: `h-10 pl-10 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 w-full sm:w-72 transition-all duration-150`.
   - Tìm kiếm đồng thời: Họ tên học viên, Họ tên giáo viên, Tên phụ huynh gửi đơn, Nội dung lý do xin nghỉ. Độ trễ debounce: `300ms`.
2. **Bộ lọc Phân loại đối tượng (`RequesterType`):**
   - Dropdown gồm: `Tất cả đối tượng`, `🎓 Học viên xin nghỉ` (`RequesterType = 'Student'`), `👩‍🏫 Giáo viên xin nghỉ` (`RequesterType = 'Teacher'`).
3. **Bộ lọc Học viên (`StudentId`):**
   - Dropdown chọn học viên cụ thể (chỉ kích hoạt khi chọn xem đối tượng Học viên, tự động lọc theo chi nhánh/lớp học).
4. **Bộ lọc Lớp học (`ClassId`):**
   - Danh sách các lớp học đang hoạt động tại cơ sở.
5. **Bộ lọc Chi nhánh (`BranchId`):**
   - **Đối với `SuperAdmin`:** Dropdown tự do: `Tất cả cơ sở`, `Cơ sở 1 - Bình Trưng`, `Cơ sở 2 - Nguyễn Duy Trinh`.
   - **Đối với `BranchManager`:** Khóa cố định (`disabled`), hiển thị icon ổ khóa `🔒` kèm tên cơ sở quản lý.
   - **Đối với `Teacher`:** Hiển thị cơ sở thuộc các lớp đang giảng dạy.
6. **Thanh lọc Trạng thái nhanh (Segmented Status Pills):**
   - Bộ nút viên thuốc chuyển đổi tức thì:
     * `Tất cả` (All)
     * `⏳ Chờ duyệt` (`Pending` - Nền vàng cam hổ phách, có dot nhấp nháy chỉ thị đơn mới cần xử lý)
     * `✓ Đã duyệt` (`Approved` - Nền xanh lá)
     * `✕ Từ chối` (`Rejected` - Nền đỏ hồng)
   - Mỗi pill có huy hiệu số lượng đính kèm cập nhật real-time theo kết quả lọc.
7. **Bộ lọc Khoảng ngày (`fromDate` – `toDate` / `LeaveDate`):**
   - Cặp ô chọn ngày (`type="date"`) giúp lọc các đơn có ngày nghỉ nằm trong khoảng thời gian mong muốn (VD: tuần này, tháng này).
8. **Nút Primary Action `+ Gửi đơn xin nghỉ`:**
   - **Phân quyền hiển thị:** Hiển thị cho **CẢ 5 VAI TRÒ** (`Parent`, `Student`, `Teacher`, `SuperAdmin`, `BranchManager`).
   - Lớp CSS: `inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all duration-150`.
   - Nhấn vào mở **Modal Tạo đơn xin nghỉ mới** với form tự động nhận diện vai trò.

---

### 11.4. BẢNG DANH SÁCH ĐƠN XIN NGHỈ (DESKTOP DATA GRID)

Bảng dữ liệu trên Desktop được bao bọc trong container `w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs`, cho phép cuộn ngang `overflow-x-auto` mượt mà khi màn hình hẹp:

```
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| NGƯỜI XIN NGHỈ & VAI TRÒ   | LỚP & BUỔI HỌC / NGÀY NGHỈ        | LÝ DO XIN NGHỈ             | TRẠNG THÁI     | NGƯỜI DUYỆT & GHI CHÚ   | THAO TÁC     |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Trần Bảo Ngọc     | Tiền TH Họa Mi 1 (Phòng 102)      | "Bé bị sốt siêu vi từ tối  | [ ⏳ Chờ duyệt ]| —                       | [✓ Duyệt]    |
| [🎓 Học viên] #STU-102     | Buổi 4: Thứ Sáu, 14/11/2026       | qua, bác sĩ dặn nghỉ ngơi  | (Đơn mới gửi)  | (Đang chờ ban quản lý   | [✕ Từ chối]  |
| Gửi bởi: Mẹ Lan (0912...)  | (08:00 - 09:30)                   | 2 ngày để theo dõi ạ."     |                | xét duyệt)              | [👁 Chi tiết]|
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Nguyễn Minh Khang | Luyện chữ đẹp K12 (Phòng 105)     | "Gia đình có việc hiếu ở   | [ ✓ Đã duyệt ] | Duyệt bởi: QL.Thảo      | [👁 Chi tiết]|
| [🎓 Học viên] #STU-105     | Buổi 8: Thứ Tư, 12/11/2026        | quê, xin phép cô cho bé    | (Đã điểm danh  | Lúc: 11/11 15:30        |              |
| Gửi bởi: Bố Hùng (0903...) | (17:30 - 19:00)                   | nghỉ buổi học Thứ Tư."     | ExcusedAbsent) | Note: Đã dặn bài về nhà |              |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Cô Mai Anh        | Lớp Tiền TH Họa Mi 1              | "Tôi đi tập huấn chuyên môn| [ ✓ Đã duyệt ] | Duyệt bởi: SuperAdmin   | [👁 Chi tiết]|
| [👩‍🏫 Giáo viên]           | Thứ Hai, 17/11/2026               | giáo dục mầm non Sở GD&ĐT  | (Đã phân công  | Lúc: 13/11 09:00        |              |
| Gửi bởi: Chính giáo viên   | Cả ngày (2 ca dạy)                | cả ngày Thứ Hai."          | Thầy Tuấn dạy) | Note: Đã bố trí GV thay |              |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
| [Avatar] Lê Tuấn Kiệt      | Toán Tư Duy A (Phòng 201)         | "Bé đi du lịch cùng ba mẹ  | [ ✕ Từ chối ]  | Từ chối: QL.Bình        | [👁 Chi tiết]|
| [🎓 Học viên] #STU-110     | Buổi 6: Thứ Bảy, 08/11/2026       | cuối tuần."                |                | Lúc: 07/11 16:00        |              |
| Gửi bởi: Mẹ Thảo (0988...) | (08:30 - 10:00)                   |                            |                | Note: Trùng lịch thi... |              |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
```

#### Quy cách hiển thị từng cột:

1. **Cột 1: Người xin nghỉ & Vai trò:**
   - **Đối với Học viên:**
     * Avatar tròn chữ cái tắt nền xanh dương nhạt `bg-sky-100 text-sky-700 font-bold text-xs`.
     * Họ tên in đậm `text-slate-900 font-semibold text-sm`.
     * Badge định danh vai trò: `bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1`.
     * Mã hồ sơ `#STU-{id}`.
     * Dòng phụ: Tên người tạo đơn (`RequestedByName`) kèm số điện thoại liên hệ (VD: `Gửi bởi: Mẹ Lan - 0912...`).
   - **Đối với Giáo viên:**
     * Avatar tròn chữ cái tắt nền chàm tím `bg-indigo-100 text-indigo-700 font-bold text-xs`.
     * Họ tên giáo viên in đậm `text-slate-900 font-semibold text-sm`.
     * Badge định danh vai trò: `bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1`.
     * Dòng phụ: `Đơn xin nghỉ dạy do chính giáo viên gửi`.
2. **Cột 2: Lớp & Buổi học / Ngày nghỉ:**
   - Tên lớp học: `text-slate-900 font-medium text-sm`.
   - Nếu có buổi học cụ thể (`ScheduleId`): Hiển thị số thứ tự buổi, thời gian học (`08:00 - 09:30`), phòng học (`Phòng 102`).
   - Ngày xin nghỉ (`LeaveDate`): Định dạng nổi bật `Thứ X, DD/MM/YYYY` màu `text-blue-700 font-semibold`.
   - Nếu không gắn buổi cụ thể: Hiển thị badge xám `Nghỉ cả ngày`.
3. **Cột 3: Lý do xin nghỉ:**
   - Nội dung lý do do người gửi điền: `text-slate-700 text-sm italic`.
   - Giới hạn hiển thị 2 dòng kèm `line-clamp-2`, click chuột hoặc hover hiển thị tooltip xem đầy đủ văn bản.
4. **Cột 4: Trạng thái đơn (`Status`):**
   - **`Pending` (Chờ duyệt):** Badge vàng hổ phách `bg-amber-50 border-amber-300 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5` kèm chấm tròn màu hổ phách có animation `animate-pulse`.
   - **`Approved` (Đã duyệt):** Badge xanh lá `bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5` kèm chấm xanh lá `bg-emerald-500`. Dòng phụ nhỏ bên dưới: `✓ Đã đồng bộ điểm danh`.
   - **`Rejected` (Từ chối):** Badge đỏ hồng `bg-rose-50 border-rose-300 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1.5` kèm chấm đỏ `bg-rose-500`.
5. **Cột 5: Người duyệt & Ghi chú duyệt:**
   - Khi đã duyệt hoặc từ chối: Hiển thị tên cán bộ duyệt (`ReviewedByName`), thời gian duyệt (`ReviewedAt` định dạng `DD/MM HH:mm`), kèm trích đoạn ghi chú phản hồi (`ReviewNote`).
   - Khi đang chờ duyệt: Hiển thị text mờ `— (Đang chờ xét duyệt)`.
6. **Cột 6: Thao tác hành động (Actions):**
   - **Nút Xem chi tiết (`View Detail`):** Icon mắt `👁️` hoặc nhãn `Chi tiết`, mở Modal Xem chi tiết đơn xin nghỉ.
   - **Nhóm Nút Duyệt nhanh (Quick Approval Buttons):**
     * **Điều kiện hiển thị:** CHỈ hiển thị khi người dùng là `SuperAdmin` hoặc `BranchManager` VÀ đơn đang ở trạng thái `Pending`. (Ẩn hoàn toàn với `Parent`, `Student`).
     * **Nút `✓ Duyệt`:** `inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-2xs active:scale-95 transition-all duration-100`. Bấm sẽ mở popover xác nhận hoặc duyệt nhanh với ghi chú mặc định `"Đồng ý phê duyệt"`.
     * **Nút `✕ Từ chối`:** `inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-md active:scale-95 transition-all duration-100`. Bấm mở popup yêu cầu nhập lý do từ chối.

---

### 11.5. MODAL TẠO ĐƠN XIN NGHỈ MỚI (`CreateLeaveRequestModal`)

Modal được thiết kế với khả năng **Tự thích ứng thông minh theo vai trò của tài khoản đang đăng nhập (Role-Adaptive Form)**, giúp loại bỏ các bước thừa và ngăn chặn lỗi gửi sai dữ liệu:

```
+---------------------------------------------------------------------------------------------------+
|  TẠO ĐƠN XIN NGHỈ PHÉP MỚI                                                                   [ ✕ ]|
|  Gửi đơn xin nghỉ học hoặc nghỉ dạy đến Ban quản trị trung tâm Roxy Academy.                       |
+---------------------------------------------------------------------------------------------------+
|  <!-- TRƯỜNG HỢP 1: TÀI KHOẢN PHỤ HUYNH (PARENT) -->                                              |
|  Chọn học viên xin nghỉ: (*)                                                                      |
|  [ 🎓 Trần Bảo Ngọc (#STU-102) - Lớp Tiền TH Họa Mi 1                                       ▼ ]  |
|  (Hệ thống tự động hiển thị danh sách các con của bạn đã đăng ký học tại trung tâm)               |
|                                                                                                   |
|  <!-- TRƯỜNG HỢP 2: TÀI KHOẢN HỌC VIÊN (STUDENT) -->                                              |
|  Học viên xin nghỉ: (*)                                                                           |
|  [ 🎓 Nguyễn Tuấn Kiệt (#STU-110)                                                           🔒 ]  |
|  (Tự động điền tài khoản học viên của bạn)                                                        |
|                                                                                                   |
|  <!-- TRƯỜNG HỢP 3: TÀI KHOẢN GIÁO VIÊN (TEACHER) -->                                             |
|  Giáo viên xin nghỉ dạy: (*)                                                                      |
|  [ 👩‍🏫 Cô Nguyễn Mai Anh - Cơ sở 1                                                           🔒 ]  |
|  (Tự động tạo đơn xin nghỉ dạy của chính bạn)                                                     |
|                                                                                                   |
|  <!-- TRƯỜNG HỢP 4: TÀI KHOẢN SUPERADMIN / BRANCHMANAGER -->                                      |
|  Loại đối tượng xin nghỉ: (*)                                                                     |
|  (●) 🎓 Học viên xin nghỉ học          ( ) 👩‍🏫 Giáo viên xin nghỉ dạy                             |
|  Chọn người xin nghỉ: (*)                                                                         |
|  [ 🔍 Tìm tên học viên hoặc mã STU...                                                       ▼ ]  |
|                                                                                                   |
|  -----------------------------------------------------------------------------------------------  |
|  Lớp học liên quan: (Tùy chọn)                                                                    |
|  [ Lớp Tiền TH Họa Mi 1 (Cơ sở 1 - Phòng 102)                                               ▼ ]  |
|  ℹ️ Chọn lớp học để hệ thống hỗ trợ lọc buổi học cụ thể và đồng bộ bảng điểm danh.                 |
|                                                                                                   |
|  Ngày xin nghỉ: (*)                                                                               |
|  [ 14/11/2026                                                                               📅 ]  |
|                                                                                                   |
|  Buổi học xin nghỉ cụ thể: (Khuyên dùng)                                                          |
|  [ Buổi 4: Thứ Sáu, 14/11/2026 (08:00 - 09:30) • Phòng 102 • Cô Mai Anh                      ▼ ]  |
|  (Hoặc tích chọn: [ ] Xin nghỉ cả ngày / không theo buổi cụ thể)                                  |
|                                                                                                   |
|  Lý do xin nghỉ phép: (*) (Tối đa 500 ký tự)                                                      |
|  +---------------------------------------------------------------------------------------------+  |
|  | Bé bị sốt siêu vi từ tối qua, bác sĩ chỉ định nghỉ ngơi theo dõi 2 ngày tại nhà...          |  |
|  |                                                                                             |  |
|  +---------------------------------------------------------------------------------------------+  |
|  Gợi ý lý do nhanh:                                                                               |
|  [⚡ Bị ốm / Khám bệnh]  [⚡ Việc gia đình]  [⚡ Trùng lịch thi ở trường]  [⚡ Đi công tác / du lịch] |
+---------------------------------------------------------------------------------------------------+
|  [ Hủy bỏ ]                                                                 [ 📤 Gửi đơn xin nghỉ ]|
+---------------------------------------------------------------------------------------------------+
```

#### Ràng buộc & Logic nghiệp vụ trên Form:

1. **Khớp nối DTO & Schema CSDL:**
   - Form gửi payload chuẩn `CreateLeaveRequest` lên endpoint `POST /api/LeaveRequests`:
     * `RequesterType`: `"Student"` hoặc `"Teacher"`.
     * `StudentId`: `int` (khi RequesterType là Student, TeacherId phải là null để thỏa mãn ràng buộc `CK_Leave_OneRequester`).
     * `TeacherId`: `int` (khi RequesterType là Teacher, StudentId phải là null).
     * `ClassId`: `int?` (lớp học liên quan).
     * `ScheduleId`: `int?` (buổi học cụ thể, chỉ hợp lệ khi `ClassId` có giá trị theo ràng buộc `CK_Leave_ScheduleNeedsClass`).
     * `LeaveDate`: `DateOnly` định dạng `YYYY-MM-DD`.
     * `Reason`: `string` (tối đa 500 ký tự).
2. **Bộ nút 1 chạm gợi ý lý do nhanh (Quick Reason Pills):**
   - Click vào một gợi ý (như `⚡ Bị ốm / Khám bệnh`) sẽ tự động chèn câu mẫu lịch sự vào ô văn bản:
     * `Bị ốm`: *"Bé có triệu chứng ốm sốt, gia đình xin phép cho bé nghỉ để đi khám và điều trị."*
     * `Việc gia đình`: *"Gia đình có việc bận đột xuất nên xin phép cho bé tạm nghỉ buổi học này."*
     * `Trùng lịch thi`: *"Học viên trùng lịch thi học kỳ tại trường phổ thông, xin phép nghỉ buổi học."*
     * `Đi công tác`: *"Giáo viên có lịch công tác / tập huấn chuyên môn đột xuất của cơ quan."*
3. **Phản hồi khi Submit Form:**
   - Nút `Gửi đơn xin nghỉ` chuyển sang loading spinner, khóa nút chống nhấp đúp (`disabled pointer-events-none`).
   - Gửi thành công: Hiện Toast thông báo xanh `"Gửi đơn xin nghỉ thành công! Ban quản lý sẽ sớm phản hồi."` và đóng modal trong 180ms.

---

### 11.6. MODAL XEM CHI TIẾT & DUYỆT / TỪ CHỐI ĐƠN (`LeaveRequestDetailModal`)

Modal này hiển thị toàn diện thông tin đơn, lịch sử phê duyệt và cung cấp công cụ thẩm định trực tiếp cho Ban giám đốc (`SuperAdmin`) và Quản lý cơ sở (`BranchManager`):

```
+---------------------------------------------------------------------------------------------------+
|  CHI TIẾT ĐƠN XIN NGHỈ PHÉP #LR-108                                                          [ ✕ ]|
|  Ngày gửi: 13/11/2026, 20:15 • Mã đơn: #LR-108                                                    |
+---------------------------------------------------------------------------------------------------+
|  THÔNG TIN NGƯỜI XIN NGHỈ                                                                         |
|  • Đối tượng:         [🎓 Học viên] Trần Bảo Ngọc (#STU-102) • 6 tuổi                             |
|  • Người gửi đơn:     Lê Thị Lan (Phụ huynh bảo hộ - SĐT: 0912 345 678) [📞 Gọi điện]             |
|  • Chi nhánh cơ sở:   Cơ sở 1 - Bình Trưng Đông                                                   |
|  • Lớp học liên quan: Tiền TH Họa Mi 1 (Phòng 102)                                                |
|  • Buổi học xin nghỉ: Buổi 4: Thứ Sáu, 14/11/2026 (08:00 - 09:30)                                 |
|  • Giáo viên lớp:     Cô Nguyễn Mai Anh (0908 123 456)                                            |
|                                                                                                   |
|  LÝ DO XIN NGHỈ TỪ PHỤ HUYNH:                                                                     |
|  +---------------------------------------------------------------------------------------------+  |
|  | "Dạ thưa cô và trung tâm, bé Bảo Ngọc tối qua bị sốt cao 39 độ, bác sĩ chẩn đoán sốt siêu   |  |
|  |  vi cần theo dõi tại nhà 2 ngày. Mẹ xin phép cho bé nghỉ buổi học sáng Thứ Sáu này ạ.         |  |
|  |  Nhờ cô gửi giúp bài tập về nhà để bé khỏi quên bài. Mẹ cảm ơn cô và trung tâm nhiều!"       |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  ⚡ CƠ CHẾ ĐỒNG BỘ ĐIỂM DANH TỰ ĐỘNG (AUTO EXCUSED-ABSENT NOTICE):                                |
|  +---------------------------------------------------------------------------------------------+  |
|  | ℹ️ LƯU Ý NGHIỆP VỤ SƯ PHẠM:                                                                 |  |
|  | Khi đơn xin nghỉ này được "DUYỆT" (Approved), hệ thống sẽ TỰ ĐỘNG đánh dấu học viên          |  |
|  | Trần Bảo Ngọc ở trạng thái "Nghỉ có phép" (ExcusedAbsent) trên bảng điểm danh Buổi 4          |  |
|  | ngày 14/11/2026. Giáo viên phụ trách không cần thao tác thủ công lại trên trang /attendance.  |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  <!-- KHU VỰC PHÊ DUYỆT (CHỈ DÀNH CHO SUPERADMIN & BRANCHMANAGER KHI STATUS == 'PENDING') -->    |
|  XÉT DUYỆT ĐƠN XIN NGHỈ: (*)                                                                      |
|  Ghi chú / Lời nhắn phản hồi phụ huynh: (Tùy chọn)                                                |
|  +---------------------------------------------------------------------------------------------+  |
|  | Chúc bé Ngọc mau khỏe nhé mẹ! Cô Mai Anh sẽ chuẩn bị phiếu bài tập gửi mẹ kèm bé sau ạ.     |  |
|  +---------------------------------------------------------------------------------------------+  |
|  [⚡ Gợi ý phản hồi: "Đã duyệt, chúc bé mau khỏe"]  [⚡ Gợi ý: "Đã duyệt, cô sẽ gửi bài tập"]   |
+---------------------------------------------------------------------------------------------------+
|  [ Đóng ]                                    [ ✕ Từ chối đơn ]               [ ✓ Phê duyệt đơn ]  |
+---------------------------------------------------------------------------------------------------+
```

#### Chi tiết tính năng phê duyệt & Đồng bộ điểm danh:

1. **Khối Thông Báo Cơ Chế Tự Động Điểm Danh (Auto ExcusedAbsent Synchronization):**
   - Đóng khung màu xanh dương nhạt sư phạm: `bg-blue-50/70 border-2 border-blue-200 rounded-xl p-3.5 text-blue-900 text-xs leading-relaxed`.
   - Nêu rõ nguyên lý: Việc duyệt đơn (`Approved`) sẽ tự động liên kết với bản ghi `Attendances` tương ứng trong CSDL với trạng thái `Status = 'ExcusedAbsent'`. Điều này đảm bảo tính toàn vẹn dữ liệu giữa đơn xin nghỉ và sổ điểm danh, đồng thời giúp phụ huynh kiểm tra học bạ thấy rõ ngày nghỉ là có phép, không bị tính vắng vô cớ.
2. **Xử lý Nút `✓ Phê duyệt đơn`:**
   - Styling: `px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150`.
   - Khi bấm: Gửi request `PUT /api/LeaveRequests/{id}/review` với payload `{ status: "Approved", reviewNote: "..." }`.
   - Backend cập nhật `Status = "Approved"`, ghi nhận `ReviewedBy = UserId` và `ReviewedAt = UtcNow`.
3. **Xử lý Nút `✕ Từ chối đơn`:**
   - Styling: `px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-sm rounded-lg active:scale-[0.98] transition-all duration-150`.
   - Yêu cầu bắt buộc phải có `ReviewNote` (Lý do từ chối, ví dụ: *"Trùng lịch thi kết thúc học phần bắt buộc, phụ huynh vui lòng liên hệ văn phòng"*). Nếu để trống, ô textarea báo viền đỏ và con trỏ focus vào ngay lập tức.
   - Gửi request `PUT /api/LeaveRequests/{id}/review` với payload `{ status: "Rejected", reviewNote: "..." }`.
4. **Giao diện khi đơn đã có kết quả (Read-only banner):**
   - Khi đơn đã là `Approved` hoặc `Rejected`, khu vực xét duyệt biến mất, thay bằng **Huy hiệu kết quả phê duyệt trang trọng**:
     * Banner xanh lá cho đơn `Approved`: `bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-sm`. Hiển thị: *"Đơn đã được phê duyệt bởi [Tên người duyệt] vào lúc [Ngày giờ]. Ghi chú: [...]"*.
     * Banner đỏ cho đơn `Rejected`: `bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 text-sm`. Hiển thị: *"Đơn đã bị từ chối bởi [Tên người duyệt] vào lúc [Ngày giờ]. Lý do từ chối: [...]"*.

---

### 11.7. THIẾT KẾ RESPONSIVE TRÊN MOBILE (`375px – 414px`)

Trên màn hình điện thoại di động (khi phụ huynh mở Zalo/Web gửi đơn hoặc cán bộ quản lý đi lại giữa 2 cơ sở duyệt đơn bằng smartphone):

#### 1. Bảng danh sách chuyển thành Dạng Thẻ Nghỉ Phép (Leave Request Card Stack):

```
+-------------------------------------------------------+
|  🎓 Trần Bảo Ngọc (#STU-102)           [ ⏳ Chờ duyệt]|
|  Tiền TH Họa Mi 1 • Cơ sở 1                           |
|  +-------------------------------------------------+  |
|  | 📅 Nghỉ ngày: Thứ Sáu, 14/11/2026 (08:00-09:30)  |  |
|  | 💬 Lý do: "Bé bị sốt siêu vi từ tối qua..."     |  |
|  | 👤 Gửi bởi: Mẹ Lan (0912 345 678)              |  |
|  +-------------------------------------------------+  |
|  [ 👁 Xem chi tiết (44px) ]    [ ✓ Duyệt ] [ ✕ Hủy ]  |
+-------------------------------------------------------+
```

- **Quy chuẩn Apple HIG:**
  - Khoảng cách giữa các thẻ: `gap-3.5`.
  - Chiều cao các nút thao tác đạt chuẩn `min-h-[44px]` để ngón tay cái bấm chính xác 100%, không bị chạm nhầm nút hủy hoặc duyệt.

#### 2. Trải nghiệm Bottom Sheet Chi Tiết Trên Mobile:
- Nhấn vào một thẻ sẽ mở **Bottom Sheet trượt từ đáy màn hình lên** (`fixed inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white shadow-2xl overflow-y-auto`):
  - Thanh gạt vuốt xuống (Drag Handle): `w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5`.
  - Phụ huynh có thể vuốt kéo xuống để đóng sheet (Velocity dismiss gesture).
  - Thanh nút bấm Xét duyệt / Đóng cố định ở đáy màn hình với khoảng đệm an toàn `pb-[env(safe-area-inset-bottom,16px)]`.

---

### 11.8. BẢNG MÃ TOKENS & BADGES BỔ SUNG CHO GIAI ĐOẠN 1F

#### 1. Badges Trạng thái Đơn xin nghỉ (Khớp 100% CSDL `LeaveRequests.Status`):

| Giá trị CSDL | Nhãn Tiếng Việt trên UI | Styling Badge (Tailwind CSS 4) | Dot chỉ thị | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :---: | :--- |
| `Pending` | **Chờ duyệt** | `bg-amber-50 text-amber-800 border border-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-amber-500 animate-pulse` | Đơn mới tạo, đang chờ Quản lý chi nhánh hoặc SuperAdmin xét duyệt |
| `Approved` | **Đã duyệt** | `bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-emerald-500` | Đơn đã được chấp thuận; tự động đồng bộ sang trạng thái `ExcusedAbsent` |
| `Rejected` | **Từ chối** | `bg-rose-50 text-rose-800 border border-rose-300 font-semibold px-2.5 py-0.5 rounded-full text-xs` | `bg-rose-500` | Đơn bị từ chối; kèm theo ghi chú giải thích lý do cụ thể |
| `Cancelled` | **Đã hủy** | `bg-slate-100 text-slate-500 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-xs line-through` | `bg-slate-400` | Người gửi chủ động hủy đơn trước khi ban quản lý xét duyệt |

#### 2. Badges Phân loại Người xin nghỉ (`RequesterType`):

| Giá trị CSDL | Nhãn hiển thị Tiếng Việt | Styling Badge | Icon định danh |
| :--- | :--- | :--- | :---: |
| `Student` | **Học viên** | `bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full` | 🎓 |
| `Teacher` | **Giáo viên** | `bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded-full` | 👩‍🏫 |

---

### 11.9. TIÊU CHUẨN NGHIỆM THU CHO GIAI ĐOẠN 1F (ACCEPTANCE CHECKLIST)

Frontend Developer và QA đối chiếu nghiệm thu tính năng theo danh sách kiểm tra chi tiết sau:

- [ ] **Phân Quyền Vai Trò Nghiêm Ngặt (RBAC Matrix):**
  - [ ] Nút `+ Gửi đơn xin nghỉ` hiển thị cho cả 5 vai trò (`Parent`, `Student`, `Teacher`, `SuperAdmin`, `BranchManager`).
  - [ ] Phụ huynh (`Parent`): Form chỉ cho phép chọn con của mình; danh sách đơn chỉ hiển thị các đơn của con mình.
  - [ ] Học viên (`Student`): Tự động điền thông tin chính mình, không sửa đổi sang học viên khác.
  - [ ] Giáo viên (`Teacher`): Tự động điền chính mình khi xin nghỉ dạy; xem được đơn của học sinh trong các lớp mình dạy.
  - [ ] Quản lý cơ sở (`BranchManager`): Bị khóa cứng cơ sở của mình (`BranchId == User.BranchId`); chỉ xem và duyệt đơn thuộc cơ sở mình.
  - [ ] Cán bộ quản trị (`SuperAdmin`): Toàn quyền xem, gửi đơn và duyệt đơn cho mọi cơ sở.
- [ ] **Thanh Công Cụ & Bộ Lọc Đa Năng (`/leave-requests`):**
  - [ ] Tìm kiếm tức thì theo tên người xin nghỉ, người gửi, lý do với độ trễ debounce `300ms`.
  - [ ] Bộ lọc trạng thái (`Tất cả`, `Chờ duyệt`, `Đã duyệt`, `Từ chối`) phản hồi mượt mà không reload trang.
  - [ ] Bộ lọc khoảng ngày (`fromDate` – `toDate`) lọc đúng theo ngày xin nghỉ (`LeaveDate`).
- [ ] **Bảng Danh Sách Đơn Xin Nghỉ:**
  - [ ] Cột người xin nghỉ phân biệt rõ ràng bằng Badge và Icon (🎓 Học viên màu xanh dương vs 👩‍🏫 Giáo viên màu chàm tím).
  - [ ] Hiển thị đầy đủ thông tin: Lớp học, Buổi học, Ngày nghỉ, Lý do vắng, Trạng thái đơn, Người duyệt kèm ngày giờ và ghi chú.
  - [ ] Đơn ở trạng thái `Pending`: Hiển thị 2 nút duyệt nhanh `✓ Duyệt` và `✕ Từ chối` cho `SuperAdmin` và `BranchManager`.
- [ ] **Modal Tạo Đơn Xin Nghỉ Mới:**
  - [ ] Giao diện tự động điều chỉnh theo vai trò (Role-Adaptive Form) chuẩn xác.
  - [ ] Tự động tải danh sách lớp học và buổi học theo ngày xin nghỉ đã chọn.
  - [ ] Cung cấp các nút 1 chạm gợi ý lý do phổ biến (Bị ốm, Việc gia đình, Lịch thi, Công tác).
  - [ ] Gửi payload đúng quy cách backend: `RequesterType`, `StudentId` hoặc `TeacherId`, `ClassId`, `ScheduleId`, `LeaveDate`, `Reason`.
- [ ] **Modal Xem Chi Tiết & Duyệt / Từ Chối Đơn:**
  - [ ] Hiển thị đầy đủ thông tin đơn, liên hệ người gửi và nội dung lý do chi tiết.
  - [ ] Hiển thị khối thông báo nghiệp vụ: Khi duyệt thành công (`Approved`), hệ thống tự động ghi nhận học viên là `Nghỉ có phép (ExcusedAbsent)` trên bảng điểm danh `/attendance`.
  - [ ] Thao tác duyệt: Bấm `✓ Duyệt` gửi trạng thái `Approved`; Bấm `✕ Từ chối` bắt buộc nhập lý do từ chối gửi `Rejected`.
- [ ] **Chuẩn Responsive Mobile (`375px – 414px`):**
  - [ ] Bảng máy tính chuyển thành Danh sách Thẻ xếp dọc dễ nhìn.
  - [ ] Chiều cao các nút thao tác đạt chuẩn Apple HIG tối thiểu `44px`.
  - [ ] Chi tiết đơn trên di động mở dạng Bottom Sheet vuốt kéo mượt mà có thanh drag handle.


