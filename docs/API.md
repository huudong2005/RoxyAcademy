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
