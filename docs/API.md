# TÀI LIỆU API HỆ THỐNG ROXY ACADEMY (ROXY LMS)

Tài liệu chi tiết các API phục vụ quản trị học tập, phân quyền và kết nối giữa Frontend (Admin Web & Zalo Mini App) với Backend ASP.NET Core 9.

---

## 1. QUY CHUẨN CHUNG & XÁC THỰC

- **Base URL:** `/api` (qua Vite proxy dev hoặc `https://api.roxy.edu.vn/api` trên Production).
- **Header xác thực:** `Authorization: Bearer <access_token>`
- **Định dạng dữ liệu:** `application/json` (Encoding: UTF-8).
- **Phân quyền 5 vai trò:**
  - `SuperAdmin`: Toàn quyền hệ thống.
  - `BranchManager`: Quản lý các lớp và học viên thuộc chi nhánh được gán (`BranchId`).
  - `Teacher`: Chỉ thao tác với các lớp mình phụ trách chính (`Class.TeacherId`) hoặc được phân công dạy thay (`SubstituteTeacherId`).
  - `Parent`: Chỉ xem dữ liệu các học viên là con mình (`Student.ParentId == UserId`).
  - `Student`: Chỉ xem dữ liệu của chính mình (`Student.UserId == UserId`).

---

## 2. PHÂN HỆ LỊCH HỌC (SCHEDULES API)

Quản lý lịch học của các lớp, hỗ trợ xem theo tuần/ngày, theo chi nhánh, theo giáo viên và lớp học.

### 2.1. Lấy danh sách lịch học — `GET /api/Schedules`
Hỗ trợ lọc linh hoạt theo thời gian, chi nhánh, lớp học và giáo viên.

- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Phân quyền dữ liệu (Scoping):**
  - `SuperAdmin`: Xem tất cả lịch học theo bộ lọc.
  - `BranchManager`: Tự động giới hạn trong chi nhánh của Quản lý (`Class.BranchId == userBranchId`).
  - `Teacher`: Chỉ xem lịch lớp mình dạy chính (`Class.TeacherId == userId`) hoặc dạy thay (`SubstituteTeacherId == userId`).
  - `Parent`: Chỉ xem lịch của các lớp mà con mình đang theo học (`StudentClasses.Status == 'Active'`).
  - `Student`: Chỉ xem lịch của các lớp mình đang theo học (`StudentClasses.Status == 'Active'`).

- **Query Parameters (Tất cả đều là optional):**
  - `classId` (int, optional): Lọc theo mã lớp học.
  - `branchId` (int, optional): Lọc theo mã cơ sở (chỉ áp dụng cho `SuperAdmin`).
  - `teacherId` (int, optional): Lọc theo giáo viên (giáo viên chính hoặc dạy thay).
  - `fromDate` (DateOnly, format `YYYY-MM-DD`, optional): Từ ngày (xem theo tuần/tháng).
  - `toDate` (DateOnly, format `YYYY-MM-DD`, optional): Đến ngày.

- **Response:** `200 OK`
  ```json
  [
    {
      "id": 101,
      "classId": 5,
      "className": "Luyện chữ đẹp K01",
      "branchId": 1,
      "branchName": "Cơ sở Bình Trưng Tây",
      "mainTeacherId": 12,
      "mainTeacherName": "Cô Nguyễn Thị Mai",
      "studyDate": "2026-11-15",
      "startTime": "08:30:00",
      "endTime": "10:30:00",
      "room": "Phòng 102 - Tầng 1",
      "substituteTeacherId": null,
      "substituteTeacherName": null,
      "status": "Scheduled",
      "note": "Học bài nét thanh nét đậm"
    }
  ]
  ```

---

### 2.2. Lấy chi tiết buổi học — `GET /api/Schedules/{id}`
- **Quyền truy cập:** Cả 5 vai trò (áp dụng kiểm tra quyền lớp học tương tự `GET /api/Schedules`).
- **Response:** `200 OK` (Cấu trúc tương tự item trong danh sách trên) hoặc `404 Not Found` nếu không tìm thấy, `403 Forbidden` nếu không có quyền xem lớp này.

---

### 2.3. Tạo buổi học mới — `POST /api/Schedules`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher`.
- **Ràng buộc nghiệp vụ & bảo mật:**
  - `BranchManager`: Bị chặn nếu tạo lịch cho lớp thuộc chi nhánh khác (`403 Forbidden`).
  - `Teacher`: Chỉ được lên lịch cho lớp mình phụ trách chính (`403 Forbidden`).
  - **Bắt buộc phân công Giáo viên:** Lớp học phải có giáo viên phụ trách (`Class.TeacherId > 0` và tài khoản giáo viên hợp lệ). Nếu chưa có -> trả về `400 Bad Request`: `"Lớp học chưa được phân công giáo viên giảng dạy, không thể lên lịch học."`
  - Giờ kết thúc phải sau giờ bắt đầu (`endTime > startTime`), nếu vi phạm -> `400 Bad Request`: `"Giờ kết thúc phải sau giờ bắt đầu."`
  - Nếu có giáo viên dạy thay (`substituteTeacherId`): tài khoản phải tồn tại và có vai trò `Teacher`.

- **Request Body:**
  ```json
  {
    "classId": 5,
    "studyDate": "2026-11-20",
    "startTime": "08:30:00",
    "endTime": "10:30:00",
    "room": "Phòng 102",
    "substituteTeacherId": null,
    "note": "Ôn tập giữa khóa"
  }
  ```

