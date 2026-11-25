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
      "note": "Học bài nét thanh nét đậm",
      "hasAttendance": false
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
  - **Khóa sửa khi đã có điểm danh:** Nếu buổi học đã có dữ liệu điểm danh (`Attendances` tồn tại), không được phép sửa `studyDate`, `startTime`, `endTime`, hoặc `status` -> trả về `400 Bad Request`: `"Buổi học đã có dữ liệu điểm danh, không thể sửa ngày, giờ học hoặc trạng thái."` (vẫn cho phép cập nhật `room`, `substituteTeacherId`, `note`).
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
  - Chỉ tự động chuyển trạng thái buổi học `Schedule.Status` từ `"Scheduled"` thành `"Completed"` khi lớp có học viên đang học (`Active` > 0) và **đã điểm danh đủ toàn bộ học viên `Active`** của lớp trong buổi đó; nếu chỉ điểm danh một phần thì giữ nguyên trạng thái `"Scheduled"`.

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
      "createdAt": "2026-11-10T08:00:00Z",
      "pendingAmount": 500000
    }
  ]
  ```
  *(Trong đó `pendingAmount` là tổng số tiền từ các giao dịch đang ở trạng thái `PendingConfirm`, giúp Frontend hiển thị số tiền đang chờ xác nhận và số tiền thực tế còn có thể nộp `remainingAmount - pendingAmount`).*

---

### 4.2. Lấy chi tiết khoản thu — `GET /api/Tuitions/{id}`
- **Quyền truy cập:** Cùng phân quyền như `GET /api/Tuitions` (chặn Giáo viên, kiểm tra quyền sở hữu đối với Phụ huynh, Học viên và Quản lý cơ sở).
- **Response:** `200 OK` (Cấu trúc tương tự item trong danh sách trên, có kèm `pendingAmount`) hoặc `404 Not Found`, `403 Forbidden`.

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
  - **Cấm hủy khoản thu (`isCancelled = true`) khi đã thu tiền (`paidAmount > 0`):** Nếu khoản thu đã có bất kỳ giao dịch thanh toán nào ở trạng thái `Confirmed` (`paidAmount > 0`) mà người dùng gửi `isCancelled = true`, hệ thống chặn tuyệt đối và trả về `400 Bad Request`:
    `"Không thể hủy khoản học phí (IsCancelled = true) khi đã có giao dịch thanh toán được xác nhận ({paidAmount:N0} đ)."`
  - **Chặn hủy khoản thu khi còn giao dịch chờ duyệt (`PendingConfirm`):** Nếu khoản thu đang có giao dịch `PendingConfirm` và người dùng chọn hủy khoản thu (`isCancelled = true`), trả về `400 Bad Request`:
    `"Khoản học phí này đang có giao dịch chờ xác nhận (PendingConfirm). Vui lòng từ chối/hủy giao dịch chờ duyệt trước khi hủy khoản thu."`
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
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Parent` (Học viên `Student` chỉ được xem học phí, nếu cố tạo giao dịch thanh toán sẽ bị từ chối với `403 Forbidden`: `{"message": "Học viên chỉ có quyền xem học phí, không được phép thực hiện giao dịch thanh toán. Vui lòng liên hệ phụ huynh hoặc trung tâm."}`).
- **Phân luồng trạng thái tự động theo vai trò:**
  - **Nhân viên thu tiền trực tiếp (`SuperAdmin`, `BranchManager`):** Giao dịch tự động có trạng thái `"Confirmed"`, gán `confirmedBy` là tài khoản hiện tại, `confirmedAt` là thời điểm hiện tại. Hệ thống tự động tạo Thông báo (`Notification`) gửi vào chuông của Phụ huynh học viên (`tuition.Student.ParentId`).
  - **Phụ huynh nộp qua App (`Parent`):** Giao dịch có trạng thái `"PendingConfirm"`, `confirmedBy: null` để Quản lý cơ sở kiểm tra sao kê ngân hàng và duyệt. Ngay khi tạo giao dịch `"PendingConfirm"`, hệ thống tự động tạo Thông báo (`Type = "Payment"`, `RefId = payment.Id`, `Title = "Có thanh toán mới cần xác nhận"`, `Body` kèm tên học viên, tên khoản thu, số tiền và mã GD nếu có) gửi tới mọi tài khoản đang hoạt động (`IsActive == true`) có vai trò `SuperAdmin` hoặc `BranchManager` thuộc cùng chi nhánh (`BranchId == tuition.BranchId`). Khi duyệt/từ chối qua `PUT /api/Payments/{id}/confirm`, hệ thống cũng tự động tạo Thông báo gửi tới Phụ huynh.
- **Kiểm soát chặn Overpay & chặn nộp trùng khi có giao dịch đang chờ xác nhận (`PendingConfirm`):**
  - Số tiền thanh toán `amount > 0`.
  - Khoản thu phải tồn tại và chưa bị hủy (`IsCancelled == false`).
  - Tính cả `currentConfirmedPaid` (`Status == "Confirmed"`) VÀ `currentPendingPaid` (`Status == "PendingConfirm"`).
  - `netAmount = Amount - Discount`.
  - `availableToPay = Math.Max(0, netAmount - currentConfirmedPaid - currentPendingPaid)`.
  - Nếu `netAmount - currentConfirmedPaid <= 0`: Trả ngay `400 Bad Request`: `"Khoản học phí này đã được thanh toán đầy đủ, không thể nộp thêm."`
  - Nếu `availableToPay <= 0` (đang có giao dịch `PendingConfirm` chiếm hết số tiền còn nợ): Trả ngay `400 Bad Request`: `"Khoản học phí này đang có giao dịch chờ xác nhận ({currentPendingPaid:N0} đ) vừa đủ số tiền còn nợ. Vui lòng chờ nhân viên duyệt hoặc hủy giao dịch chờ trước khi tạo thanh toán mới."`
  - Nếu `amount > availableToPay`: Trả ngay `400 Bad Request` kèm chi tiết `netAmount`, `currentConfirmedPaid`, `currentPendingPaid` — **chặn tuyệt đối việc nộp trùng chờ duyệt và lỗi 500 từ SQL trigger `TR_Payments_NoOverpay`**.

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

### 5.5. Hủy (Void) giao dịch thanh toán đang chờ duyệt — `PUT /api/Payments/{id}/cancel` (hoặc `PUT /api/Payments/{id}/void`)
Dành cho Quản lý chi nhánh hoặc SuperAdmin hủy một giao dịch đang ở trạng thái chờ xác nhận (`PendingConfirm`) khi tạo nhầm hoặc phụ huynh gửi nhầm.

- **Quyền truy cập:** `SuperAdmin`, `BranchManager` (chỉ chi nhánh mình).
- **Ràng buộc nghiệp vụ:**
  - Chỉ cho phép hủy khi `payment.Status == "PendingConfirm"`. Nếu ở trạng thái khác -> trả về `400 Bad Request`: `"Chỉ có thể hủy (void) giao dịch đang ở trạng thái Chờ xác nhận (PendingConfirm)."`
  - **Bắt buộc nhập lý do hủy (`reason` hoặc `note`):** Nếu thiếu lý do -> trả về `400 Bad Request`: `"Vui lòng nhập lý do hủy giao dịch thanh toán."`
  - Cập nhật trạng thái giao dịch sang `"Rejected"` (khớp `CK_Payments_Status`), ghi nhận `confirmedBy`, `confirmedAt` (khớp `CK_Payments_Reviewed`), lưu `note = "[Hủy giao dịch]: {reason}"` và gửi `Notification` cho phụ huynh.
