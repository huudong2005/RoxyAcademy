import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatDate, formatDateTime, numberToVietnameseWords } from '../utils/formatters';
import { fetchAllStudents } from '../utils/fetchAllStudents';
import ImageUpload from '../components/ImageUpload';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  SelectPill,
  CustomSelect,
  Badge,
} from '../components/ui';

export default function Tuitions() {
  const navigate = useNavigate();

  // Thông tin user đăng nhập từ storage
  const [currentUser] = useState(() => getStoredUser());

  const isTeacher = currentUser.role === 'Teacher';
  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const isParent = currentUser.role === 'Parent';
  const isStudent = currentUser.role === 'Student';
  const canManage = isSuperAdmin || isBranchManager;

  // Dữ liệu danh sách khoản thu
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const validStatuses = ['Unpaid', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'];
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(() => {
    if (isBranchManager && currentUser.branchId) {
      return String(currentUser.branchId);
    }
    return '';
  });
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && validStatuses.includes(initialStatus) ? initialStatus : ''
  ); // '', 'Unpaid', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'

  // Danh mục bổ trợ
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoadError, setStudentsLoadError] = useState('');

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTuition, setSelectedTuition] = useState(null);
  const [tuitionPayments, setTuitionPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTuition, setEditingTuition] = useState(null);

  const [quickPayModalOpen, setQuickPayModalOpen] = useState(false);
  const [quickPayTuition, setQuickPayTuition] = useState(null);

  const [parentPaymentModalOpen, setParentPaymentModalOpen] = useState(false);
  const [parentPaymentTuition, setParentPaymentTuition] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null); // { tuition, submitting, error }

  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // 1. Tải danh mục bổ trợ (Chi nhánh, Lớp học, Học viên)
  useEffect(() => {
    if (isTeacher) return; // Nếu là giáo viên thì không gọi API

    let ignore = false;
    const fetchMetadata = async () => {
      setStudentsLoadError('');
      try {
        const [branchRes, classRes, studentRes] = await Promise.allSettled([
          axiosClient.get('/Branches'),
          axiosClient.get('/Classes'),
          fetchAllStudents(),
        ]);

        if (!ignore) {
          if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data || []);
          if (classRes.status === 'fulfilled') setClasses(classRes.value.data || []);
          if (studentRes.status === 'fulfilled') {
            setStudents(studentRes.value || []);
          } else {
            const msg =
              studentRes.reason?.response?.data?.message ||
              'Không thể tải danh sách học viên cho bộ lọc và form tạo khoản thu.';
            setStudentsLoadError(msg);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục cho Tuitions:', err);
        if (!ignore) {
          setStudentsLoadError('Không thể tải danh sách học viên.');
        }
      }
    };

    fetchMetadata();
    return () => {
      ignore = true;
    };
  }, [isTeacher]);

  // 2. Tải danh sách khoản thu học phí
  useEffect(() => {
    if (isTeacher) return; // Không gọi API nếu là Teacher

    let ignore = false;
    const fetchTuitions = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (studentFilter) params.studentId = studentFilter;
        if (classFilter) params.classId = classFilter;
        if (branchFilter) params.branchId = branchFilter;
        if (statusFilter) params.status = statusFilter;

        const res = await axiosClient.get('/Tuitions', { params });
        if (!ignore) {
          setTuitions(res.data || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải danh sách học phí:', err);
          setError(err.response?.data?.message || 'Không thể tải danh sách khoản thu học phí.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTuitions();
    return () => {
      ignore = true;
    };
  }, [isTeacher, reloadKey, searchTerm, studentFilter, classFilter, branchFilter, statusFilter]);

  // 3. Tải lịch sử thanh toán của 1 khoản thu khi mở detail modal
  const fetchTuitionPayments = useCallback(async (tuitionId) => {
    setLoadingPayments(true);
    try {
      const res = await axiosClient.get('/Payments', { params: { tuitionId } });
      setTuitionPayments(res.data || []);
    } catch (err) {
      console.warn('Lỗi tải lịch sử thanh toán:', err);
      setTuitionPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const handleOpenDetail = (item) => {
    setSelectedTuition(item);
    setDetailModalOpen(true);
    fetchTuitionPayments(item.id);
  };

  const handleOpenEdit = (item) => {
    setEditingTuition(item);
    setEditModalOpen(true);
  };

  const handleOpenQuickPay = (item) => {
    setQuickPayTuition(item);
    setQuickPayModalOpen(true);
  };

  const handleOpenParentPayment = (item) => {
    setParentPaymentTuition(item);
    setParentPaymentModalOpen(true);
  };

  const handleOpenDelete = (item) => {
    setDeleteModal({
      tuition: item,
      submitting: false,
      error: '',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.tuition) return;
    const { tuition } = deleteModal;
    setDeleteModal((prev) => (prev ? { ...prev, submitting: true, error: '' } : prev));
    try {
      await axiosClient.delete(`/Tuitions/${tuition.id}`);
      setDeleteModal(null);
      showToast('Đã xóa khoản thu học phí.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' && err.response.data) ||
        'Không thể xóa khoản thu học phí. Vui lòng thử lại.';
      setDeleteModal((prev) => (prev ? { ...prev, submitting: false, error: msg } : prev));
    }
  };

  // 4. Thống kê nhanh KPI
  const stats = useMemo(() => {
    const valid = tuitions.filter((t) => !t.isCancelled);
    const totalNet = valid.reduce((sum, t) => sum + (t.finalAmount ?? (t.amount - t.discount)), 0);
    const totalPaid = valid.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalRemaining = valid.reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
    const overdueList = valid.filter((t) => t.isOverdue || t.status === 'Overdue');
    const totalOverdueAmount = overdueList.reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
    const progressPercent = totalNet > 0 ? Math.min(100, Math.round((totalPaid / totalNet) * 100)) : 0;
    const debtCount = valid.filter((t) => (t.remainingAmount || 0) > 0).length;

    return {
      totalNet,
      totalPaid,
      totalRemaining,
      progressPercent,
      debtCount,
      overdueCount: overdueList.length,
      totalOverdueAmount,
      totalCount: tuitions.length,
    };
  }, [tuitions]);

  // Xử lý phím Escape để đóng Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImageUrl) setLightboxImageUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImageUrl]);

  // ==================== MÀN HÌNH CHẶN 403 DÀNH CHO TEACHER ====================
  if (isTeacher) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card large className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            Bạn không có quyền truy cập phân hệ Học phí
          </h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            Phân hệ Tài chính &amp; Quản lý học phí chỉ dành cho Quản lý cơ sở và Ban giám đốc theo quy định bảo mật của trung tâm.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton onClick={() => navigate('/classes')}>
              Quay lại Lớp học
            </PrimaryButton>
            <SecondaryButton onClick={() => navigate('/schedules')}>
              Xem Thời khóa biểu
            </SecondaryButton>
          </div>
        </Card>
      </div>
    );
  }

  // ==================== RENDER GIAO DIỆN QUẢN TRỊ HỌC PHÍ ====================
  return (
    <div className="space-y-6">
      {/* TOAST THÔNG BÁO TỨC THÌ */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-modal text-sm font-medium transition-all duration-150 ease-out ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal text-white'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* HEADER & TIÊU ĐỀ TRANG */}
      <PageHeader
        eyebrow="Tài chính & Học phí"
        title={
          isParent
            ? 'Học phí & Đóng phí trực tuyến'
            : isStudent
            ? 'Thông tin Học phí'
            : 'Quản lý Học phí & Công nợ'
        }
        description={
          isParent
            ? 'Theo dõi biểu phí, lịch sử đóng và nộp học phí trực tuyến thuận tiện cho các con.'
            : isStudent
            ? 'Chi tiết học phí các môn học và tình trạng thanh toán của bản thân.'
            : 'Theo dõi khoản phải thu, tình trạng thanh toán và nhắc nợ học viên theo cơ sở.'
        }
        actions={
          canManage && (
            <PrimaryButton onClick={() => setCreateModalOpen(true)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tạo khoản thu</span>
            </PrimaryButton>
          )
        }
      />

      {/* BANNER CÔNG NỢ PHỤ HUYNH HOẶC THẺ KPI ADMIN */}
      {isParent ? (
        <div className="bg-gradient-to-br from-teal-deep via-teal to-teal-hover rounded-card-lg p-5 md:p-6 text-white shadow-card space-y-4 border border-teal-hover">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold/20 text-gold text-xs font-semibold mb-1.5 border border-gold/30">
                Cổng thông tin Phụ huynh Roxy
              </span>
              <h2 className="text-base md:text-lg font-bold text-white">Tổng quan học phí gia đình</h2>
              <p className="text-xs text-white/80 mt-0.5">
                Quý phụ huynh vui lòng kiểm tra và hoàn tất các khoản học phí còn nợ đúng hạn để đảm bảo quyền lợi học tập cho các bé.
              </p>
            </div>
            {stats.totalRemaining > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/20 border border-rose-300/30 rounded-full text-rose-100 text-xs font-semibold shrink-0">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>Cần thanh toán: {stats.debtCount} khoản</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/10 backdrop-blur-xs rounded-card p-3.5 border border-white/15">
              <span className="text-xs text-white/80 uppercase tracking-wider block font-medium">Tổng học phí</span>
              <span className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 block tracking-tight text-white">
                {formatCurrency(stats.totalNet)}
              </span>
              <span className="text-[11px] text-white/70 mt-1 block">
                Tổng cộng {stats.totalCount} khoản thu
              </span>
            </div>

            <div className="bg-emerald-950/35 backdrop-blur-xs rounded-card p-3.5 border border-emerald-400/25">
              <span className="text-xs text-emerald-200 uppercase tracking-wider block font-medium">Đã thanh toán</span>
              <span className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 block text-emerald-300 tracking-tight">
                {formatCurrency(stats.totalPaid)}
              </span>
              <span className="text-[11px] text-emerald-200/80 mt-1 block">
                Đạt {stats.progressPercent}% tiến độ
              </span>
            </div>

            <div className="bg-gold/15 backdrop-blur-xs rounded-card p-3.5 border border-gold/30">
              <span className="text-xs text-gold uppercase tracking-wider block font-medium">Còn nợ cần thanh toán</span>
              <span className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 block text-gold tracking-tight">
                {formatCurrency(stats.totalRemaining)}
              </span>
              <span className="text-[11px] text-white/80 mt-1 block">
                {stats.totalRemaining > 0 ? 'Có thể đóng theo từng đợt' : 'Đã hoàn tất mọi khoản'}
              </span>
            </div>
          </div>
        </div>
      ) : isStudent ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-4 border-l-4 border-l-teal">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Tổng học phí</span>
            <div className="font-mono font-bold text-xl text-teal tabular-nums mt-1">{formatCurrency(stats.totalNet)}</div>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-600">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Đã thanh toán</span>
            <div className="font-mono font-bold text-xl text-emerald-700 tabular-nums mt-1">{formatCurrency(stats.totalPaid)}</div>
          </Card>
          <Card className="p-4 border-l-4 border-l-gold">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Còn nợ</span>
            <div className="font-mono font-bold text-xl text-amber-800 tabular-nums mt-1">{formatCurrency(stats.totalRemaining)}</div>
          </Card>
        </div>
      ) : (
        /* 4 THẺ THỐNG KÊ NHANH CHO ADMIN / STAFF */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Thẻ 1: Tổng học phí phải thu */}
          <Card className="p-4 border-l-4 border-l-teal flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-muted mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng phải thu</span>
              <svg className="h-4 w-4 text-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="font-mono font-bold text-xl md:text-2xl text-teal tracking-tight tabular-nums">
              {formatCurrency(stats.totalNet)}
            </div>
            <div className="mt-2 text-[11px] text-ink-muted">
              Tổng cộng: <span className="font-semibold text-ink-secondary">{stats.totalCount}</span> khoản thu
            </div>
          </Card>

          {/* Thẻ 2: Đã thu thực tế */}
          <Card className="p-4 border-l-4 border-l-emerald-600 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đã thu thực tế</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="font-mono font-bold text-xl md:text-2xl text-emerald-700 tracking-tight tabular-nums">
              {formatCurrency(stats.totalPaid)}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-emerald-800 font-medium mb-1">
                <span>Tiến độ thu:</span>
                <span className="tabular-nums">{stats.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Thẻ 3: Tổng công nợ còn lại */}
          <Card className="p-4 border-l-4 border-l-gold flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Còn nợ lại</span>
              <svg className="h-4 w-4 text-gold-active" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="font-mono font-bold text-xl md:text-2xl text-teal tracking-tight tabular-nums">
              {formatCurrency(stats.totalRemaining)}
            </div>
            <div className="mt-2 text-[11px] text-ink-secondary font-medium">
              <span className="font-bold text-amber-800 tabular-nums">{stats.debtCount}</span> khoản thu chưa hoàn tất
            </div>
          </Card>

          {/* Thẻ 4: Khoản thu quá hạn */}
          <Card className="p-4 border-l-4 border-l-rose-500 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Quá hạn nộp</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="font-mono font-bold text-xl md:text-2xl text-rose-700 tracking-tight tabular-nums">
              {formatCurrency(stats.totalOverdueAmount)}
            </div>
            <div className="mt-2 text-[11px] text-rose-700 font-semibold">
              {stats.overdueCount > 0 ? (
                <span>Cần nhắc {stats.overdueCount} khoản quá hạn</span>
              ) : (
                <span className="text-ink-muted font-normal">Không có khoản nợ quá hạn</span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* THANH CÔNG CỤ & BỘ LỌC ĐA CHIỀU */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm tên học viên, mã STU, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!h-10 !pl-9 !pr-8 !py-0 text-xs md:text-sm"
            />
          </div>

          {/* Lọc theo Học viên */}
          <div>
            <CustomSelect
              value={studentFilter}
              onChange={(v) => setStudentFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo học viên"
              options={[
                { value: '', label: 'Tất cả học viên' },
                ...students.map((st) => ({
                  value: String(st.id),
                  label: `${st.fullName} (#${st.id})`,
                })),
              ]}
            />
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <CustomSelect
              value={classFilter}
              onChange={(v) => setClassFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo lớp học"
              options={[
                { value: '', label: 'Tất cả lớp học' },
                ...classes.map((c) => ({ value: String(c.id), label: c.className })),
              ]}
            />
          </div>

          {/* Lọc theo Cơ sở (SuperAdmin chọn, BranchManager khóa) */}
          <div>
            <CustomSelect
              value={branchFilter}
              disabled={isBranchManager}
              onChange={(v) => setBranchFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo cơ sở"
              options={[
                ...(!isBranchManager ? [{ value: '', label: 'Tất cả cơ sở' }] : []),
                ...branches.map((b) => ({ value: String(b.id), label: b.branchName })),
              ]}
            />
          </div>
        </div>

        {/* Thanh lọc trạng thái (Segmented Pill Filter) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
          {[
            { id: '', label: 'Tất cả' },
            { id: 'Unpaid', label: 'Chưa thanh toán' },
            { id: 'PartiallyPaid', label: 'Đóng một phần' },
            { id: 'Paid', label: 'Đã hoàn thành' },
            { id: 'Overdue', label: 'Quá hạn' },
            { id: 'Cancelled', label: 'Đã hủy' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap active:scale-95 transition-all duration-150 ease-out cursor-pointer ${
                  active
                    ? 'bg-teal text-gold shadow-xs font-semibold'
                    : 'bg-surface-subtle text-ink-secondary font-medium hover:bg-mint-canvas hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* DANH SÁCH KHOẢN THU (DESKTOP TABLE + MOBILE CARDS) */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-ink-muted gap-3">
            <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang nạp danh sách học phí...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="text-sm font-medium">{error}</p>
            <SecondaryButton
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-3 !px-4 !py-1.5 text-xs"
            >
              Thử lại
            </SecondaryButton>
          </div>
        ) : tuitions.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-ink-muted">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Không tìm thấy khoản thu nào phù hợp</p>
            <p className="text-xs text-ink-muted mt-1">
              Thử thay đổi bộ lọc hoặc tạo khoản thu mới cho học viên.
            </p>
          </div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW (>= 768px): BẢNG DỮ LIỆU ĐẦY ĐỦ CÓ CUỘN NGANG */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-line text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-2 py-2.5 whitespace-nowrap">Học viên</th>
                    <th className="px-2 py-2.5">Khoản thu &amp; Lớp</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">Cơ sở</th>
                    <th className="px-2 py-2.5 text-right whitespace-nowrap">Phải thu</th>
                    <th className="px-2 py-2.5 text-right whitespace-nowrap">Đã đóng</th>
                    <th className="px-2 py-2.5 text-right whitespace-nowrap">Còn nợ</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">Hạn nộp</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">Trạng thái</th>
                    <th className="sticky right-0 z-20 bg-surface-subtle px-2 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {tuitions.map((t) => {
                    const finalAmount = t.finalAmount ?? (t.amount - t.discount);
                    const paidPercent = finalAmount > 0 ? Math.min(100, Math.round((t.paidAmount / finalAmount) * 100)) : 0;
                    const isFullyPaid = (t.remainingAmount || 0) <= 0 && !t.isCancelled;

                    return (
                      <tr key={t.id} className="group hover:bg-mint-canvas/60 transition-colors duration-150">
                        {/* Học viên */}
                        <td className="px-2 py-2.5 max-w-[140px]">
                          <div className="min-w-0">
                            <div className="font-semibold text-ink text-xs break-words">
                              {t.studentName}
                            </div>
                            <div className="text-[11px] text-ink-muted font-mono">#STU-{t.studentId}</div>
                          </div>
                        </td>

                        {/* Khoản thu & Lớp */}
                        <td className="px-2 py-2.5 max-w-[160px]">
                          <div className="font-medium text-ink break-words" title={t.title}>
                            {t.title}
                          </div>
                          {t.className ? (
                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] bg-surface-subtle text-ink-secondary rounded-full border border-line break-words">
                              {t.className}
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] bg-surface-subtle text-ink-muted rounded-full border border-line/70">
                              Thu ngoài lớp
                            </span>
                          )}
                        </td>

                        {/* Chi nhánh */}
                        <td className="px-2 py-2.5 text-ink-secondary text-xs max-w-[100px] break-words">
                          {t.branchName || '—'}
                        </td>

                        {/* Phải thu */}
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-semibold text-ink text-xs">
                            {formatCurrency(finalAmount)}
                          </div>
                          {t.discount > 0 && (
                            <div className="text-[11px] text-ink-muted">
                              <span className="line-through">{formatCurrency(t.amount)}</span>{' '}
                              <span className="text-emerald-700 font-medium">(-{formatCurrency(t.discount)})</span>
                            </div>
                          )}
                        </td>

                        {/* Đã đóng */}
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-medium text-emerald-700 text-xs">
                            {formatCurrency(t.paidAmount)}
                          </div>
                          <div className="w-14 ml-auto h-1.5 bg-surface-subtle rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                          {(t.pendingAmount || 0) > 0 && (
                            <div className="mt-1">
                              <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap">
                                Chờ duyệt: {formatCurrency(t.pendingAmount)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Còn nợ (NỔI BẬT) */}
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.isCancelled ? (
                            <span className="text-ink-muted text-xs">—</span>
                          ) : isFullyPaid ? (
                            <span className="text-emerald-700 font-semibold text-xs inline-flex items-center gap-1">
                              0 đ
                            </span>
                          ) : (
                            <div className="font-bold text-xs text-rose-600">
                              {formatCurrency(t.remainingAmount)}
                            </div>
                          )}
                        </td>

                        {/* Hạn nộp */}
                        <td className="px-2 py-2.5 text-center whitespace-nowrap">
                          <div className={`text-xs tabular-nums ${t.isOverdue ? 'text-rose-600 font-bold' : 'text-ink-secondary'}`}>
                            {formatDate(t.dueDate)}
                          </div>
                          {t.isOverdue && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-semibold whitespace-nowrap">
                              Quá hạn
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-2 py-2.5 text-center whitespace-nowrap">
                          {renderStatusBadge(t)}
                        </td>

                        {/* Thao tác */}
                        <td className="sticky right-0 z-10 bg-surface group-hover:bg-mint-canvas/60 px-2 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)] transition-colors duration-150">
                          <div className="inline-flex items-center justify-center gap-1">
                            {/* Nút Xem chi tiết */}
                            <IconButton
                              onClick={() => handleOpenDetail(t)}
                              title="Xem chi tiết & lịch sử thanh toán"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </IconButton>

                            {/* Nút Sửa */}
                            {canManage && !t.isCancelled && (
                              <IconButton
                                onClick={() => handleOpenEdit(t)}
                                title="Chỉnh sửa thông tin khoản thu"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </IconButton>
                            )}

                            {/* Nút Xóa */}
                            {canManage && (() => {
                              const hasPayments = (t.paidAmount || 0) > 0 || (t.pendingAmount || 0) > 0;
                              return (
                                <IconButton
                                  variant="danger"
                                  disabled={hasPayments}
                                  onClick={() => handleOpenDelete(t)}
                                  title={
                                    hasPayments
                                      ? 'Không thể xóa khoản thu đã có thanh toán hoặc đang chờ duyệt'
                                      : 'Xóa khoản thu'
                                  }
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </IconButton>
                              );
                            })()}

                            {/* Nút Gửi thanh toán cho Phụ huynh (chỉ hiện khi còn nợ > 0 và chưa bị hủy) */}
                            {isParent && !t.isCancelled && (t.remainingAmount || 0) > 0 && (
                              <IconButton
                                onClick={() => handleOpenParentPayment(t)}
                                title="Thanh toán trực tuyến khoản học phí này"
                                className="!bg-gold !border-gold !text-teal hover:!bg-gold-hover"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                </svg>
                              </IconButton>
                            )}

                            {/* Nút Thu tiền nhanh (chỉ hiện khi còn nợ > 0 và chưa bị hủy) */}
                            {canManage && !t.isCancelled && (t.remainingAmount || 0) > 0 && (
                              <IconButton
                                onClick={() => handleOpenQuickPay(t)}
                                title="Ghi nhận thanh toán nhanh"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </IconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE VIEW (< 768px): DẠNG THẺ XẾP DỌC (TUITION CARD STACK) */}
            <div className="block md:hidden divide-y divide-line/60">
              {tuitions.map((t) => {
                const finalAmount = t.finalAmount ?? (t.amount - t.discount);
                const isFullyPaid = (t.remainingAmount || 0) <= 0 && !t.isCancelled;

                return (
                  <div key={t.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-ink text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{t.studentName}</span>
                          <span className="text-[11px] font-normal text-ink-muted font-mono">#STU-{t.studentId}</span>
                        </div>
                        <div className="text-xs text-ink-secondary font-medium mt-0.5">{t.title}</div>
                        {t.className && (
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {t.className} • {t.branchName}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">{renderStatusBadge(t)}</div>
                    </div>

                    {/* Khung số liệu tiền tệ */}
                    <div className="bg-surface-subtle p-3 rounded-card border border-line/80 grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-sans">Phải thu:</span>
                        <span className="font-semibold text-ink">{formatCurrency(finalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-sans">Đã đóng:</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(t.paidAmount)}</span>
                      </div>
                      {(t.pendingAmount || 0) > 0 && (
                        <div className="col-span-2 pt-1">
                          <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold whitespace-nowrap">
                            Chờ duyệt: {formatCurrency(t.pendingAmount)}
                          </span>
                        </div>
                      )}
                      <div className="col-span-2 pt-1.5 border-t border-line/60 flex items-center justify-between">
                        <span className="text-[11px] text-ink-secondary font-sans font-medium">Còn nợ:</span>
                        {isFullyPaid ? (
                          <span className="text-emerald-700 font-semibold text-xs">Hoàn tất</span>
                        ) : (
                          <span className="text-base font-bold text-rose-600">{formatCurrency(t.remainingAmount)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <div>
                        Hạn: <span className={t.isOverdue ? 'text-rose-600 font-bold' : 'text-ink-secondary'}>{formatDate(t.dueDate)}</span>
                      </div>
                      {t.isOverdue && (
                        <span className="text-rose-700 font-semibold text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Quá hạn
                        </span>
                      )}
                    </div>

                    {/* Các nút bấm Mobile (min-h-[44px]) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(t)}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-teal bg-surface border border-line hover:bg-mint-canvas rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Chi tiết</span>
                      </button>

                      {canManage && !t.isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="px-4 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-medium text-teal bg-surface-subtle border border-line hover:bg-mint-canvas rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                          <span>Sửa</span>
                        </button>
                      )}

                      {canManage && (() => {
                        const hasPayments = (t.paidAmount || 0) > 0 || (t.pendingAmount || 0) > 0;
                        return (
                          <button
                            type="button"
                            disabled={hasPayments}
                            onClick={() => handleOpenDelete(t)}
                            title={
                              hasPayments
                                ? 'Không thể xóa khoản thu đã có thanh toán hoặc đang chờ duyệt'
                                : 'Xóa khoản thu'
                            }
                            aria-label="Xóa khoản thu"
                            className={`px-3.5 min-h-[44px] flex items-center justify-center text-xs font-medium rounded-full border transition-all duration-150 ${
                              hasPayments
                                ? 'text-ink-muted bg-surface-subtle border-line opacity-50 cursor-not-allowed'
                                : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        );
                      })()}

                      {isParent && !t.isCancelled && (t.remainingAmount || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenParentPayment(t)}
                          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-teal bg-gold hover:bg-gold-hover rounded-full shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                          <span>Thanh toán ngay</span>
                        </button>
                      )}

                      {canManage && !t.isCancelled && (t.remainingAmount || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPay(t)}
                          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-teal bg-gold hover:bg-gold-hover rounded-full shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Thu tiền</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* ==================== 1. MODAL XEM CHI TIẾT KHOẢN THU ==================== */}
      {detailModalOpen && selectedTuition && (
        <TuitionDetailModal
          tuition={tuitions.find((x) => x.id === selectedTuition.id) || selectedTuition}
          payments={tuitionPayments}
          loadingPayments={loadingPayments}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedTuition(null);
          }}
          onOpenQuickPay={() => {
            const currentT = tuitions.find((x) => x.id === selectedTuition.id) || selectedTuition;
            setDetailModalOpen(false);
            handleOpenQuickPay(currentT);
          }}
          onOpenParentPayment={() => {
            const currentT = tuitions.find((x) => x.id === selectedTuition.id) || selectedTuition;
            setDetailModalOpen(false);
            handleOpenParentPayment(currentT);
          }}
          onOpenEdit={() => {
            const currentT = tuitions.find((x) => x.id === selectedTuition.id) || selectedTuition;
            setDetailModalOpen(false);
            handleOpenEdit(currentT);
          }}
          onViewImage={(url) => setLightboxImageUrl(url)}
          onPaymentChanged={(msg) => {
            showToast(msg || 'Đã cập nhật giao dịch thanh toán.');
            fetchTuitionPayments(selectedTuition.id);
            setReloadKey((k) => k + 1);
          }}
          canManage={canManage}
          isParent={isParent}
        />
      )}

      {/* ==================== 2. MODAL TẠO KHOẢN THU MỚI ==================== */}
      {createModalOpen && (
        <CreateTuitionModal
          branches={branches}
          students={students}
          studentsLoadError={studentsLoadError}
          classes={classes}
          currentUser={currentUser}
          isBranchManager={isBranchManager}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(msg) => {
            setCreateModalOpen(false);
            showToast(msg || 'Tạo khoản thu học phí thành công!');
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* ==================== 3. MODAL SỬA KHOẢN THU ==================== */}
      {editModalOpen && editingTuition && (
        <EditTuitionModal
          tuition={editingTuition}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTuition(null);
          }}
          onSuccess={(msg) => {
            setEditModalOpen(false);
            setEditingTuition(null);
            showToast(msg || 'Cập nhật khoản thu thành công!');
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* ==================== 4. MODAL THU TIỀN NHANH ==================== */}
      {quickPayModalOpen && quickPayTuition && (
        <QuickPayModal
          tuition={quickPayTuition}
          onClose={() => {
            setQuickPayModalOpen(false);
            setQuickPayTuition(null);
          }}
          onSuccess={(msg) => {
            setQuickPayModalOpen(false);
            setQuickPayTuition(null);
            showToast(msg || 'Ghi nhận thanh toán thành công!');
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* ==================== 4.1. MODAL GỬI THANH TOÁN (PHỤ HUYNH) ==================== */}
      {parentPaymentModalOpen && parentPaymentTuition && (
        <ParentPaymentModal
          tuition={parentPaymentTuition}
          onClose={() => {
            setParentPaymentModalOpen(false);
            setParentPaymentTuition(null);
          }}
          onSuccess={(msg) => {
            setParentPaymentModalOpen(false);
            setParentPaymentTuition(null);
            showToast(msg || 'Gửi yêu cầu thanh toán thành công! Trung tâm sẽ kiểm tra và xác nhận.');
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* ==================== 4.2. MODAL XÁC NHẬN XÓA KHOẢN THU ==================== */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
            onClick={() => !deleteModal.submitting && setDeleteModal(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="modal-panel relative z-10 w-full max-w-md rounded-card-lg border border-line/80 bg-surface p-5 md:p-6 shadow-modal"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-ink">
                  Xóa khoản thu học phí
                </h3>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn khoản thu{' '}
                  <span className="font-semibold text-ink">
                    {deleteModal.tuition.billingPeriod || deleteModal.tuition.title || `#${deleteModal.tuition.id}`}
                  </span>{' '}
                  của học viên{' '}
                  <span className="font-semibold text-ink">
                    {deleteModal.tuition.studentName}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-card border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              Thao tác này sẽ <strong>xóa vĩnh viễn</strong> khoản thu khỏi hệ thống và không thể hoàn tác.
            </div>

            {deleteModal.error && (
              <div className="mt-3 rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {deleteModal.error}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-line/60 pt-4">
              <SecondaryButton
                disabled={deleteModal.submitting}
                onClick={() => setDeleteModal(null)}
              >
                Hủy
              </SecondaryButton>
              <button
                type="button"
                disabled={deleteModal.submitting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer disabled:opacity-70"
              >
                {deleteModal.submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xóa vĩnh viễn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. MODAL LIGHTBOX XEM ẢNH CHỨNG TỪ ==================== */}
      {lightboxImageUrl && (
        <div
          className="modal-backdrop fixed inset-0 z-50 bg-teal-deep/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="modal-panel relative max-w-3xl max-h-[90vh] bg-transparent flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={lightboxImageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-semibold bg-surface/95 hover:bg-surface text-teal rounded-full shadow-modal backdrop-blur-xs"
              >
                Mở tab mới ↗
              </a>
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                aria-label="Đóng ảnh"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-deep/75 text-white hover:bg-teal-deep transition-colors duration-150 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={lightboxImageUrl}
              alt="Chứng từ thanh toán"
              className="max-h-[85vh] max-w-full rounded-card shadow-modal object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== HELPER RENDER BADGE TRẠNG THÁI ====================
function renderStatusBadge(tuition) {
  if (tuition.isCancelled || tuition.status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 line-through px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap">
        Đã hủy
      </span>
    );
  }

  const remaining = tuition.remainingAmount ?? (tuition.finalAmount - tuition.paidAmount);
  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Đã thanh toán
      </span>
    );
  }

  if (tuition.isOverdue || tuition.status === 'Overdue') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 font-bold px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Quá hạn
      </span>
    );
  }

  if ((tuition.paidAmount || 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Đóng một phần
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-300 font-medium px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
      Chưa thanh toán
    </span>
  );
}

// ==================== 1. MODAL XEM CHI TIẾT KHOẢN THU ====================
function TuitionDetailModal({
  tuition,
  payments,
  loadingPayments,
  onClose,
  onOpenQuickPay,
  onOpenParentPayment,
  onOpenEdit,
  onViewImage,
  onPaymentChanged,
  canManage,
  isParent,
}) {
  const finalAmount = tuition.finalAmount ?? (tuition.amount - tuition.discount);
  const remainingAmount = tuition.remainingAmount ?? Math.max(0, finalAmount - tuition.paidAmount);
  const pendingAmount = tuition.pendingAmount || 0;
  const payableAmount = Math.max(0, remainingAmount - pendingAmount);
  const hasDebt = remainingAmount > 0 && !tuition.isCancelled;

  // State Modal Hủy (Void) giao dịch PendingConfirm ngay trong TuitionDetailModal
  const [voidModal, setVoidModal] = useState(null); // { payment, reason, submitting, error }

  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidModal?.payment) return;
    if (!voidModal.reason.trim()) {
      setVoidModal((prev) => ({ ...prev, error: 'Vui lòng nhập lý do hủy giao dịch thanh toán.' }));
      return;
    }
    setVoidModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const res = await axiosClient.put(`/Payments/${voidModal.payment.id}/cancel`, {
        reason: voidModal.reason.trim(),
      });
      setVoidModal(null);
      if (onPaymentChanged) {
        onPaymentChanged(res.data?.message || 'Đã hủy giao dịch thanh toán đang chờ duyệt.');
      }
    } catch (err) {
      setVoidModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Không thể hủy giao dịch thanh toán.',
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-3xl bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-ink">Chi tiết khoản thu</span>
              <Badge variant="gold" className="font-mono">
                #TUI-{tuition.id}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{tuition.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Vùng 1 & 2: Thông tin học viên & Tổng hợp tài chính */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cột trái: Thông tin học viên */}
            <div className="bg-surface-subtle p-4 rounded-card border border-line/80 space-y-2 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                Thông tin đối tượng
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Học viên:</span>
                <span className="font-semibold text-ink">{tuition.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Mã học viên:</span>
                <span className="font-mono text-ink-secondary">#STU-{tuition.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Lớp học:</span>
                <span className="font-medium text-ink">{tuition.className || 'Khoản thu ngoài lớp'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Cơ sở:</span>
                <span className="text-ink-secondary">{tuition.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Hạn đóng:</span>
                <span className={`font-semibold ${tuition.isOverdue ? 'text-rose-600' : 'text-ink'}`}>
                  {formatDate(tuition.dueDate)} {tuition.isOverdue && '(Quá hạn)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-line/60">
                <span className="text-ink-muted">Trạng thái:</span>
                <div>{renderStatusBadge(tuition)}</div>
              </div>
            </div>

            {/* Cột phải: Tổng hợp tài chính */}
            <div className="bg-surface-subtle p-4 rounded-card border border-line/80 space-y-2 text-xs font-mono tabular-nums">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1 font-sans">
                Tổng hợp tài chính
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted font-sans">Học phí gốc:</span>
                <span className="font-medium text-ink-secondary">{formatCurrency(tuition.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted font-sans">Miễn giảm / Ưu đãi:</span>
                <span className="text-emerald-700 font-medium">-{formatCurrency(tuition.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink pt-1 border-t border-line/60">
                <span className="font-sans">Số tiền thực thu:</span>
                <span className="text-sm">{formatCurrency(finalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="font-sans">Đã thanh toán:</span>
                <span className="font-semibold">{formatCurrency(tuition.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span className="font-sans">Đang chờ xác nhận (Pending):</span>
                <span className="font-semibold">{formatCurrency(pendingAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-line/60">
                <span className="font-sans font-bold text-ink">CÒN NỢ CẦN THU:</span>
                <span className={`text-base font-bold ${hasDebt ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
              <div className="flex justify-between text-teal pt-1">
                <span className="font-sans font-semibold">Số tiền còn có thể nộp:</span>
                <span className="font-bold">{formatCurrency(payableAmount)}</span>
              </div>
            </div>
          </div>

          {/* Ghi chú nội bộ nếu có */}
          {tuition.note && (
            <div className="p-3 bg-gold-soft/60 border border-gold/40 rounded-card text-xs text-teal">
              <span className="font-semibold">Ghi chú:</span> {tuition.note}
            </div>
          )}

          {/* Vùng 3: LỊCH SỬ CÁC LẦN THANH TOÁN (PAYMENTS) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Lịch sử các lần thanh toán ({payments.length})
              </h3>
              {canManage && hasDebt && (
                <PrimaryButton
                  onClick={onOpenQuickPay}
                  className="!px-3.5 !py-1.5 text-xs"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Ghi nhận thanh toán mới</span>
                </PrimaryButton>
              )}
              {isParent && hasDebt && (
                <PrimaryButton
                  onClick={onOpenParentPayment}
                  className="!px-3.5 !py-1.5 text-xs"
                >
                  <span>Gửi thanh toán ngay</span>
                </PrimaryButton>
              )}
            </div>

            {loadingPayments ? (
              <div className="p-6 text-center text-ink-muted text-xs">
                <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Đang tải lịch sử thanh toán...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-6 text-center text-ink-muted bg-surface-subtle rounded-card border border-dashed border-line text-xs">
                Chưa có lượt thanh toán nào được ghi nhận cho khoản thu này.
              </div>
            ) : (
              <div className="border border-line rounded-card overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-subtle border-b border-line text-ink-muted font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Mã GD</th>
                      <th className="px-3 py-2">Ngày đóng</th>
                      <th className="px-3 py-2 text-right">Số tiền</th>
                      <th className="px-3 py-2">Phương thức</th>
                      <th className="px-3 py-2">Chứng từ</th>
                      <th className="px-3 py-2">Người duyệt</th>
                      <th className="px-3 py-2 text-center">Trạng thái</th>
                      {canManage && <th className="px-3 py-2 text-center">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-mint-canvas/50 transition-colors duration-150">
                        <td className="px-3 py-2.5 font-mono font-semibold text-teal">
                          {p.transactionCode || `#TX-${p.id}`}
                        </td>
                        <td className="px-3 py-2.5 text-ink-secondary whitespace-nowrap">
                          {formatDateTime(p.paidAt || p.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-ink whitespace-nowrap">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {renderPaymentMethodBadge(p.paymentMethod)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {p.proofImageUrl ? (
                            <button
                              type="button"
                              onClick={() => onViewImage(p.proofImageUrl)}
                              className="text-teal hover:underline font-medium text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                              <span>Xem ảnh</span>
                            </button>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-ink-secondary whitespace-nowrap">
                          {p.confirmedByName || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {renderPaymentStatusBadge(p.status)}
                        </td>
                        {canManage && (
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {p.status === 'PendingConfirm' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setVoidModal({
                                    payment: p,
                                    reason: '',
                                    submitting: false,
                                    error: '',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-subtle text-ink-secondary hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-line rounded-full text-[11px] font-semibold active:scale-95 transition-colors duration-150 cursor-pointer"
                                title="Hủy (Void) giao dịch đang chờ xác nhận"
                              >
                                <span>Hủy (Void)</span>
                              </button>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Hủy (Void) giao dịch đang chờ duyệt */}
          {voidModal && (
            <div className="p-4 rounded-card border border-rose-200 bg-rose-50/70 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-900">
                  Hủy giao dịch đang chờ xác nhận ({voidModal.payment.transactionCode || `#PAY-${voidModal.payment.id}`}) — {formatCurrency(voidModal.payment.amount)}
                </h4>
                <button
                  type="button"
                  onClick={() => setVoidModal(null)}
                  aria-label="Đóng"
                  className="text-ink-muted hover:text-ink cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {voidModal.error && (
                <div className="text-rose-700 font-medium">{voidModal.error}</div>
              )}
              <form onSubmit={handleConfirmVoid} className="space-y-2.5">
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    Lý do hủy giao dịch <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="VD: Nhập sai số tiền chuyển khoản / Tạo trùng giao dịch..."
                    value={voidModal.reason}
                    onChange={(e) => setVoidModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
                    className="w-full p-2.5 bg-surface border border-line rounded-card focus:outline-none focus:border-rose-500 text-ink"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <SecondaryButton
                    disabled={voidModal.submitting}
                    onClick={() => setVoidModal(null)}
                    className="!px-3.5 !py-1.5 text-xs"
                  >
                    Đóng
                  </SecondaryButton>
                  <button
                    type="submit"
                    disabled={voidModal.submitting || !voidModal.reason.trim()}
                    className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {voidModal.submitting ? 'Đang xử lý...' : 'Xác nhận hủy giao dịch'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-line/60 bg-surface-subtle">
          <div>
            {canManage && !tuition.isCancelled && (
              <SecondaryButton
                onClick={onOpenEdit}
                className="!px-4 !py-2 text-xs"
              >
                Chỉnh sửa khoản thu
              </SecondaryButton>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={onClose} className="!px-4 !py-2 text-xs">
              Đóng
            </SecondaryButton>
            {canManage && hasDebt && (
              <PrimaryButton onClick={onOpenQuickPay} className="!px-4 !py-2 text-xs">
                Thu tiền ngay ({formatCurrency(remainingAmount)})
              </PrimaryButton>
            )}
            {isParent && hasDebt && (
              <PrimaryButton onClick={onOpenParentPayment} className="!px-4 !py-2 text-xs">
                Thanh toán ngay ({formatCurrency(remainingAmount)})
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 2. MODAL TẠO KHOẢN THU MỚI ====================
function CreateTuitionModal({
  branches,
  students,
  studentsLoadError,
  currentUser,
  isBranchManager,
  onClose,
  onSuccess,
}) {
  const [branchId, setBranchId] = useState(() => {
    if (isBranchManager && currentUser.branchId) return String(currentUser.branchId);
    return branches[0]?.id ? String(branches[0].id) : '';
  });

  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentEnrolledClasses, setStudentEnrolledClasses] = useState([]);
  const [loadingStudentClasses, setLoadingStudentClasses] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('0');

  // Hạn đóng: Gợi ý 7 ngày sau
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Lọc học viên theo chi nhánh đang chọn
  const filteredStudents = useMemo(() => {
    if (!branchId) return students;
    return students.filter((st) => String(st.branchId) === String(branchId));
  }, [students, branchId]);

  const handleStudentChange = (newId) => {
    setStudentId(newId);
    setClassId('');
    if (!newId) {
      setStudentEnrolledClasses([]);
    }
  };

  // Khi chọn học viên, gọi API lấy danh sách lớp học viên đã ghi danh
  useEffect(() => {
    if (!studentId) return;

    let ignore = false;
    const fetchEnrolled = async () => {
      setLoadingStudentClasses(true);
      try {
        const res = await axiosClient.get('/StudentClasses', { params: { studentId } });
        if (!ignore) {
          // Chỉ lấy các lớp Active hoặc Pending
          const activeClasses = (res.data || []).filter((sc) => sc.status === 'Active' || sc.status === 'Pending');
          setStudentEnrolledClasses(activeClasses);
        }
      } catch (err) {
        console.warn('Lỗi lấy lớp của học viên:', err);
        if (!ignore) setStudentEnrolledClasses([]);
      } finally {
        if (!ignore) setLoadingStudentClasses(false);
      }
    };

    fetchEnrolled();
    return () => {
      ignore = true;
    };
  }, [studentId]);

  // Tính số tiền thực thu và phiên âm
  const numAmount = Number(amount) || 0;
  const numDiscount = Number(discount) || 0;
  const netAmount = Math.max(0, numAmount - numDiscount);

  // Validate discount <= amount
  const isDiscountInvalid = numDiscount > numAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!branchId) {
      setFormError('Vui lòng chọn cơ sở.');
      return;
    }
    if (!studentId) {
      setFormError('Vui lòng chọn học viên.');
      return;
    }
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề khoản thu.');
      return;
    }
    if (numAmount < 0 || numDiscount < 0) {
      setFormError('Số tiền học phí và giảm giá phải lớn hơn hoặc bằng 0.');
      return;
    }
    if (isDiscountInvalid) {
      setFormError('Số tiền giảm giá không được lớn hơn học phí gốc!');
      return;
    }
    if (!dueDate) {
      setFormError('Vui lòng chọn hạn nộp học phí.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        branchId: Number(branchId),
        studentId: Number(studentId),
        classId: classId ? Number(classId) : null,
        title: title.trim(),
        amount: numAmount,
        discount: numDiscount,
        dueDate,
        note: note.trim() || null,
      };

      const res = await axiosClient.post('/Tuitions', payload);
      onSuccess(res.data?.message || 'Tạo khoản thu học phí thành công!');
    } catch (err) {
      console.error('Lỗi khi tạo khoản thu:', err);
      setFormError(err.response?.data?.message || 'Đã xảy ra lỗi khi tạo khoản thu. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-xl bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
            <div>
              <h2 className="text-base font-bold text-ink">Tạo khoản thu học phí mới</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Thiết lập khoản thu cho học viên theo lớp hoặc hoạt động ngoại khóa.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {/* Cơ sở */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Cơ sở áp dụng <span className="text-rose-500">*</span>
              </label>
              <SelectPill
                value={branchId}
                disabled={isBranchManager}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setStudentId('');
                  setClassId('');
                  setStudentEnrolledClasses([]);
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </SelectPill>
            </div>

            {/* Chọn học viên */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Chọn học viên <span className="text-rose-500">*</span>
              </label>
              {studentsLoadError && (
                <p className="mb-1.5 rounded-card border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                  {studentsLoadError}
                </p>
              )}
              <SelectPill
                value={studentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                required
              >
                <option value="">-- Chọn học viên --</option>
                {filteredStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} (#{st.id}) {st.school ? `• ${st.school}` : ''}
                  </option>
                ))}
              </SelectPill>
            </div>

            {/* Chọn lớp học (tự động lọc theo các lớp học viên đã ghi danh) */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Lớp học liên kết <span className="text-ink-muted font-normal">(Tùy chọn)</span>
              </label>
              {loadingStudentClasses ? (
                <div className="text-ink-muted py-2">Đang nạp lớp học viên đã ghi danh...</div>
              ) : (
                <SelectPill
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">-- Khoản thu ngoài lớp (Không gắn lớp) --</option>
                  {studentEnrolledClasses.map((sc) => (
                    <option key={sc.classId} value={sc.classId}>
                      {sc.className} ({sc.status === 'Active' ? 'Đang học' : 'Chờ duyệt'})
                    </option>
                  ))}
                </SelectPill>
              )}
              <p className="text-[11px] text-ink-muted mt-1">
                Hệ thống tự động lọc các lớp học viên đã ghi danh để đảm bảo tính toàn vẹn dữ liệu.
              </p>
            </div>

            {/* Tiêu đề khoản thu */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Tiêu đề khoản thu <span className="text-rose-500">*</span>
              </label>
              <InputPill
                type="text"
                placeholder="VD: Học phí Tháng 11/2026 - Khóa Tiền tiểu học Họa Mi 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="!h-10 !py-0 text-xs"
              />
            </div>

            {/* Học phí gốc & Miễn giảm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  Mức học phí gốc (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <InputPill
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="VD: 2500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="!h-10 !py-0 font-mono text-xs"
                />
                {numAmount > 0 && (
                  <p className="text-[11px] text-ink-muted mt-1 font-mono">
                    {formatCurrency(numAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  Miễn giảm / Ưu đãi (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className={`w-full h-10 px-4 font-mono bg-surface border rounded-full focus:outline-none ${
                    isDiscountInvalid
                      ? 'border-rose-500 ring-2 ring-rose-200 text-rose-700'
                      : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink'
                  }`}
                />
                {numDiscount > 0 && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                    Giảm: {formatCurrency(numDiscount)}
                  </p>
                )}
              </div>
            </div>

            {isDiscountInvalid && (
              <p className="text-xs text-rose-600 font-medium">
                Số tiền giảm giá ({formatCurrency(numDiscount)}) không được lớn hơn học phí gốc ({formatCurrency(numAmount)})!
              </p>
            )}

            {/* Tổng số tiền thực thu (Tự động tính) */}
            <div className="p-3.5 bg-gold-soft/60 border border-gold/40 rounded-card space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal">SỐ TIỀN THỰC THU:</span>
                <span className="font-mono font-bold text-base text-teal">
                  {formatCurrency(netAmount)}
                </span>
              </div>
              <p className="text-[11px] text-ink-secondary italic">
                {numberToVietnameseWords(netAmount)}
              </p>
            </div>

            {/* Hạn nộp */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Hạn đóng học phí <span className="text-rose-500">*</span>
              </label>
              <InputPill
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="!h-10 !py-0 text-xs"
              />
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Ghi chú nội bộ <span className="text-ink-muted font-normal">(Tùy chọn)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Ghi chú về học bổng, đăng ký theo tháng, anh em học chung..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 bg-surface border border-line rounded-card focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line/60 bg-surface-subtle">
            <SecondaryButton onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting || isDiscountInvalid}>
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              )}
              <span>Lưu khoản thu</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 3. MODAL CHỈNH SỬA KHOẢN THU ====================
function EditTuitionModal({ tuition, onClose, onSuccess }) {
  const [title, setTitle] = useState(tuition.title || '');
  const [amount, setAmount] = useState(String(tuition.amount || 0));
  const [discount, setDiscount] = useState(String(tuition.discount || 0));
  const [dueDate, setDueDate] = useState(() => {
    if (!tuition.dueDate) return '';
    try {
      const d = new Date(tuition.dueDate);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return String(tuition.dueDate).split('T')[0];
    }
  });
  const [isCancelled, setIsCancelled] = useState(Boolean(tuition.isCancelled));
  const [note, setNote] = useState(tuition.note || '');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const numAmount = Number(amount) || 0;
  const numDiscount = Number(discount) || 0;
  const netAmount = Math.max(0, numAmount - numDiscount);
  const paidAmount = tuition.paidAmount || 0;
  const pendingAmount = tuition.pendingAmount || 0;
  const hasConfirmedPayments = paidAmount > 0;
  const hasPendingPayments = pendingAmount > 0;

  // Validate discount <= amount và netAmount >= paidAmount
  const isDiscountInvalid = numDiscount > numAmount;
  const isUnderpaidAfterEdit = netAmount < paidAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề khoản thu.');
      return;
    }
    if (numAmount < 0 || numDiscount < 0) {
      setFormError('Số tiền học phí và giảm giá phải lớn hơn hoặc bằng 0.');
      return;
    }
    if (isDiscountInvalid) {
      setFormError('Số tiền giảm giá không được lớn hơn học phí gốc!');
      return;
    }
    if (isUnderpaidAfterEdit) {
      setFormError(
        `Số tiền thực thu (${formatCurrency(netAmount)}) không được nhỏ hơn tổng số tiền đã thanh toán trước đó (${formatCurrency(paidAmount)})!`
      );
      return;
    }
    if (!dueDate) {
      setFormError('Vui lòng chọn hạn nộp.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        amount: numAmount,
        discount: numDiscount,
        dueDate,
        isCancelled,
        note: note.trim() || null,
      };

      const res = await axiosClient.put(`/Tuitions/${tuition.id}`, payload);
      onSuccess(res.data?.message || 'Cập nhật khoản thu thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật khoản thu:', err);
      setFormError(err.response?.data?.message || 'Không thể cập nhật khoản thu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-xl bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <span>Chỉnh sửa khoản thu</span>
                <Badge variant="gold" className="font-mono">#TUI-{tuition.id}</Badge>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Học viên: <span className="font-semibold text-ink">{tuition.studentName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Tiêu đề khoản thu <span className="text-rose-500">*</span>
              </label>
              <InputPill
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="!h-10 !py-0 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  Mức học phí gốc (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <InputPill
                  type="number"
                  min="0"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="!h-10 !py-0 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  Miễn giảm / Ưu đãi (VNĐ)
                </label>
                <InputPill
                  type="number"
                  min="0"
                  step="1000"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="!h-10 !py-0 font-mono text-xs"
                />
              </div>
            </div>

            {/* Cảnh báo nếu số tiền thực thu nhỏ hơn số tiền đã đóng */}
            {isUnderpaidAfterEdit && (
              <p className="text-xs text-rose-600 font-medium p-2.5 bg-rose-50 border border-rose-200 rounded-card">
                Cảnh báo: Học viên đã đóng <span className="font-bold">{formatCurrency(paidAmount)}</span>.
                Số tiền thực thu sau khi sửa ({formatCurrency(netAmount)}) không được nhỏ hơn số tiền đã thanh toán!
              </p>
            )}

            {/* Số tiền thực thu */}
            <div className="p-3.5 bg-surface-subtle border border-line rounded-card space-y-1 font-mono tabular-nums">
              <div className="flex justify-between text-xs">
                <span className="font-sans text-ink-secondary">Thực thu mới:</span>
                <span className="font-bold text-ink">{formatCurrency(netAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700">
                <span className="font-sans">Đã đóng trước đó:</span>
                <span className="font-semibold">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-rose-600 font-bold pt-1 border-t border-line/60">
                <span className="font-sans">Còn nợ mới:</span>
                <span>{formatCurrency(Math.max(0, netAmount - paidAmount))}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Hạn đóng học phí <span className="text-rose-500">*</span>
              </label>
              <InputPill
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="!h-10 !py-0 text-xs"
              />
            </div>

            {/* Checkbox Đã hủy */}
            <div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isCancelled"
                  disabled={hasConfirmedPayments || hasPendingPayments}
                  checked={isCancelled}
                  onChange={(e) => setIsCancelled(e.target.checked)}
                  className="w-4 h-4 text-teal rounded border-line focus:ring-gold/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="isCancelled"
                  className={`text-xs font-semibold ${
                    hasConfirmedPayments || hasPendingPayments
                      ? 'text-ink-muted cursor-not-allowed'
                      : 'text-ink-secondary cursor-pointer'
                  }`}
                >
                  Hủy khoản thu này (Khoản thu sẽ bị đóng băng và không thể thanh toán tiếp)
                </label>
              </div>
              {hasConfirmedPayments && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-card p-2.5 mt-1.5">
                  Không thể hủy khoản học phí này vì đã có giao dịch thanh toán được xác nhận ({formatCurrency(paidAmount)}).
                </div>
              )}
              {!hasConfirmedPayments && hasPendingPayments && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-card p-2.5 mt-1.5">
                  Khoản học phí này đang có giao dịch chờ xác nhận ({formatCurrency(pendingAmount)}). Vui lòng hủy/từ chối giao dịch chờ trước khi hủy khoản thu.
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Ghi chú điều chỉnh
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 bg-surface border border-line rounded-card focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line/60 bg-surface-subtle">
            <SecondaryButton onClick={onClose} disabled={submitting}>
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={submitting || isDiscountInvalid || isUnderpaidAfterEdit}
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              )}
              <span>Cập nhật</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 4. MODAL THU TIỀN NHANH ====================
function QuickPayModal({ tuition, onClose, onSuccess }) {
  const finalAmount = tuition.finalAmount ?? (tuition.amount - tuition.discount);
  const remainingAmount = tuition.remainingAmount ?? Math.max(0, finalAmount - tuition.paidAmount);
  const pendingAmount = tuition.pendingAmount || 0;
  const payableAmount = Math.max(0, remainingAmount - pendingAmount);

  // Mặc định điền đúng số còn có thể nộp (sau khi trừ pendingAmount)
  const [amount, setAmount] = useState(String(payableAmount > 0 ? payableAmount : 0));
  const [paymentMethod, setPaymentMethod] = useState('BankTransfer'); // 'BankTransfer', 'Cash', 'ZaloPay', 'Other'
  const [transactionCode, setTransactionCode] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const numAmount = Number(amount) || 0;
  const isOverpay = numAmount > payableAmount;
  const isInvalidAmount = payableAmount <= 0 || numAmount <= 0 || isOverpay;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (payableAmount <= 0) {
      setFormError('Không thể nộp thêm vì đã có giao dịch chờ xác nhận đủ số tiền còn nợ.');
      return;
    }
    if (numAmount <= 0) {
      setFormError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (isOverpay) {
      setFormError(`Số tiền thanh toán không được vượt quá số còn có thể nộp (Tối đa: ${formatCurrency(payableAmount)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tuitionId: tuition.id,
        amount: numAmount,
        paymentMethod,
        transactionCode: transactionCode.trim() || null,
        proofImageUrl: proofImageUrl.trim() || null,
        paidAt: new Date().toISOString(),
        note: note.trim() || null,
      };

      const res = await axiosClient.post('/Payments', payload);
      onSuccess(res.data?.message || 'Ghi nhận thanh toán thành công!');
    } catch (err) {
      console.error('Lỗi khi ghi nhận thanh toán:', err);
      setFormError(err.response?.data?.message || 'Không thể ghi nhận thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-lg bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
            <div>
              <h2 className="text-base font-bold text-ink">
                Ghi nhận thanh toán nhanh
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Thu tiền cho học viên <span className="font-semibold text-ink">{tuition.studentName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {pendingAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-card p-3 text-xs leading-relaxed">
                Lưu ý: Khoản thu này đang có <strong>{formatCurrency(pendingAmount)}</strong> chờ xác nhận. Số tiền tối đa có thể nộp thêm lúc này là <strong>{formatCurrency(payableAmount)}</strong>.
                {payableAmount <= 0 && (
                  <p className="mt-1 font-semibold text-rose-700">
                    Toàn bộ số tiền còn nợ đang chờ xác nhận. Vui lòng duyệt hoặc hủy giao dịch chờ trước khi tạo giao dịch mới.
                  </p>
                )}
              </div>
            )}

            {/* Thông tin dư nợ */}
            <div className="p-3.5 bg-surface-subtle border border-line rounded-card space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Khoản thu:</span>
                <span className="font-semibold text-ink text-right truncate max-w-[220px]">{tuition.title}</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-ink-muted font-sans">Tổng phải thu:</span>
                <span className="text-ink-secondary">{formatCurrency(finalAmount)}</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-ink-muted font-sans">Đã đóng trước:</span>
                <span className="text-emerald-700 font-medium">{formatCurrency(tuition.paidAmount)}</span>
              </div>
              {pendingAmount > 0 && (
                <div className="flex justify-between font-mono tabular-nums">
                  <span className="text-ink-muted font-sans">Đang chờ xác nhận:</span>
                  <span className="text-amber-700 font-semibold">{formatCurrency(pendingAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-line/60">
                <span className="font-bold text-ink">TỐI ĐA CÓ THỂ NỘP:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-rose-600 tabular-nums">
                    {formatCurrency(payableAmount)}
                  </span>
                  {payableAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(payableAmount))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-gold-soft text-teal hover:bg-gold/30 rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                      Điền đủ
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ô nhập số tiền thanh toán */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Số tiền thanh toán (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                max={payableAmount}
                disabled={payableAmount <= 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`w-full h-11 px-4 font-mono text-base font-bold rounded-full border focus:outline-none transition-all disabled:bg-surface-subtle disabled:text-ink-muted ${
                  isOverpay
                    ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30 text-rose-700'
                    : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink bg-surface'
                }`}
              />

              {/* Báo đỏ tức thì nếu vượt nợ */}
              {isOverpay && (
                <p className="text-xs text-rose-600 font-medium mt-1">
                  Số tiền thanh toán ({formatCurrency(numAmount)}) không được vượt quá số còn có thể nộp (Tối đa: {formatCurrency(payableAmount)}).
                </p>
              )}

              {/* Phiên âm tiếng Việt */}
              {!isOverpay && numAmount > 0 && (
                <p className="text-[11px] text-ink-muted italic mt-1">
                  {numberToVietnameseWords(numAmount)}
                </p>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1.5">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'BankTransfer', label: 'Chuyển khoản' },
                  { id: 'Cash', label: 'Tiền mặt' },
                  { id: 'ZaloPay', label: 'ZaloPay' },
                  { id: 'Other', label: 'Khác' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-gold bg-gold-soft text-teal shadow-2xs'
                        : 'border-line bg-surface text-ink-secondary hover:bg-mint-canvas'
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mã giao dịch */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Mã giao dịch / Mã tham chiếu ngân hàng
              </label>
              <InputPill
                type="text"
                placeholder="VD: MB12345678, FT263..."
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value)}
                className="!h-10 !py-0 font-mono text-xs"
              />
            </div>

            {/* Ảnh chứng từ */}
            <ImageUpload
              label={
                <>
                  Ảnh chụp biên lai / Chứng từ <span className="text-ink-muted font-normal">(Tùy chọn)</span>
                </>
              }
              value={proofImageUrl}
              onChange={setProofImageUrl}
              folder="payments"
              disabled={submitting}
            />

            {/* Ghi chú */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Ghi chú thu tiền
              </label>
              <textarea
                rows={2}
                placeholder="Phụ huynh nộp trực tiếp tại quầy, chuyển khoản từ số..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 bg-surface border border-line rounded-card focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink resize-none text-xs"
              />
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-card text-[11px] text-emerald-800">
              Thao tác do Quản trị viên thực hiện sẽ tự động được đánh dấu <span className="font-bold">Đã xác nhận (Confirmed)</span> và gửi thông báo tới phụ huynh.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line/60 bg-surface-subtle">
            <SecondaryButton onClick={onClose} disabled={submitting}>
              Hủy
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting || isInvalidAmount}>
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              )}
              <span>Lưu &amp; Xác nhận thanh toán</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 4.1. MODAL THANH TOÁN DÀNH CHO PHỤ HUYNH ====================
function ParentPaymentModal({ tuition, onClose, onSuccess }) {
  const finalAmount = tuition.finalAmount ?? (tuition.amount - tuition.discount);
  const remainingAmount = tuition.remainingAmount ?? Math.max(0, finalAmount - (tuition.paidAmount || 0));
  const pendingAmount = tuition.pendingAmount || 0;
  const payableAmount = Math.max(0, remainingAmount - pendingAmount);

  const [amount, setAmount] = useState(String(payableAmount > 0 ? payableAmount : 0));
  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
  const [transactionCode, setTransactionCode] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [note, setNote] = useState('');

  const [copiedStk, setCopiedStk] = useState(false);
  const [copiedSyntax, setCopiedSyntax] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const numAmount = Number(amount) || 0;
  const isOverpay = numAmount > payableAmount;

  const bankAccount = {
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    accountNumber: '0326538824',
    accountName: 'TRUNG TAM ROXY ACADEMY',
    transferSyntax: `HP ${tuition.id} ${tuition.studentName || ''}`.trim(),
  };

  const handleCopy = (text, type) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      if (type === 'stk') {
        setCopiedStk(true);
        setTimeout(() => setCopiedStk(false), 2000);
      } else {
        setCopiedSyntax(true);
        setTimeout(() => setCopiedSyntax(false), 2000);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (payableAmount <= 0) {
      setFormError('Không thể nộp thêm vì đã có giao dịch chờ xác nhận đủ số tiền còn nợ.');
      return;
    }
    if (numAmount <= 0) {
      setFormError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (isOverpay) {
      setFormError(`Số tiền thanh toán không được vượt quá số còn có thể nộp (Tối đa: ${formatCurrency(payableAmount)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tuitionId: tuition.id,
        amount: numAmount,
        paymentMethod,
        transactionCode: transactionCode.trim() || null,
        proofImageUrl: proofImageUrl.trim() || null,
        paidAt: new Date().toISOString(),
        note: note.trim() || null,
      };

      const res = await axiosClient.post('/Payments', payload);
      onSuccess(res.data?.message || 'Gửi yêu cầu thanh toán thành công! Trung tâm sẽ kiểm tra và xác nhận.');
    } catch (err) {
      console.error('Lỗi khi gửi thanh toán:', err);
      setFormError(err.response?.data?.message || 'Không thể gửi yêu cầu thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-lg bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
            <div>
              <h2 className="text-base font-bold text-ink">
                Nộp học phí trực tuyến
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Khoản thu: <strong className="text-ink">{tuition.title}</strong> — Học viên: {tuition.studentName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-800">
                {formError}
              </div>
            )}

            {pendingAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-card p-3 text-xs leading-relaxed">
                Lưu ý: Khoản thu này đang có <strong>{formatCurrency(pendingAmount)}</strong> chờ xác nhận. Số tiền tối đa có thể nộp thêm lúc này là <strong>{formatCurrency(payableAmount)}</strong>.
                {payableAmount <= 0 && (
                  <p className="mt-1 font-semibold text-rose-700">
                    Toàn bộ số tiền còn nợ đang chờ xác nhận. Vui lòng đợi trung tâm đối soát trước khi tạo giao dịch mới.
                  </p>
                )}
              </div>
            )}

            {/* HỘP THÔNG TIN TÀI KHOẢN NGÂN HÀNG ROXY */}
            <div className="p-4 bg-gold-soft/50 border border-gold/40 rounded-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal uppercase tracking-wider">
                  Tài khoản nhận học phí
                </span>
                <Badge variant="gold">Vietcombank</Badge>
              </div>

              <div className="space-y-1.5 text-xs text-teal">
                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary">Chủ tài khoản:</span>
                  <strong className="text-teal uppercase font-mono">{bankAccount.accountName}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-base text-teal">{bankAccount.accountNumber}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankAccount.accountNumber, 'stk')}
                      className="px-2.5 py-0.5 text-[11px] font-semibold bg-surface text-teal hover:bg-gold-soft border border-gold/40 rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                      {copiedStk ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gold/30 gap-2">
                  <span className="text-ink-secondary shrink-0">Cú pháp chuyển khoản:</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-teal bg-surface px-2.5 py-0.5 rounded-full border border-gold/40 truncate">
                      {bankAccount.transferSyntax}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankAccount.transferSyntax, 'syntax')}
                      className="px-2.5 py-0.5 text-[11px] font-semibold bg-surface text-teal hover:bg-gold-soft border border-gold/40 rounded-full active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
                    >
                      {copiedSyntax ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Số tiền cần thanh toán */}
            <div className="bg-surface-subtle p-3.5 rounded-card border border-line text-xs flex justify-between items-center">
              <div>
                <span className="text-ink-muted block">Số tiền tối đa có thể nộp:</span>
                <span className="font-bold text-rose-600 text-sm font-mono tabular-nums">{formatCurrency(payableAmount)}</span>
              </div>
              {payableAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(payableAmount))}
                  className="px-3 py-1 rounded-full bg-gold-soft text-teal text-xs font-semibold hover:bg-gold/30 transition-colors cursor-pointer"
                >
                  Điền toàn bộ
                </button>
              )}
            </div>

            {/* Input Số tiền muốn đóng */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Số tiền thanh toán lần này (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <InputPill
                type="number"
                required
                min={1000}
                max={payableAmount}
                disabled={payableAmount <= 0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="!h-10 !py-0 font-mono font-bold text-xs md:text-sm"
              />
              {isOverpay && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  Số tiền thanh toán ({formatCurrency(numAmount)}) không được vượt quá số còn có thể nộp (Tối đa: {formatCurrency(payableAmount)}).
                </p>
              )}
              {/* Phiên âm số tiền thành chữ tiếng Việt */}
              {numAmount > 0 && (
                <p className="mt-1.5 text-xs text-teal bg-gold-soft/60 border border-gold/30 rounded-card p-2 italic leading-relaxed">
                  Bằng chữ: <strong>{numberToVietnameseWords(numAmount)}</strong>
                </p>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Phương thức thanh toán <span className="text-rose-600">*</span>
              </label>
              <SelectPill
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-xs md:text-sm"
              >
                <option value="BankTransfer">Chuyển khoản ngân hàng (Khuyên dùng)</option>
                <option value="ZaloPay">Ví ZaloPay</option>
                <option value="Cash">Đóng tiền mặt tại quầy trung tâm</option>
              </SelectPill>
            </div>

            {/* Mã giao dịch ngân hàng */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Mã giao dịch / Mã tham chiếu ngân hàng <span className="text-ink-muted font-normal">(tùy chọn)</span>
              </label>
              <InputPill
                type="text"
                maxLength={50}
                placeholder="VD: FT241116..., MB0326..."
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value)}
                className="!h-10 !py-0 text-xs md:text-sm font-mono uppercase"
              />
              <span className="text-[11px] text-ink-muted mt-0.5 block">
                Điền mã giao dịch trên ứng dụng ngân hàng giúp trung tâm đối soát và xác nhận nhanh hơn.
              </span>
            </div>

            {/* Ảnh chứng từ chuyển khoản */}
            <ImageUpload
              label={
                <>
                  Ảnh chứng từ / Biên lai chuyển khoản <span className="text-ink-muted font-normal">(tùy chọn)</span>
                </>
              }
              value={proofImageUrl}
              onChange={setProofImageUrl}
              folder="payments"
              disabled={submitting}
            />

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Ghi chú cho trung tâm <span className="text-ink-muted font-normal">(tùy chọn)</span>
              </label>
              <textarea
                rows={2}
                maxLength={250}
                placeholder="Ví dụ: Phụ huynh bé Nam đã chuyển khoản từ ngân hàng Techcombank..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 text-xs md:text-sm bg-surface border border-line rounded-card focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 placeholder:text-ink-muted text-ink"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line/60 bg-surface-subtle">
            <SecondaryButton onClick={onClose} disabled={submitting}>
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={submitting || payableAmount <= 0 || numAmount <= 0 || isOverpay}
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              )}
              <span>Gửi yêu cầu xác nhận</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== HELPER BADGES CHO PAYMENTS ====================
function renderPaymentMethodBadge(method) {
  switch (method) {
    case 'BankTransfer':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap">
          Chuyển khoản
        </span>
      );
    case 'Cash':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          Tiền mặt
        </span>
      );
    case 'ZaloPay':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gold-soft text-teal border border-gold/40 whitespace-nowrap">
          ZaloPay
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-subtle text-ink-secondary border border-line whitespace-nowrap">
          {method || 'Khác'}
        </span>
      );
  }
}

function renderPaymentStatusBadge(status) {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đã xác nhận
        </span>
      );
    case 'PendingConfirm':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Chờ xác nhận
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-subtle text-ink-secondary border border-line whitespace-nowrap">
          {status}
        </span>
      );
  }
}
