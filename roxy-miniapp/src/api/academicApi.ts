import axiosClient from '@/api/axiosClient';
import type {
  AttendanceDto,
  GradeDto,
  HomeworkDto,
  HomeworkSubmissionDto,
  HomeworkWithSubmission,
  ScheduleDto,
  ScheduleWithAttendance,
  StudentClassDto,
  SubmitHomeworkPayload,
  SubmitHomeworkResponse,
  TuitionDto,
} from '@/types/academic';

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
 * Upload ảnh chụp bài làm: POST /Uploads/image?folder=general (field: file).
 */
export async function uploadHomeworkImage(file: File): Promise<string> {
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
    throw new Error('Máy chủ không trả về đường dẫn ảnh.');
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