- **Request Body:**
  ```json
  {
    "reason": "Phụ huynh nhập sai số tiền chuyển khoản, hủy để tạo lại"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Đã hủy giao dịch thanh toán đang chờ duyệt.",
    "id": 51,
    "status": "Rejected"
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
  - Cập nhật trạng thái `status = "Submitted"`, ghi nhận `submittedAt = UTC`, cập nhật `submissionUrl` và `studentNote`.
  - **Không xóa điểm & lời phê cũ khi nộp lại:** Nếu bài nộp đã từng được giáo viên chấm trước đó (`Reviewed`), hệ thống **giữ nguyên** `score`, `teacherFeedback` và `reviewedAt` cũ để giáo viên và phụ huynh/học viên vẫn đối chiếu được điểm + lời phê trước đó cho tới khi giáo viên chấm lại.
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
    "message": "Nộp bài thành công! Bài nộp mới đã được gửi chờ giáo viên chấm lại, điểm và nhận xét cũ vẫn được giữ nguyên.",
    "score": 8.0,
    "teacherFeedback": "Cần sửa lại câu 2",
    "reviewedAt": "2026-11-15T15:30:00Z",
    "status": "Submitted"
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
- **Quy tắc Tự động liên kết Điểm danh (`ExcusedAbsent`) khi duyệt đơn Học viên (`StudentId != null`):**
  - Khi đơn xin nghỉ của học viên được **Duyệt (`status = "Approved"`)**:
    - Nếu đơn có chỉ định buổi học (`ScheduleId`): Tìm buổi học đó (đảm bảo học viên đang học `Active` trong lớp).
    - Nếu đơn không chỉ định buổi học cụ thể: Tìm tất cả các buổi học trong ngày `leaveDate` mà học viên đang theo học `Active` (thuộc lớp `classId` nếu đơn có chỉ định lớp, hoặc tất cả các lớp của học viên nếu không chọn lớp).
    - Với mỗi buổi học tìm được:
      - Nếu buổi học **đã được điểm danh trước đó** (đã có bản ghi và `Status` khác rỗng như `Present`, `Late`, ...): **giữ nguyên**, không ghi đè; tăng bộ đếm `attendanceSkipped` và ghi nhận ngày vào `skippedDates`.
      - Nếu buổi học **chưa có bản ghi điểm danh** (hoặc `Status` rỗng): Tự động tạo mới/cập nhật bản ghi `Attendances` với `Status = "ExcusedAbsent"`, `Note = "Nghỉ phép có phép (Đơn #{id}: ...) [Prev:NONE]"`, `MarkedBy = UserId`, `MarkedAt = DateTime.UtcNow`, và tăng `attendanceUpdated`.
  - Khi đơn bị **Từ chối (`status = "Rejected"`)**: giữ nguyên điểm danh, không tạo bản ghi vắng.
- **Quy tắc Tự động xử lý Buổi học khi duyệt đơn Giáo viên (`TeacherId != null`):**
  - Khi đơn xin nghỉ của giáo viên được **Duyệt (`status = "Approved"`)**:
    - Tìm tất cả buổi học bị ảnh hưởng (theo `ScheduleId` nếu có, hoặc các buổi học `Status == "Scheduled"` trong ngày `leaveDate` mà giáo viên đó dạy chính hoặc dạy thay).
    - Nếu giáo viên xin nghỉ đang là giáo viên dạy thay (`SubstituteTeacherId == teacherId`): Gỡ `SubstituteTeacherId = null`.
    - Với các buổi học đang ở trạng thái `"Scheduled"` mà chưa có giáo viên dạy thay khác (`SubstituteTeacherId == null`): Chuyển trạng thái buổi học sang **`Status = "Cancelled"`** (Tạm hoãn chờ xếp dạy thay / học bù) và nối ghi chú `"[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{id}]"` vào `Schedule.Note`. Nhờ đó buổi học không còn ở trạng thái `Scheduled` với giáo viên đang nghỉ và nhân viên nhìn vào lịch thấy ngay nhãn cần xếp dạy thay.
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
    "message": "Đã duyệt đơn xin nghỉ và tự động cập nhật điểm danh (Nghỉ có phép)!",
    "attendanceUpdated": 1,
    "attendanceSkipped": 0,
    "skippedDates": []
  }
  ```
- **Lỗi có thể trả về:**
  - `400 Bad Request`: Trạng thái không phải `Approved` hoặc `Rejected`, hoặc đơn không ở trạng thái `Pending`.
  - `403 Forbidden`: `BranchManager` cố tình duyệt đơn thuộc chi nhánh khác, hoặc vai trò không phải Admin/Manager.
  - `404 Not Found`: Không tìm thấy đơn xin nghỉ.

---

### 7.5. Hủy đơn xin nghỉ (Chờ duyệt hoặc Đã duyệt) — `PUT /api/LeaveRequests/{id}/cancel`
- **Quyền truy cập & Ràng buộc theo trạng thái đơn:**
  1. **Khi đơn đang ở trạng thái `Pending` (Chờ duyệt):**
     - Người tạo đơn (`RequestedBy == userId`), `SuperAdmin` hoặc `BranchManager` (đúng chi nhánh) đều được hủy.
     - Không bắt buộc gửi body lý do hủy.
  2. **Khi đơn đã ở trạng thái `Approved` (Đã duyệt):**
     - **Chỉ `SuperAdmin` hoặc `BranchManager` (đúng chi nhánh)** mới được phép hủy đơn đã duyệt (`403 Forbidden` nếu vai trò khác).
     - **Bắt buộc nhập lý do hủy (`reason`):** Nếu thiếu lý do -> trả về `400 Bad Request`: `"Vui lòng nhập lý do hủy đơn xin nghỉ đã được phê duyệt."`
     - Ghi nhận lý do hủy vào `ReviewNote`: `"[Đã hủy đơn đã duyệt: {reason}]"`, cập nhật `ReviewedBy` và `ReviewedAt`.
     - **Tự động hoàn tác dữ liệu liên quan:**
       - **Đơn của Học viên:** Tìm các bản ghi `Attendances` có `Status == "ExcusedAbsent"` gắn với `Đơn #{id}`. Nếu trước khi duyệt học viên chưa điểm danh (`[Prev:NONE]`), xóa bản ghi `Attendance` để trở về trạng thái chưa điểm danh; nếu trước đó đã có trạng thái (`[Prev:Present]`, `[Prev:Late]`, ...), khôi phục lại đúng `Status` cũ.
       - **Đơn của Giáo viên:** Tìm các buổi học có gắn tag `"[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{id}]"`, khôi phục `Status = "Scheduled"` và gỡ tag khỏi `Schedule.Note`.
- **Request Body (Tùy chọn khi `Pending`, Bắt buộc khi `Approved`):**
  ```json
  {
    "reason": "Học viên đã hết sốt và đi học lại bình thường"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Đã hủy đơn xin nghỉ thành công."
  }
  ```

---

## 8. PHÂN HỆ CƠ SỞ / CHI NHÁNH (BRANCHES API)

Quản lý danh sách các cơ sở (chi nhánh) của Roxy Academy kèm thống kê nhanh số lớp đang mở, học viên đang học và giáo viên đang hoạt động tại từng cơ sở.

