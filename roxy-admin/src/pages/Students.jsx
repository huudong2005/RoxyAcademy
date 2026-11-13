import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function Students() {
  // Thông tin user đăng nhập
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isStaff = currentUser.role === 'SuperAdmin' || currentUser.role === 'BranchManager';
  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';

  // Danh sách học viên & trạng thái tải
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(
    isBranchManager && currentUser.branchId ? currentUser.branchId : ''
  );
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Danh mục phục vụ lọc và form
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);

  // Modal Chi tiết
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal Thêm / Sửa
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null = Thêm mới, object = Sửa
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: 'Male',
    parentId: '',
    branchId: '',
    school: '',
    grade: '',
    note: '',
    status: 'Active',
  });

  // Tải danh mục branches, classes, parents (cho staff)
  useEffect(() => {
    let ignore = false;

    const fetchMetadata = async () => {
      try {
        const [branchRes, classRes] = await Promise.allSettled([
          axiosClient.get('/Branches'),
          axiosClient.get('/Classes'),
        ]);

        if (!ignore) {
          if (branchRes.status === 'fulfilled') {
            setBranches(branchRes.value.data || []);
          }
          if (classRes.status === 'fulfilled') {
            setClasses(classRes.value.data || []);
          }
        }

        // Chỉ staff mới có quyền lấy danh sách Users để chọn Parent
        if (isStaff) {
          try {
            const parentRes = await axiosClient.get('/Users?role=Parent&pageSize=100');
            if (!ignore) {
              setParents(parentRes.data.items || parentRes.data || []);
            }
          } catch (pErr) {
            console.warn('Không tải được danh sách phụ huynh:', pErr);
          }
        }
      } catch (err) {
        console.error('Lỗi nạp danh mục bổ trợ:', err);
      }
    };

    fetchMetadata();

    return () => {
      ignore = true;
    };
  }, [isStaff]);

  // Tải danh sách học viên
  useEffect(() => {
    let ignore = false;

    const fetchStudents = async () => {
      setLoading(true);
      setError('');

      try {
        const params = {
          page,
          pageSize,
        };

        if (search.trim()) params.search = search.trim();
        if (branchFilter) params.branchId = branchFilter;
        if (classFilter) params.classId = classFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await axiosClient.get('/Students', { params });
        const data = response.data;

        if (!ignore) {
          if (data && Array.isArray(data.items)) {
            setStudents(data.items);
            setTotal(data.total || 0);
          } else if (Array.isArray(data)) {
            setStudents(data);
            setTotal(data.length);
          } else {
            setStudents([]);
            setTotal(0);
          }
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 403) {
            setError('Bạn không có quyền truy cập danh sách học viên này.');
          } else {
            setError('Không thể tải danh sách học viên. Vui lòng thử lại sau.');
          }
          console.error(err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchStudents();

    return () => {
      ignore = true;
    };
  }, [page, pageSize, reloadKey, search, branchFilter, classFilter, statusFilter]);

  // Xử lý tìm kiếm submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setSearch('');
    if (isBranchManager && currentUser.branchId) {
      setBranchFilter(currentUser.branchId);
    } else {
      setBranchFilter('');
    }
    setClassFilter('');
    setStatusFilter('');
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  // Mở modal Thêm mới
  const handleOpenCreateModal = () => {
    setEditingStudent(null);
    setFormError('');
    setFormData({
      fullName: '',
      dob: '',
      gender: 'Male',
      parentId: parents.length > 0 ? parents[0].id : '',
      branchId: isBranchManager ? currentUser.branchId : branches.length > 0 ? branches[0].id : '',
      school: '',
      grade: '',
      note: '',
      status: 'Active',
    });
    setFormModalOpen(true);
  };

  // Mở modal Chỉnh sửa
  const handleOpenEditModal = (stu) => {
    setEditingStudent(stu);
    setFormError('');
    setFormData({
      fullName: stu.fullName || '',
      dob: stu.dob ? stu.dob.split('T')[0] : '',
      gender: stu.gender || 'Male',
      parentId: stu.parentId || '',
      branchId: stu.branchId || '',
      school: stu.school || '',
      grade: stu.grade || '',
      note: stu.note || '',
      status: stu.status || 'Active',
    });
    setFormModalOpen(true);
  };

  // Mở Drawer/Modal Xem chi tiết
  const handleOpenDetail = (stu) => {
    setSelectedStudent(stu);
    setDetailModalOpen(true);
  };

  // Gửi form Thêm / Sửa
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Họ tên học viên là bắt buộc.');
      return;
    }

    if (!editingStudent && !formData.parentId) {
      setFormError('Vui lòng chọn phụ huynh cho học viên.');
      return;
    }

    const branchIdVal = isBranchManager ? currentUser.branchId : Number(formData.branchId);
    if (!editingStudent && !branchIdVal) {
      setFormError('Vui lòng chọn cơ sở cho học viên.');
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingStudent) {
        // Cập nhật học viên (PUT /api/Students/{id})
        const payload = {
          fullName: formData.fullName.trim(),
          dob: formData.dob || null,
          gender: formData.gender,
          school: formData.school.trim() || null,
          grade: formData.grade.trim() || null,
          note: formData.note.trim() || null,
          status: formData.status,
          ...(isSuperAdmin && { branchId: branchIdVal }),
        };

        await axiosClient.put(`/Students/${editingStudent.id}`, payload);
      } else {
        // Tạo mới học viên (POST /api/Students)
        const payload = {
          fullName: formData.fullName.trim(),
          dob: formData.dob || null,
          gender: formData.gender,
          parentId: Number(formData.parentId),
          branchId: branchIdVal,
          school: formData.school.trim() || null,
          grade: formData.grade.trim() || null,
          note: formData.note.trim() || null,
        };

        await axiosClient.post('/Students', payload);
      }

      setFormModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
        'Có lỗi xảy ra khi lưu hồ sơ học viên.';
      setFormError(detail);
      console.error(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper tính tuổi
  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? `(${age} tuổi)` : '';
  };

  // Helper định dạng ngày DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const clean = dateStr.split('T')[0];
      const [y, m, d] = clean.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper hiển thị badge trạng thái
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đang học
          </span>
        );
      case 'Paused':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Tạm dừng
          </span>
        );
      case 'Graduated':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Tốt nghiệp
          </span>
        );
      case 'Dropped':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Thôi học
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Helper hiển thị chip giới tính
  const renderGenderChip = (gender) => {
    if (gender === 'Male') {
      return <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">Nam</span>;
    }
    if (gender === 'Female') {
      return <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">Nữ</span>;
    }
    return <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Khác</span>;
  };

  // Tính tổng số trang
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Trang & Phân Quyền Nút Thao Tác */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Hồ sơ học viên
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              Tổng số: {total} học viên
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý thông tin học sinh, phụ huynh và ghi chú sư phạm nội bộ trung tâm
          </p>
        </div>

        {/* Nút Thêm học viên: CHỈ HIỂN THỊ CHO SuperAdmin VÀ BranchManager; ẨN VỚI Teacher */}
        {isStaff && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Thêm học viên</span>
          </button>
        )}
      </div>

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc (Filter Toolbar) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Ô Tìm kiếm */}
          <div className="lg:col-span-2 relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm theo họ tên học viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs md:text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* Lọc theo Chi nhánh */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              disabled={isBranchManager} // BranchManager bị khóa theo chi nhánh mình
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              {!isBranchManager && <option value="">Tất cả cơ sở</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái & Nút thao tác */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Active">Đang học</option>
              <option value="Paused">Tạm dừng</option>
              <option value="Graduated">Tốt nghiệp</option>
              <option value="Dropped">Thôi học</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              className="h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs md:text-sm text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Bảng Danh Sách Học Viên (Responsive overflow-x-auto) */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase font-semibold tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Học viên</th>
                <th scope="col" className="px-4 py-3.5">Ngày sinh &amp; Giới tính</th>
                <th scope="col" className="px-4 py-3.5">Phụ huynh &amp; SĐT</th>
                <th scope="col" className="px-4 py-3.5">Cơ sở</th>
                <th scope="col" className="px-4 py-3.5">Trường / Khối lớp</th>
                <th scope="col" className="px-4 py-3.5">Trạng thái</th>
                <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách học viên...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🎓</span>
                      <p className="text-sm font-medium text-slate-600">Không tìm thấy học viên nào</p>
                      <p className="text-xs text-slate-400">Thử thay đổi từ khóa hoặc điều kiện bộ lọc phía trên</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                    {/* Cột 1: Học viên */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {stu.fullName ? stu.fullName.charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{stu.fullName}</div>
                          <div className="text-[11px] text-slate-400">#STU-{stu.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Ngày sinh & Giới tính */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">
                        {formatDate(stu.dob)}{' '}
                        <span className="text-[11px] text-slate-400">{calculateAge(stu.dob)}</span>
                      </div>
                      <div className="mt-0.5">{renderGenderChip(stu.gender)}</div>
                    </td>

                    {/* Cột 3: Phụ huynh & SĐT */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{stu.parentName || '—'}</div>
                      {stu.parentPhone ? (
                        <a
                          href={`tel:${stu.parentPhone}`}
                          className="text-xs text-blue-600 hover:underline hover:text-blue-800"
                        >
                          {stu.parentPhone}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa có SĐT</span>
                      )}
                    </td>

                    {/* Cột 4: Cơ sở */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 font-medium">
                        {stu.branchName || `Cơ sở #${stu.branchId}`}
                      </span>
                    </td>

                    {/* Cột 5: Trường / Khối lớp */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      <div>{stu.school || '—'}</div>
                      {stu.grade && <div className="text-[11px] text-slate-400">Khối: {stu.grade}</div>}
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatusBadge(stu.status)}
                    </td>

                    {/* Cột 7: Thao tác */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Nút Xem chi tiết (Tất cả vai trò đều bấm được) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(stu)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                          title="Xem chi tiết hồ sơ"
                        >
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút Sửa: CHỈ HIỂN THỊ cho SuperAdmin và BranchManager; ẨN VỚI Teacher */}
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(stu)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
                            title="Chỉnh sửa thông tin"
                          >
                            <span>Sửa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Thanh Phân Trang (Pagination Bar) */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 gap-3 text-xs text-slate-600">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-800">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-slate-800">{total}</span> học viên
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Trước
            </button>
            <span className="px-3 py-1.5 font-medium text-slate-800">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal / Drawer "Xem Chi Tiết Học Viên" (Chi Tiết & Bảo Mật Note) */}
      {detailModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop mờ */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setDetailModalOpen(false)}
            aria-hidden="true"
          />

          {/* Hộp thoại chi tiết */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            {/* Header chi tiết */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-700">
                  {selectedStudent.fullName ? selectedStudent.fullName.charAt(0).toUpperCase() : 'H'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-slate-500">Mã hồ sơ: #STU-{selectedStudent.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Thông tin cơ bản */}
            <div className="mt-4 grid grid-cols-2 gap-3.5 text-xs">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Ngày sinh</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedStudent.dob)} {calculateAge(selectedStudent.dob)}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Giới tính</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.gender === 'Male'
                    ? 'Nam'
                    : selectedStudent.gender === 'Female'
                    ? 'Nữ'
                    : 'Khác'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Phụ huynh bảo hộ</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.parentName || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Số điện thoại phụ huynh</span>
                <span className="font-semibold text-blue-600">
                  {selectedStudent.parentPhone || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Cơ sở đăng ký</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.branchName || `Cơ sở #${selectedStudent.branchId}`}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Trạng thái hồ sơ</span>
                <div className="mt-0.5">{renderStatusBadge(selectedStudent.status)}</div>
              </div>
              <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500 block">Trường học &amp; Khối lớp</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.school || 'Chưa cập nhật trường'}{' '}
                  {selectedStudent.grade ? `— Khối ${selectedStudent.grade}` : ''}
                </span>
              </div>
            </div>

            {/* MỤC ĐẶC BIỆT: GHI CHÚ NỘI BỘ (Note) — DỮ LIỆU NHẠY CẢM */}
            <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚠️</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Ghi chú nội bộ (Chỉ nhân sự trung tâm xem)
                </h4>
              </div>
              <div className="text-xs leading-relaxed text-amber-950 whitespace-pre-wrap bg-white/70 rounded-lg p-3 border border-amber-200">
                {selectedStudent.note ? (
                  selectedStudent.note
                ) : (
                  <span className="italic text-amber-700/80">
                    Chưa có ghi chú đặc biệt cho học viên này.
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-700">
                <span>🔒</span>
                <span>Dữ liệu được bảo mật tuyệt đối. Phụ huynh và học viên không xem được mục này.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal "Thêm / Chỉnh Sửa Học Viên" */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !formSubmitting && setFormModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-base md:text-lg font-bold text-slate-900">
                {editingStudent ? 'Cập nhật hồ sơ học viên' : 'Thêm học viên mới'}
              </h3>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={() => setFormModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Họ tên */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên học viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Bảo An"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Giới tính */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>

                {/* Phụ huynh (Chỉ chọn khi tạo mới; khi sửa backend không đổi parentId trực tiếp) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phụ huynh bảo hộ {!editingStudent && <span className="text-rose-500">*</span>}
                  </label>
                  {editingStudent ? (
                    <input
                      type="text"
                      disabled
                      value={editingStudent.parentName || 'Phụ huynh'}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      required
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    >
                      <option value="">-- Chọn phụ huynh --</option>
                      {parents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.phoneNumber})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Cơ sở */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cơ sở trung tâm {!editingStudent && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    disabled={isBranchManager || (editingStudent && !isSuperAdmin)}
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {isSuperAdmin && <option value="">-- Chọn cơ sở --</option>}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName}
                      </option>
                    ))}
                  </select>
                  {isBranchManager && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Tự động gắn vào chi nhánh bạn đang quản lý
                    </p>
                  )}
                </div>

                {/* Trường học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trường học hiện tại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tiểu học An Phú"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Khối lớp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối lớp
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Lớp 2A / Mầm non"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Trạng thái (Chỉ hiện khi Sửa) */}
                {editingStudent && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trạng thái hồ sơ
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    >
                      <option value="Active">Đang học (Active)</option>
                      <option value="Paused">Tạm dừng (Paused)</option>
                      <option value="Graduated">Tốt nghiệp (Graduated)</option>
                      <option value="Dropped">Thôi học (Dropped)</option>
                    </select>
                  </div>
                )}

                {/* Ghi chú nội bộ (Note) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-amber-800">
                      ⚠️ Ghi chú nội bộ (Tâm lý, sức khỏe, can thiệp đặc biệt...)
                    </label>
                    <span className="text-[11px] text-slate-400">Chỉ cán bộ &amp; giáo viên xem</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Nhập lưu ý dành cho giáo viên: tính cách, sự tập trung, thói quen, can thiệp chuyên biệt..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full rounded-lg border border-amber-300 bg-amber-50/40 p-3 text-xs md:text-sm text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu hồ sơ...</span>
                    </>
                  ) : (
                    'Lưu hồ sơ học viên'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