- **Response:** `201 Created`
  ```json
  {
    "message": "Lên lịch thành công",
    "id": 102
  }
  ```

---

### 2.4. Cập nhật buổi học — `PUT /api/Schedules/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher`.
- **Ràng buộc nghiệp vụ:**
  - `BranchManager`: Chỉ sửa buổi học thuộc chi nhánh mình.
  - `Teacher`: Chỉ sửa buổi học của lớp mình dạy chính hoặc mình dạy thay.
  - `status`: Bắt buộc là một trong 3 giá trị chuẩn DB: `"Scheduled"`, `"Completed"`, `"Cancelled"`.
  - `endTime > startTime`.

- **Request Body:**
  ```json
  {
    "studyDate": "2026-11-20",
    "startTime": "09:00:00",
    "endTime": "11:00:00",
    "room": "Phòng 201 (Đổi phòng)",
    "substituteTeacherId": 15,
    "status": "Scheduled",
    "note": "Đổi giờ và giáo viên dạy thay do cô Mai bận việc đột xuất"
  }
  ```

- **Response:** `204 No Content` hoặc `400 Bad Request` / `403 Forbidden` / `404 Not Found`.

---

### 2.5. Xóa buổi học — `DELETE /api/Schedules/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc an toàn dữ liệu (FK Integrity):**
  - `BranchManager`: Bị chặn nếu buổi học thuộc cơ sở khác (`403 Forbidden`).
  - **Đã có dữ liệu điểm danh:** Chặn xóa và trả về `400 Bad Request`: `"Không thể xóa buổi học đã có dữ liệu điểm danh. Vui lòng chuyển trạng thái sang Đã hủy (Cancelled)."`
  - **Đã gắn tiến độ bài học (`LessonProgress`):** Chặn xóa `400 Bad Request`: `"Không thể xóa buổi học đã gắn tiến độ bài học. Vui lòng xóa hoặc gỡ liên kết tiến độ bài học trước."`
  - **Đã gắn bài tập về nhà (`Homeworks`):** Chặn xóa `400 Bad Request`: `"Không thể xóa buổi học đã gắn bài tập về nhà. Vui lòng xóa bài tập trước."`
  - **Đã có đơn xin nghỉ phép (`LeaveRequests`):** Chặn xóa `400 Bad Request`: `"Không thể xóa buổi học đã có đơn xin nghỉ phép liên kết."`

- **Response:** `204 No Content` khi xóa thành công.

---

## 3. PHÂN HỆ ĐIỂM DANH (ATTENDANCES API)

Quản lý việc điểm danh học viên trong từng buổi học, hỗ trợ giáo viên và quản lý điểm danh nhanh hàng loạt.

### 3.1. Lấy danh sách điểm danh buổi học — `GET /api/Attendances?scheduleId={scheduleId}`
- **Quyền truy cập:**
  - `SuperAdmin`: Xem tất cả.
  - `BranchManager`: Xem các buổi học thuộc chi nhánh mình.
  - `Teacher`: Xem buổi học lớp mình dạy hoặc dạy thay.
  - `Parent`: Chỉ xem trạng thái của con mình.
  - `Student`: Chỉ xem trạng thái của chính mình.
- **Cơ chế phục vụ giao diện (UX Seamless):**
  - Tự động nạp toàn bộ học viên đang học trong lớp (`StudentClasses.Status == 'Active'`).
  - Nếu học viên **đã được điểm danh**: Trả về `id`, `status` tương ứng (`Present`, `Late`, `ExcusedAbsent`, `UnexcusedAbsent`), thông tin người chấm và thời gian.
  - Nếu học viên **chưa được điểm danh**: Trả về `id: null`, `status: null` kèm thông tin họ tên, ngày sinh, giới tính của học viên để Frontend dễ dàng hiển thị danh sách lớp và cho phép chọn nhanh "Tất cả có mặt".

- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1001,
      "scheduleId": 101,
      "studentId": 20,
      "studentName": "Trần Bảo Nam",
      "gender": "Nam",
      "dob": "2018-05-12",
      "status": "Present",
      "note": null,
      "markedBy": 12,
      "markedByName": "Cô Nguyễn Thị Mai",
      "markedAt": "2026-11-15T08:35:10Z"
    },
    {
      "id": null,
      "scheduleId": 101,
      "studentId": 21,
      "studentName": "Lê Ngọc Ánh",
      "gender": "Nữ",
      "dob": "2019-02-18",
      "status": null,
      "note": null,
      "markedBy": null,
      "markedByName": null,
      "markedAt": null
    }
  ]
  ```

---

### 3.2. Điểm danh hàng loạt — `POST /api/Attendances/bulk`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher`.
- **Ràng buộc nghiệp vụ:**
  - `BranchManager`: Chỉ điểm danh buổi học thuộc cơ sở mình.
  - `Teacher`: Chỉ điểm danh buổi học lớp mình dạy chính hoặc dạy thay.
  - **Trạng thái điểm danh (`status`):** Khớp 100% CHECK constraint của Database:
    - `"Present"`: Có mặt
    - `"Late"`: Đi muộn
    - `"ExcusedAbsent"`: Nghỉ có phép
    - `"UnexcusedAbsent"`: Nghỉ không phép
  - Tự động bỏ qua học viên không thuộc danh sách `Active` của lớp.
  - Tự động cập nhật nếu đã có bản ghi hoặc thêm mới nếu chưa có.
  - Tự động chuyển trạng thái buổi học `Schedule.Status` từ `"Scheduled"` thành `"Completed"`.