### Cấu trúc dữ liệu `BranchDto`
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `int` | Mã định danh cơ sở |
| `branchName` | `string` | Tên cơ sở (tối đa 150 ký tự) |
| `address` | `string` | Địa chỉ cơ sở (tối đa 300 ký tự) |
| `phone` | `string?` | Số điện thoại liên hệ (tối đa 20 ký tự, có thể `null`) |
| `isActive` | `bool` | Trạng thái hoạt động (`true`: Đang hoạt động, `false`: Ngừng hoạt động) |
| `createdAt` | `DateTime` | Thời điểm tạo bản ghi (UTC) |
| `classCount` | `int` | Số lớp đang mở tại cơ sở (`Classes.BranchId == Id && Classes.Status != "Finished"`) |
| `studentCount` | `int` | Số học viên đang theo học tại cơ sở (`Students.BranchId == Id && Students.Status == "Active"`) |
| `teacherCount` | `int` | Số giáo viên đang hoạt động tại cơ sở (`Users.BranchId == Id && Users.Role == "Teacher" && Users.IsActive == true`) |

---

### 8.1. Lấy danh sách cơ sở — `GET /api/Branches`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "branchName": "Cơ sở Bình Trưng Tây",
      "address": "123 Nguyễn Duy Trinh, P. Bình Trưng, TP.HCM",
      "phone": "0326 538 824",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "classCount": 8,
      "studentCount": 95,
      "teacherCount": 6
    }
  ]
  ```

---

### 8.2. Lấy chi tiết 1 cơ sở — `GET /api/Branches/{id}`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Response:**
  - `200 OK`: Trả về object `BranchDto` (bao gồm `classCount`, `studentCount`, `teacherCount`).
  - `404 Not Found`: `{ "message": "Không tìm thấy cơ sở này." }`

---

### 8.3. Tạo cơ sở mới — `POST /api/Branches`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Request Body:**
  ```json
  {
    "branchName": "Cơ sở Bình Trưng Đông",
    "address": "456 Lê Văn Thịnh, P. Bình Trưng, TP.HCM",
    "phone": "0326 538 824"
  }
  ```
- **Validation:**
  - `branchName`: Bắt buộc, tối đa 150 ký tự.
  - `address`: Bắt buộc, tối đa 300 ký tự.
  - `phone`: Tùy chọn, tối đa 20 ký tự.
- **Response:**
  - `201 Created`: Trả về `BranchDto` vừa tạo (với `isActive: true`, `classCount: 0`, `studentCount: 0`, `teacherCount: 0`) cùng header `Location`.
  - `400 Bad Request`: Dữ liệu đầu vào không hợp lệ.
  - `403 Forbidden`: Không có quyền `SuperAdmin`.

---

### 8.4. Cập nhật thông tin cơ sở — `PUT /api/Branches/{id}`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Request Body:**
  ```json
  {
    "branchName": "Cơ sở Bình Trưng Tây (Mới)",
    "address": "123 Nguyễn Duy Trinh, P. Bình Trưng, TP.HCM",
    "phone": "0326 538 824",
    "isActive": true
  }
  ```
- **Ràng buộc nghiệp vụ khi ngừng hoạt động (`branch.IsActive == true && req.IsActive == false`):**
  - Hệ thống kiểm tra 7 điều kiện chặn thuộc chi nhánh:
    1. Lớp đang mở (`Classes.Status != "Finished"`)
    2. Học viên đang học (`Students.Status == "Active"`)
    3. Giáo viên đang hoạt động (`Role == "Teacher" && BranchId == id && IsActive`)
    4. Học phí chưa thu đủ (`!IsCancelled` và tổng `Confirmed` < `Amount - Discount`)
    5. Thanh toán chờ xác nhận (`PendingConfirm`)
    6. Đơn nghỉ phép chờ duyệt (`Pending` theo `Class.BranchId`, `Student.BranchId`, hoặc `Teacher.BranchId`)
    7. Bài nộp bài tập chưa nộp (`HomeworkSubmissions.Status == "Pending"`)
  - Nếu còn bất kỳ ràng buộc nào, từ chối ngừng hoạt động và trả về `409 Conflict` kèm `message` liệt kê rõ từng lý do và mảng `reasons`:
    ```json
    {
      "message": "Không thể ngừng hoạt động chi nhánh vì còn: 2 lớp đang mở; 5 học viên đang học. Vui lòng xử lý toàn bộ trước khi ngừng chi nhánh.",
      "reasons": ["2 lớp đang mở", "5 học viên đang học"]
    }
    ```
- **Response:**
  - `204 No Content`: Cập nhật thành công.
  - `409 Conflict`: Vi phạm ràng buộc ngừng hoạt động (còn lớp/học viên/giáo viên/công nợ/đơn chờ/bài tập).
  - `403 Forbidden`: Không có quyền `SuperAdmin`.
  - `404 Not Found`: `{ "message": "Không tìm thấy cơ sở này." }`

---

### 8.5. Ngừng hoạt động cơ sở (Soft Delete) — `DELETE /api/Branches/{id}`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Cơ chế:** Xóa mềm bằng cách đặt `IsActive = false` để bảo toàn dữ liệu lịch sử và khóa ngoại.
- **Ràng buộc nghiệp vụ:**
  - Áp dụng cùng 7 kiểm tra ràng buộc như `PUT /api/Branches/{id}` khi ngừng hoạt động (`ValidateBranchDeactivationAsync`).
  - Nếu còn ràng buộc, trả về `409 Conflict` với `message` và mảng `reasons`.
- **Response:**
  - `204 No Content`: Ngừng hoạt động thành công.
  - `409 Conflict`: Chi nhánh còn dữ liệu đang hoạt động / chưa xử lý xong.
  - `403 Forbidden`: Không có quyền `SuperAdmin`.
  - `404 Not Found`: `{ "message": "Không tìm thấy cơ sở này." }`

---

## 9. PHÂN HỆ LỚP HỌC & ĐĂNG KÝ LỚP (CLASSES & STUDENTCLASSES API)

> **Vị trí trên Admin Web (`roxy-admin`):** Luồng **"Phụ huynh tự đăng ký lớp cho con"** được đặt tại **Trang Học viên (`/students`)** và **chỉ hiển thị cho vai trò `Parent`**. Các vai trò `SuperAdmin`, `BranchManager`, `Teacher`, `Student` không thấy nút đăng ký hay khu vực đơn đăng ký lớp của phụ huynh tại trang này.

### 9.1. Lấy danh sách lớp học (`GET /api/Classes`) & Lớp đang mở đăng ký (`GET /api/Classes/open-for-registration`)
- **Quyền truy cập:**
  - `GET /api/Classes`: Đã đăng nhập (lọc theo chi nhánh / giáo viên / con / học viên).
  - `GET /api/Classes/open-for-registration`: `SuperAdmin`, `BranchManager`, `Parent`.
- **Phân quyền dữ liệu (`open-for-registration`):**
  - Chỉ lấy các lớp có `IsOpenForRegistration == true` và `Status != "Finished"`.
  - `SuperAdmin`: Xem tất cả lớp đang mở đăng ký.
  - `BranchManager`: Tự động giới hạn trong cơ sở mình quản lý (`Class.BranchId == userBranchId`).
  - `Parent`: Chỉ trả về các lớp đang mở đăng ký thuộc cùng cơ sở với con đang hoạt động của phụ huynh (`Student.ParentId == UserId && Student.Status != "Dropped" && Student.BranchId == Class.BranchId`).
- **Response:** `200 OK` (`IEnumerable<ClassDto>`, bao gồm `activeStudentsCount` là sĩ số học viên `Active` hiện tại)
  ```json
  [
    {
      "id": 5,
      "className": "Luyện chữ đẹp K01",
      "courseId": 2,
      "courseName": "Luyện chữ đẹp",
      "teacherId": 12,
      "teacherName": "Cô Nguyễn Thị Mai",
      "branchId": 1,
      "branchName": "Cơ sở Bình Trưng Tây",
      "classType": "Group",
      "maxStudents": 15,
      "startDate": "2026-11-20",
      "endDate": null,
      "tuitionFee": 2500000,
      "isOpenForRegistration": true,
      "status": "Upcoming",
      "note": null,
      "createdAt": "2026-11-01T08:00:00Z",
      "activeStudentsCount": 10
    }
  ]
  ```

---

### 9.2. Tạo lớp học mới — `POST /api/Classes`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Ràng buộc nghiệp vụ:**
  - `className`: Không trùng tên lớp đã có (`409 Conflict`).
  - `courseId`: Khóa học phải tồn tại và đang hoạt động (`IsActive == true`). Nếu khóa học đã ngừng hoạt động -> `400 Bad Request`: `"Khóa học đã ngừng hoạt động, không thể tạo lớp mới."`
  - `branchId`: Cơ sở phải tồn tại và đang hoạt động (`IsActive == true`). Nếu cơ sở đã ngừng hoạt động -> `400 Bad Request`: `"Cơ sở đã ngừng hoạt động, không thể tạo lớp mới."`
  - `teacherId`: Tài khoản phải tồn tại, có `Role == "Teacher"` và đang hoạt động (`IsActive == true`). Nếu giáo viên bị khóa -> `400 Bad Request`: `"Không thể phân công giáo viên đang bị khóa tài khoản (IsActive = false)."`
  - `classType`: Nhận `"Group"` (mặc định) hoặc `"OneToOne"` (khớp `CK_Classes_Type`).

---

### 9.3. Cập nhật lớp học — `PUT /api/Classes/{id}`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Các quy tắc chặn khi sửa lớp (`400 Bad Request`):**
  1. **Không gán giáo viên đã khóa (`IsActive == false`):** Nếu tài khoản giáo viên bị khóa -> `"Không thể gán giáo viên đã bị khóa tài khoản (IsActive = false)."`
  2. **Không hạ sĩ số tối đa (`maxStudents`) xuống dưới sĩ số đang theo học (`activeStudentsCount`):** Nếu `maxStudents < activeStudentsCount` -> `"Không thể hạ sĩ số tối đa ({maxStudents}) xuống dưới sĩ số học viên đang theo học hiện tại ({activeStudentsCount} học viên)."`
  3. **Không đổi trạng thái từ `Finished` quay lại `Ongoing` / `Upcoming`:** Nếu lớp đã `Finished` và gửi `status != "Finished"` -> `"Lớp học đã kết thúc (Finished), không thể chuyển trạng thái quay lại Đang học (Ongoing)."`
  4. **Không đổi học phí của lớp (`tuitionFee`) khi đã có học phí phát sinh:** Nếu `tuitionFee` thay đổi và lớp đã có bản ghi `Tuitions` (`!IsCancelled`) -> `"Không thể thay đổi học phí của lớp khi đã có khoản thu học phí phát sinh cho lớp này."`
- **Quy tắc phân quyền khi Đổi giáo viên phụ trách (`teacherId`):**
  - Toàn bộ các API phân quyền giáo viên (`Classes`, `Schedules`, `Attendances`, `Homeworks`, `HomeworkSubmissions`, `LessonProgresses`, `Students`, `StudentClasses`, `Dashboard`) đều kiểm tra động theo `Class.TeacherId == UserId` trong database hiện tại (không cache quyền cũ).
  - **Giáo viên mới** được xem toàn bộ lịch sử lớp (kể cả bài đã chấm, tiến độ bài học, điểm danh trước khi nhận lớp) để tiếp tục giảng dạy.
  - **Giáo viên cũ** mất quyền truy cập lớp ngay lập tức khi bị thay thế.

---

### 9.4. Xóa / Đóng lớp học (Soft Delete) — `DELETE /api/Classes/{id}`
- **Quyền truy cập:** Chỉ `SuperAdmin`.
- **Kiểm tra 4 điều kiện chặn trước khi đóng lớp:**
  1. Còn học viên đang theo học (`StudentClasses.Status == "Active"`): `"còn {n} học viên đang theo học (Active)"`
  2. Còn lịch học tương lai chưa diễn ra (`Schedules.Status == "Scheduled" && StudyDate >= today`): `"còn {n} lịch học tương lai chưa diễn ra"`
  3. Còn bài tập chưa kết thúc hạn nộp hoặc còn bài nộp chưa chấm xong (`HomeworkSubmissions.Status != "Reviewed"`): `"còn {n} bài tập chưa kết thúc hoặc chưa chấm xong"`
  4. Còn khoản học phí chưa thu đủ (`!IsCancelled && PaidAmount < Amount - Discount`): `"còn {n} khoản học phí chưa thu đủ"`
- Nếu vi phạm bất kỳ điều kiện nào, hệ thống chặn đóng lớp và trả về `400 Bad Request` liệt kê đầy đủ các lý do:
  ```json
  {
    "message": "Không thể xóa/đóng lớp học \"Luyện chữ đẹp K01\" vì: còn 10 học viên đang theo học (Active); còn 4 lịch học tương lai chưa diễn ra. Vui lòng xử lý hoàn tất trước khi đóng lớp.",
    "reasons": [
      "còn 10 học viên đang theo học (Active)",
      "còn 4 lịch học tương lai chưa diễn ra"
    ]
  }
  ```
- Khi thỏa mãn cả 4 điều kiện, hệ thống đóng đăng ký (`IsOpenForRegistration = false`) và chuyển `Status = "Finished"`, trả về `204 No Content`.

---

### 9.5. Lấy danh sách đơn đăng ký lớp — `GET /api/StudentClasses`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Phân quyền dữ liệu (Scoping):**
  - `Parent`: Chỉ xem đơn đăng ký của các con mình (`Student.ParentId == UserId`).
  - `Student`: Chỉ xem đơn đăng ký của chính mình.
  - `Teacher`: Chỉ xem đơn đăng ký của các lớp mình phụ trách.
  - `BranchManager`: Chỉ xem đơn đăng ký thuộc cơ sở mình.
  - `SuperAdmin`: Xem toàn bộ.
- **Query Parameters (Tùy chọn):**
  - `studentId` (int, optional): Lọc đơn đăng ký theo mã học viên (trên trang `/students`, `Parent` gọi `GET /api/StudentClasses?studentId=...` khi lọc theo từng con hoặc `GET /api/StudentClasses` để xem tất cả các con).
  - `classId` (int, optional): Lọc theo mã lớp học.
- **Response:** `200 OK` (`IEnumerable<StudentClassDto>`)
  ```json
  [
    {
      "id": 31,
      "studentId": 20,
      "studentName": "Trần Bảo Nam",
      "classId": 5,
      "className": "Luyện chữ đẹp K01",
      "status": "Pending",
      "registeredAt": "2026-11-16T09:30:00Z",
      "approvedBy": null,
      "approvedByName": null,
      "approvedAt": null,
      "note": "Mong muốn học ca sáng cuối tuần"
    }
  ]
  ```
- **Các giá trị `status`:**
  - `Pending`: Chờ duyệt (mặc định khi `Parent` tự đăng ký)
  - `Active`: Đã duyệt / Đang học
  - `Rejected`: Từ chối
  - `Completed`: Hoàn thành
  - `Dropped`: Ngừng học

---

### 9.6. Phụ huynh gửi đơn đăng ký lớp cho con — `POST /api/StudentClasses`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`, `Parent`.
- **Luồng gọi của `Parent` tại `/students`:**
  1. Tải danh sách lớp đang mở từ `GET /api/Classes/open-for-registration`.
  2. Chọn con (loại trừ bé có trạng thái `Dropped`; tự động chọn nếu chỉ có 1 bé), lọc lớp có `isOpenForRegistration === true` và cùng `branchId` với con.
  3. Gửi `POST /api/StudentClasses` với `{ studentId, classId, note }`.
  4. Khi `Parent` gọi, backend tạo bản ghi ở trạng thái `Pending` (Chờ duyệt); nếu `SuperAdmin`/`BranchManager` gọi thì duyệt thẳng sang `Active`.
  5. Sau khi tạo thành công, Frontend reload lại danh sách đơn đăng ký qua `GET /api/StudentClasses?studentId=...`.
