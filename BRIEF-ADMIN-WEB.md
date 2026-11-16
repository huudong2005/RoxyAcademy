# BRIEF — Admin web Roxy Academy (Giai đoạn 1: web trước, Zalo Mini App sau)

> Đọc cùng `GEMINI.md` + `PROJECT.md`. Đã có sẵn code — KHÔNG làm lại từ đầu.

## 1. Mục tiêu giai đoạn 1
Hoàn thiện admin web cho staff (SuperAdmin, BranchManager, Teacher) dùng hàng ngày:
quản lý học viên, lớp, lịch học / điểm danh, học phí, bài tập, xin nghỉ phép.
Phụ huynh / học viên ở giai đoạn 1 CHƯA dùng admin web — họ dùng Zalo Mini App ở giai đoạn 2.

## 2. Hiện trạng (đã xác minh từ repo)
- Backend đã có 19 controller, đủ API cho các trang dưới đây. Ưu tiên kiểm tra API có sẵn trước, chỉ thêm API khi thật sự thiếu.
- Admin web đã có: Login, Dashboard (gần như trống), ClassList.
- Chưa có: Students, Tuitions/Payments, Schedules/Attendance, Homework, Leave, Messages, Newsfeed.

## 3. Phạm vi giai đoạn 1 — theo thứ tự
1. **Students (ưu tiên 1):** danh sách, tìm kiếm, lọc theo chi nhánh / lớp / trạng thái, xem chi tiết, thêm / sửa học viên. Đúng phân quyền theo chi nhánh + vai trò. Ghi chú nhạy cảm (`Note`) chỉ staff xem.
2. **Schedules / Attendance:** lịch học theo lớp, điểm danh (bulk), xem lịch theo ngày / tuần.
3. **Tuitions / Payments:** xem học phí phải thu / đã thu, ghi nhận thanh toán, xác nhận thanh toán.
4. **Homework:** giao bài, xem bài nộp, chấm bài.
5. **LeaveRequests:** xem + duyệt / từ chối xin nghỉ.
6. **Dashboard:** làm CUỐI, khi đã có số liệu thật — số học viên, lớp đang mở, học phí tháng này, điểm danh hôm nay.
7. **Messages / Newsfeed / Notifications:** chỉ làm sau khi 6 mục trên xong, nếu còn thời gian.

## 4. Quy tắc
- Giữ nguyên API + DB đang có, không đổi schema khi chưa có lệnh.
- Không hard-code `localhost:5123` cho production — URL API lấy từ env.
- Không tạo dữ liệu giả làm dữ liệu thật. Dữ liệu demo (nếu cần) ghi rõ là demo, tách riêng.
- Mọi màn hình đều phải tôn trọng phân quyền theo chi nhánh + vai trò.
- Designer: dùng skill `/apple-design` + `/emil-design-eng` cho admin UI (rõ ràng, nhanh, ít chuyển động thừa — admin là công cụ làm việc, không phải landing).

## 5. Prompt gửi commander — GIAI ĐOẠN 0: KIỂM TRA TRƯỚC, CHƯA SỬA CODE

```
Gửi commander: Giai đoạn 0 cho Roxy Academy — chỉ kiểm tra, KHÔNG sửa code.

Đọc trước: GEMINI.md, PROJECT.md, BRIEF-ADMIN-WEB.md trong thư mục hiện tại,
và toàn bộ code đã có trong RoxyAppBE/ (backend .NET 9 + MSSQL) và roxy-admin/
(React 19 + Vite + Tailwind 4).

Nhiệm vụ:
- Chia việc cho architecture, backend, frontend, qa (chưa cần deploy, chưa cần mobile).
- Architecture: vẽ lại sơ đồ hệ thống hiện tại (backend, DB, admin web, Zalo Mini App sau này), đối chiếu API đã có với 7 mục trong §3 BRIEF, liệt kê API thiếu / API thừa / API chưa đúng phân quyền.
- Backend: kiểm tra backend có build + chạy được không (dotnet build, chạy local với DB MSSQL), kiểm tra từng controller về phân quyền theo chi nhánh/vai trò, ghi rõ chỗ nào chưa đúng.
- Frontend: kiểm tra admin web có chạy được không (npm install, npm run dev), Login + ClassList + Dashboard hiện làm được gì, thiếu gì so với BRIEF.
- QA: tổng hợp thành docs/AUDIT.md — bảng: đã xong / làm dở / chưa làm / rủi ro, kèm file/dòng code cụ thể. Không sửa code, không tạo file code mới.
- Cuối cùng: báo danh sách câu hỏi cần Đông trả lời trước khi code (hosting, dữ liệu thật, Zalo OA...).

Quy tắc: commander chỉ phân việc và tổng hợp, không tự sửa code.
```

Sau khi Giai đoạn 0 xong và Đông duyệt báo cáo, mới gửi prompt Giai đoạn 1 (làm trang Students).