- **Request Body:**
  ```json
  {
    "scheduleId": 101,
    "records": [
      {
        "studentId": 20,
        "status": "Present",
        "note": "Ngoan, tích cực"
      },
      {
        "studentId": 21,
        "status": "ExcusedAbsent",
        "note": "Phụ huynh xin nghỉ về quê"
      }
    ]
  }
  ```

- **Response:** `200 OK`
  ```json
  {
    "message": "Điểm danh thành công!"
  }
  ```

---

## 4. PHÂN HỆ HỌC PHÍ (TUITIONS API)

Quản lý danh sách các khoản phải thu (học phí khóa học, giáo trình, đồng phục...), theo dõi công nợ, tính toán số tiền đã nộp và số tiền còn thiếu.

### 4.1. Lấy danh sách khoản thu — `GET /api/Tuitions`
Hỗ trợ tìm kiếm, lọc theo học viên, lớp học, cơ sở và trạng thái công nợ.

- **Quyền truy cập:**
  - `Teacher`: **Bị cấm** (`403 Forbidden`) — Giáo viên không được can thiệp vào tài chính/học phí.
  - `SuperAdmin`: Xem toàn bộ hệ thống hoặc lọc theo `branchId`.
  - `BranchManager`: Tự động giới hạn trong cơ sở mình quản lý (`BranchId == userBranchId`).
  - `Parent`: Chỉ xem khoản thu của con mình (`Student.ParentId == UserId`).
  - `Student`: Chỉ xem khoản thu của chính mình (`Student.UserId == UserId`).

- **Query Parameters (Tùy chọn):**
  - `search` (string): Tìm kiếm theo tên học viên, mã học viên, tên lớp hoặc tiêu đề khoản thu.
  - `studentId` (int): Lọc theo mã học viên.
  - `classId` (int): Lọc theo lớp học cụ thể.
  - `branchId` (int): Lọc theo mã cơ sở (chỉ `SuperAdmin` có thể chọn cơ sở tùy ý).
  - `status` (string): Lọc trạng thái công nợ:
    - `"Paid"`: Đã thanh toán đầy đủ (`paidAmount >= finalAmount`).
    - `"Partial"` hoặc `"PartiallyPaid"`: Đã thanh toán một phần (`0 < paidAmount < finalAmount`).
    - `"Unpaid"`: Chưa thanh toán (`paidAmount == 0`).
    - `"Overdue"`: Quá hạn nộp học phí (`paidAmount < finalAmount` và `dueDate < today`).
    - `"Cancelled"`: Khoản thu đã hủy (`isCancelled == true`).

- **Response:** `200 OK`
  ```json
  [
    {
      "id": 15,
      "studentId": 20,
      "studentName": "Trần Bảo Nam",
      "classId": 5,
      "className": "Luyện chữ đẹp K01",
      "branchId": 1,
      "branchName": "Cơ sở Bình Trưng Tây",
      "title": "Học phí Khóa Luyện chữ đẹp tháng 11/2026",
      "amount": 2500000,
      "totalAmount": 2500000,
      "discount": 200000,
      "finalAmount": 2300000,
      "paidAmount": 1000000,
      "remainingAmount": 1300000,
      "status": "PartiallyPaid",
      "isOverdue": false,
      "dueDate": "2026-11-25",
      "isCancelled": false,
      "note": "Ưu đãi đăng ký sớm 200k",
      "createdAt": "2026-11-10T08:00:00Z"
    }
  ]
  ```

---

### 4.2. Lấy chi tiết khoản thu — `GET /api/Tuitions/{id}`
- **Quyền truy cập:** Cùng phân quyền như `GET /api/Tuitions` (chặn Giáo viên, kiểm tra quyền sở hữu đối với Phụ huynh, Học viên và Quản lý cơ sở).
- **Response:** `200 OK` (Cấu trúc tương tự item trong danh sách trên) hoặc `404 Not Found`, `403 Forbidden`.

---

### 4.3. Tạo khoản thu mới — `POST /api/Tuitions`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc nghiệp vụ & bảo mật:**
  - `BranchManager`: Bị chặn nếu tạo khoản thu cho học viên hoặc cơ sở khác (`403 Forbidden`).
  - `amount >= 0`, `discount >= 0`, `discount <= amount`: Giảm giá không được vượt quá số tiền học phí.
  - Nếu có chọn lớp (`classId`): Kiểm tra học viên bắt buộc phải đã ghi danh vào lớp (`StudentClasses`), và lớp phải thuộc chi nhánh quản lý nếu người tạo là `BranchManager`.
  - Kiểm tra chi nhánh (`branchId`) phải tồn tại và đang hoạt động (`IsActive == true`).

- **Request Body:**
  ```json
  {
    "studentId": 20,
    "classId": 5,
    "branchId": 1,
    "title": "Học phí Khóa Luyện chữ đẹp tháng 11/2026",
    "amount": 2500000,
    "discount": 200000,
    "dueDate": "2026-11-25",
    "note": "Ưu đãi đăng ký sớm"
  }
  ```

