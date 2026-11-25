import axiosClient from '@/api/axiosClient';
import type {
  ActionMessageResponse,
  AttendanceDto,
  BranchDto,
  ChangePasswordPayload,
  CreateLeaveRequestPayload,
  GradeDto,
  HomeworkDto,
  HomeworkSubmissionDto,
  HomeworkWithSubmission,
  LeaveActionResponse,
  LeaveRequestDto,
  NewsfeedDto,
  NotificationDto,
  PaymentDto,
  ScheduleDto,
  ScheduleWithAttendance,
  StudentClassDto,
  SubmitHomeworkPayload,
  SubmitHomeworkResponse,
  SubmitPaymentPayload,
  SubmitPaymentResponse,
  TuitionDto,
  UpdateMePayload,
} from '@/types/academic';
import type { UserInfo } from '@/types/auth';

function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Lấy tập ID các lớp học đang hoạt động ('Active') của học viên đang chọn.
 */
export async function fetchActiveClassIdsForStudent(
  studentId: number
): Promise<Set<number>> {
  const res = await axiosClient.get('/StudentClasses', {
    params: { studentId },
  });
  const list = unwrapArray<StudentClassDto>(res.data);
  const activeIds = new Set<number>();
  list.forEach((item) => {
    if (item && item.status === 'Active' && typeof item.classId === 'number') {
      activeIds.add(item.classId);
    }
  });
  return activeIds;
}

/**
 * Lấy danh sách lịch học trong khoảng [fromDate, toDate] ('YYYY-MM-DD')
 * và lọc theo danh sách lớp đang học của học viên (`activeClassIds`).
 */
export async function fetchStudentSchedules(params: {
  fromDate: string;
  toDate: string;
  activeClassIds: Set<number>;
}): Promise<ScheduleDto[]> {
  if (params.activeClassIds.size === 0) return [];
  const res = await axiosClient.get('/Schedules', {
    params: {
      fromDate: params.fromDate,
      toDate: params.toDate,
    },
  });
  const list = unwrapArray<ScheduleDto>(res.data);
  return list.filter((s) => s && params.activeClassIds.has(s.classId));
}

/**
 * Lấy trạng thái điểm danh của 1 học viên cho 1 buổi học cụ thể.
 * Chỉ gọi GET /Attendances?scheduleId=${scheduleId} khi buổi học có hasAttendance === true.
 */
export async function fetchStudentAttendanceForSchedule(
  scheduleId: number,
  studentId: number
): Promise<AttendanceDto | null> {
  const res = await axiosClient.get('/Attendances', {
    params: { scheduleId },
  });
  const list = unwrapArray<AttendanceDto>(res.data);
  const found = list.find((a) => a && Number(a.studentId) === Number(studentId));
  return found || null;
}

/**
 * Gắn thông tin điểm danh của học viên vào danh sách buổi học.
 * Chỉ gọi GET /Attendances?scheduleId=${s.id} cho các buổi có s.hasAttendance === true,
 * chạy theo batch nhỏ để kiểm soát số request song song.
 */
export async function attachAttendanceForSchedules(
  schedules: ScheduleDto[],
  studentId: number,
  concurrency = 5
): Promise<ScheduleWithAttendance[]> {
  const results: ScheduleWithAttendance[] = schedules.map((s) => ({
    ...s,
    studentAttendanceStatus: null,
    studentAttendanceNote: null,
  }));

  const indicesToFetch: number[] = [];
  schedules.forEach((s, index) => {
    if (s.hasAttendance) {
      indicesToFetch.push(index);
    }
  });

  for (let i = 0; i < indicesToFetch.length; i += concurrency) {
    const batch = indicesToFetch.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (idx) => {
        const sched = schedules[idx];
        try {
          const att = await fetchStudentAttendanceForSchedule(
            sched.id,
            studentId
          );
          if (att) {
            results[idx].studentAttendanceStatus = att.status ?? null;
            results[idx].studentAttendanceNote = att.note ?? null;
          }
        } catch {
          // Giữ trạng thái null ("Chưa điểm danh") nếu bản ghi điểm danh của buổi đó lỗi tạm thời
        }
      })
    );
  }

  return results;
}

