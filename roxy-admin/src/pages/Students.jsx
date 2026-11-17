import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function StudentAvatar({ src, name, sizeClass = 'h-9 w-9', textClass = 'text-xs' }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const trimmed = typeof src === 'string' ? src.trim() : '';
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'H';
  const imgError = failedSrc === trimmed;

  if (trimmed && /^https?:\/\//i.test(trimmed) && !imgError) {
    return (
      <img
        src={trimmed}
        alt={name || 'Ảnh đại diện học viên'}
        onError={() => setFailedSrc(trimmed)}
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover bg-white shadow-xs`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-blue-100 ${textClass} font-bold text-blue-700`}
    >
      {initial}
    </div>
  );
}

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
  const isParent = currentUser.role === 'Parent';
  const canViewInternalNote = isStaff || currentUser.role === 'Teacher';

  // Danh sách học viên & trạng thái tải
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [searchParams] = useSearchParams();
  const initialBranchId = searchParams.get('branchId');
  const initialStatus = searchParams.get('status');
  const validStatuses = ['Active', 'Paused', 'Graduated', 'Dropped'];
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(
    isBranchManager && currentUser.branchId
      ? currentUser.branchId
      : initialBranchId && /^\d+$/.test(initialBranchId)
      ? initialBranchId
      : ''
  );
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && validStatuses.includes(initialStatus) ? initialStatus : ''
  );

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

  // Tạo nhanh tài khoản Phụ huynh ngay trong form Học viên (POST /Users, role Parent)
  const [showInlineParentForm, setShowInlineParentForm] = useState(false);
  const [inlineParentData, setInlineParentData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
  });
  const [inlineParentSubmitting, setInlineParentSubmitting] = useState(false);
  const [inlineParentError, setInlineParentError] = useState('');
  const [inlineParentSuccess, setInlineParentSuccess] = useState('');

  // Modal Tạo tài khoản Học viên / Đặt lại mật khẩu Học viên
  const [accountModal, setAccountModal] = useState(null); // { mode: 'create'|'reset', student, phoneNumber, password, newPassword, submitting, error }
  const [actionFeedback, setActionFeedback] = useState('');

  // State riêng cho Phụ huynh (role === 'Parent'): tự đăng ký lớp & theo dõi đơn đăng ký của con
  const [parentChildren, setParentChildren] = useState([]);
  const [openClasses, setOpenClasses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [allParentRegistrations, setAllParentRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState('');
  const [registrationStudentFilter, setRegistrationStudentFilter] = useState('');
  const [registrationsReloadKey, setRegistrationsReloadKey] = useState(0);

  // Modal Đăng ký lớp cho con
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    studentId: '',
    classId: '',
    note: '',
  });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Modal Phụ huynh cập nhật thông tin liên hệ (school, grade, avatarUrl)
  const [parentEditOpen, setParentEditOpen] = useState(false);
  const [parentEditStudent, setParentEditStudent] = useState(null);
  const [parentEditForm, setParentEditForm] = useState({
    avatarUrl: '',
    school: '',
    grade: '',
  });
  const [parentEditSubmitting, setParentEditSubmitting] = useState(false);
  const [parentEditError, setParentEditError] = useState('');

  const handleOpenParentEditModal = (stu) => {
    setParentEditStudent(stu);
    setParentEditForm({
      avatarUrl: stu.avatarUrl || '',
      school: stu.school || '',
      grade: stu.grade || '',
    });
    setParentEditError('');
    setParentEditOpen(true);
  };

  const handleSubmitParentEdit = async (e) => {
    e.preventDefault();
    if (!parentEditStudent) return;

    const trimmedAvatar = parentEditForm.avatarUrl.trim();
    if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
      setParentEditError('Đường dẫn ảnh đại diện phải bắt đầu bằng http:// hoặc https://.');
      return;
    }

    setParentEditSubmitting(true);
    setParentEditError('');
    try {
      const payload = {
        school: parentEditForm.school.trim() || null,
        grade: parentEditForm.grade.trim() || null,
        avatarUrl: trimmedAvatar || null,
      };
      await axiosClient.put(`/Students/${parentEditStudent.id}`, payload);

      if (detailModalOpen && selectedStudent?.id === parentEditStudent.id) {
        setSelectedStudent((prev) =>
          prev
            ? {
                ...prev,
                school: payload.school,
                grade: payload.grade,
                avatarUrl: payload.avatarUrl,
              }
            : prev
        );
      }

      setParentEditOpen(false);
      setActionFeedback(`Đã cập nhật thông tin liên hệ cho học viên ${parentEditStudent.fullName}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setParentEditError(
        err.response?.data?.message || 'Không thể cập nhật thông tin liên hệ. Vui lòng thử lại.'
      );
    } finally {
      setParentEditSubmitting(false);
    }
  };

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

  // Tải danh sách con và lớp đang mở đăng ký (CHỈ dành cho Phụ huynh)
  useEffect(() => {
    if (!isParent) return;
    let ignore = false;

    const fetchParentRegistrationData = async () => {
      try {
        const [childrenRes, openClassRes] = await Promise.allSettled([
          axiosClient.get('/Students', { params: { page: 1, pageSize: 100 } }),
          axiosClient.get('/Classes/open-for-registration'),
        ]);

        if (ignore) return;

        if (childrenRes.status === 'fulfilled') {
          const data = childrenRes.value.data;
          const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
          setParentChildren(list);
        }

        if (openClassRes.status === 'fulfilled') {
          setOpenClasses(Array.isArray(openClassRes.value.data) ? openClassRes.value.data : []);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu đăng ký lớp cho phụ huynh:', err);
      }
    };

    fetchParentRegistrationData();

    return () => {
      ignore = true;
    };
  }, [isParent]);

  // Tải danh sách đơn đăng ký lớp của các con (CHỈ dành cho Phụ huynh)
  useEffect(() => {
    if (!isParent) return;
    let ignore = false;

    const fetchRegistrations = async () => {
      setRegistrationsLoading(true);
      setRegistrationsError('');
      try {
        const params = {};
        if (registrationStudentFilter) {
          params.studentId = registrationStudentFilter;
        }
        const res = await axiosClient.get('/StudentClasses', { params });
        const list = Array.isArray(res.data) ? res.data : [];

        if (!ignore) {
          setRegistrations(list);
          if (!registrationStudentFilter) {
            setAllParentRegistrations(list);
          }
        }
      } catch (err) {
        if (!ignore) {
          setRegistrationsError('Không thể tải danh sách đơn đăng ký lớp. Vui lòng thử lại sau.');
          console.error('Lỗi tải đơn đăng ký lớp:', err);
        }
      } finally {
        if (!ignore) {
          setRegistrationsLoading(false);
        }
      }
    };

    fetchRegistrations();

    return () => {
      ignore = true;
    };
  }, [isParent, registrationStudentFilter, registrationsReloadKey]);

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
    setShowInlineParentForm(false);
    setInlineParentData({ fullName: '', phoneNumber: '', password: '' });
    setInlineParentError('');
    setInlineParentSuccess('');
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
    setShowInlineParentForm(false);
    setInlineParentData({ fullName: '', phoneNumber: '', password: '' });
    setInlineParentError('');
    setInlineParentSuccess('');
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

  // Tạo nhanh tài khoản Phụ huynh ngay trong form Học viên
  const handleCreateInlineParent = async () => {
    setInlineParentError('');
    setInlineParentSuccess('');
    const fullName = inlineParentData.fullName.trim();
    const phoneNumber = inlineParentData.phoneNumber.trim();
    const password = inlineParentData.password;

    if (!fullName) {
      setInlineParentError('Họ tên phụ huynh là bắt buộc.');
      return;
    }
    if (!/^0\d{9}$/.test(phoneNumber)) {
      setInlineParentError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }
    if (password && password.length < 8) {
      setInlineParentError('Mật khẩu phải từ 8 ký tự (hoặc để trống để đặt lại sau).');
      return;
    }

    setInlineParentSubmitting(true);
    try {
      const branchIdVal = isBranchManager
        ? currentUser.branchId
        : formData.branchId
        ? Number(formData.branchId)
        : null;

      const res = await axiosClient.post('/Users', {
        fullName,
        phoneNumber,
        role: 'Parent',
        branchId: branchIdVal,
        password: password ? password : null,
        preferredLanguage: 'vi',
      });

      const createdParent = res.data;
      setParents((prev) => [createdParent, ...prev]);
      setFormData((prev) => ({ ...prev, parentId: String(createdParent.id) }));
      setInlineParentData({ fullName: '', phoneNumber: '', password: '' });
      setShowInlineParentForm(false);
      setInlineParentSuccess(`Đã tạo và chọn phụ huynh ${createdParent.fullName} (${createdParent.phoneNumber}).`);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
        'Không thể tạo tài khoản phụ huynh.';
      setInlineParentError(detail);
    } finally {
      setInlineParentSubmitting(false);
    }
  };

  // Mở modal Tạo tài khoản / Đặt lại mật khẩu Học viên
  const handleOpenCreateAccountModal = (stu) => {
    setAccountModal({
      mode: 'create',
      student: stu,
      phoneNumber: '',
      password: '',
      newPassword: '',
      submitting: false,
      error: '',
    });
  };

  const handleOpenResetAccountModal = (stu) => {
    setAccountModal({
      mode: 'reset',
      student: stu,
      phoneNumber: '',
      password: '',
      newPassword: '',
      submitting: false,
      error: '',
    });
  };

  const handleStudentAccountSubmit = async (e) => {
    e.preventDefault();
    if (!accountModal) return;
    const { mode, student, phoneNumber, password, newPassword } = accountModal;

    if (mode === 'create') {
      const phone = phoneNumber.trim();
      if (!/^0\d{9}$/.test(phone)) {
        setAccountModal((prev) => ({
          ...prev,
          error: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.',
        }));
        return;
      }
      if (password && password.length < 8) {
        setAccountModal((prev) => ({
          ...prev,
          error: 'Mật khẩu phải từ 8 ký tự (hoặc để trống để đặt lại sau).',
        }));
        return;
      }

      setAccountModal((prev) => ({ ...prev, submitting: true, error: '' }));
      try {
        const res = await axiosClient.post(`/Students/${student.id}/account`, {
          phoneNumber: phone,
          password: password ? password : null,
        });
        const updatedStu = res.data;
        if (selectedStudent?.id === student.id) {
          setSelectedStudent(updatedStu);
        }
        setAccountModal(null);
        setActionFeedback(`Đã tạo tài khoản đăng nhập cho học viên ${student.fullName}.`);
        setReloadKey((k) => k + 1);
      } catch (err) {
        const data = err.response?.data;
        const detail =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
          'Không thể tạo tài khoản học viên.';
        setAccountModal((prev) => ({ ...prev, submitting: false, error: detail }));
      }
    } else {
      if (!newPassword || newPassword.length < 8) {
        setAccountModal((prev) => ({
          ...prev,
          error: 'Mật khẩu mới phải từ 8 ký tự trở lên.',
        }));
        return;
      }

      setAccountModal((prev) => ({ ...prev, submitting: true, error: '' }));
      try {
        await axiosClient.post(`/Students/${student.id}/account/reset-password`, {
          newPassword,
        });
        setAccountModal(null);
        setActionFeedback(`Đã đặt lại mật khẩu cho học viên ${student.fullName}.`);
      } catch (err) {
        const data = err.response?.data;
        const detail =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
          'Không thể đặt lại mật khẩu học viên.';
        setAccountModal((prev) => ({ ...prev, submitting: false, error: detail }));
      }
    }
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

  // Danh sách con đủ điều kiện đăng ký lớp (loại trừ Dropped)
  const eligibleChildren = parentChildren.filter((child) => child.status !== 'Dropped');

  // Con đang được chọn trong modal đăng ký lớp
  const selectedRegisterChild =
    eligibleChildren.find((child) => String(child.id) === String(registerForm.studentId)) || null;

  // Lọc lớp đang mở đăng ký đúng chi nhánh của con đang chọn
  const availableOpenClassesForChild = selectedRegisterChild
    ? openClasses.filter(
        (cls) => cls.isOpenForRegistration === true && cls.branchId === selectedRegisterChild.branchId
      )
    : [];

  // Kiểm tra học viên đã đăng ký lớp này rồi hay chưa (trên danh sách đã tải)
  const isAlreadyRegistered = (studentId, classId) => {
    if (!studentId || !classId) return false;
    const source = allParentRegistrations.length > 0 ? allParentRegistrations : registrations;
    return source.some(
      (reg) => String(reg.studentId) === String(studentId) && String(reg.classId) === String(classId)
    );
  };

  // Helper định dạng tiền VND
  const formatCurrencyVnd = (amount) => {
    const num = Number(amount);
    if (!num || num <= 0) return 'Liên hệ trung tâm';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Helper định dạng ngày giờ đăng ký
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatDate(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Helper badge trạng thái đơn đăng ký lớp
  const renderRegistrationStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Chờ duyệt
          </span>
        );
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đã duyệt / Đang học
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Từ chối
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Hoàn thành
          </span>
        );
      case 'Dropped':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Ngừng học
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

  // Mở modal Đăng ký lớp cho con (CHỈ dành cho Parent)
  const handleOpenRegisterModal = () => {
    if (!isParent) return;
    const defaultChildId = eligibleChildren.length === 1 ? String(eligibleChildren[0].id) : '';
    setRegisterError('');
    setRegisterForm({
      studentId: defaultChildId,
      classId: '',
      note: '',
    });
    setRegisterModalOpen(true);
  };

  // Gửi đơn đăng ký lớp cho con (POST /api/StudentClasses)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!isParent) return;

    setRegisterError('');

    if (!registerForm.studentId) {
      setRegisterError('Vui lòng chọn học viên cần đăng ký.');
      return;
    }

    if (!registerForm.classId) {
      setRegisterError('Vui lòng chọn lớp học muốn đăng ký.');
      return;
    }

    const chosenClass = availableOpenClassesForChild.find(
      (c) => String(c.id) === String(registerForm.classId)
    );
    if (!chosenClass || !chosenClass.isOpenForRegistration) {
      setRegisterError('Lớp học đã chọn hiện không mở đăng ký hoặc không thuộc cơ sở của bé.');
      return;
    }

    if (isAlreadyRegistered(registerForm.studentId, registerForm.classId)) {
      setRegisterError('Học viên đã đăng ký lớp này rồi. Vui lòng chọn lớp khác.');
      return;
    }

    setRegisterSubmitting(true);
    try {
      await axiosClient.post('/StudentClasses', {
        studentId: Number(registerForm.studentId),
        classId: Number(registerForm.classId),
        note: registerForm.note.trim() || null,
      });

      const childName = selectedRegisterChild?.fullName || 'học viên';
      setRegisterModalOpen(false);
      setActionFeedback(
        `Đã gửi đơn đăng ký lớp "${chosenClass.className}" cho ${childName}. Trạng thái: Pending (Chờ duyệt).`
      );
      setRegistrationsReloadKey((k) => k + 1);
    } catch (err) {
      if (err.response?.status === 409) {
        setRegisterError('Học viên đã đăng ký lớp này rồi. Vui lòng chọn lớp khác.');
      } else {
        const data = err.response?.data;
        const detail =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
          'Không thể gửi đơn đăng ký lớp. Vui lòng thử lại sau.';
        setRegisterError(detail);
      }
    } finally {
      setRegisterSubmitting(false);
    }
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

        {/* Nút Đăng ký lớp cho con: CHỈ HIỂN THỊ CHO Parent */}
        {isParent && (
          <button
            type="button"
            onClick={handleOpenRegisterModal}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Đăng ký lớp cho con</span>
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

      {/* Thông báo thao tác tài khoản thành công */}
      {actionFeedback && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs md:text-sm text-emerald-800 flex items-center justify-between gap-2">
          <span>✓ {actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback('')}
            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            ✕
          </button>
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
                <th scope="col" className="px-4 py-3.5">Tài khoản</th>
                <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
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
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
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
                        <StudentAvatar src={stu.avatarUrl} name={stu.fullName} sizeClass="h-9 w-9" textClass="text-xs" />
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

                    {/* Cột 7: Tài khoản Học viên */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {stu.userId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Đã có TK
                          </span>
                          {isStaff && (
                            <button
                              type="button"
                              onClick={() => handleOpenResetAccountModal(stu)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                              title="Đặt lại mật khẩu tài khoản học viên"
                            >
                              Đặt lại MK
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            Chưa có
                          </span>
                          {isStaff && stu.status !== 'Dropped' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateAccountModal(stu)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                              title="Tạo tài khoản đăng nhập cho học viên"
                            >
                              Tạo tài khoản
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cột 8: Thao tác */}
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

                        {/* Nút Cập nhật thông tin liên hệ: CHỈ HIỂN THỊ cho Parent */}
                        {isParent && (
                          <button
                            type="button"
                            onClick={() => handleOpenParentEditModal(stu)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
                            title="Cập nhật thông tin liên hệ"
                          >
                            <span>Cập nhật thông tin liên hệ</span>
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

      {/* 4B. Khu vực "Đơn đăng ký lớp của con" — CHỈ HIỂN THỊ CHO Parent */}
      {isParent && (
        <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold tracking-tight text-slate-900">
                  Đơn đăng ký lớp của con
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {registrations.length} đơn
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Theo dõi trạng thái xét duyệt ghi danh lớp học của con tại trung tâm
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {parentChildren.length > 1 && (
                <select
                  value={registrationStudentFilter}
                  onChange={(e) => setRegistrationStudentFilter(e.target.value)}
                  aria-label="Lọc đơn đăng ký theo con"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  <option value="">Tất cả các con</option>
                  {parentChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleOpenRegisterModal}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out cursor-pointer"
              >
                <span>+ Đăng ký lớp</span>
              </button>
            </div>
          </div>

          {registrationsError && (
            <div className="m-4 rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              ⚠️ {registrationsError}
            </div>
          )}

          {registrationsLoading ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500">
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Đang tải đơn đăng ký lớp...</span>
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400">
              <p className="text-sm font-medium text-slate-600">Chưa có đơn đăng ký lớp nào</p>
              <p className="mt-1 text-xs text-slate-400">
                Nhấn nút &ldquo;Đăng ký lớp cho con&rdquo; để chọn lớp đang mở tuyển sinh.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile card list (< md) */}
              <div className="divide-y divide-slate-100 md:hidden">
                {registrations.map((reg) => (
                  <div key={reg.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{reg.className}</div>
                        <div className="text-slate-600 mt-0.5">Học viên: {reg.studentName}</div>
                      </div>
                      {renderRegistrationStatusBadge(reg.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span className="block text-slate-400">Ngày đăng ký</span>
                        <span className="font-medium text-slate-700">{formatDateTime(reg.registeredAt)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Người duyệt</span>
                        <span className="font-medium text-slate-700">{reg.approvedByName || '—'}</span>
                      </div>
                    </div>
                    {reg.note && (
                      <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                        <span className="font-medium text-slate-500">Ghi chú:</span> {reg.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table (>= md) */}
              <div className="hidden md:block overflow-x-auto min-w-full">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs md:text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase font-semibold tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Học viên</th>
                      <th scope="col" className="px-4 py-3">Lớp học</th>
                      <th scope="col" className="px-4 py-3">Ngày đăng ký</th>
                      <th scope="col" className="px-4 py-3">Trạng thái</th>
                      <th scope="col" className="px-4 py-3">Người duyệt</th>
                      <th scope="col" className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {reg.studentName}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {reg.className}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {formatDateTime(reg.registeredAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderRegistrationStatusBadge(reg.status)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {reg.approvedByName || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={reg.note || ''}>
                          {reg.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

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
                <StudentAvatar
                  src={selectedStudent.avatarUrl}
                  name={selectedStudent.fullName}
                  sizeClass="h-12 w-12"
                  textClass="text-base"
                />
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
              <div className="col-span-2 rounded-lg bg-slate-50 p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-slate-500 block">Tài khoản đăng nhập học viên</span>
                  <span className={`font-semibold ${selectedStudent.userId ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {selectedStudent.userId ? 'Đã có tài khoản đăng nhập' : 'Chưa có tài khoản'}
                  </span>
                </div>
                {isStaff && (
                  selectedStudent.userId ? (
                    <button
                      type="button"
                      onClick={() => handleOpenResetAccountModal(selectedStudent)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                    >
                      Đặt lại mật khẩu
                    </button>
                  ) : selectedStudent.status !== 'Dropped' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateAccountModal(selectedStudent)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                    >
                      Tạo tài khoản
                    </button>
                  ) : null
                )}
              </div>
            </div>

            {/* MỤC ĐẶC BIỆT: GHI CHÚ NỘI BỘ (Note) — CHỈ STAFF (SuperAdmin, BranchManager, Teacher) */}
            {canViewInternalNote && (
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
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              {isParent && (
                <button
                  type="button"
                  onClick={() => handleOpenParentEditModal(selectedStudent)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out cursor-pointer"
                >
                  Cập nhật thông tin liên hệ
                </button>
              )}
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

                {/* Phụ huynh (Chỉ chọn khi tạo mới; hỗ trợ tạo nhanh tài khoản Phụ huynh tại chỗ) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Phụ huynh bảo hộ {!editingStudent && <span className="text-rose-500">*</span>}
                    </label>
                    {!editingStudent && isStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineParentForm((v) => !v);
                          setInlineParentError('');
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        {showInlineParentForm ? 'Đóng form tạo phụ huynh' : '+ Tạo tài khoản phụ huynh mới'}
                      </button>
                    )}
                  </div>

                  {editingStudent ? (
                    <input
                      type="text"
                      disabled
                      value={`${editingStudent.parentName || 'Phụ huynh'}${editingStudent.parentPhone ? ` (${editingStudent.parentPhone})` : ''}`}
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

                  {inlineParentSuccess && (
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-700">
                      ✓ {inlineParentSuccess}
                    </p>
                  )}

                  {!editingStudent && isStaff && showInlineParentForm && (
                    <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2.5">
                      <div className="text-xs font-bold text-slate-800">
                        Tạo nhanh tài khoản Phụ huynh (vai trò Parent)
                      </div>

                      {inlineParentError && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] text-rose-700">
                          ⚠️ {inlineParentError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Họ tên phụ huynh <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Trần Thị Lan"
                            value={inlineParentData.fullName}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Số điện thoại <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="09xxxxxxxx"
                            value={inlineParentData.phoneNumber}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Mật khẩu (tùy chọn)
                          </label>
                          <input
                            type="password"
                            placeholder="Để trống đặt sau (≥8 ký tự)"
                            value={inlineParentData.password}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, password: e.target.value }))
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={inlineParentSubmitting}
                          onClick={() => setShowInlineParentForm(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          disabled={inlineParentSubmitting}
                          onClick={handleCreateInlineParent}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 disabled:opacity-50 cursor-pointer"
                        >
                          {inlineParentSubmitting ? 'Đang tạo...' : 'Tạo & chọn phụ huynh'}
                        </button>
                      </div>
                    </div>
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

      {/* 7. Modal Tạo tài khoản Học viên / Đặt lại mật khẩu Học viên */}
      {accountModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => !accountModal.submitting && setAccountModal(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl z-10">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {accountModal.mode === 'create'
                    ? 'Tạo tài khoản cho học viên'
                    : 'Đặt lại mật khẩu học viên'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học viên: <span className="font-semibold text-slate-700">{accountModal.student.fullName}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={accountModal.submitting}
                onClick={() => setAccountModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentAccountSubmit} className="mt-4 space-y-3.5 text-xs">
              {accountModal.error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700">
                  ⚠️ {accountModal.error}
                </div>
              )}

              {accountModal.mode === 'create' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số điện thoại đăng nhập <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912345678"
                      value={accountModal.phoneNumber}
                      onChange={(e) =>
                        setAccountModal((prev) => ({ ...prev, phoneNumber: e.target.value }))
                      }
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Mỗi tài khoản sử dụng một số điện thoại riêng (10 chữ số, bắt đầu bằng 0).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mật khẩu (tùy chọn)
                    </label>
                    <input
                      type="password"
                      placeholder="Để trống nếu chưa đặt, tối thiểu 8 ký tự"
                      value={accountModal.password}
                      onChange={(e) =>
                        setAccountModal((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                    value={accountModal.newPassword}
                    onChange={(e) =>
                      setAccountModal((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={accountModal.submitting}
                  onClick={() => setAccountModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={accountModal.submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {accountModal.submitting
                    ? 'Đang xử lý...'
                    : accountModal.mode === 'create'
                    ? 'Tạo tài khoản'
                    : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal "Đăng ký lớp cho con" — CHỈ HIỂN THỊ CHO Parent */}
      {isParent && registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !registerSubmitting && setRegisterModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-5 md:p-6 shadow-xl z-10 max-h-[92vh] overflow-y-auto modal-panel">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold tracking-tight text-slate-900">
                  Đăng ký lớp cho con
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn học viên và lớp đang mở tuyển sinh tại cơ sở tương ứng
                </p>
              </div>
              <button
                type="button"
                disabled={registerSubmitting}
                onClick={() => setRegisterModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition-transform cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            {registerError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                ⚠️ {registerError}
              </div>
            )}

            {eligibleChildren.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-600">
                Hiện không có hồ sơ học viên nào đang hoạt động để đăng ký lớp. Vui lòng liên hệ trung tâm để được hỗ trợ.
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs md:text-sm">
                {/* Chọn con */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chọn học viên <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={registerForm.studentId}
                    onChange={(e) => {
                      setRegisterError('');
                      setRegisterForm((prev) => ({
                        ...prev,
                        studentId: e.target.value,
                        classId: '',
                      }));
                    }}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    {eligibleChildren.length > 1 && <option value="">-- Chọn con để đăng ký --</option>}
                    {eligibleChildren.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.fullName} — {child.branchName || `Cơ sở #${child.branchId}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Danh sách lớp đang mở đăng ký đúng chi nhánh */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Chọn lớp đang mở đăng ký <span className="text-rose-500">*</span>
                    </label>
                    {selectedRegisterChild && (
                      <span className="text-[11px] text-slate-500">
                        Cơ sở: <strong className="text-slate-700">{selectedRegisterChild.branchName || `#${selectedRegisterChild.branchId}`}</strong>
                      </span>
                    )}
                  </div>

                  {!selectedRegisterChild ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      Vui lòng chọn học viên phía trên để xem các lớp đang mở tuyển sinh.
                    </div>
                  ) : availableOpenClassesForChild.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      Hiện chưa có lớp nào mở đăng ký tại cơ sở của {selectedRegisterChild.fullName}.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {availableOpenClassesForChild.map((cls) => {
                        const isSelected = String(registerForm.classId) === String(cls.id);
                        const alreadyRegistered = isAlreadyRegistered(selectedRegisterChild.id, cls.id);

                        return (
                          <label
                            key={cls.id}
                            className={`block rounded-xl border p-3.5 transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-100'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="registerClassId"
                                value={cls.id}
                                checked={isSelected}
                                onChange={(e) => {
                                  setRegisterError('');
                                  setRegisterForm((prev) => ({ ...prev, classId: e.target.value }));
                                }}
                                className="mt-1 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 text-xs md:text-sm">
                                    {cls.className}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {alreadyRegistered && (
                                      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                        Đã đăng ký
                                      </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                      {formatCurrencyVnd(cls.tuitionFee)}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                                  <div>
                                    <span className="text-slate-400">Khóa học:</span>{' '}
                                    <span className="font-medium text-slate-800">{cls.courseName || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Cơ sở:</span>{' '}
                                    <span className="font-medium text-slate-800">{cls.branchName || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Giáo viên:</span>{' '}
                                    <span className="font-medium text-slate-800">{cls.teacherName || 'Đang cập nhật'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Khai giảng:</span>{' '}
                                    <span className="font-medium text-slate-800">{formatDate(cls.startDate)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ghi chú tùy chọn */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Mong muốn học buổi sáng cuối tuần, lưu ý đưa đón..."
                    value={registerForm.note}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, note: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={registerSubmitting}
                    onClick={() => setRegisterModalOpen(false)}
                    className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={registerSubmitting || !registerForm.studentId || !registerForm.classId}
                    className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    {registerSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Đang gửi đăng ký...</span>
                      </>
                    ) : (
                      'Gửi đăng ký lớp'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. Modal Phụ huynh cập nhật thông tin liên hệ (CHỈ 3 trường: avatarUrl, school, grade) */}
      {isParent && parentEditOpen && parentEditStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="modal-backdrop fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => !parentEditSubmitting && setParentEditOpen(false)}
            aria-hidden="true"
          />

          <div className="modal-panel relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header chỉ đọc */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cập nhật thông tin liên hệ
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {parentEditStudent.fullName} • #STU-{parentEditStudent.id}
                </p>
              </div>
              <button
                type="button"
                disabled={parentEditSubmitting}
                onClick={() => setParentEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitParentEdit} className="mt-5 space-y-4">
              {parentEditError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  ⚠️ {parentEditError}
                </div>
              )}

              {/* Trường 1: Ảnh đại diện (avatarUrl) kèm live preview 56x56px */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Ảnh đại diện (URL)
                </label>
                <div className="flex items-center gap-3.5">
                  <StudentAvatar
                    src={parentEditForm.avatarUrl}
                    name={parentEditStudent.fullName}
                    sizeClass="h-14 w-14"
                    textClass="text-lg"
                  />
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={parentEditForm.avatarUrl}
                      onChange={(e) => {
                        setParentEditForm((prev) => ({ ...prev, avatarUrl: e.target.value }));
                        if (parentEditError) setParentEditError('');
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Dán đường dẫn ảnh (URL) hoặc để trống để dùng chữ cái đầu.
                </p>
              </div>

              {/* Trường 2: Trường học (school) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Trường học
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="VD: Tiểu học Nguyễn Văn Trỗi"
                  value={parentEditForm.school}
                  onChange={(e) =>
                    setParentEditForm((prev) => ({ ...prev, school: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Trường 3: Khối / Lớp (grade) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Khối / Lớp
                </label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="VD: Lớp 3A"
                  value={parentEditForm.grade}
                  onChange={(e) =>
                    setParentEditForm((prev) => ({ ...prev, grade: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={parentEditSubmitting}
                  onClick={() => setParentEditOpen(false)}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={parentEditSubmitting}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {parentEditSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu thay đổi'
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