- **Response:** `201 Created`
  ```json
  {
    "id": 15,
    "message": "Tạo khoản thu học phí thành công!"
  }
  ```

---

### 4.4. Cập nhật khoản thu — `PUT /api/Tuitions/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager` (chỉ chi nhánh mình).
- **Ràng buộc nghiệp vụ:**
  - `discount <= amount`.
  - **Kiểm soát chống Overpay khi giảm học phí:** Số tiền thực thu sau khi cập nhật (`amount - discount`) **không được nhỏ hơn** tổng số tiền đã thanh toán trước đó (`paidAmount`). Nếu vi phạm, trả ngay `400 Bad Request` tiếng Việt kèm thông số chi tiết.

- **Request Body:**
  ```json
  {
    "title": "Học phí Khóa Luyện chữ đẹp tháng 11/2026 (Điều chỉnh)",
    "amount": 2500000,
    "discount": 300000,
    "dueDate": "2026-11-30",
    "isCancelled": false,
    "note": "Thêm ưu đãi phụ huynh giới thiệu bạn"
  }
  ```

- **Response:** `200 OK`
  ```json
  {
    "message": "Cập nhật khoản thu thành công!"
  }
  ```

---

### 4.5. Xóa khoản thu — `DELETE /api/Tuitions/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager` (chỉ chi nhánh mình).
- **Ràng buộc an toàn dữ liệu:**
  - Nếu khoản thu **đã có giao dịch thanh toán** trong hệ thống (`Payments`), hệ thống sẽ chặn xóa và trả về `400 Bad Request`: `"Không thể xóa khoản học phí đã có lịch sử thanh toán. Bạn có thể chọn Hủy khoản thu (IsCancelled = true)."`
  - Chỉ cho phép xóa khi khoản thu tạo nhầm và chưa phát sinh giao dịch nào.
- **Response:** `204 No Content` khi xóa thành công.

---

## 5. PHÂN HỆ THANH TOÁN (PAYMENTS API)

Quản lý việc thu tiền học phí, ghi nhận thanh toán (tiền mặt / chuyển khoản / ZaloPay), đối soát mã giao dịch, kiểm duyệt biên nhận và tự động thông báo tới phụ huynh.

### 5.1. Lấy danh sách thanh toán — `GET /api/Payments`
- **Quyền truy cập:**
  - `Teacher`: **Bị cấm** (`403 Forbidden`).
  - `SuperAdmin`: Xem tất cả giao dịch thanh toán.
  - `BranchManager`: Chỉ xem các giao dịch thuộc học viên/khoản thu của cơ sở mình.
  - `Parent`: Chỉ xem các giao dịch của con mình.
  - `Student`: Chỉ xem các giao dịch của chính mình.

- **Query Parameters (Tùy chọn):**
  - `tuitionId` (int): Lọc theo mã khoản thu cụ thể.
  - `paymentMethod` (string): Lọc theo phương thức (`BankTransfer`, `Cash`, `ZaloPay`, `Other`).
  - `status` (string): Lọc theo trạng thái duyệt (`PendingConfirm`, `Confirmed`, `Rejected`).

- **Response:** `200 OK`
  ```json
  [
    {
      "id": 50,
      "tuitionId": 15,
      "tuitionTitle": "Học phí Khóa Luyện chữ đẹp tháng 11/2026",
      "studentName": "Trần Bảo Nam",
      "amount": 1000000,
      "paymentMethod": "BankTransfer",
      "status": "Confirmed",
      "transactionCode": "MB1234567890",
      "proofImageUrl": "https://img.roxy.edu.vn/receipts/rec-50.jpg",
      "paidAt": "2026-11-14T09:30:00Z",
      "confirmedBy": 2,
      "confirmedByName": "Quản lý Cơ sở 1",
      "confirmedAt": "2026-11-14T09:35:00Z",
      "note": "Đã khớp sao kê tài khoản trung tâm",
      "createdAt": "2026-11-14T09:30:00Z"
    }
  ]
  ```

---

### 5.2. Lấy chi tiết giao dịch thanh toán — `GET /api/Payments/{id}`
- **Quyền truy cập:** Cùng phân quyền như `GET /api/Payments`.
- **Response:** `200 OK` (Cấu trúc tương tự item trong danh sách trên) hoặc `404 Not Found`, `403 Forbidden`.

---

### 5.3. Ghi nhận giao dịch thanh toán mới — `POST /api/Payments`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Parent`, `Student`.
- **Phân luồng trạng thái tự động theo vai trò:**
  - **Nhân viên thu tiền trực tiếp (`SuperAdmin`, `BranchManager`):** Giao dịch tự động có trạng thái `"Confirmed"`, gán `confirmedBy` là tài khoản hiện tại, `confirmedAt` là thời điểm hiện tại. Hệ thống tự động tạo Thông báo (`Notification`) gửi vào chuông của Phụ huynh học viên.
  - **Phụ huynh / Học viên nộp qua App (`Parent`, `Student`):** Giao dịch có trạng thái `"PendingConfirm"`, `confirmedBy: null` để Quản lý cơ sở kiểm tra sao kê ngân hàng và duyệt.