/**
 * Lấy bài tập sắp tới hạn trong khoảng [dueDateFrom, dueDateTo], lọc theo activeClassIds.
 */
export async function fetchUpcomingHomeworksForStudent(params: {
  dueDateFrom: string;
  dueDateTo: string;
  activeClassIds: Set<number>;
}): Promise<HomeworkDto[]> {
  if (params.activeClassIds.size === 0) return [];
  const res = await axiosClient.get('/Homeworks', {
    params: {
      dueDateFrom: params.dueDateFrom,
      dueDateTo: params.dueDateTo,
    },
  });
  const list = unwrapArray<HomeworkDto>(res.data);
  return list
    .filter((hw) => hw && params.activeClassIds.has(hw.classId))
    .sort((a, b) => {
      const da = a.dueDate || '';
      const db = b.dueDate || '';
      return da.localeCompare(db);
    });
}

/**
 * Lấy danh sách học phí tháng hiện tại của học viên (lọc !isCancelled và dueDate thuộc YYYY-MM hiện tại).
 */
export async function fetchCurrentMonthTuitionsForStudent(
  studentId: number,
  currentYearMonth: string
): Promise<TuitionDto[]> {
  const res = await axiosClient.get('/Tuitions', {
    params: { studentId },
  });
  const list = unwrapArray<TuitionDto>(res.data);
  return list.filter((t) => {
    if (!t || t.isCancelled) return false;
    const due = (t.dueDate || '').trim();
    return due.startsWith(currentYearMonth);
  });
}

/**
 * Lấy danh sách bài tập của học viên: gọi GET /Homeworks và lọc client-side theo classIds.
 * Sắp xếp theo hạn nộp (dueDate) tăng dần (bài chưa đặt hạn nộp xếp sau cùng).
 */
export async function fetchStudentHomeworks(
  classIds: Set<number>
): Promise<HomeworkDto[]> {
  if (classIds.size === 0) return [];
  const res = await axiosClient.get('/Homeworks');
  const list = unwrapArray<HomeworkDto>(res.data);
  return list
    .filter((hw) => hw && classIds.has(hw.classId))
    .sort((a, b) => {
      const da = a.dueDate ? a.dueDate.trim() : '';
      const db = b.dueDate ? b.dueDate.trim() : '';
      if (!da && !db) return a.id - b.id;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    });
}

/**
 * Lấy bài nộp của 1 học viên cho 1 bài tập cụ thể.
 * Lưu ý: Backend bỏ qua tham số studentId đối với role Parent/Student, nên bắt buộc lọc client-side.
 */
export async function fetchStudentSubmissions(
  homeworkId: number,
  studentId: number
): Promise<HomeworkSubmissionDto[]> {
  const res = await axiosClient.get('/HomeworkSubmissions', {
    params: { homeworkId },
  });
  const list = unwrapArray<HomeworkSubmissionDto>(res.data);
  return list.filter(
    (s) => s && Number(s.studentId) === Number(studentId)
  );
}

/**
 * Gắn trạng thái nộp bài của học viên vào từng bài tập theo batch nhỏ để kiểm soát request.
 */
export async function attachSubmissionsForHomeworks(
  homeworks: HomeworkDto[],
  studentId: number,
  concurrency = 5
): Promise<HomeworkWithSubmission[]> {
  const results: HomeworkWithSubmission[] = homeworks.map((hw) => ({
    ...hw,
    submission: null,
  }));

  for (let i = 0; i < homeworks.length; i += concurrency) {
    const batch = homeworks.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (hw, offset) => {
        try {
          const subs = await fetchStudentSubmissions(hw.id, studentId);
          if (subs.length > 0) {
            results[i + offset].submission = subs[0];
          }
        } catch {
          // Giữ submission = null nếu lỗi tạm thời ở 1 bài tập
        }
      })
    );
  }

  return results;
}