- **Request Body:**
  ```json
  {
    "studentId": 20,
    "classId": 5,
    "note": "Mong muốn học ca sáng cuối tuần"
  }
  ```
- **Response:**
  - `200 OK`: `{ "message": "Đăng ký thành công!", "id": 31 }` (với `Parent`, đơn ở trạng thái `Pending`).
  - `400 Bad Request`: Học viên không tồn tại / `Dropped`, lớp không tồn tại / không mở đăng ký, hoặc học viên và lớp khác cơ sở.
  - `403 Forbidden`: `Parent` cố tình gửi `studentId` không phải con mình (`"Bạn chỉ có thể đăng ký lớp cho con của mình."`).
  - `409 Conflict`: Học viên đã đăng ký lớp này rồi (Frontend hiển thị thông báo rõ ràng có cụm `"đã đăng ký lớp này rồi"`).

---

## 10. PHÂN HỆ KHÓA HỌC (COURSES API)

Quản lý danh mục khóa học của Roxy Academy (Tiền tiểu học, Luyện chữ đẹp, Tư duy logic, Gia sư...).

### 10.1. Lấy danh sách khóa học — `GET /api/Courses`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "courseCode": "TTH",
      "courseName": "Tiền tiểu học",
      "description": "Hành trang vững chắc vào lớp 1 cho bé",
      "totalSessions": 24,
      "defaultFee": 3000000,
      "isActive": true,
      "createdAt": "2026-11-01T00:00:00Z"
    }
  ]
  ```

---

### 10.2. Lấy chi tiết khóa học — `GET /api/Courses/{id}`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Response:** `200 OK` hoặc `404 Not Found` (`{"message": "Không tìm thấy khóa học này."}`).

---

### 10.3. Thêm khóa học mới — `POST /api/Courses`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc:** Nếu có `courseCode`, kiểm tra không trùng mã khóa học đã có trong hệ thống (`409 Conflict`).
- **Request Body:**
  ```json
  {
    "courseCode": "LCD-01",
    "courseName": "Luyện chữ đẹp",
    "description": "Rèn chữ viết chuẩn và tư thế ngồi học đúng",
    "totalSessions": 12,
    "defaultFee": 2500000
  }
  ```
- **Response:** `201 Created`

---

### 10.4. Cập nhật khóa học — `PUT /api/Courses/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc:** Kiểm tra mã `courseCode` không trùng với khóa học khác (`409 Conflict`).
- **Request Body:**
  ```json
  {
    "courseCode": "LCD-01",
    "courseName": "Luyện chữ đẹp & Rèn nếp",
    "description": "Rèn chữ viết chuẩn và tư thế ngồi học đúng",
    "totalSessions": 12,
    "defaultFee": 2500000,
    "isActive": true
  }
  ```