- **Kiểm soát chặn Overpay nghiêm ngặt trước khi lưu DB:**
  - Số tiền thanh toán `amount > 0`.
  - Khoản thu phải tồn tại và chưa bị hủy (`IsCancelled == false`).
  - Tính số tiền còn nợ: `remainingAmount = (Amount - Discount) - Tổng các khoản đã Confirmed`.
  - Nếu `remainingAmount <= 0`: Trả ngay `400 Bad Request`: `"Khoản học phí này đã được thanh toán đầy đủ, không thể nộp thêm."`
  - Nếu `amount > remainingAmount`: Trả ngay `400 Bad Request`: `"Số tiền thanh toán ({amount} đ) vượt quá số tiền còn nợ ({remainingAmount} đ)..."` — **chặn tuyệt đối việc phát sinh lỗi 500 từ SQL trigger `TR_Payments_NoOverpay`**.

- **Request Body:**
  ```json
  {
    "tuitionId": 15,
    "amount": 1000000,
    "paymentMethod": "BankTransfer",
    "transactionCode": "MB1234567890",
    "proofImageUrl": "https://img.roxy.edu.vn/receipts/rec-50.jpg",
    "paidAt": "2026-11-14T09:30:00Z",
    "note": "Phụ huynh chuyển khoản ngân hàng MB Bank"
  }
  ```

- **Response:** `201 Created`
  ```json
  {
    "id": 50,
    "status": "Confirmed",
    "amount": 1000000,
    "message": "Ghi nhận thanh toán thành công!"
  }
  ```

---

### 5.4. Xác nhận / Từ chối giao dịch thanh toán — `PUT /api/Payments/{id}/confirm`
Dành cho Quản lý chi nhánh hoặc SuperAdmin kiểm tra chứng từ/sao kê ngân hàng để duyệt giao dịch đang chờ (`PendingConfirm`).

- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc nghiệp vụ & bảo mật:**
  - `BranchManager`: Bị chặn nếu giao dịch thuộc học phí của cơ sở khác (`403 Forbidden`).
  - Giao dịch phải đang ở trạng thái `"PendingConfirm"` (không thể duyệt lại giao dịch đã xử lý).
  - Khoản học phí liên kết không bị hủy (`IsCancelled == false`).
  - **Kiểm soát chống Overpay khi bấm duyệt (Confirm):**
    - Nếu chọn `"Confirmed"`, hệ thống kiểm tra tổng tiền đã duyệt của khoản học phí + `payment.Amount`. Nếu vượt quá số tiền phải thu sau giảm giá, trả ngay `400 Bad Request` tiếng Việt nêu rõ số tiền nợ tối đa còn lại.
  - Khi duyệt thành công:
    - Lưu vết người duyệt (`confirmedBy`) và thời gian duyệt (`confirmedAt`).
    - Tự động sinh Thông báo cá nhân (`Notification`) gửi tới tài khoản Phụ huynh thông báo kết quả duyệt thanh toán (kèm ghi chú nếu có).

- **Request Body:**
  ```json
  {
    "status": "Confirmed",
    "note": "Đã kiểm tra sao kê ngân hàng MB Bank, khớp giao dịch."
  }
  ```
  *(Hoặc `status: "Rejected"` kèm lý do từ chối nếu không thấy tiền vào tài khoản)*

- **Response:** `200 OK`
  ```json
  {
    "id": 50,
    "status": "Confirmed",
    "message": "Xác nhận thanh toán thành công!"
  }
  ```

---

## 6. QUẢN LÝ BÀI TẬP VỀ NHÀ & CHẤM BÀI (HOMEWORKS & SUBMISSIONS)

### 6.1. Danh sách bài tập — `GET /api/Homeworks`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager` (chi nhánh mình), `Teacher` (lớp mình dạy / dạy thay), `Parent` (lớp con học), `Student` (lớp mình học).
- **Query Params:**
  - `classId` (int, tùy chọn): Lọc theo lớp học.
  - `scheduleId` (int, tùy chọn): Lọc theo buổi học cụ thể.
  - `branchId` (int, tùy chọn): Lọc theo cơ sở (chỉ SuperAdmin / BM hợp lệ).
  - `page` (int, mặc định 1), `pageSize` (int, mặc định 20).
- **Response:** `200 OK`
  ```json
  {
    "totalItems": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "items": [
      {
        "id": 1,
        "classId": 5,
        "className": "Luyện chữ đẹp K01",
        "scheduleId": 12,
        "title": "Bài tập luyện nét thanh nét đậm tuần 2",
        "description": "Viết 2 trang vở bài tập số 3",
        "attachmentUrl": "https://cdn.roxy.edu.vn/homework/bai-tap-t2.pdf",
        "dueDate": "2026-11-20T17:00:00Z",
        "createdBy": 3,
        "createdByName": "Cô Lan Hương",
        "createdAt": "2026-11-14T08:00:00Z",
        "branchId": 1,
        "branchName": "Cơ sở Bình Trưng Tây",
        "totalSubmissions": 15,
        "submittedCount": 12,
        "reviewedCount": 8
      }
    ]
  }
  ```

---

### 6.2. Lấy chi tiết bài tập — `GET /api/Homeworks/{id}`
- **Quyền truy cập:** Tương tự danh sách (áp dụng kiểm tra quyền theo vai trò).
- **Response:** `200 OK` (Cấu trúc như DTO bài tập) hoặc `404 Not Found`, `403 Forbidden`.

---

