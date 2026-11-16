# Cài bộ sub-agent + skill cho Roxy Academy — 4 bước

## Bước 1 — Giải nén (zip phẳng, không lồng thư mục)
Zip này là zip phẳng: giải nén **thẳng vào thư mục gốc của repo RoxyAcademy**
(thư mục có `RoxyAppBE/`, `roxy-admin/`, `RoxyAppDB.sql` — trong ảnh VS Code của anh là thư mục `ROXYAPP`). Đừng giải nén ra thư mục con rồi copy lòng vòng nữa.

Sau khi copy, gốc repo phải có:
```
ROXYAPP/
  GEMINI.md
  PROJECT.md
  BRIEF-ADMIN-WEB.md
  .agents/
    agents/  (commander, architecture, backend, frontend, designer, copywriter, qa, deploy, mobile)
    skills/  (apple-design, emil-design-eng, animate, ...)
  RoxyAppBE/
  roxy-admin/
  RoxyAppDB.sql
```

Lưu ý: file `key.txt`, `program.txt` vẫn còn trên máy local của anh là đúng (đã gỡ khỏi git, không commit lại). Riêng `PROJECT.md`: trong ảnh VS Code anh đã có 1 file `PROJECT.md` (chưa commit, chữ U) — so sánh với file `PROJECT.md` em gửi rồi gộp tay, đừng ghi đè mù.

## Bước 2 — Mở trong Antigravity
- Antigravity App: Add Folder → chọn thư mục gốc repo RoxyAcademy.
- Hoặc terminal:
```powershell
cd "<đường dẫn thư mục repo RoxyAcademy trên máy anh>"
agy
```
- Model: **Gemini 3.8 Flash (Medium)** (Argon đang hết quota).
- Kiểm tra: gõ `/skills` phải thấy `apple-design`, `emil-design-eng`; gõ `/agents` phải thấy commander + 8 sub-agent.

## Bước 3 — Giai đoạn 0: kiểm tra trước, chưa sửa code
Paste prompt ở §5 trong `BRIEF-ADMIN-WEB.md` cho commander. Commander sẽ chia việc
cho architecture, backend, frontend, qa làm audit, output `docs/AUDIT.md`.
Anh duyệt các lệnh xin phép như mọi lần (chọn 1. Yes cho lệnh đọc).
Chế độ auto: bấm Shift+Tab tới `auto` nếu muốn nó tự chạy.

## Bước 4 — Sau khi duyệt báo cáo audit
Mới gửi prompt Giai đoạn 1 (làm trang Students). Đừng gửi prompt code khi chưa có
báo cáo audit + chưa có đáp án hosting từ anh Bảo (chỉ code local thì được, không deploy).
