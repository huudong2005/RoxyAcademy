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