### 6.3. Tạo bài tập mới — `POST /api/Homeworks`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher` (phụ trách lớp).
- **Ràng buộc:** Tự động khởi tạo bản ghi `HomeworkSubmissions` với trạng thái `"Pending"` cho toàn bộ học viên đang theo học (`Active`) trong lớp.
- **Request Body:**
  ```json
  {
    "classId": 5,
    "scheduleId": 12,
    "title": "Luyện viết chữ O, Ô, Ơ",
    "description": "Viết mỗi chữ 3 dòng vào vở ô ly",
    "attachmentUrl": "https://cdn.roxy.edu.vn/homework/de-bai-o-o-o.pdf",
    "dueDate": "2026-11-20T23:59:00Z"
  }
  ```
- **Response:** `201 Created`

---

### 6.4. Cập nhật bài tập — `PUT /api/Homeworks/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher` (chỉ người tạo hoặc giáo viên phụ trách).
- **Request Body:**
  ```json
  {
    "scheduleId": 12,
    "title": "Luyện viết chữ O, Ô, Ơ (Gia hạn)",
    "description": "Viết mỗi chữ 3 dòng vào vở ô ly. Hạn nộp mở rộng thêm 2 ngày.",
    "attachmentUrl": "https://cdn.roxy.edu.vn/homework/de-bai-o-o-o.pdf",
    "dueDate": "2026-11-22T23:59:00Z"
  }
  ```
- **Response:** `200 OK`

---

### 6.5. Xóa bài tập — `DELETE /api/Homeworks/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher` (chỉ người tạo hoặc giáo viên phụ trách).
- **Ràng buộc CASCADE:** Xóa bài tập sẽ tự động xóa các bản ghi nộp bài liên quan (`HomeworkSubmissions`) theo FK ON DELETE CASCADE trong DB.
- **Response:** `204 No Content`

---

### 6.6. Lấy danh sách bài nộp — `GET /api/HomeworkSubmissions`
- **Quyền truy cập:**
  - `SuperAdmin`: Toàn bộ.
  - `BranchManager`: Học viên thuộc chi nhánh quản lý.
  - `Teacher`: Học viên thuộc lớp phụ trách.
  - `Parent`: Chỉ xem bài tập của con mình.
  - `Student`: Chỉ xem bài tập của bản thân.
- **Query Params:**
  - `homeworkId` (int, tùy chọn): Lọc theo bài tập.
  - `classId` (int, tùy chọn): Lọc theo lớp.
  - `studentId` (int, tùy chọn): Lọc theo học viên (chỉ staff).
  - `status` (string, tùy chọn): `Pending`, `Submitted`, `Reviewed`.
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 101,
      "homeworkId": 1,
      "classId": 5,
      "studentId": 10,
      "studentName": "Nguyễn Hoàng Nam",
      "status": "Reviewed",
      "submissionUrl": "https://cdn.roxy.edu.vn/submissions/nam-bai-tap.jpg",
      "studentNote": "Em đã hoàn thành bài tập viết chữ đẹp",
      "submittedAt": "2026-11-15T10:00:00Z",
      "teacherFeedback": "Nét chữ đều và đẹp, chú ý dấu thanh chữ Ơ",
      "reviewedAt": "2026-11-15T15:30:00Z",
      "homeworkTitle": "Bài tập luyện nét thanh nét đậm tuần 2",
      "dueDate": "2026-11-20T17:00:00Z",
      "score": 9.5
    }
  ]
  ```

---

### 6.7. Lấy chi tiết bài nộp — `GET /api/HomeworkSubmissions/{id}`
- **Quyền truy cập:** Lọc theo phân quyền tương tự danh sách bài nộp (`403 Forbidden` nếu không đúng thẩm quyền).
- **Response:** `200 OK` (Cấu trúc DTO bài nộp kèm trường `score`).

---

### 6.8. Nộp bài tập — `PUT /api/HomeworkSubmissions/{id}/submit`
Dành cho Phụ huynh hoặc Học viên nộp bài làm hoặc nộp lại bài khi bị yêu cầu làm lại.
- **Quyền truy cập:** `SuperAdmin`, `Parent` (chỉ được nộp cho con mình), `Student` (chỉ nộp cho bản thân).
- **Hành vi khi nộp / nộp lại bài:**
  - Cập nhật trạng thái `status = "Submitted"`, ghi nhận `submittedAt = UTC`.
  - Nếu bài nộp đã từng được giáo viên chấm trước đó, **tự động reset**:
    - `score = null`
    - `teacherFeedback = null`
    - `reviewedAt = null`
- **Request Body:**
  ```json
  {
    "submissionUrl": "https://cdn.roxy.edu.vn/submissions/bai-tap-moi.pdf",
    "studentNote": "Em xin gửi lại bài nộp đã sửa lỗi"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Nộp bài thành công!"
  }
  ```

---

### 6.9. Chấm bài & Cho điểm — `PUT /api/HomeworkSubmissions/{id}/review`
Dành cho Giáo viên phụ trách lớp hoặc Quản lý chi nhánh chấm bài và nhận xét bài nộp của học viên.
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Teacher` (phụ trách lớp).
- **Ràng buộc:**
  - `status`: Bắt buộc, nhận giá trị `"Reviewed"` (Đã chấm) hoặc `"Pending"` (Yêu cầu làm lại).
  - `score`: Nullable (không bắt buộc), nếu nhập phải từ `0` đến `10` (thang điểm 10, tối đa 2 chữ số thập phân).
  - Nếu `score = null`, giáo viên chỉ để lại nhận xét bằng lời (`teacherFeedback`).