- **Response:** `204 NoContent` hoặc `404 Not Found`, `409 Conflict`.

---

### 10.5. Xóa (vô hiệu hóa) khóa học — `DELETE /api/Courses/{id}`
- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
- **Ràng buộc nghiệp vụ:**
  - Nếu khóa học đang có lớp học đang mở (`Status != "Finished"` hoặc `IsOpenForRegistration == true`) -> Chặn xóa và trả về `400 Bad Request`: `{"message": "Không thể xóa khóa học đang có lớp học đang mở hoặc đang diễn ra."}`.
  - Khi xóa hợp lệ, hệ thống thực hiện soft delete (`IsActive = false`).
- **Response:** `204 NoContent` hoặc `400 Bad Request`, `404 Not Found`.

---

## 11. PHÂN HỆ THÔNG BÁO (NOTIFICATIONS API)

Quản lý thông báo cá nhân cho người dùng (học phí, lịch học, duyệt đăng ký...). Dữ liệu được bảo mật strictly theo `UserId` của người đăng nhập.

### 11.1. Lấy danh sách thông báo của tôi — `GET /api/Notifications`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Phân quyền dữ liệu (Scoping):** Tự động lọc strictly theo `UserId == User.GetUserId()`, không lộ chéo giữa các tài khoản/vai trò.
- **Query Parameters:**
  - `unreadOnly` (bool, optional): Lọc chỉ lấy thông báo chưa đọc (`true`).
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "userId": 10,
      "title": "Biên nhận học phí mới",
      "body": "Khoản thanh toán 1,000,000 đ cho 'Học phí Khóa Luyện chữ đẹp tháng 11/2026' của học viên Trần Bảo Nam đã được ghi nhận.",
      "type": "Tuition",
      "refId": 15,
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-11-16T10:00:00Z"
    }
  ]
  ```

---

### 11.2. Đánh dấu 1 thông báo đã đọc — `PUT /api/Notifications/{id}/read`
- **Quyền truy cập:** Đã đăng nhập.
- **Phân quyền dữ liệu:** Chỉ đánh dấu thông báo thuộc về chính `UserId` của user đăng nhập. Nếu không khớp hoặc không tồn tại -> trả `404 Not Found`.
- **Response:** `204 NoContent`

---

### 11.3. Đánh dấu tất cả thông báo đã đọc — `PUT /api/Notifications/read-all`
- **Quyền truy cập:** Đã đăng nhập.
- **Phân quyền dữ liệu:** Tự động cập nhật `isRead = true` cho tất cả thông báo chưa đọc của user hiện tại (`UserId == User.GetUserId()`).
- **Response:** `200 OK` (`{"message": "Đã đánh dấu đọc tất cả!"}`)

---

## 12. CHECKLIST BẢO MẬT SEED PRODUCTION (POST-DEPLOY CHECKLIST)

Trong `Program.cs`, cơ chế tự động khởi tạo tài khoản `SuperAdmin` mặc định (`PhoneNumber = "0900000000"`) chỉ kích hoạt khi:
1. Cấu hình `Seed:AdminPassword` (hoặc biến môi trường `Seed__AdminPassword`) có giá trị khác rỗng (`!string.IsNullOrWhiteSpace(seedPassword)`).
2. Bảng `Users` chưa có bất kỳ tài khoản nào mang vai trò `SuperAdmin`.

Trên môi trường không phải Development (`!app.Environment.IsDevelopment()`), nếu `Seed:AdminPassword` vẫn còn tồn tại, ứng dụng sẽ ghi log cảnh báo bảo mật mức `Warning` (`CẢNH BÁO BẢO MẬT [PRODUCTION]`).

**Quy trình bắt buộc khi triển khai Production (Go-Live):**
- [ ] **Bước 1:** Chỉ đặt `Seed__AdminPassword` trong biến môi trường / `web.config` ở lần khởi chạy đầu tiên nếu DB chưa có tài khoản `SuperAdmin`.
- [ ] **Bước 2:** Đăng nhập ngay bằng tài khoản `SuperAdmin` vừa khởi tạo và đổi mật khẩu mạnh qua API (`POST /api/Auth/change-password`).
- [ ] **Bước 3 (Quan trọng):** **XÓA NGAY** biến `Seed:AdminPassword` (`Seed__AdminPassword`) khỏi `web.config` / biến môi trường trên server Production và khởi động lại App Pool để đảm bảo tài khoản gốc không bao giờ bị tự động tạo lại nếu DB trống hoặc có sự cố dữ liệu.

---

## 13. ĐỔI MẬT KHẨU & SEED DANH MỤC (AUTH & SEED API)

### 13.1. Đổi mật khẩu cá nhân — `POST /api/Auth/change-password`
Cho phép người dùng đang đăng nhập tự đổi mật khẩu của chính mình (lấy `Id` từ JWT claim `sub`).

- **Quyền truy cập:** Đã đăng nhập (`[Authorize]` — mọi vai trò `SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123",
    "newPassword": "NewStrongPassword456"
  }
  ```
  - `currentPassword` (string, required, max 100): Mật khẩu hiện tại.
  - `newPassword` (string, required, min 8, max 100): Mật khẩu mới (tối thiểu 8 ký tự).
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Đổi mật khẩu thành công."
    }
    ```
  - `400 Bad Request`:
    - Dữ liệu đầu vào không hợp lệ (thiếu trường hoặc `newPassword` < 8 ký tự).
    - Tài khoản chưa có mật khẩu hoặc `currentPassword` không khớp:
      ```json
      {
        "message": "Mật khẩu hiện tại không đúng."
      }
      ```
  - `401 Unauthorized`: Chưa đăng nhập hoặc tài khoản không tồn tại / đã bị khóa (`IsActive = false`).

