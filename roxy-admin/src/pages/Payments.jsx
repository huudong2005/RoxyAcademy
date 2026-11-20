import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatDateTime, numberToVietnameseWords } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';
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

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Thông tin user đăng nhập từ storage
  const [currentUser] = useState(() => getStoredUser());

  const isTeacher = currentUser.role === 'Teacher';
  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const isParent = currentUser.role === 'Parent';
  const isStudent = currentUser.role === 'Student';
  const canManage = isSuperAdmin || isBranchManager;

  // Dữ liệu danh sách thanh toán
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [tuitionFilter, setTuitionFilter] = useState(() => searchParams.get('tuitionId') || '');
  const [methodFilter, setMethodFilter] = useState(''); // 'BankTransfer', 'Cash', 'ZaloPay', 'Other'
  const [statusFilter, setStatusFilter] = useState(''); // 'PendingConfirm', 'Confirmed', 'Rejected'

  // Danh sách các khoản thu (phục vụ bộ lọc và ghi nhận mới)
  const [tuitions, setTuitions] = useState([]);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State Modals
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectPaymentItem, setRejectPaymentItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // State Modal Hủy (Void) giao dịch đang chờ xác nhận (PUT /api/Payments/{id}/cancel)
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidPaymentItem, setVoidPaymentItem] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidError, setVoidError] = useState('');

  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // 1. Tải danh sách khoản thu (để lọc và dùng cho Modal Ghi nhận mới)
  useEffect(() => {
    if (isTeacher) return;

    let ignore = false;
    const fetchTuitions = async () => {
      try {
        const res = await axiosClient.get('/Tuitions');
        if (!ignore) {
          setTuitions(res.data || []);
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục khoản thu cho Payments:', err);
      }
    };

    fetchTuitions();
    return () => {
      ignore = true;
    };
  }, [isTeacher, reloadKey]);

  // 2. Tải danh sách thanh toán
  useEffect(() => {
    if (isTeacher) return; // Không gọi API nếu là Teacher

    let ignore = false;
    const fetchPayments = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (tuitionFilter) params.tuitionId = tuitionFilter;
        if (methodFilter) params.paymentMethod = methodFilter;
        if (statusFilter) params.status = statusFilter;

        const res = await axiosClient.get('/Payments', { params });
        if (!ignore) {
          setPayments(res.data || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải danh sách thanh toán:', err);
          setError(err.response?.data?.message || 'Không thể tải danh sách giao dịch thanh toán.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchPayments();
    return () => {
      ignore = true;
    };
  }, [isTeacher, reloadKey, tuitionFilter, methodFilter, statusFilter]);

  // Lọc thêm theo từ khóa tìm kiếm (mã GD, tên học viên, tên khoản thu)
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const term = searchTerm.trim().toLowerCase();
    return payments.filter((p) => {
      const matchCode = (p.transactionCode || '').toLowerCase().includes(term);
      const matchId = String(p.id).includes(term);
      const matchStudent = (p.studentName || '').toLowerCase().includes(term);
      const matchTuition = (p.tuitionTitle || '').toLowerCase().includes(term);
      return matchCode || matchId || matchStudent || matchTuition;
    });
  }, [payments, searchTerm]);

  const [confirmModal, setConfirmModal] = useState(null);

  // 3. Xử lý Xác nhận thanh toán (PUT /api/Payments/{id}/confirm với status='Confirmed')
  const handleConfirmPayment = (payment) => {
    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận duyệt giao dịch',
      message: `Xác nhận duyệt giao dịch thanh toán ${formatCurrency(payment.amount)} của học viên ${payment.studentName}?`,
      onConfirm: async () => {
        try {
          const res = await axiosClient.put(`/Payments/${payment.id}/confirm`, {
            status: 'Confirmed',
            note: 'Đã kiểm tra sao kê, xác nhận thu tiền thành công.',
          });
          showToast(res.data?.message || 'Xác nhận thanh toán thành công!');
          setReloadKey((k) => k + 1);
        } catch (err) {
          console.error('Lỗi khi xác nhận thanh toán:', err);
          showToast(err.response?.data?.message || 'Không thể xác nhận giao dịch.', 'error');
        }
      },
    });
  };

  // 4. Mở modal từ chối thanh toán
  const handleOpenReject = (payment) => {
    setRejectPaymentItem(payment);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectPaymentItem) return;

    if (!rejectReason.trim()) {
      setConfirmModal({
        mode: 'alert',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập lý do từ chối giao dịch.',
      });
      return;
    }

    setRejectSubmitting(true);
    try {
      const res = await axiosClient.put(`/Payments/${rejectPaymentItem.id}/confirm`, {
        status: 'Rejected',
        note: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      setRejectPaymentItem(null);
      showToast(res.data?.message || 'Đã từ chối giao dịch thanh toán.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi khi từ chối thanh toán:', err);
      showToast(err.response?.data?.message || 'Không thể từ chối giao dịch.', 'error');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // 5. Mở modal Hủy (Void) giao dịch đang chờ duyệt (PUT /api/Payments/{id}/cancel)
  const handleOpenVoid = (payment) => {
    setVoidPaymentItem(payment);
    setVoidReason('');
    setVoidError('');
    setVoidModalOpen(true);
  };

  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidPaymentItem) return;
    if (!voidReason.trim()) {
      setVoidError('Vui lòng nhập lý do hủy giao dịch thanh toán.');
      return;
    }

    setVoidSubmitting(true);
    setVoidError('');
    try {
      const res = await axiosClient.put(`/Payments/${voidPaymentItem.id}/cancel`, {
        reason: voidReason.trim(),
      });
      setVoidModalOpen(false);
      setVoidPaymentItem(null);
      showToast(res.data?.message || 'Đã hủy giao dịch thanh toán đang chờ duyệt.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi khi hủy giao dịch thanh toán:', err);
      setVoidError(err.response?.data?.message || 'Không thể hủy giao dịch thanh toán.');
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Đóng Lightbox khi bấm Esc
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
            Bạn không có quyền truy cập phân hệ Thanh toán
          </h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            Sổ quỹ và quản lý giao dịch thanh toán chỉ dành cho Quản lý cơ sở và Ban giám đốc theo quy định tài chính.
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

  // ==================== RENDER GIAO DIỆN SỔ QUỸ & THANH TOÁN ====================
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
        eyebrow="Tài chính & Sổ quỹ"
        title={
          isParent
            ? 'Lịch sử thanh toán học phí'
            : isStudent
            ? 'Lịch sử thanh toán'
            : 'Quản lý Thanh toán & Sổ quỹ'
        }
        description={
          isParent
            ? 'Theo dõi trạng thái các giao dịch đóng học phí của con (Chờ xác nhận, Đã xác nhận, Bị từ chối).'
            : isStudent
            ? 'Chi tiết lịch sử các lần đóng học phí của bản thân.'
            : 'Lịch sử giao dịch đóng học phí, đối soát biên nhận ngân hàng và duyệt thanh toán trực tuyến.'
        }
        actions={
          canManage && (
            <PrimaryButton onClick={() => setRecordModalOpen(true)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Ghi nhận thanh toán</span>
            </PrimaryButton>
          )
        }
      />

      {/* THANH CÔNG CỤ & BỘ LỌC ĐA CHIỀU */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm mã GD, tên học viên, khoản thu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!h-10 !pl-9 !pr-8 !py-0 text-xs md:text-sm"
            />
          </div>

          {/* Lọc theo Khoản thu */}
          <div>
            <CustomSelect
              value={tuitionFilter}
              onChange={(v) => setTuitionFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo khoản thu"
              options={[
                { value: '', label: 'Tất cả khoản thu' },
                ...tuitions.map((t) => ({
                  value: String(t.id),
                  label: `${t.studentName} — ${t.title}`,
                })),
              ]}
            />
          </div>

          {/* Lọc theo Phương thức */}
          <div>
            <CustomSelect
              value={methodFilter}
              onChange={(v) => setMethodFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo phương thức"
              options={[
                { value: '', label: 'Tất cả phương thức' },
                { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng' },
                { value: 'Cash', label: 'Tiền mặt tại quầy' },
                { value: 'ZaloPay', label: 'Ví ZaloPay' },
                { value: 'Other', label: 'Phương thức khác' },
              ]}
            />
          </div>

          {/* Lọc theo Trạng thái duyệt */}
          <div>
            <CustomSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              className="text-xs md:text-sm"
              aria-label="Lọc theo trạng thái duyệt"
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'PendingConfirm', label: 'Chờ xác nhận (Pending)' },
                { value: 'Confirmed', label: 'Đã xác nhận (Confirmed)' },
                { value: 'Rejected', label: 'Đã từ chối (Rejected)' },
              ]}
            />
          </div>
        </div>

        {/* Thanh lọc nhanh trạng thái dạng pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
          {[
            { id: '', label: 'Tất cả trạng thái' },
            { id: 'PendingConfirm', label: 'Chờ xác nhận' },
            { id: 'Confirmed', label: 'Đã xác nhận' },
            { id: 'Rejected', label: 'Đã từ chối' },
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

      {/* DANH SÁCH GIAO DỊCH (DESKTOP TABLE + MOBILE CARDS) */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-ink-muted gap-3">
            <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải lịch sử giao dịch...</p>
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
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-ink-muted">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Không tìm thấy giao dịch nào</p>
            <p className="text-xs text-ink-muted mt-1">
              Thử thay đổi bộ lọc hoặc ghi nhận khoản thanh toán mới.
            </p>
          </div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW (>= 768px): BẢNG DỮ LIỆU ĐẦY ĐỦ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-line text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-2 py-2.5 whitespace-nowrap">Mã GD &amp; Ngày</th>
                    <th className="px-2 py-2.5">Học viên &amp; Khoản thu</th>
                    <th className="pl-1.5 pr-3.5 py-2.5 text-right whitespace-nowrap">Số tiền</th>
                    <th className="pl-3.5 pr-1.5 py-2.5 whitespace-nowrap">Phương thức</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">Chứng từ</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">Trạng thái</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">Người xác nhận</th>
                    <th className="sticky right-0 z-20 bg-surface-subtle px-2 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredPayments.map((p) => {
                    const isPending = p.status === 'PendingConfirm';

                    return (
                      <tr key={p.id} className="group hover:bg-mint-canvas/60 transition-colors duration-150">
                        {/* Mã GD & Thời gian */}
                        <td className="px-2 py-2.5">
                          <div className="font-mono font-semibold text-teal text-xs sm:text-[13px] break-all">
                            {p.transactionCode || `#TX-${p.id}`}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5 whitespace-nowrap">
                            {formatDateTime(p.paidAt || p.createdAt)}
                          </div>
                        </td>

                        {/* Học viên & Khoản thu */}
                        <td className="px-2 py-2.5 max-w-[160px]">
                          <div className="font-semibold text-ink text-xs break-words">
                            {p.studentName}
                          </div>
                          <div className="text-ink-secondary text-[11px] mt-0.5 break-words" title={p.tuitionTitle}>
                            {p.tuitionTitle}
                          </div>
                        </td>

                        {/* Số tiền */}
                        <td className="pl-1.5 pr-3.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-bold text-ink text-xs">
                            {formatCurrency(p.amount)}
                          </div>
                        </td>

                        {/* Phương thức */}
                        <td className="pl-3.5 pr-1.5 py-2.5 whitespace-nowrap">
                          {renderPaymentMethodBadge(p.paymentMethod)}
                        </td>

                        {/* Chứng từ / Ảnh */}
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          {p.proofImageUrl ? (
                            <div className="flex items-center gap-1.5">
                              <img
                                src={p.proofImageUrl}
                                alt="Biên lai"
                                onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                                className="w-7 h-7 rounded-md border border-line object-cover cursor-pointer hover:ring-2 hover:ring-gold transition-all shadow-2xs shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                                className="text-[11px] text-teal hover:underline font-medium cursor-pointer"
                              >
                                Xem ảnh
                              </button>
                            </div>
                          ) : (
                            <span className="text-ink-muted text-xs">—</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-2 py-2.5 text-center">
                          {renderPaymentStatusBadge(p.status)}
                          {p.status === 'Rejected' && p.note && (
                            <span
                              className="block text-[11px] text-rose-600 italic mt-1 break-words max-w-[140px] mx-auto"
                              title={`Lý do từ chối: ${p.note}`}
                            >
                              Lý do: {p.note}
                            </span>
                          )}
                        </td>

                        {/* Người duyệt / tạo */}
                        <td className="px-2 py-2.5 max-w-[120px]">
                          {p.confirmedByName ? (
                            <div>
                              <div className="text-ink font-medium text-xs break-words">
                                {p.confirmedByName}
                              </div>
                              <div className="text-[11px] text-ink-muted">
                                {formatDateTime(p.confirmedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-muted text-xs italic whitespace-nowrap">Chờ duyệt</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="sticky right-0 z-10 bg-surface group-hover:bg-mint-canvas/60 px-2 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)] transition-colors duration-150">
                          <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                            {/* Nút Xem chi tiết */}
                            <IconButton
                              onClick={() => {
                                setSelectedPayment(p);
                                setDetailModalOpen(true);
                              }}
                              title="Xem chi tiết giao dịch"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </IconButton>

                            {/* Cụm nút duyệt / từ chối / hủy (void) khi đang PendingConfirm */}
                            {canManage && isPending && (
                              <>
                                <IconButton
                                  onClick={() => handleConfirmPayment(p)}
                                  title="Xác nhận giao dịch"
                                  className="!bg-emerald-50 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-100 hover:!border-emerald-300"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </IconButton>
                                <IconButton
                                  variant="danger"
                                  onClick={() => handleOpenReject(p)}
                                  title="Từ chối giao dịch"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </IconButton>
                                <IconButton
                                  onClick={() => handleOpenVoid(p)}
                                  title="Hủy (Void) giao dịch đang chờ xác nhận"
                                  className="!bg-surface-subtle !border-line !text-ink-secondary hover:!bg-rose-50 hover:!text-rose-700 hover:!border-rose-200"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </IconButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE VIEW (< 768px): DẠNG THẺ GIAO DỊCH (TRANSACTION CARDS) */}
            <div className="block md:hidden divide-y divide-line/60">
              {filteredPayments.map((p) => {
                const isPending = p.status === 'PendingConfirm';

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-teal text-xs">
                          {p.transactionCode || `#TX-${p.id}`}
                        </div>
                        <div className="font-bold text-ink text-sm mt-0.5">{p.studentName}</div>
                        <div className="text-xs text-ink-secondary mt-0.5">{p.tuitionTitle}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        {renderPaymentStatusBadge(p.status)}
                        {p.status === 'Rejected' && p.note && (
                          <span
                            className="block text-[10px] text-rose-600 italic mt-0.5 max-w-[130px] truncate"
                            title={`Lý do từ chối: ${p.note}`}
                          >
                            Lý do: {p.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-surface-subtle p-3 rounded-card border border-line/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase">Số tiền thanh toán:</span>
                        <span className="font-mono font-bold text-base text-ink tabular-nums">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div>{renderPaymentMethodBadge(p.paymentMethod)}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <div>Thời gian: {formatDateTime(p.paidAt || p.createdAt)}</div>
                      {p.proofImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                          className="text-teal font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <span>Xem ảnh CK</span>
                        </button>
                      )}
                    </div>

                    {/* Hàng nút thao tác Mobile (min-h-[44px]) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(p);
                          setDetailModalOpen(true);
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-teal bg-surface border border-line hover:bg-mint-canvas rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Chi tiết</span>
                      </button>

                      {canManage && isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(p)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReject(p)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Từ chối</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenVoid(p)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold text-ink-secondary bg-surface-subtle border border-line hover:bg-rose-50 hover:text-rose-700 rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <span>Hủy</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* ==================== 1. MODAL GHI NHẬN THANH TOÁN MỚI ==================== */}
      {recordModalOpen && (
        <RecordPaymentModal
          tuitions={tuitions}
          onClose={() => setRecordModalOpen(false)}
          onSuccess={(msg) => {
            setRecordModalOpen(false);
            showToast(msg || 'Ghi nhận thanh toán thành công!');
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* ==================== 2. MODAL XEM CHI TIẾT GIAO DỊCH ==================== */}
      {detailModalOpen && selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedPayment(null);
          }}
          onViewImage={(url) => setLightboxImageUrl(url)}
        />
      )}

      {/* ==================== 3. MODAL TỪ CHỐI GIAO DỊCH ==================== */}
      {rejectModalOpen && rejectPaymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
            onClick={() => !rejectSubmitting && setRejectModalOpen(false)}
            aria-hidden="true"
          />
          <div className="modal-panel relative z-10 w-full max-w-md bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden">
            <form onSubmit={handleConfirmReject}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-line/60 bg-rose-50/60">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <h3 className="font-bold text-ink text-sm">Từ chối giao dịch thanh toán</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  aria-label="Đóng"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <p className="text-ink-secondary">
                  Bạn đang từ chối giao dịch <span className="font-bold text-ink">{formatCurrency(rejectPaymentItem.amount)}</span> của học viên <span className="font-semibold text-ink">{rejectPaymentItem.studentName}</span>.
                </p>

                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    Lý do từ chối <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="VD: Không tìm thấy giao dịch ngân hàng khớp sao kê, sai nội dung chuyển khoản..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-line rounded-card focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-ink resize-none text-xs"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Lý do này sẽ được gửi thông báo tới tài khoản phụ huynh học viên.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-line/60 bg-surface-subtle">
                <SecondaryButton
                  onClick={() => setRejectModalOpen(false)}
                  disabled={rejectSubmitting}
                  className="!px-4 !py-2 text-xs"
                >
                  Hủy
                </SecondaryButton>
                <button
                  type="submit"
                  disabled={rejectSubmitting || !rejectReason.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {rejectSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 3.1. MODAL HỦY (VOID) GIAO DỊCH CHỜ DUYỆT ==================== */}
      {voidModalOpen && voidPaymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
            onClick={() => !voidSubmitting && setVoidModalOpen(false)}
            aria-hidden="true"
          />
          <div className="modal-panel relative z-10 w-full max-w-md bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden">
            <form onSubmit={handleConfirmVoid}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-line/60 bg-surface-subtle">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </span>
                  <h3 className="font-bold text-ink text-sm">
                    Hủy giao dịch đang chờ xác nhận (#PAY-{voidPaymentItem.id})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  aria-label="Đóng"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                {voidError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-rose-700 font-medium">
                    {voidError}
                  </div>
                )}

                <p className="text-ink-secondary">
                  Bạn đang hủy (void) giao dịch chờ xác nhận{' '}
                  <span className="font-bold font-mono text-ink">{formatCurrency(voidPaymentItem.amount)}</span> của học viên{' '}
                  <span className="font-semibold text-ink">{voidPaymentItem.studentName}</span>.
                </p>

                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    Lý do hủy giao dịch <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="VD: Nhập sai số tiền chuyển khoản / Tạo trùng giao dịch..."
                    value={voidReason}
                    onChange={(e) => {
                      setVoidReason(e.target.value);
                      if (voidError) setVoidError('');
                    }}
                    className="w-full p-2.5 bg-surface border border-line rounded-card focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-ink resize-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-line/60 bg-surface-subtle">
                <SecondaryButton
                  onClick={() => setVoidModalOpen(false)}
                  disabled={voidSubmitting}
                  className="!px-4 !py-2 text-xs"
                >
                  Đóng
                </SecondaryButton>
                <button
                  type="submit"
                  disabled={voidSubmitting || !voidReason.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer disabled:opacity-50"
                >
                  {voidSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy giao dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 4. MODAL LIGHTBOX XEM ẢNH CHỨNG TỪ ==================== */}
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
              alt="Chứng từ chuyển khoản"
              className="max-h-[85vh] max-w-full rounded-card shadow-modal object-contain border border-white/20"
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmModal)}
        mode={confirmModal?.mode || 'confirm'}
        title={confirmModal?.title}
        message={confirmModal?.message}
        onConfirm={() => {
          const action = confirmModal?.onConfirm;
          setConfirmModal(null);
          action?.();
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}

// ==================== 1. MODAL GHI NHẬN THANH TOÁN MỚI ====================
function RecordPaymentModal({ tuitions, onClose, onSuccess }) {
  // Chỉ lấy các khoản thu chưa bị hủy và còn nợ > 0
  const activeUnpaidTuitions = useMemo(() => {
    return tuitions.filter((t) => !t.isCancelled && (t.remainingAmount || 0) > 0);
  }, [tuitions]);

  const [tuitionId, setTuitionId] = useState(
    activeUnpaidTuitions.length > 0 ? String(activeUnpaidTuitions[0].id) : ''
  );

  const selectedTuition = useMemo(() => {
    return activeUnpaidTuitions.find((t) => String(t.id) === String(tuitionId)) || null;
  }, [activeUnpaidTuitions, tuitionId]);

  const remainingAmount = selectedTuition ? (selectedTuition.remainingAmount || 0) : 0;
  const pendingAmount = selectedTuition ? (selectedTuition.pendingAmount || 0) : 0;
  const payableAmount = Math.max(0, remainingAmount - pendingAmount);
  const finalAmount = selectedTuition ? (selectedTuition.finalAmount ?? (selectedTuition.amount - selectedTuition.discount)) : 0;

  // Số tiền: Gợi ý đúng số tiền còn có thể nộp (sau khi trừ pendingAmount)
  const [amount, setAmount] = useState(() => (payableAmount > 0 ? String(payableAmount) : '0'));

  const handleSelectTuition = (newId) => {
    setTuitionId(newId);
    const item = activeUnpaidTuitions.find((t) => String(t.id) === String(newId));
    if (item) {
      const itemPayable = Math.max(0, (item.remainingAmount || 0) - (item.pendingAmount || 0));
      setAmount(String(itemPayable > 0 ? itemPayable : 0));
    }
  };

  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
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

    if (!tuitionId) {
      setFormError('Vui lòng chọn khoản thu học phí.');
      return;
    }
    if (payableAmount <= 0) {
      setFormError('Không thể nộp thêm vì đã có giao dịch chờ xác nhận đủ số tiền còn nợ.');
      return;
    }
    if (numAmount <= 0) {
      setFormError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (isOverpay) {
      setFormError(
        `Số tiền thanh toán (${formatCurrency(numAmount)}) không được vượt quá số còn có thể nộp (${formatCurrency(payableAmount)})!`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tuitionId: Number(tuitionId),
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
              <h2 className="text-base font-bold text-ink">Ghi nhận thanh toán mới</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Nhập phiếu thu trực tiếp tại quầy hoặc đối soát chuyển khoản từ phụ huynh.
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

            {/* Chọn khoản thu */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                Chọn khoản thu học phí <span className="text-rose-500">*</span>
              </label>
              {activeUnpaidTuitions.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-card text-amber-800">
                  Không có khoản thu nào còn nợ. Tất cả các khoản học phí đều đã tất toán!
                </div>
              ) : (
                <SelectPill
                  value={tuitionId}
                  onChange={(e) => handleSelectTuition(e.target.value)}
                  required
                >
                  {activeUnpaidTuitions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.studentName} — {t.title} (Còn nợ: {formatCurrency(t.remainingAmount)})
                    </option>
                  ))}
                </SelectPill>
              )}
            </div>

            {/* Card thông tin dư nợ của khoản thu đang chọn */}
            {selectedTuition && (
              <>
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

                <div className="p-3.5 bg-surface-subtle border border-line rounded-card space-y-1.5 font-mono tabular-nums">
                  <div className="flex justify-between text-xs">
                    <span className="font-sans text-ink-muted">Học viên:</span>
                    <span className="font-sans font-semibold text-ink">{selectedTuition.studentName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-sans text-ink-muted">Phải thu:</span>
                    <span className="text-ink-secondary">{formatCurrency(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span className="font-sans">Đã thanh toán:</span>
                    <span className="font-medium">{formatCurrency(selectedTuition.paidAmount)}</span>
                  </div>
                  {pendingAmount > 0 && (
                    <div className="flex justify-between text-xs text-amber-700">
                      <span className="font-sans">Đang chờ xác nhận:</span>
                      <span className="font-semibold">{formatCurrency(pendingAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-line/60">
                    <span className="font-sans font-bold text-ink">TỐI ĐA CÓ THỂ NỘP:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-rose-600">
                        {formatCurrency(payableAmount)}
                      </span>
                      {payableAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmount(String(payableAmount))}
                          className="px-2.5 py-1 text-[11px] font-sans font-semibold bg-gold-soft text-teal hover:bg-gold/30 rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                          Điền nhanh
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Ô nhập Số tiền thanh toán & Validate chống Overpay */}
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
                placeholder="VD: 1500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`w-full h-11 px-4 font-mono text-base font-bold rounded-full border focus:outline-none transition-all disabled:bg-surface-subtle disabled:text-ink-muted ${
                  isOverpay
                    ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30 text-rose-700'
                    : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink bg-surface'
                }`}
              />

              {/* Báo lỗi đỏ real-time nếu vượt nợ */}
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
                Mã giao dịch / Mã tham chiếu
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
                placeholder="Nộp trực tiếp tại văn phòng, ghi chú thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 bg-surface border border-line rounded-card focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 text-ink resize-none text-xs"
              />
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-card text-[11px] text-emerald-800">
              Giao dịch do Quản trị viên lập sẽ được tự động đánh dấu <span className="font-bold">Đã xác nhận (Confirmed)</span>.
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

// ==================== 2. MODAL XEM CHI TIẾT GIAO DỊCH ====================
function PaymentDetailModal({ payment, onClose, onViewImage }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel relative z-10 w-full max-w-lg bg-surface rounded-card-lg shadow-modal border border-line/80 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-ink">Chi tiết giao dịch</span>
              <Badge variant="gold" className="font-mono">
                {payment.transactionCode || `#TX-${payment.id}`}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Học viên: <span className="font-semibold text-ink">{payment.studentName}</span>
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

        <div className="p-6 space-y-4 text-xs">
          {/* Box số tiền */}
          <div className="p-4 bg-gold-soft/50 rounded-card border border-gold/40 text-center space-y-1">
            <span className="text-xs text-ink-secondary uppercase font-semibold">Số tiền thanh toán</span>
            <div className="font-mono font-bold text-2xl text-teal tabular-nums">
              {formatCurrency(payment.amount)}
            </div>
            <p className="text-xs text-ink-secondary italic">
              {numberToVietnameseWords(payment.amount)}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between py-1.5 border-b border-line/50">
              <span className="text-ink-muted">Khoản thu liên kết:</span>
              <span className="font-medium text-ink text-right">{payment.tuitionTitle}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/50">
              <span className="text-ink-muted">Phương thức:</span>
              <span>{renderPaymentMethodBadge(payment.paymentMethod)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/50">
              <span className="text-ink-muted">Trạng thái:</span>
              <span>{renderPaymentStatusBadge(payment.status)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-line/50">
              <span className="text-ink-muted">Thời gian đóng:</span>
              <span className="font-medium text-ink">{formatDateTime(payment.paidAt || payment.createdAt)}</span>
            </div>
            {payment.confirmedByName && (
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-ink-muted">Người xác nhận:</span>
                <span className="font-semibold text-ink">
                  {payment.confirmedByName} ({formatDateTime(payment.confirmedAt)})
                </span>
              </div>
            )}
            {payment.note && (
              <div className="py-1">
                <span className="text-ink-muted block mb-1">Ghi chú:</span>
                <div className="p-2.5 bg-surface-subtle rounded-card border border-line/70 text-ink-secondary text-xs">
                  {payment.note}
                </div>
              </div>
            )}
          </div>

          {/* Chứng từ ảnh nếu có */}
          {payment.proofImageUrl && (
            <div className="pt-2">
              <span className="text-ink-secondary font-semibold block mb-2">Ảnh chứng từ / Biên lai:</span>
              <img
                src={payment.proofImageUrl}
                alt="Chứng từ thanh toán"
                onClick={() => onViewImage(payment.proofImageUrl)}
                className="max-h-48 w-full object-contain rounded-card border border-line bg-surface-subtle cursor-pointer hover:opacity-90 transition-opacity"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-line/60 bg-surface-subtle">
          <SecondaryButton onClick={onClose}>
            Đóng
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

// ==================== HELPER BADGES ====================
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
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Đã xác nhận
        </span>
      );
    case 'PendingConfirm':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Chờ xác nhận
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
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