- **Request Body:**
  ```json
  {
    "status": "Reviewed",
    "score": 9.5,
    "teacherFeedback": "Bài viết rất tiến bộ, trình bày sạch sẽ!"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Chấm bài thành công!",
    "status": "Reviewed",
    "score": 9.5
  }
  ```
- **Lỗi có thể trả về:**
  - `400 Bad Request`: Nếu `score < 0` hoặc `score > 10` ("Điểm số phải từ 0 đến 10"), hoặc trạng thái chấm bài không hợp lệ.
  - `403 Forbidden`: Nếu giáo viên không phụ trách lớp hoặc Quản lý cơ sở truy cập lớp thuộc cơ sở khác.
  - `404 Not Found`: Nếu hồ sơ nộp bài không tồn tại.

---

## 7. PHÂN HỆ ĐƠN XIN NGHỈ PHÉP (LEAVE REQUESTS API)

Quản lý đơn xin nghỉ học của học viên và nghỉ phép của giáo viên; phân quyền duyệt đơn theo chi nhánh; tự động liên kết trạng thái Điểm danh (`ExcusedAbsent` - Nghỉ có phép) cho học viên khi đơn được duyệt.

### 7.1. Lấy danh sách đơn xin nghỉ phép — `GET /api/LeaveRequests`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Phân quyền dữ liệu (Scoping):**
  - `SuperAdmin`: Xem toàn bộ đơn xin nghỉ trong hệ thống.
  - `BranchManager`: Xem tất cả đơn thuộc chi nhánh mình quản lý: đơn của học viên trong chi nhánh, đơn của lớp thuộc chi nhánh, hoặc đơn nghỉ của giáo viên thuộc chi nhánh (kể cả khi giáo viên xin nghỉ phép cả ngày với `ClassId == null`).
  - `Teacher`: Xem đơn do chính mình tạo (`TeacherId == userId`) và đơn của học sinh trong các lớp mình phụ trách giảng dạy (`Class.TeacherId == userId`).
  - `Parent`: Chỉ xem đơn xin nghỉ của các con mình (`Student.ParentId == userId`).
  - `Student`: Chỉ xem đơn xin nghỉ của chính mình (`Student.UserId == userId` hoặc do chính mình tạo).