---

### 13.2. Seed danh mục tối thiểu (2 chi nhánh + 8 khóa học) — `POST /api/Seed/catalog`
Khởi tạo danh mục cơ bản gồm **2 chi nhánh tại P. Bình Trưng, TP.HCM** và **8 khóa học chuẩn** của Roxy Academy theo cơ chế idempotent (kiểm tra trùng theo `BranchName` và `CourseName`, chưa có mới chèn). Tuyệt đối không tạo học viên, giáo viên, phụ huynh hay tài khoản giả.

- **Quyền truy cập:** `SuperAdmin` (`[Authorize(Roles = "SuperAdmin")]`).
- **Request Body:** Không yêu cầu.
- **Response:**
  - `200 OK`:
    ```json
    {
      "branchesAdded": 2,
      "coursesAdded": 8,
      "totalBranches": 2,
      "totalCourses": 8
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Không phải `SuperAdmin`.

### 13.3. Hướng dẫn chạy SQL Seed thủ công (`RoxyAppDB.Seed.Catalog.sql`)
Ngoài endpoint `POST /api/Seed/catalog`, có thể chạy trực tiếp script idempotent `RoxyAppDB.Seed.Catalog.sql` ở thư mục gốc repo sau khi đã tạo schema từ `RoxyAppDB.sql`:

- **Qua SSMS / Azure Data Studio:** Mở kết nối tới database `RoxyAcademy`, mở file `RoxyAppDB.Seed.Catalog.sql` và nhấn **Execute**. Script dùng `IF NOT EXISTS` theo `BranchName` / `CourseName` nên chạy lại nhiều lần không bị nhân đôi dữ liệu.
- **Qua `sqlcmd`:**
  ```bash
  sqlcmd -S <SERVER_HOST> -d RoxyAcademy -U <USER> -P <PASSWORD> -i RoxyAppDB.Seed.Catalog.sql -f 65001
  ```

---

## 14. PHÂN HỆ TỔNG QUAN (DASHBOARD API)

### 14.1. Lấy dữ liệu tổng quan — `GET /api/Dashboard/summary`
- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`).
- **Phân quyền dữ liệu (Scoping theo vai trò):**
  - `SuperAdmin`: toàn hệ thống.
  - `BranchManager`: lọc theo `BranchId` của quản lý.
  - `Teacher`: chỉ lớp mình dạy chính (`Class.TeacherId == UserId`) hoặc dạy thay (`SubstituteTeacherId == UserId`); trường `tuition` trả về `null`.
  - `Parent`: chỉ học viên là con mình (`Student.ParentId == UserId`).
  - `Student`: chỉ chính mình (`Student.UserId == UserId`).
- **Response:** `200 OK` (`DashboardSummaryDto`)
  ```json
  {
    "overview": {
      "activeStudents": 42,
      "ongoingClasses": 6,
      "upcomingClasses": 1,
      "activeTeachers": 8,
      "pendingLeaveRequests": 2
    },
    "tuition": {
      "month": 11,
      "year": 2026,
      "totalExpected": 100000,
      "totalPaid": 0,
      "totalRemaining": 100000,
      "overdueTuitionCount": 2,
      "overdueTuitionAmount": 1350000
    },
    "todayAttendance": {
      "date": "2026-11-18",
      "totalExpected": 0,
      "present": 0,
      "late": 0,
      "excusedAbsent": 0,
      "unexcusedAbsent": 0
    },
    "todaySchedules": []
  }
  ```
- **Quy tắc tính toán block `tuition` (QUAN TRỌNG — tránh nhầm lẫn):**
  1. **Tổng tháng hiện tại (`totalExpected`, `totalPaid`, `totalRemaining`):**
     - Chỉ tính các khoản thu chưa bị hủy (`!IsCancelled`) có **hạn nộp (`DueDate`) rơi vào đúng tháng/năm hiện tại theo giờ Việt Nam (UTC+7)** (`t.DueDate.Month == month && t.DueDate.Year == year`), **KHÔNG** tính theo ngày tạo khoản thu (`CreatedAt`) và **KHÔNG** gộp nợ quá hạn từ các tháng trước.
     - Công thức: `NetAmount = Amount - Discount`; `PaidAmount = SUM(Payments.Amount với Status == "Confirmed")`; `totalRemaining = SUM(Math.Max(0, NetAmount - PaidAmount))`.
     - **Hành vi đúng thiết kế (ví dụ dữ liệu thực tế Phụ huynh Trần Thị D):** Thẻ **"Học phí tháng 11/2026"** hiển thị `Đã thu 0đ / Chưa thu 100.000đ / Tổng phải thu 100.000đ` vì có khoản `"TEST Học phí đợt 2A"` hạn nộp `30/11/2026` còn nợ `100.000đ` (trong khi 2 khoản nợ quá hạn `100.000đ` hạn `23/10/2026` và `1.250.000đ` còn nợ hạn `30/10/2026`, tổng `1.350.000đ`, hiển thị ở thẻ **"Học phí quá hạn (tất cả các tháng)"**). Thẻ học phí tháng chỉ hiển thị `Đã thu 0đ / Chưa thu 0đ / Tổng phải thu 0đ` khi không có khoản thu nào có hạn nộp (`DueDate`) rơi vào tháng đó.
  2. **Nợ quá hạn (`overdueTuitionCount`, `overdueTuitionAmount`):**
     - Được tính tách riêng trên **tất cả các tháng** với điều kiện `!IsCancelled && DueDate < today && PaidAmount < NetAmount` (với `today` theo UTC+7).
     - Khoản nợ quá hạn từ các tháng trước sẽ hiển thị ở card **"Học phí quá hạn (tất cả các tháng)"** ngay bên dưới card học phí tháng trên Dashboard, khớp với danh sách lọc `Overdue` tại trang Học phí (`/tuitions?status=Overdue`).

---

## 15. PHÂN HỆ TẠO KHOẢN THU TỰ ĐỘNG (BILLING API)

### 15.1. Tạo khoản thu học phí hàng tháng (thủ công) — `POST /api/Billing/generate-monthly`
Quét các ghi danh đang hoạt động (`StudentClass.Status == "Active"`) ở lớp chưa kết thúc (`Class.Status != "Finished"`) và tự động tạo khoản thu học phí cho tháng/năm chỉ định (hoặc tháng/năm hiện tại theo giờ Việt Nam UTC+7), kèm thông báo đến phụ huynh (nếu có tài khoản).