/**
 * Nộp bài tập (hoặc nộp lại): PUT /HomeworkSubmissions/{id}/submit.
 * Trả về nguyên response từ server (gồm message, score, teacherFeedback, status...).
 */
export async function submitHomework(
  submissionId: number,
  payload: SubmitHomeworkPayload
): Promise<SubmitHomeworkResponse> {
  const res = await axiosClient.put<SubmitHomeworkResponse>(
    `/HomeworkSubmissions/${submissionId}/submit`,
    {
      submissionUrl: payload.submissionUrl ?? null,
      studentNote: payload.studentNote ?? null,
    }
  );
  return res.data;
}

/**
 * Upload tệp bài làm (ảnh hoặc tài liệu): POST /Uploads/image?folder=general (field: file).
 */
export async function uploadHomeworkFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axiosClient.post<{ url?: string }>(
    '/Uploads/image?folder=general',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const url = res.data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Máy chủ không trả về đường dẫn tệp.');
  }
  return url;
}

/**
 * Lấy danh sách điểm số của học viên: GET /Grades?studentId=.
 * Sắp xếp mới nhất lên đầu (examDate giảm dần, createdAt giảm dần).
 */
export async function fetchStudentGrades(
  studentId: number
): Promise<GradeDto[]> {
  const res = await axiosClient.get('/Grades', {
    params: { studentId },
  });
  const list = unwrapArray<GradeDto>(res.data);
  return list
    .filter((g) => g && Number(g.studentId) === Number(studentId))
    .sort((a, b) => {
      const dateA = (a.examDate || '').trim();
      const dateB = (b.examDate || '').trim();
      if (dateA !== dateB) {
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
}

// ==================== HỌC PHÍ & BÁO THANH TOÁN ====================

/**
 * Lấy danh sách học phí của học viên: GET /Tuitions?studentId=.
 * Sắp xếp theo DueDate tăng dần.
 */
export async function fetchStudentTuitions(
  studentId: number
): Promise<TuitionDto[]> {
  const res = await axiosClient.get('/Tuitions', {
    params: { studentId },
  });
  const list = unwrapArray<TuitionDto>(res.data);
  return list
    .filter((t) => t && Number(t.studentId) === Number(studentId))
    .sort((a, b) => {
      const da = (a.dueDate || '').trim();
      const db = (b.dueDate || '').trim();
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      }
      return a.id - b.id;
    });
}

/**
 * Lấy lịch sử giao dịch thanh toán của 1 khoản thu: GET /Payments?tuitionId=.
 */
export async function fetchTuitionPayments(
  tuitionId: number
): Promise<PaymentDto[]> {
  const res = await axiosClient.get('/Payments', {
    params: { tuitionId },
  });
  const list = unwrapArray<PaymentDto>(res.data);
  return list.sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

/**
 * Phụ huynh báo đã chuyển khoản: POST /Payments.
 * Trạng thái tạo ra là PendingConfirm.
 */
export async function submitPaymentReport(
  payload: SubmitPaymentPayload
): Promise<SubmitPaymentResponse> {
  const res = await axiosClient.post<SubmitPaymentResponse>('/Payments', {
    tuitionId: payload.tuitionId,
    amount: payload.amount,
    paymentMethod: 'BankTransfer',
    transactionCode: payload.transactionCode?.trim() || null,
    proofImageUrl: payload.proofImageUrl?.trim() || null,
    note: payload.note?.trim() || null,
    paidAt: new Date().toISOString(),
  });
  return res.data;
}

/**
 * Upload ảnh chứng từ chuyển khoản: POST /Uploads/image?folder=payments (field: file).
 * Chỉ nhận ảnh jpg/jpeg/png/webp, tối đa 5MB.
 */
export async function uploadPaymentProof(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axiosClient.post<{ url?: string }>(
    '/Uploads/image?folder=payments',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const url = res.data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Máy chủ không trả về đường dẫn ảnh chứng từ.');
  }
  return url;
}

// ==================== XIN NGHỈ HỌC ====================

/**
 * Lấy danh sách đơn xin nghỉ của học viên: GET /LeaveRequests?studentId=.
 * Sắp xếp mới nhất lên đầu.
 */
export async function fetchStudentLeaveRequests(
  studentId: number
): Promise<LeaveRequestDto[]> {
  const res = await axiosClient.get('/LeaveRequests', {
    params: { studentId },
  });
  const list = unwrapArray<LeaveRequestDto>(res.data);
  return list
    .filter((lr) => lr && Number(lr.studentId) === Number(studentId))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Tạo đơn xin nghỉ 1 ngày cho học viên: POST /LeaveRequests.
 * Không gửi ClassId/ScheduleId/RequesterType (backend tự suy ra).
 */
export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload
): Promise<LeaveActionResponse> {
  const res = await axiosClient.post<LeaveActionResponse>('/LeaveRequests', {
    studentId: payload.studentId,
    leaveDate: payload.leaveDate,
    reason: payload.reason.trim(),
  });
  return res.data;
}

/**
 * Hủy đơn xin nghỉ đang Pending: PUT /LeaveRequests/{id}/cancel (body rỗng).
 */
export async function cancelLeaveRequest(
  id: number
): Promise<LeaveActionResponse> {
  const res = await axiosClient.put<LeaveActionResponse>(
    `/LeaveRequests/${id}/cancel`
  );
  return res.data;
}

// ==================== BẢN TIN, THÔNG BÁO, CƠ SỞ & TÀI KHOẢN ====================

/**
 * Lấy danh sách bản tin: GET /Newsfeeds (không tham số).
 * Server tự lọc theo phụ huynh, bài ghim lên trước rồi tới ngày tạo.
 */
export async function fetchNewsfeeds(): Promise<NewsfeedDto[]> {
  const res = await axiosClient.get('/Newsfeeds');
  const list = unwrapArray<NewsfeedDto>(res.data);
  return list.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

/**
 * Lấy danh sách thông báo của tài khoản hiện tại: GET /Notifications (?unreadOnly=true).
 */
export async function fetchMyNotifications(
  unreadOnly?: boolean
): Promise<NotificationDto[]> {
  const res = await axiosClient.get('/Notifications', {
    params: unreadOnly ? { unreadOnly: true } : undefined,
  });
  const list = unwrapArray<NotificationDto>(res.data);
  return list.sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

/**
 * Đánh dấu 1 thông báo là đã đọc: PUT /Notifications/{id}/read.
 */
export async function markNotificationRead(id: number): Promise<void> {
  await axiosClient.put(`/Notifications/${id}/read`);
}

/**
 * Đánh dấu tất cả thông báo là đã đọc: PUT /Notifications/read-all.
 */
export async function markAllNotificationsRead(): Promise<ActionMessageResponse> {
  const res = await axiosClient.put<ActionMessageResponse>(
    '/Notifications/read-all'
  );
  return res.data;
}

/**
 * Lấy danh sách cơ sở đang hoạt động: GET /Branches (chỉ giữ isActive === true).
 */
export async function fetchBranches(): Promise<BranchDto[]> {
  const res = await axiosClient.get('/Branches');
  const list = unwrapArray<BranchDto>(res.data);
  return list.filter((b) => b && b.isActive === true);
}

/**
 * Cập nhật thông tin liên hệ của bản thân: PUT /Auth/me.
 */
export async function updateMe(payload: UpdateMePayload): Promise<UserInfo> {
  const res = await axiosClient.put<UserInfo>('/Auth/me', {
    phoneNumber: payload.phoneNumber.trim(),
    email: payload.email?.trim() ? payload.email.trim() : null,
    avatarUrl: payload.avatarUrl?.trim() ? payload.avatarUrl.trim() : null,
  });
  return res.data;
}

/**
 * Đổi mật khẩu: POST /Auth/change-password.
 */
export async function changePassword(
  payload: ChangePasswordPayload
): Promise<ActionMessageResponse> {
  const res = await axiosClient.post<ActionMessageResponse>(
    '/Auth/change-password',
    {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    }
  );
  return res.data;
}