- **Query Parameters (Tất cả là optional):**
  - `studentId` (int, optional): Lọc theo mã học viên.
  - `classId` (int, optional): Lọc theo mã lớp học.
  - `branchId` (int, optional): Lọc theo mã chi nhánh (`SuperAdmin` lọc tùy ý; `BranchManager` tự động giới hạn ở chi nhánh mình).
  - `status` (string, optional): Lọc theo trạng thái (`Pending`, `Approved`, `Rejected`, `Cancelled`).
  - `fromDate` (DateOnly, format `YYYY-MM-DD`, optional): Từ ngày xin nghỉ.
  - `toDate` (DateOnly, format `YYYY-MM-DD`, optional): Đến ngày xin nghỉ.
  - `requesterType` (string, optional): Lọc theo loại đối tượng (`Student` hoặc `Teacher`).
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 15,
      "requesterType": "Student",
      "studentId": 24,
      "studentName": "Trần Bảo Nam",
      "teacherId": null,
      "teacherName": null,
      "classId": 5,
      "className": "Luyện chữ đẹp K01",
      "branchId": 1,
      "branchName": "Cơ sở Bình Trưng Tây",
      "scheduleId": 101,
      "leaveDate": "2026-11-20",
      "reason": "Học sinh bị sốt cao cần đi khám bác sĩ",
      "status": "Pending",
      "requestedBy": 18,
      "requestedByName": "Trần Văn An (Phụ huynh)",
      "reviewedBy": null,
      "reviewedByName": null,
      "reviewedAt": null,
      "reviewNote": null,
      "createdAt": "2026-11-14T08:30:00Z"
    }
  ]
  ```

---

### 7.2. Lấy chi tiết đơn xin nghỉ theo ID — `GET /api/LeaveRequests/{id}`
- **Quyền truy cập:** Cả 5 vai trò (kiểm tra phân quyền tương tự `GET /api/LeaveRequests`).
- **Response:** `200 OK` (Cấu trúc tương tự item trong danh sách trên).
- **Lỗi có thể trả về:**
  - `403 Forbidden`: Người dùng không có quyền xem đơn này.
  - `404 Not Found`: Không tìm thấy đơn xin nghỉ.

---

### 7.3. Tạo đơn xin nghỉ mới — `POST /api/LeaveRequests`
- **Quyền truy cập & Đối tượng tạo:**
  - `Parent`: Chỉ tạo đơn cho học viên là con mình (`Student.ParentId == userId`).
  - `Student`: Chỉ tạo đơn cho chính mình (`Student.UserId == userId`).
  - `Teacher`: Chỉ tạo đơn xin nghỉ cho chính mình (`TeacherId = userId`).
  - `BranchManager`: Tạo đơn cho học viên hoặc giáo viên thuộc chi nhánh quản lý.
  - `SuperAdmin`: Tạo đơn cho bất kỳ học viên hoặc giáo viên nào.
- **Quy tắc nghiệp vụ & Ràng buộc toàn vẹn dữ liệu:**
  - `requesterType`: Tự động nhận diện nếu không gửi (`"Student"` cho Parent/Student, `"Teacher"` cho Teacher).
  - Khi `requesterType = "Student"`, `StudentId` là bắt buộc, `TeacherId` tự động set `null` (đảm bảo check constraint `CK_Leave_OneRequester`).
  - Khi `requesterType = "Teacher"`, `TeacherId` là bắt buộc, `StudentId` tự động set `null`.
  - Nếu có chọn buổi học (`ScheduleId`): tự động điền `ClassId` và `LeaveDate` tương ứng với buổi học đó nếu client không gửi kèm.
  - Nếu có chọn lớp (`ClassId`): kiểm tra học viên đã đăng ký vào lớp đó chưa (`StudentClasses`), ngăn lỗi FK `FK_Leave_Enrolled`.
  - Chống gửi trùng: Từ chối nếu đã có đơn xin nghỉ ở trạng thái `Pending` cho cùng ngày/buổi học đó (`400 Bad Request`).
- **Request Body:**
  ```json
  {
    "requesterType": "Student",
    "studentId": 24,
    "classId": 5,
    "scheduleId": 101,
    "leaveDate": "2026-11-20",
    "reason": "Học sinh bị sốt cao cần đi khám bác sĩ"
  }
  ```
  *(Đơn của giáo viên xin nghỉ cả ngày:)*
  ```json
  {
    "requesterType": "Teacher",
    "leaveDate": "2026-11-22",
    "reason": "Nghỉ việc gia đình có việc riêng"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "message": "Gửi đơn xin nghỉ thành công!",
    "id": 15
  }
  ```
- **Lỗi có thể trả về:**
  - `400 Bad Request`: Thiếu lý do, ngày nghỉ, học viên/giáo viên không tồn tại, hoặc đã có đơn Pending trùng lặp.
  - `403 Forbidden`: Phụ huynh/học sinh tạo đơn cho người khác, giáo viên tạo đơn cho học viên, hoặc Quản lý cơ sở tạo đơn ngoài phạm vi chi nhánh.

---

### 7.4. Duyệt hoặc Từ chối đơn xin nghỉ — `PUT /api/LeaveRequests/{id}/review`
- **Quyền truy cập:** Chỉ `SuperAdmin` và `BranchManager`.
- **Phân quyền duyệt theo chi nhánh:**
  - `BranchManager` chỉ duyệt đơn thuộc chi nhánh mình (kiểm tra cả `Class.BranchId`, `Student.BranchId` và `Teacher.BranchId` để duyệt được cả đơn của Giáo viên khi `ClassId == null`). Vi phạm trả về `403 Forbidden`.
  - Chỉ duyệt đơn đang ở trạng thái `Pending` (`400 Bad Request` nếu đơn đã duyệt hoặc hủy).
- **Quy tắc Tự động liên kết Điểm danh (`ExcusedAbsent`):**
  - Khi đơn xin nghỉ của học viên (`StudentId != null`) được **Duyệt (`status = "Approved"`)**:
    - Nếu đơn có chỉ định buổi học (`ScheduleId`): Tìm buổi học đó (đảm bảo học viên đang học `Active` trong lớp).
    - Nếu đơn không chỉ định buổi học cụ thể: Tìm tất cả các buổi học trong ngày `leaveDate` mà học viên đang theo học `Active` (thuộc lớp `classId` nếu đơn có chỉ định lớp, hoặc tất cả các lớp của học viên nếu không chọn lớp).
    - Với mỗi buổi học tìm được:
      - Nếu buổi học **đã có bản ghi điểm danh** cho học viên: Tự động cập nhật `Status = "ExcusedAbsent"`, cập nhật `Note = "Nghỉ phép có phép (Đơn #...)"`, `MarkedBy = UserId`, `MarkedAt = DateTime.UtcNow`.
      - Nếu buổi học **chưa có bản ghi điểm danh**: Tự động tạo mới bản ghi `Attendances` với `Status = "ExcusedAbsent"`, `Note = "Nghỉ phép có phép (Đơn #...)"`, `MarkedBy = UserId`, `MarkedAt = DateTime.UtcNow`.
    - Khi giáo viên mở màn hình điểm danh hoặc gọi `GET /api/Attendances`, học viên sẽ hiển thị ngay trạng thái `ExcusedAbsent` (Nghỉ có phép).
- **Request Body:**
  ```json
  {
    "status": "Approved",
    "reviewNote": "Đồng ý cho học viên nghỉ phép"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Đã duyệt đơn xin nghỉ và tự động cập nhật điểm danh (Nghỉ có phép)!"
  }
  ```
- **Lỗi có thể trả về:**
  - `400 Bad Request`: Trạng thái không phải `Approved` hoặc `Rejected`, hoặc đơn không ở trạng thái `Pending`.
  - `403 Forbidden`: `BranchManager` cố tình duyệt đơn thuộc chi nhánh khác, hoặc vai trò không phải Admin/Manager.
  - `404 Not Found`: Không tìm thấy đơn xin nghỉ.

---

### 7.5. Hủy đơn xin nghỉ — `PUT /api/LeaveRequests/{id}/cancel`
- **Quyền truy cập:** Người tạo đơn (`RequestedBy == userId`), `SuperAdmin` hoặc `BranchManager`.
- **Ràng buộc:** Chỉ hủy được đơn đang ở trạng thái `Pending`.
- **Response:** `200 OK`
  ```json
  {
    "message": "Đã hủy đơn xin nghỉ thành công."
  }
  ```