- **Quyền truy cập:** `SuperAdmin`, `BranchManager`.
  - `SuperAdmin`: Chạy cho tất cả chi nhánh.
  - `BranchManager`: Tự động giới hạn theo chi nhánh của quản lý (`Class.BranchId == BranchId`); trả `403 Forbidden` nếu tài khoản chưa được gán chi nhánh.
- **Request Body (tùy chọn — có thể gửi `{}` hoặc không gửi body):**
  ```json
  {
    "month": 11,
    "year": 2026
  }
  ```
  - `month` (int?, optional): Tháng tính học phí (`1`–`12`). Mặc định là tháng hiện tại theo UTC+7.
  - `year` (int?, optional): Năm tính học phí (`2000`–`2100`). Mặc định là năm hiện tại theo UTC+7.
- **Quy tắc tính phí:**
  - **Hạn nộp (`DueDate`):** Ngày cuối cùng của tháng (`31`, hoặc `28/29/30` với các tháng ít hơn 31 ngày).
  - **Số tiền (`Amount`):** Lấy `Class.TuitionFee`; nếu `null` thì lấy `Course.DefaultFee`. Nếu cả hai đều `null` hoặc `< 0` thì không tạo và đưa vào `uncreatedItems`.
  - **Giảm giá (`Discount`):** `0` (không tính theo tỷ lệ cho học viên mới).
  - **Tiêu đề & Ghi chú:** `Title = "Học phí tháng MM/YYYY – {ClassName}"`, `Note = "Tự động tạo bởi hệ thống ngày dd/MM/yyyy"`.
  - **Chống tạo trùng:** Nếu cặp `(StudentId, ClassId)` đã có khoản thu bất kỳ (kể cả `IsCancelled == true`) có `DueDate` trong cùng `month/year` thì bỏ qua (`skippedDuplicateCount`).
  - **Thông báo phụ huynh:** Khi tạo khoản thu thành công và `Student.ParentId > 0`, tạo `Notification` (`Type = "Tuition"`, `RefId = Tuition.Id`). Lỗi thông báo không làm hỏng khoản thu đã tạo.
- **Response:**
  - `200 OK` (`MonthlyBillingSummaryDto`):
    ```json
    {
      "month": 11,
      "year": 2026,
      "dueDate": "2026-11-30",
      "executedAtVn": "2026-11-18T11:45:00",
      "createdCount": 12,
      "totalCreatedAmount": 18000000,
      "createdItems": [
        {
          "tuitionId": 205,
          "studentId": 10,
          "studentName": "Nguyễn Văn A",
          "classId": 5,
          "className": "Luyện chữ đẹp K01",
          "branchId": 1,
          "title": "Học phí tháng 11/2026 – Luyện chữ đẹp K01",
          "amount": 1500000,
          "dueDate": "2026-11-30"
        }
      ],
      "skippedDuplicateCount": 3,
      "uncreatedCount": 1,
      "uncreatedItems": [
        {
          "studentId": 14,
          "studentName": "Trần Thị B",
          "classId": 8,
          "className": "Lớp vẽ cơ bản",
          "reason": "Lớp và khóa học chưa thiết lập học phí."
        }
      ]
    }
    ```
  - `400 Bad Request`: `month`/`year` ngoài phạm vi hợp lệ hoặc JSON không hợp lệ.
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Không thuộc vai trò `SuperAdmin`/`BranchManager` hoặc `BranchManager` chưa được gán chi nhánh.

- **Vận hành chạy nền tự động (3B):**
  - Job nền (`MonthlyBillingBackgroundService`) tự động chạy mỗi ngày lúc **06:00 sáng (UTC+7)** cho tháng/năm hiện tại và gửi thông báo tổng hợp (`Notification`, `Type = "Tuition"`, `RefId = null`) cho từng `SuperAdmin` (toàn hệ thống) và `BranchManager` (riêng chi nhánh mình).
  - Việc chạy nền cần API luôn hoạt động — khi deploy production cần nhờ hosting bật **Always On** cho site API.
  - Nếu API dừng đúng lúc 06:00 thì hôm sau job chạy lại sẽ tự tạo bù các khoản còn thiếu (nhờ quy tắc tạo bù + chống trùng theo tháng của 3A); ngoài ra nhân viên luôn có thể chạy tay bằng `POST /api/Billing/generate-monthly`.





---

## 16. PHÂN HỆ TẢI TỆP (UPLOADS API)

Cung cấp endpoint tải tệp lên máy chủ và trả về URL công khai (phục vụ tĩnh qua `wwwroot/uploads/`) để dùng cho bằng chứng chuyển khoản thanh toán, ảnh bài đăng bảng tin, tệp nộp bài tập/tài liệu dùng chung, v.v.

### 16.1. Upload ảnh / tài liệu — `POST /api/Uploads/image`

- **Quyền truy cập:** Đã đăng nhập (`SuperAdmin`, `BranchManager`, `Teacher`, `Parent`, `Student`). Chưa đăng nhập trả về `401 Unauthorized`.
- **Request (`multipart/form-data`):**
  - `file` (`IFormFile`, bắt buộc): Tệp cần tải lên.
  - `folder` (`string`, tùy chọn — nhận qua form field hoặc query string): Thư mục con lưu trữ. Chỉ chấp nhận 1 trong 3 giá trị: `payments`, `newsfeed`, `general`. Mặc định là `general`.
