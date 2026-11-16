# PROJECT.md — Roxy Academy

## 1. Dự án
- Tên: Roxy Academy — Hệ thống quản lý học tập
- Khách: Trung tâm Roxy Academy, https://roxy.edu.vn/ (WordPress, đang chạy — KHÔNG động vào)
- Repo: https://github.com/huudong2005/RoxyAcademy
- Trạng thái: đang làm dở, backend lõi đã có, admin web mới có 3 trang, chưa có Zalo Mini App.
- Thứ tự: web admin trước → Zalo Mini App sau.

## 2. Stack đã chốt
- Backend: ASP.NET Core 9.0 + MSSQL (EF Core), JWT 480 phút
- DB: MSSQL, schema `RoxyAppDB.sql` v1, 18 bảng, không có EF migration
- Admin web: React 19 + Vite + Tailwind CSS 4, React Router 7, axios
- Zalo Mini App (sau): gọi cùng API, đăng nhập bằng Zalo (`ZaloId`)
- Roles: SuperAdmin, BranchManager, Teacher, Parent, Student
- Chi nhánh: 2 cơ sở, P. Bình Trưng, TP.HCM

## 3. Hosting — anh Bảo trả lời 13/11/2026 (11:17–11:36)
- [x] Runtime + phiên bản: **CÓ .NET 9** — server đã tích hợp đủ phiên bản: ASP.NET Core Module V2 110.0.26302.0, .NET Core 10.0 Runtime 10.0.15, 8.0 Runtime 8.0.34, **9.0 Runtime 9.0.23**. (Lúc đầu anh Bảo tưởng chỉ có ASP.NET 4.8.0, kiểm tra lại mới thấy đủ.)
- [ ] Database MSSQL: anh Bảo trả lời 13/11/2026 13:12 — 'được luôn em, hoặc em có thể kết nối từ xa rồi từ run file .sql đó luôn' (import được, hoặc kết nối remote rồi chạy file .sql). Connection string / tên DB / tài khoản DB: `[CHƯA CÓ]`. Cần hỏi lại khi lấy thông tin host.
- [ ] Cách deploy + đặt biến môi trường: Đông đã hỏi 13/11/2026 11:50, đang đợi anh Bảo trả lời
- [ ] Subdomain + SSL + DNS: Đông đã nhờ tạo `api.roxy.edu.vn` + `admin.roxy.edu.vn` 13/11/2026 11:50, đang đợi anh Bảo trả lời; SSL/DNS chưa hỏi riêng
- Host: Đông nhận host test 13/11/2026 11:50, nhưng 14:05 nhắn gộp xin 1 host cho Roxy Academy (ASP.NET Core 9 + MSSQL, 2 subdomain, DB RoxyAcademy + connection string); 14:12 Đông quyết: TẠO HOST CHÍNH LUÔN cũng được, không cần tách host test riêng — deploy thẳng lên host chính, test kỹ ở local trước khi deploy.
- Ghi đáp án vào đây ngay khi anh Bảo trả lời. Không deploy production khi chưa đủ 4 mục.

## 4. Hiện trạng code (xác minh từ repo, commit 7cc7453, 13/11/2026)
- Backend: 19 controller — Auth, Users, Students, Branches, Courses, Classes, StudentClasses, Schedules, Attendances, Grades, Homeworks, HomeworkSubmissions, LessonProgresses, Tuitions, Payments, LeaveRequests, Messages, Newsfeeds, Notifications. Phân quyền theo chi nhánh đã làm ở StudentsController, cần kiểm tra lại các controller còn lại.
- Admin web: chỉ có Login, Dashboard (20 dòng, gần như trống), ClassList (212 dòng). Chưa có: Students, Tuitions/Payments, Schedules/Attendance, Homework, Leave, Messages, Newsfeed.
- Zalo Mini App: chưa có thư mục nào trong repo.
- File chức năng: `ChucNang-Roxy-App_Full.docx` ở gốc repo.
- Lưu ý: repo từng lộ secret trong `key.txt` ở commit 85854b1 (đã gỡ khỏi HEAD ở 7cc7453, nhưng vẫn còn trong lịch sử — cần xoay key/mật khẩu khi rảnh). Không commit lại `key.txt`, `program.txt`.

## 5. Liên hệ / tài khoản
- Hotline trung tâm: 0326 538 824
- Hosting: anh Bảo (Nguyên Bảo)
- Đăng nhập seed: SuperAdmin, SĐT 0900000000 (mật khẩu chỉ để trong biến môi trường, không ghi vào đây)

## 6. Việc chưa xác minh — [CẦN XÁC MINH]
- [ ] Anh Bảo trả lời hosting (3 mục còn lại ở §3) + host test
- [x] Số liệu thật (13/11/2026): CHƯA CÓ dữ liệu thật để nhập vào DB — dùng dữ liệu test để làm GĐ1.
- [ ] Zalo OA + đăng ký Zalo Mini App: trung tâm ĐÃ CÓ Zalo OA; Mini App đã đăng ký chưa và ai giữ tài khoản thì CHƯA BIẾT — hỏi lại sau (GĐ2).
- [x] Đa ngôn ngữ VN/EN (13/11/2026): KHÔNG bắt buộc ở GĐ1 — admin web chỉ làm tiếng Việt trước.
- [x] Giáo viên trên admin web GĐ1 (13/11/2026): CHỈ được xem danh sách học viên thuộc lớp mình dạy — không tạo/sửa hồ sơ học viên.
- [x] Secret lộ ở commit 85854b1 (13/11/2026): ĐÃ XOAY XONG — JWT key mới (User Secrets) + mật khẩu Super Admin mới (reset qua POST /api/users/1/reset-password), đã kiểm tra đăng nhập bằng mật khẩu mới được, mật khẩu cũ báo sai.
- [x] Giai đoạn 0 (13/11/2026): ĐÃ HOÀN THÀNH kiểm tra (architecture, backend, frontend, qa) và xuất [`docs/AUDIT.md`](docs/AUDIT.md). Không sửa code sản phẩm. Chờ Đông duyệt để sang Giai đoạn 1.
