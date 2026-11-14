import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatDateTime, numberToVietnameseWords } from '../utils/formatters';

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Thông tin user đăng nhập từ localStorage
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isTeacher = currentUser.role === 'Teacher';
  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
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
  }, [isTeacher]);

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

  // 3. Xử lý Xác nhận thanh toán (PUT /api/Payments/{id}/confirm với status='Confirmed')
  const handleConfirmPayment = async (payment) => {
    if (!window.confirm(`Xác nhận duyệt giao dịch thanh toán ${formatCurrency(payment.amount)} của học viên ${payment.studentName}?`)) {
      return;
    }

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
      alert('Vui lòng nhập lý do từ chối giao dịch.');
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4 text-rose-600 shadow-xs">
          🚫
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Bạn không có quyền truy cập phân hệ Thanh toán
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Sổ quỹ và quản lý giao dịch thanh toán chỉ dành cho Quản lý cơ sở và Ban giám đốc theo quy định tài chính.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/classes')}
            className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
          >
            Quay lại Lớp học
          </button>
          <button
            onClick={() => navigate('/schedules')}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            Xem Thời khóa biểu
          </button>
        </div>
      </div>
    );
  }

  // ==================== RENDER GIAO DIỆN SỔ QUỸ & THANH TOÁN ====================
  return (
    <div className="space-y-6">
      {/* TOAST THÔNG BÁO TỨC THÌ */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all transform animate-in fade-in duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '❌' : '✓'}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* HEADER & TIÊU ĐỀ TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>💳</span> Quản lý Thanh toán &amp; Sổ quỹ
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Lịch sử giao dịch đóng học phí, đối soát biên nhận ngân hàng và duyệt thanh toán trực tuyến.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setRecordModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm rounded-lg shadow-xs transition-all duration-150 cursor-pointer min-h-[42px]"
          >
            <span className="text-base font-bold">+</span>
            <span>Ghi nhận thanh toán</span>
          </button>
        )}
      </div>

      {/* THANH CÔNG CỤ & BỘ LỌC ĐA CHIỀU */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm mã GD, tên học viên, khoản thu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Lọc theo Khoản thu */}
          <div>
            <select
              value={tuitionFilter}
              onChange={(e) => setTuitionFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 truncate"
            >
              <option value="">Tất cả khoản thu</option>
              {tuitions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.studentName} — {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Phương thức */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả phương thức</option>
              <option value="BankTransfer">🏦 Chuyển khoản ngân hàng</option>
              <option value="Cash">💵 Tiền mặt tại quầy</option>
              <option value="ZaloPay">📱 Ví ZaloPay</option>
              <option value="Other">🏷️ Phương thức khác</option>
            </select>
          </div>

          {/* Lọc theo Trạng thái duyệt */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PendingConfirm">Chờ xác nhận (Pending)</option>
              <option value="Confirmed">Đã xác nhận (Confirmed)</option>
              <option value="Rejected">Đã từ chối (Rejected)</option>
            </select>
          </div>
        </div>

        {/* Thanh lọc nhanh trạng thái dạng pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
          {[
            { id: '', label: 'Tất cả trạng thái' },
            { id: 'PendingConfirm', label: '⏳ Chờ xác nhận' },
            { id: 'Confirmed', label: '✓ Đã xác nhận' },
            { id: 'Rejected', label: '✕ Đã từ chối' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DANH SÁCH GIAO DỊCH (DESKTOP TABLE + MOBILE CARDS) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải lịch sử giao dịch...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-3 px-3 py-1.5 text-xs bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-3xl block mb-2">💳</span>
            <p className="text-sm font-medium text-slate-600">Không tìm thấy giao dịch nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử thay đổi bộ lọc hoặc ghi nhận khoản thanh toán mới.
            </p>
          </div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW (>= 768px): BẢNG DỮ LIỆU ĐẦY ĐỦ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Mã GD &amp; Ngày</th>
                    <th className="px-4 py-3">Học viên &amp; Khoản thu</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-3 py-3">Phương thức</th>
                    <th className="px-3 py-3">Chứng từ</th>
                    <th className="px-3 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3">Người xác nhận</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => {
                    const isPending = p.status === 'PendingConfirm';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Mã GD & Thời gian */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-mono font-semibold text-blue-700 text-sm">
                            {p.transactionCode || `#TX-${p.id}`}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTime(p.paidAt || p.createdAt)}
                          </div>
                        </td>

                        {/* Học viên & Khoản thu */}
                        <td className="px-4 py-3.5 max-w-[260px]">
                          <div className="font-semibold text-slate-900 text-sm">{p.studentName}</div>
                          <div className="text-slate-500 text-xs truncate mt-0.5" title={p.tuitionTitle}>
                            {p.tuitionTitle}
                          </div>
                        </td>

                        {/* Số tiền */}
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">
                            {formatCurrency(p.amount)}
                          </div>
                        </td>

                        {/* Phương thức */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          {renderPaymentMethodBadge(p.paymentMethod)}
                        </td>

                        {/* Chứng từ / Ảnh */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          {p.proofImageUrl ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={p.proofImageUrl}
                                alt="Biên lai"
                                onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                                className="w-9 h-9 rounded-md border border-slate-200 object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                                className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                              >
                                Xem ảnh
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          {renderPaymentStatusBadge(p.status)}
                        </td>

                        {/* Người duyệt / tạo */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {p.confirmedByName ? (
                            <div>
                              <div className="text-slate-800 font-medium text-xs">{p.confirmedByName}</div>
                              <div className="text-[11px] text-slate-400">
                                {formatDateTime(p.confirmedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Chờ duyệt</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Nút Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayment(p);
                                setDetailModalOpen(true);
                              }}
                              title="Xem chi tiết giao dịch"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            >
                              👁️
                            </button>

                            {/* Cụm 2 nút duyệt nhanh khi đang PendingConfirm */}
                            {canManage && isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmPayment(p)}
                                  title="Xác nhận giao dịch"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-md shadow-2xs transition-all cursor-pointer"
                                >
                                  <span>✓</span>
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReject(p)}
                                  title="Từ chối giao dịch"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-semibold text-xs rounded-md transition-all cursor-pointer"
                                >
                                  <span>✕</span>
                                  <span>Từ chối</span>
                                </button>
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
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredPayments.map((p) => {
                const isPending = p.status === 'PendingConfirm';

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-blue-700 text-xs">
                          {p.transactionCode || `#TX-${p.id}`}
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{p.studentName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.tuitionTitle}</div>
                      </div>
                      <div className="shrink-0">{renderPaymentStatusBadge(p.status)}</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Số tiền thanh toán:</span>
                        <span className="font-mono font-bold text-base text-slate-900">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div>{renderPaymentMethodBadge(p.paymentMethod)}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div>Thời gian: {formatDateTime(p.paidAt || p.createdAt)}</div>
                      {p.proofImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(p.proofImageUrl)}
                          className="text-blue-600 font-semibold flex items-center gap-1"
                        >
                          <span>🖼️</span> Xem ảnh CK
                        </button>
                      )}
                    </div>

                    {/* Hàng nút thao tác Mobile (min-h-[44px] Apple HIG) */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(p);
                          setDetailModalOpen(true);
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg active:scale-95 transition-all"
                      >
                        👁️ Chi tiết
                      </button>

                      {canManage && isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(p)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs active:scale-95 transition-all"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReject(p)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg active:scale-95 transition-all"
                          >
                            ✕ Từ chối
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
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleConfirmReject}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-rose-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 text-lg">✕</span>
                  <h3 className="font-bold text-slate-900 text-sm">Từ chối giao dịch thanh toán</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200/70"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <p className="text-slate-600">
                  Bạn đang từ chối giao dịch <span className="font-bold">{formatCurrency(rejectPaymentItem.amount)}</span> của học viên <span className="font-semibold text-slate-800">{rejectPaymentItem.studentName}</span>.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lý do từ chối <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="VD: Không tìm thấy giao dịch ngân hàng khớp sao kê, sai nội dung chuyển khoản..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-700 resize-none text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ℹ️ Lý do này sẽ được gửi thông báo tới tài khoản phụ huynh học viên.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={rejectSubmitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting || !rejectReason.trim()}
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-all cursor-pointer ${
                    rejectSubmitting || !rejectReason.trim()
                      ? 'bg-rose-400 cursor-not-allowed opacity-60'
                      : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
                  }`}
                >
                  {rejectSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 4. MODAL LIGHTBOX XEM ẢNH CHỨNG TỪ ==================== */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-transparent flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={lightboxImageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-xs font-semibold bg-white/90 hover:bg-white text-slate-800 rounded shadow-md backdrop-blur-xs"
              >
                Mở tab mới ↗
              </a>
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white font-bold hover:bg-black/80 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={lightboxImageUrl}
              alt="Chứng từ chuyển khoản"
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
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
  const finalAmount = selectedTuition ? (selectedTuition.finalAmount ?? (selectedTuition.amount - selectedTuition.discount)) : 0;

  // Số tiền: Gợi ý đúng số nợ
  const [amount, setAmount] = useState(() => (remainingAmount > 0 ? String(remainingAmount) : ''));

  const handleSelectTuition = (newId) => {
    setTuitionId(newId);
    const item = activeUnpaidTuitions.find((t) => String(t.id) === String(newId));
    if (item) {
      setAmount(String(item.remainingAmount || 0));
    }
  };

  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
  const [transactionCode, setTransactionCode] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const numAmount = Number(amount) || 0;
  const isOverpay = numAmount > remainingAmount;
  const isInvalidAmount = numAmount <= 0 || isOverpay;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!tuitionId) {
      setFormError('Vui lòng chọn khoản thu học phí.');
      return;
    }
    if (numAmount <= 0) {
      setFormError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (isOverpay) {
      setFormError(
        `Số tiền thanh toán (${formatCurrency(numAmount)}) không được vượt quá số còn nợ (${formatCurrency(remainingAmount)})!`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ghi nhận thanh toán mới</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập phiếu thu trực tiếp tại quầy hoặc đối soát chuyển khoản từ phụ huynh.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                ⚠️ {formError}
              </div>
            )}

            {/* Chọn khoản thu */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chọn khoản thu học phí <span className="text-rose-500">*</span>
              </label>
              {activeUnpaidTuitions.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  Không có khoản thu nào còn nợ. Tất cả các khoản học phí đều đã tất toán!
                </div>
              ) : (
                <select
                  value={tuitionId}
                  onChange={(e) => handleSelectTuition(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  {activeUnpaidTuitions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.studentName} — {t.title} (Còn nợ: {formatCurrency(t.remainingAmount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Card thông tin dư nợ của khoản thu đang chọn */}
            {selectedTuition && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="font-sans text-slate-500">Học viên:</span>
                  <span className="font-sans font-semibold text-slate-800">{selectedTuition.studentName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-sans text-slate-500">Phải thu:</span>
                  <span className="text-slate-700">{formatCurrency(finalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700">
                  <span className="font-sans">Đã thanh toán:</span>
                  <span className="font-medium">{formatCurrency(selectedTuition.paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-sans font-bold text-slate-900">CÒN NỢ CẦN THU:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-rose-600">
                      {formatCurrency(remainingAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmount(String(remainingAmount))}
                      className="px-2 py-0.5 text-[11px] font-sans font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded active:scale-95 transition-all cursor-pointer"
                    >
                      ⚡ Điền nhanh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ô nhập Số tiền thanh toán & Validate chống Overpay */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số tiền thanh toán (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                placeholder="VD: 1500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`w-full h-11 px-3.5 font-mono text-base font-bold rounded-lg border focus:outline-none transition-all ${
                  isOverpay
                    ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30 text-rose-700'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 bg-white'
                }`}
              />

              {/* Báo lỗi đỏ real-time nếu vượt nợ */}
              {isOverpay && (
                <p className="text-xs text-rose-600 font-medium mt-1 animate-in fade-in">
                  ⚠️ Số tiền thanh toán ({formatCurrency(numAmount)}) không được vượt quá số còn nợ (Tối đa: {formatCurrency(remainingAmount)}).
                </p>
              )}

              {/* Phiên âm tiếng Việt */}
              {!isOverpay && numAmount > 0 && (
                <p className="text-[11px] text-slate-500 italic mt-1">
                  {numberToVietnameseWords(numAmount)}
                </p>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'BankTransfer', label: 'Chuyển khoản', icon: '🏦' },
                  { id: 'Cash', label: 'Tiền mặt', icon: '💵' },
                  { id: 'ZaloPay', label: 'ZaloPay', icon: '📱' },
                  { id: 'Other', label: 'Khác', icon: '🏷️' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mã giao dịch */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mã giao dịch / Mã tham chiếu
              </label>
              <input
                type="text"
                placeholder="VD: MB12345678, FT263..."
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 font-mono text-xs"
              />
            </div>

            {/* URL ảnh chứng từ */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                URL ảnh chụp biên lai / Chứng từ <span className="text-slate-400 font-normal">(Tùy chọn)</span>
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={proofImageUrl}
                onChange={(e) => setProofImageUrl(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 text-xs"
              />
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ghi chú thu tiền
              </label>
              <textarea
                rows={2}
                placeholder="Nộp trực tiếp tại văn phòng, ghi chú thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 resize-none text-xs"
              />
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800">
              ℹ️ Giao dịch do Quản trị viên lập sẽ được tự động đánh dấu <span className="font-bold">Đã xác nhận (Confirmed)</span>.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || isInvalidAmount}
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-all cursor-pointer ${
                submitting || isInvalidAmount
                  ? 'bg-blue-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>✓ Lưu &amp; Xác nhận thanh toán</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 2. MODAL XEM CHI TIẾT GIAO DỊCH ====================
function PaymentDetailModal({ payment, onClose, onViewImage }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Chi tiết giao dịch</span>
              <span className="text-xs font-mono font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {payment.transactionCode || `#TX-${payment.id}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Học viên: <span className="font-semibold text-slate-700">{payment.studentName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Box số tiền */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Số tiền thanh toán</span>
            <div className="font-mono font-bold text-2xl text-slate-900">
              {formatCurrency(payment.amount)}
            </div>
            <p className="text-xs text-slate-500 italic">
              {numberToVietnameseWords(payment.amount)}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Khoản thu liên kết:</span>
              <span className="font-medium text-slate-800 text-right">{payment.tuitionTitle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phương thức:</span>
              <span>{renderPaymentMethodBadge(payment.paymentMethod)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Trạng thái:</span>
              <span>{renderPaymentStatusBadge(payment.status)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Thời gian đóng:</span>
              <span className="font-medium text-slate-800">{formatDateTime(payment.paidAt || payment.createdAt)}</span>
            </div>
            {payment.confirmedByName && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Người xác nhận:</span>
                <span className="font-semibold text-slate-800">
                  {payment.confirmedByName} ({formatDateTime(payment.confirmedAt)})
                </span>
              </div>
            )}
            {payment.note && (
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Ghi chú:</span>
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 text-xs">
                  {payment.note}
                </div>
              </div>
            )}
          </div>

          {/* Chứng từ ảnh nếu có */}
          {payment.proofImageUrl && (
            <div className="pt-2">
              <span className="text-slate-500 font-semibold block mb-2">Ảnh chứng từ / Biên lai:</span>
              <img
                src={payment.proofImageUrl}
                alt="Chứng từ thanh toán"
                onClick={() => onViewImage(payment.proofImageUrl)}
                className="max-h-48 w-full object-contain rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            Đóng
          </button>
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200">
          <span>🏦</span> Chuyển khoản
        </span>
      );
    case 'Cash':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>💵</span> Tiền mặt
        </span>
      );
    case 'ZaloPay':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <span>📱</span> ZaloPay
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span>🏷️</span> {method || 'Khác'}
        </span>
      );
  }
}

function renderPaymentStatusBadge(status) {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đã xác nhận
        </span>
      );
    case 'PendingConfirm':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Chờ xác nhận
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}
