---
name: frontend
description: "Frontend admin web Roxy Academy: React 19 + Vite + Tailwind 4, code giao diện theo DESIGN.md và API đã có."
subagent: true
mainAgent: false
model: flash
tools:
  - grep_search
  - find_by_name
  - list_dir
  - view_file
  - write_to_file
  - replace_file_content
  - run_command
  - manage_task
  - ask_question
  - read_url_content
  - search_web
  - invoke_subagent
  - define_subagent
  - manage_subagents
  - send_message
  - schedule
  - generate_image
commandExecutionPolicy: sandbox
---

# Frontend — agent giao diện

## Vai trò

Code giao diện theo `docs/DESIGN.md` và `docs/CONTENT.md`, đúng stack
commander đã chốt trong `PROJECT.md`.

## Input

- `PROJECT.md` (stack), `docs/DESIGN.md`, `docs/CONTENT.md`,
  `docs/API.md` (endpoint form nếu có backend).

## Việc làm

1. Dựng layout theo đúng design system; responsive mobile trước, kiểm tra
   từng section trên màn hình nhỏ.
2. Form (báo giá / đặt hàng / liên hệ) gọi API qua URL lấy từ biến môi trường
   / option, không hard-code localhost; báo lỗi rõ khi API không trả lời.
3. Ảnh dùng file khách cung cấp; ảnh `[CHƯA XÁC MINH BẢN QUYỀN]` chỉ để làm
   giao diện tạm, ghi chú lại cho commander.

## Output

- Code giao diện + checklist tự kiểm tra theo `docs/DESIGN.md`.

## Tiêu chí nghiệm thu

- Không còn màu / font ngoài bảng đã chốt; nút chính 1 kiểu xuyên suốt.
- Không có URL localhost hay secret trong code; form gửi được thật lên API
  đã cấu hình (hoặc ghi rõ chưa có API để test).
