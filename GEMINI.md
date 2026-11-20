# GEMINI.md — Roxy Academy (luật chung, riêng cho dự án này)

> File này là luật chung cho dự án Roxy Academy. Commander và mọi sub-agent
> đều phải tuân theo. Đặt ở thư mục gốc của repo RoxyAcademy (cùng cấp với
> `RoxyAppBE/`, `roxy-admin/`, `RoxyAppDB.sql`).
> Đã có sẵn code — KHÔNG làm lại từ đầu. Mọi thay đổi phải giữ code đang chạy.

## Thông tin dự án — ĐÃ ĐIỀN SẴN (không tự đoán lại)

- Thương hiệu: Roxy Academy — trung tâm giáo dục trẻ em, gần 20 năm.
- Web giới thiệu: https://roxy.edu.vn/ (WordPress, đang chạy) — KHÔNG động vào.
- Hệ thống mới: quản lý học tập — Admin web + Zalo Mini App, chung 1 backend.
- Khách mục tiêu: phụ huynh, học viên (lớp 6+ tự dùng), giáo viên, quản lý chi nhánh, SuperAdmin.
- Khóa học: Tiền tiểu học, Luyện chữ đẹp, Tư duy logic, Gia sư cấp 1-2-3, Lớp vẽ, Dạy trẻ phổ tự kỷ, Kỹ năng sống, Giáo dục giới tính.
- Chi nhánh: 2 cơ sở ở P. Bình Trưng, TP.HCM. Hotline: 0326 538 824.
- Thứ tự làm: **web admin trước, Zalo Mini App sau**. Mobile agent đã có sẵn trong `.agents/agents/mobile/` nhưng CHƯA dùng ở giai đoạn web.

## Stack — ĐÃ CHỐT, không đổi khi chưa có lệnh của Đông

- Backend: ASP.NET Core 9.0 + MSSQL (EF Core), JWT (hết hạn 480 phút).
- Database: MSSQL, schema trong `RoxyAppDB.sql` v1 (18 bảng). KHÔNG có EF migration.
- Admin web: React 19 + Vite + Tailwind CSS 4, React Router 7, axios.
- Zalo Mini App (sau): gọi cùng API backend, đăng nhập bằng Zalo (`ZaloId` đã có trong DB).
- Repo: https://github.com/huudong2005/RoxyAcademy — commit đầu 85854b1, đã dọn `.gitignore` ở 7cc7453.

## Hosting — ĐANG CHỜ anh Bảo (13/11/2026)

- Đông đã hỏi anh Bảo câu 1 (host có chạy được .NET 9 không), đang đợi trả lời rồi hỏi tiếp 3 câu còn lại.
- Chưa chốt: runtime chính xác, database MSSQL + connection string, cách deploy + đặt biến môi trường, subdomain `api.roxy.edu.vn` + `admin.roxy.edu.vn` + SSL/DNS.
- Ghi đáp án vào `PROJECT.md` ngay khi anh Bảo trả lời. **Không deploy production khi chưa có đủ 4 đáp án này.**
- Web WordPress roxy.edu.vn giữ nguyên, không động vào.

## Luật code — áp cho mọi agent (riêng Roxy, quan trọng)

- **Không hard-code localhost.** API URL lấy từ biến môi trường / cấu hình, không hard-code `http://localhost:5123`, `Server=MSI`, hay URL tuyệt đối nào. Admin web đang dùng Vite proxy `/api` → `localhost:5123` chỉ để chạy dev, production phải đổi bằng env.
- **Secret chỉ trong biến môi trường / User Secrets, không commit.** Không để token, JWT key, mật khẩu trong code, log, hay file commit lên git. Đã từng lộ 1 lần trong `key.txt` ở commit cũ — không lặp lại. File `key.txt`, `program.txt` chỉ còn trên máy local, không commit lại.
- **Không bịa số liệu / quy trình.** Mọi con số, lịch học, học phí chưa có nguồn thì ghi `[CẦN XÁC MINH]`, hỏi Đông / trung tâm để chốt. Không tự tạo khóa học, lớp, học viên giả làm dữ liệu thật.
- **Phân quyền theo chi nhánh + vai trò là luật cứng.** 5 vai trò: SuperAdmin, BranchManager, Teacher, Parent, Student. Mọi API đọc/ghi đều phải lọc đúng phạm vi như `StudentsController.VisibleStudents()` đang làm: quản lý chi nhánh chỉ thấy chi nhánh mình, giáo viên chỉ thấy lớp mình dạy, phụ huynh chỉ thấy con mình, học viên chỉ thấy chính mình. Không được mở rộng quyền khi chưa có lệnh.
- **Dữ liệu nhạy cảm:** ghi chú học viên (`Students.Note`, nhu cầu đặc biệt / tự kỷ) chỉ staff (SuperAdmin, BranchManager, Teacher) được xem. Parent/Student phải bị ẩn (`Note = null`) như code hiện tại đang làm. Không hiển thị ghi chú này ở bất kỳ màn hình phụ huynh/học viên nào, không log ra.
- **CORS:** hiện `AllowAll` chỉ để dev. Production chỉ cho phép đúng origin: admin web, web Roxy, Zalo Mini App. Không deploy production với `AllowAll`.
- **Database:** không tự tạo migration / không chạy SQL thô thay đổi schema khi chưa có lệnh của Đông. Schema thay đổi phải qua file `RoxyAppDB.sql` có version, hoặc migration chuẩn được duyệt trước.
- **Kiểm tra bản đang chạy có khớp repo không** trước khi debug. Sau mỗi phiên agent, Đông push rồi báo commit → Linh pull và xác minh bằng code thật, không tin báo cáo miệng.
- **Bàn giao bằng file + checklist.** Mỗi agent chỉ làm đúng phần của mình, ghi rõ input, output, file tạo/sửa, tiêu chí nghiệm thu. Không làm chồng lên phần của agent khác.
- Commander phân việc và tổng hợp; commander không tự sửa code.
- QA kiểm tra xong mới deploy: phân quyền, form, tốc độ, mobile, rồi mới lên production và bàn giao.
- **Luôn gửi kèm lệnh `git add` khi xong việc:** Cuối mỗi lần hoàn thành tác vụ có sửa/tạo file, luôn gửi kèm lệnh `git add` viết trên 1 dòng duy nhất, chỉ liệt kê đúng các file đã chỉnh sửa hoặc tạo mới (không dùng `git add .` hoặc thêm các file không liên quan).