- **Giới hạn & Kiểm tra hợp lệ:**
  - Thư mục `payments`, `newsfeed`: chỉ nhận ảnh `.jpg`, `.jpeg`, `.png`, `.webp` (kiểm tra **cả đuôi file** và **`Content-Type`**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`).
  - Thư mục `general`: ngoài các định dạng ảnh trên, chấp nhận thêm tài liệu (kiểm tra **cả đuôi file** và **`Content-Type` tương ứng**):
    - `.pdf` → `application/pdf`
    - `.doc` → `application/msword`
    - `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
    - `.xls` → `application/vnd.ms-excel`
    - `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Dung lượng tối đa: **5MB** (`5 * 1024 * 1024` bytes).
  - Tên file lưu trữ được sinh ngẫu nhiên (`{Guid:N}{ext}`), không sử dụng tên file gốc của client.
- **Response:**
  - `200 OK`:
    ```json
    {
      "url": "http://localhost:5123/uploads/payments/<guid>.jpg"
    }
    ```
  - `400 Bad Request`:
    - Thiếu file hoặc file rỗng: `{ "message": "Vui lòng chọn tệp ảnh để tải lên." }`
    - Vượt quá 5MB: `{ "message": "Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB)." }`
    - Sai đuôi file hoặc sai `Content-Type` (thư mục `payments`, `newsfeed`): `{ "message": "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP." }`
    - Sai đuôi file hoặc sai `Content-Type` (thư mục `general`): `{ "message": "Định dạng tệp không hợp lệ. Thư mục general chấp nhận ảnh (JPG, JPEG, PNG, WEBP) hoặc tài liệu (PDF, DOC, DOCX, XLS, XLSX)." }`
    - `folder` ngoài whitelist (`payments`, `newsfeed`, `general`): `{ "message": "Thư mục lưu ảnh không hợp lệ. Chỉ chấp nhận: payments, newsfeed, general." }`
  - `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ.

- **Lưu ý deploy production (QUAN TRỌNG):**
  - Khi upload code lên production bằng FTP, **KHÔNG** được xóa hoặc ghi đè xóa sạch thư mục `wwwroot/uploads/` (toàn bộ ảnh đã upload của phụ huynh và bảng tin phải được giữ nguyên).

---

## 17. ĐĂNG NHẬP ZALO MINI APP & CẤU HÌNH CORS (ZALO AUTH API)

### 17.1. Đăng nhập qua Zalo Mini App — `POST /api/Auth/zalo-login`
Cho phép Phụ huynh (`Parent`) và Học viên (`Student`) đăng nhập trực tiếp từ Zalo Mini App bằng `accessToken` và `phoneCode` nhận từ Zalo SDK. Hệ thống xác thực số điện thoại với Zalo Open API, đối chiếu số điện thoại đã đăng ký tại trung tâm, tự động liên kết `ZaloId` ở lần đăng nhập đầu tiên và cấp JWT access token dùng chung với các API khác.

- **Quyền truy cập:** `[AllowAnonymous]` (Chỉ chấp nhận tài khoản có vai trò `Parent` hoặc `Student`).
- **Request Body:**
  ```json
  {
    "accessToken": "<zalo_user_access_token>",
    "phoneCode": "<zalo_phone_token_code>"
  }
  ```
  - `accessToken` (`string`, bắt buộc, không rỗng): Access token của người dùng Zalo lấy từ `getAccessToken()`.
  - `phoneCode` (`string`, bắt buộc, không rỗng): Token đổi số điện thoại lấy từ `getPhoneNumber()`.
- **Luồng xử lý tại Backend:**
  1. Kiểm tra cấu hình `Zalo:AppSecret` trên máy chủ. Nếu chưa cấu hình (rỗng), ghi log lỗi và trả về `500 Internal Server Error`: `{ "message": "Máy chủ chưa cấu hình Zalo" }`.
  2. Gọi Zalo Open API để xác thực và lấy số điện thoại + Zalo User ID:
     - Gọi `GET https://graph.zalo.me/v2.0/me/info` với headers `access_token`, `code`, `secret_key` để giải mã `phoneCode` lấy số điện thoại (`data.number`).
     - Nếu response chưa có Zalo User ID, gọi tiếp `GET https://graph.zalo.me/v2.0/me?fields=id,name` với headers `access_token` và `appsecret_proof` (HMAC-SHA256 hex lowercase của `accessToken` với khóa `AppSecret`) để lấy `id`.
     - Nếu Zalo trả về lỗi, mã hết hạn hoặc không hợp lệ -> trả về `400 Bad Request` (không làm lộ `secret_key` hay lỗi thô ra client).
  3. Chuẩn hóa số điện thoại từ định dạng quốc tế của Zalo (`84xxxxxxxxx` hoặc `+84xxxxxxxxx`) về dạng 10 chữ số bắt đầu bằng `0` (`^0\d{9}$`).
  4. Tra cứu bảng `Users` theo `PhoneNumber` đã chuẩn hóa:
     - Không tìm thấy -> `404 Not Found` (**không tự tạo tài khoản mới**).
     - Tài khoản bị khóa (`!user.IsActive`) -> `401 Unauthorized`.
     - Vai trò khác `Parent` và `Student` (`SuperAdmin`, `BranchManager`, `Teacher`) -> `403 Forbidden`.
     - Nếu `user.ZaloId` đã có và khác Zalo User ID vừa lấy (hoặc Zalo User ID đó đã gắn với một tài khoản khác trong DB) -> `400 Bad Request`.
     - Nếu `user.ZaloId` đang `null` -> gán `user.ZaloId = zaloUserId` và lưu DB.
  5. Cập nhật `LastLoginAt = DateTime.UtcNow` và cấp JWT token qua `TokenService.CreateAccessToken(user)`.
- **Response:**
  - `200 OK` (`LoginResponse` — giống hệt `POST /api/Auth/login`):
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresAt": "2026-11-23T12:00:00Z",
      "user": {
        "id": 18,
        "fullName": "Trần Văn An",
        "role": "Parent",
        "branchId": 1,
        "preferredLanguage": "vi",
        "phoneNumber": "0912345678",
        "email": "an.tran@example.com",
        "avatarUrl": null
      }
    }
    ```
  - `400 Bad Request`:
    - Thiếu `accessToken` hoặc `phoneCode`: `{ "message": "Vui lòng cung cấp đầy đủ accessToken và phoneCode từ Zalo." }`
    - Mã Zalo không hợp lệ hoặc hết hạn: `{ "message": "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." }`
    - Số điện thoại từ Zalo không đúng chuẩn 10 số VN: `{ "message": "Số điện thoại từ Zalo không hợp lệ." }`
    - Xung đột liên kết Zalo: `{ "message": "Tài khoản Zalo này đã liên kết với một số điện thoại khác." }`
  - `401 Unauthorized`: Tài khoản bị khóa (`IsActive == false`): `{ "message": "Sai số điện thoại hoặc mật khẩu." }`
  - `403 Forbidden`: Tài khoản là `SuperAdmin`, `BranchManager`, hoặc `Teacher`: `{ "message": "Chỉ tài khoản Phụ huynh và Học viên mới được đăng nhập qua Zalo Mini App." }`
  - `404 Not Found`: Số điện thoại chưa có trong hệ thống: `{ "message": "Số điện thoại chưa được đăng ký tại trung tâm, vui lòng liên hệ trung tâm." }`
  - `500 Internal Server Error`: Máy chủ chưa cấu hình `Zalo:AppSecret`: `{ "message": "Máy chủ chưa cấu hình Zalo" }`

---

### 17.2. Cấu hình Zalo (`Zalo:AppId` & `Zalo:AppSecret`) — Không commit secret
Trong `RoxyAppBE/RoxyAcademy.Api/appsettings.json`, mục `Zalo` chỉ chứa chuỗi rỗng làm placeholder (tuyệt đối không điền giá trị thật vào file commit lên Git):
```json
"Zalo": {
  "AppId": "",
  "AppSecret": ""
}
```

**Cách cấu hình giá trị thật:**
- **Môi trường Local (Development) — dùng .NET User Secrets:**
  ```bash
  cd RoxyAppBE/RoxyAcademy.Api
  dotnet user-secrets set "Zalo:AppId" "<ZALO_APP_ID_THẬT>"
  dotnet user-secrets set "Zalo:AppSecret" "<ZALO_APP_SECRET_THẬT>"
  ```
- **Môi trường Production (IIS / Hosting) — dùng biến môi trường trong `web.config`:**
  ```xml
  <environmentVariables>
    <environmentVariable name="Zalo__AppId" value="<ZALO_APP_ID_THẬT>" />
    <environmentVariable name="Zalo__AppSecret" value="<ZALO_APP_SECRET_THẬT>" />
  </environmentVariables>
  ```

---

### 17.3. Cấu hình CORS cho Zalo Mini App
Trong `Program.cs`, danh sách origin mặc định của policy `"RoxyCors"` đã bao gồm cả 2 origin của Zalo Mini App và origin dev local:
```csharp
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://admin.roxy.edu.vn",
        "https://roxy.edu.vn",
        "https://h5.zdn.vn",
        "zbrowser://h5.zdn.vn"
    ];
```
- Ghi chú: Origin `"http://localhost:3000"` chỉ phục vụ môi trường dev local khi chạy Zalo Mini App bằng lệnh `zmp start`.

> **Lưu ý quan trọng khi cấu hình Production:**
> Nếu trên Production có ghi đè cấu hình `Cors:AllowedOrigins` (qua `appsettings.Production.json` hoặc các biến môi trường `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, ... trong `web.config`), danh sách bắt buộc **phải bao gồm cả 2 origin `"https://h5.zdn.vn"` và `"zbrowser://h5.zdn.vn"`** (cùng với `"https://admin.roxy.edu.vn"` và `"https://roxy.edu.vn"`), nếu không Zalo Mini App sẽ bị chặn bởi CORS khi gọi API.
