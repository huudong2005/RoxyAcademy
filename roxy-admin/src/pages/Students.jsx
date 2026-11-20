import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ImageUpload from '../components/ImageUpload';
import { getStoredUser } from '../utils/authStorage';
import {
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  CustomSelect,
  Badge,
  Card,
  PageHeader,
} from '../components/ui';

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
        className={`${sizeClass} shrink-0 rounded-full border border-line object-cover bg-surface shadow-xs`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gold-soft border border-gold/30 ${textClass} font-bold text-teal`}
    >
      {initial}
    </div>
  );
}

export default function Students() {
  // Thông tin user đăng nhập
  const [currentUser] = useState(() => getStoredUser());

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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { student, submitting, error }
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

  const handleOpenDeleteModal = (stu) => {
    setDeleteConfirmModal({
      student: stu,
      submitting: false,
      error: '',
    });
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteConfirmModal?.student) return;
    const { student } = deleteConfirmModal;
    setDeleteConfirmModal((prev) => (prev ? { ...prev, submitting: true, error: '' } : prev));
    try {
      await axiosClient.delete(`/Students/${student.id}`);
      setDeleteConfirmModal(null);
      setActionFeedback(`Đã chuyển học viên ${student.fullName} sang trạng thái Đã nghỉ (Dropped).`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' && err.response.data) ||
        'Không thể xóa học viên. Vui lòng thử lại.';
      setDeleteConfirmModal((prev) => (prev ? { ...prev, submitting: false, error: msg } : prev));
    }
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
          <Badge variant="emerald" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đang học
          </Badge>
        );
      case 'Paused':
        return (
          <Badge variant="amber" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Tạm dừng
          </Badge>
        );
      case 'Graduated':
        return (
          <Badge
            variant="neutral"
            className="normal-case tracking-normal text-xs border-purple-200 bg-purple-50 text-purple-800"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Tốt nghiệp
          </Badge>
        );
      case 'Dropped':
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
            Thôi học
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            {status}
          </Badge>
        );
    }
  };

  // Helper hiển thị chip giới tính
  const renderGenderChip = (gender) => {
    if (gender === 'Male') {
      return (
        <Badge variant="blue" className="normal-case tracking-normal px-2 py-0.5 text-[11px]">
          Nam
        </Badge>
      );
    }
    if (gender === 'Female') {
      return (
        <Badge variant="rose" className="normal-case tracking-normal px-2 py-0.5 text-[11px]">
          Nữ
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" className="normal-case tracking-normal px-2 py-0.5 text-[11px]">
        Khác
      </Badge>
    );
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
          <Badge variant="amber" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Chờ duyệt
          </Badge>
        );
      case 'Active':
        return (
          <Badge variant="emerald" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đã duyệt / Đang học
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="rose" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Từ chối
          </Badge>
        );
      case 'Completed':
        return (
          <Badge
            variant="neutral"
            className="normal-case tracking-normal text-xs border-purple-200 bg-purple-50 text-purple-800"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Hoàn thành
          </Badge>
        );
      case 'Dropped':
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
            Ngừng học
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            {status}
          </Badge>
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
      <PageHeader
        eyebrow="Quản lý đào tạo"
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            <span>Hồ sơ học viên</span>
            <Badge variant="gold">Tổng số: {total} học viên</Badge>
          </span>
        }
        description="Quản lý thông tin học sinh, phụ huynh và ghi chú sư phạm nội bộ trung tâm"
        actions={
          <>
            {/* Nút Thêm học viên: CHỈ HIỂN THỊ CHO SuperAdmin VÀ BranchManager; ẨN VỚI Teacher */}
            {isStaff && (
              <PrimaryButton onClick={handleOpenCreateModal}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Thêm học viên</span>
              </PrimaryButton>
            )}

            {/* Nút Đăng ký lớp cho con: CHỈ HIỂN THỊ CHO Parent */}
            {isParent && (
              <PrimaryButton onClick={handleOpenRegisterModal}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Đăng ký lớp cho con</span>
              </PrimaryButton>
            )}
          </>
        }
      />

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc (Filter Toolbar) */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm theo họ tên học viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lọc theo Chi nhánh */}
          <CustomSelect
            value={branchFilter}
            onChange={(v) => {
              setBranchFilter(v);
              setPage(1);
            }}
            disabled={isBranchManager} // BranchManager bị khóa theo chi nhánh mình
            wrapperClassName="w-full sm:w-auto sm:min-w-[165px]"
            aria-label="Lọc theo chi nhánh"
            options={[
              ...(!isBranchManager ? [{ value: '', label: 'Tất cả cơ sở' }] : []),
              ...branches.map((b) => ({ value: String(b.id), label: b.branchName })),
            ]}
          />

          {/* Lọc theo Lớp học */}
          <CustomSelect
            value={classFilter}
            onChange={(v) => {
              setClassFilter(v);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-auto sm:min-w-[165px]"
            aria-label="Lọc theo lớp học"
            options={[
              { value: '', label: 'Tất cả lớp học' },
              ...classes.map((cls) => ({ value: String(cls.id), label: cls.className })),
            ]}
          />

          {/* Lọc theo Trạng thái */}
          <CustomSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-auto sm:min-w-[175px]"
            aria-label="Lọc theo trạng thái"
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'Active', label: 'Đang học' },
              { value: 'Paused', label: 'Tạm dừng' },
              { value: 'Graduated', label: 'Tốt nghiệp' },
              { value: 'Dropped', label: 'Thôi học' },
            ]}
          />

          <SecondaryButton
            type="button"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
            className="px-4 py-2 text-xs shrink-0"
          >
            Đặt lại
          </SecondaryButton>
        </form>
      </Card>

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
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-line text-left text-xs md:text-sm">
            <thead className="bg-surface-subtle border-b border-line text-[11px] uppercase font-semibold tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-2 py-2.5">Học viên</th>
                <th scope="col" className="px-2 py-2.5">Ngày sinh &amp; Giới tính</th>
                <th scope="col" className="px-2 py-2.5">Phụ huynh &amp; SĐT</th>
                <th scope="col" className="px-2 py-2.5">Cơ sở</th>
                <th scope="col" className="px-2 py-2.5">Trường / Khối lớp</th>
                <th scope="col" className="px-2 py-2.5">Trạng thái</th>
                <th scope="col" className="px-2 py-2.5">Tài khoản</th>
                <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap sticky right-0 z-20 bg-surface-subtle shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách học viên...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🎓</span>
                      <p className="text-sm font-medium text-ink-secondary">Không tìm thấy học viên nào</p>
                      <p className="text-xs text-ink-muted">Thử thay đổi từ khóa hoặc điều kiện bộ lọc phía trên</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-mint-canvas/60 transition-colors duration-150 ease-out">
                    {/* Cột 1: Học viên */}
                    <td className="px-2 py-2.5 max-w-[170px]">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar src={stu.avatarUrl} name={stu.fullName} sizeClass="h-9 w-9 shrink-0" textClass="text-xs" />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{stu.fullName}</div>
                          <div className="text-[11px] text-ink-muted">#STU-{stu.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Ngày sinh & Giới tính */}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <div className="text-ink font-medium">
                        {formatDate(stu.dob)}{' '}
                        <span className="text-[11px] text-ink-muted">{calculateAge(stu.dob)}</span>
                      </div>
                      <div className="mt-0.5">{renderGenderChip(stu.gender)}</div>
                    </td>

                    {/* Cột 3: Phụ huynh & SĐT */}
                    <td className="px-2 py-2.5 max-w-[155px]">
                      <div className="font-medium text-ink">{stu.parentName || '—'}</div>
                      {stu.parentPhone ? (
                        <a
                          href={`tel:${stu.parentPhone}`}
                          className="text-xs font-medium text-teal hover:text-gold-active hover:underline"
                        >
                          {stu.parentPhone}
                        </a>
                      ) : (
                        <span className="text-xs text-ink-muted">Chưa có SĐT</span>
                      )}
                    </td>

                    {/* Cột 4: Cơ sở */}
                    <td className="px-2 py-2.5 min-w-[85px] max-w-[115px]">
                      <span className="inline-flex items-center rounded-full bg-surface-subtle border border-line px-2 py-0.5 text-xs text-ink-secondary font-medium">
                        {stu.branchName || `Cơ sở #${stu.branchId}`}
                      </span>
                    </td>

                    {/* Cột 5: Trường / Khối lớp */}
                    <td className="px-2 py-2.5 max-w-[150px] text-ink-secondary">
                      <div>{stu.school || '—'}</div>
                      {stu.grade && <div className="text-[11px] text-ink-muted">Khối: {stu.grade}</div>}
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {renderStatusBadge(stu.status)}
                    </td>

                    {/* Cột 7: Tài khoản Học viên */}
                    <td className="px-2 py-2.5 min-w-[110px]">
                      {stu.userId ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="emerald" className="normal-case tracking-normal">
                            Đã có TK
                          </Badge>
                          {isStaff && (
                            <button
                              type="button"
                              onClick={() => handleOpenResetAccountModal(stu)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-teal bg-surface border border-line hover:bg-mint-canvas active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                              title="Đặt lại mật khẩu tài khoản học viên"
                            >
                              Đặt lại MK
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="neutral" className="normal-case tracking-normal">
                            Chưa có
                          </Badge>
                          {isStaff && stu.status !== 'Dropped' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateAccountModal(stu)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-teal bg-gold-soft border border-gold/40 hover:bg-gold/30 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                              title="Tạo tài khoản đăng nhập cho học viên"
                            >
                              Tạo tài khoản
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cột 8: Thao tác */}
                    <td className="px-2 py-2.5 whitespace-nowrap text-center sticky right-0 z-10 bg-surface shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {/* Nút Xem chi tiết (Tất cả vai trò đều bấm được) */}
                        <IconButton
                          variant="neutral"
                          onClick={() => handleOpenDetail(stu)}
                          title="Xem chi tiết hồ sơ"
                          aria-label="Xem chi tiết hồ sơ"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </IconButton>

                        {/* Nút Sửa: CHỈ HIỂN THỊ cho SuperAdmin và BranchManager; ẨN VỚI Teacher */}
                        {isStaff && (
                          <IconButton
                            variant="neutral"
                            onClick={() => handleOpenEditModal(stu)}
                            title="Chỉnh sửa thông tin"
                            aria-label="Chỉnh sửa thông tin"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </IconButton>
                        )}

                        {/* Nút Xóa: CHỈ HIỂN THỊ cho SuperAdmin và BranchManager khi chưa Dropped */}
                        {isStaff && stu.status !== 'Dropped' && (
                          <IconButton
                            variant="danger"
                            onClick={() => handleOpenDeleteModal(stu)}
                            title="Xóa / Chuyển sang Đã nghỉ"
                            aria-label="Xóa / Chuyển sang Đã nghỉ"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </IconButton>
                        )}

                        {/* Nút Cập nhật thông tin liên hệ: CHỈ HIỂN THỊ cho Parent */}
                        {isParent && (
                          <IconButton
                            variant="neutral"
                            onClick={() => handleOpenParentEditModal(stu)}
                            title="Cập nhật thông tin liên hệ"
                            aria-label="Cập nhật thông tin liên hệ"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </IconButton>
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-line bg-surface-subtle px-4 py-3 gap-3 text-xs text-ink-secondary">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-ink">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-ink">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-ink">{total}</span> học viên
          </div>

          <div className="flex items-center gap-1.5">
            <SecondaryButton
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 text-xs"
            >
              Trước
            </SecondaryButton>
            <span className="px-3 py-1.5 font-medium text-ink">
              Trang {page} / {totalPages}
            </span>
            <SecondaryButton
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 text-xs"
            >
              Sau
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* 4B. Khu vực "Đơn đăng ký lớp của con" — CHỈ HIỂN THỊ CHO Parent */}
      {isParent && (
        <Card as="section" className="w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line bg-surface-subtle/70 px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold tracking-tight text-ink">
                  Đơn đăng ký lớp của con
                </h2>
                <Badge variant="gold">{registrations.length} đơn</Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Theo dõi trạng thái xét duyệt ghi danh lớp học của con tại trung tâm
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {parentChildren.length > 1 && (
                <CustomSelect
                  value={registrationStudentFilter}
                  onChange={(v) => setRegistrationStudentFilter(v)}
                  aria-label="Lọc đơn đăng ký theo con"
                  wrapperClassName="w-auto min-w-[160px]"
                  className="text-xs"
                  options={[
                    { value: '', label: 'Tất cả các con' },
                    ...parentChildren.map((child) => ({
                      value: child.id,
                      label: child.fullName,
                    })),
                  ]}
                />
              )}

              <PrimaryButton
                type="button"
                onClick={handleOpenRegisterModal}
                className="px-4 py-2 text-xs"
              >
                <span>+ Đăng ký lớp</span>
              </PrimaryButton>
            </div>
          </div>

          {registrationsError && (
            <div className="m-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              ⚠️ {registrationsError}
            </div>
          )}

          {registrationsLoading ? (
            <div className="px-6 py-10 text-center text-xs text-ink-muted">
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Đang tải đơn đăng ký lớp...</span>
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="px-6 py-10 text-center text-ink-muted">
              <p className="text-sm font-medium text-ink-secondary">Chưa có đơn đăng ký lớp nào</p>
              <p className="mt-1 text-xs text-ink-muted">
                Nhấn nút &ldquo;Đăng ký lớp cho con&rdquo; để chọn lớp đang mở tuyển sinh.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile card list (< md) */}
              <div className="divide-y divide-line/60 md:hidden">
                {registrations.map((reg) => (
                  <div key={reg.id} className="p-4 space-y-2 text-xs hover:bg-mint-canvas/60 transition-colors duration-150 ease-out">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-ink">{reg.className}</div>
                        <div className="text-ink-secondary mt-0.5">Học viên: {reg.studentName}</div>
                      </div>
                      {renderRegistrationStatusBadge(reg.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-secondary pt-1">
                      <div>
                        <span className="block text-ink-muted">Ngày đăng ký</span>
                        <span className="font-medium text-ink">{formatDateTime(reg.registeredAt)}</span>
                      </div>
                      <div>
                        <span className="block text-ink-muted">Người duyệt</span>
                        <span className="font-medium text-ink">{reg.approvedByName || '—'}</span>
                      </div>
                    </div>
                    {reg.note && (
                      <div className="rounded-xl bg-surface-subtle px-2.5 py-1.5 text-[11px] text-ink-secondary">
                        <span className="font-medium text-ink-muted">Ghi chú:</span> {reg.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table (>= md) */}
              <div className="hidden md:block overflow-x-auto min-w-full">
                <table className="min-w-full divide-y divide-line text-left text-xs md:text-sm">
                  <thead className="bg-surface-subtle border-b border-line text-[11px] uppercase font-semibold tracking-wider text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">Học viên</th>
                      <th scope="col" className="px-4 py-3">Lớp học</th>
                      <th scope="col" className="px-4 py-3">Ngày đăng ký</th>
                      <th scope="col" className="px-4 py-3">Trạng thái</th>
                      <th scope="col" className="px-4 py-3">Người duyệt</th>
                      <th scope="col" className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60 bg-surface">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-mint-canvas/60 transition-colors duration-150 ease-out">
                        <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                          {reg.studentName}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                          {reg.className}
                        </td>
                        <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">
                          {formatDateTime(reg.registeredAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderRegistrationStatusBadge(reg.status)}
                        </td>
                        <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">
                          {reg.approvedByName || '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-secondary max-w-xs truncate" title={reg.note || ''}>
                          {reg.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* 5. Modal / Drawer "Xem Chi Tiết Học Viên" (Chi Tiết & Bảo Mật Note) */}
      {detailModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop mờ */}
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => setDetailModalOpen(false)}
            aria-hidden="true"
          />

          {/* Hộp thoại chi tiết */}
          <div className="relative w-full max-w-lg rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10 max-h-[90vh] overflow-y-auto">
            {/* Header chi tiết */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  src={selectedStudent.avatarUrl}
                  name={selectedStudent.fullName}
                  sizeClass="h-12 w-12"
                  textClass="text-base"
                />
                <div>
                  <h3 className="text-lg font-bold text-ink">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-ink-muted">Mã hồ sơ: #STU-{selectedStudent.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin cơ bản */}
            <div className="mt-4 grid grid-cols-2 gap-3.5 text-xs">
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Ngày sinh</span>
                <span className="font-semibold text-ink">
                  {formatDate(selectedStudent.dob)} {calculateAge(selectedStudent.dob)}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Giới tính</span>
                <span className="font-semibold text-ink">
                  {selectedStudent.gender === 'Male'
                    ? 'Nam'
                    : selectedStudent.gender === 'Female'
                    ? 'Nữ'
                    : 'Khác'}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Phụ huynh bảo hộ</span>
                <span className="font-semibold text-ink">
                  {selectedStudent.parentName || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Số điện thoại phụ huynh</span>
                <span className="font-semibold text-teal">
                  {selectedStudent.parentPhone || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Cơ sở đăng ký</span>
                <span className="font-semibold text-ink">
                  {selectedStudent.branchName || `Cơ sở #${selectedStudent.branchId}`}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Trạng thái hồ sơ</span>
                <div className="mt-0.5">{renderStatusBadge(selectedStudent.status)}</div>
              </div>
              <div className="col-span-2 rounded-2xl bg-surface-subtle border border-line/60 p-3">
                <span className="text-ink-muted block">Trường học &amp; Khối lớp</span>
                <span className="font-semibold text-ink">
                  {selectedStudent.school || 'Chưa cập nhật trường'}{' '}
                  {selectedStudent.grade ? `— Khối ${selectedStudent.grade}` : ''}
                </span>
              </div>
              <div className="col-span-2 rounded-2xl bg-surface-subtle border border-line/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-ink-muted block">Tài khoản đăng nhập học viên</span>
                  <span className={`font-semibold ${selectedStudent.userId ? 'text-emerald-700' : 'text-ink-secondary'}`}>
                    {selectedStudent.userId ? 'Đã có tài khoản đăng nhập' : 'Chưa có tài khoản'}
                  </span>
                </div>
                {isStaff && (
                  selectedStudent.userId ? (
                    <SecondaryButton
                      type="button"
                      onClick={() => handleOpenResetAccountModal(selectedStudent)}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Đặt lại mật khẩu
                    </SecondaryButton>
                  ) : selectedStudent.status !== 'Dropped' ? (
                    <PrimaryButton
                      type="button"
                      onClick={() => handleOpenCreateAccountModal(selectedStudent)}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Tạo tài khoản
                    </PrimaryButton>
                  ) : null
                )}
              </div>
            </div>

            {/* MỤC ĐẶC BIỆT: GHI CHÚ NỘI BỘ (Note) — CHỈ STAFF (SuperAdmin, BranchManager, Teacher) */}
            {canViewInternalNote && (
              <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">⚠️</span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Ghi chú nội bộ (Chỉ nhân sự trung tâm xem)
                  </h4>
                </div>
                <div className="text-xs leading-relaxed text-amber-950 whitespace-pre-wrap bg-white/70 rounded-xl p-3 border border-amber-200">
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
                <PrimaryButton
                  type="button"
                  onClick={() => handleOpenParentEditModal(selectedStudent)}
                  className="px-4 py-2 text-xs"
                >
                  Cập nhật thông tin liên hệ
                </PrimaryButton>
              )}
              <SecondaryButton
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-xs"
              >
                Đóng
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal "Thêm / Chỉnh Sửa Học Viên" */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !formSubmitting && setFormModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
              <h3 className="text-base md:text-lg font-bold text-ink">
                {editingStudent ? 'Cập nhật hồ sơ học viên' : 'Thêm học viên mới'}
              </h3>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={() => setFormModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Họ tên */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Họ và tên học viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Bảo An"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                {/* Giới tính */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Giới tính
                  </label>
                  <CustomSelect
                    value={formData.gender}
                    onChange={(v) => setFormData({ ...formData, gender: v })}
                    options={[
                      { value: 'Male', label: 'Nam' },
                      { value: 'Female', label: 'Nữ' },
                      { value: 'Other', label: 'Khác' },
                    ]}
                  />
                </div>

                {/* Phụ huynh (Chỉ chọn khi tạo mới; hỗ trợ tạo nhanh tài khoản Phụ huynh tại chỗ) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-ink-secondary">
                      Phụ huynh bảo hộ {!editingStudent && <span className="text-rose-500">*</span>}
                    </label>
                    {!editingStudent && isStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineParentForm((v) => !v);
                          setInlineParentError('');
                        }}
                        className="text-[11px] font-semibold text-teal hover:text-gold-active cursor-pointer"
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
                      className="w-full rounded-full border border-line bg-surface-subtle px-4 py-2.5 text-sm text-ink-muted cursor-not-allowed"
                    />
                  ) : (
                    <CustomSelect
                      value={formData.parentId}
                      onChange={(v) => setFormData({ ...formData, parentId: v })}
                      options={[
                        { value: '', label: '-- Chọn phụ huynh --' },
                        ...parents.map((p) => ({
                          value: p.id,
                          label: `${p.fullName} (${p.phoneNumber})`,
                        })),
                      ]}
                    />
                  )}

                  {inlineParentSuccess && (
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-700">
                      ✓ {inlineParentSuccess}
                    </p>
                  )}

                  {!editingStudent && isStaff && showInlineParentForm && (
                    <div className="mt-2.5 rounded-2xl border border-gold/40 bg-gold-soft/40 p-3.5 space-y-2.5">
                      <div className="text-xs font-bold text-ink">
                        Tạo nhanh tài khoản Phụ huynh (vai trò Parent)
                      </div>

                      {inlineParentError && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] text-rose-700">
                          ⚠️ {inlineParentError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-secondary mb-1">
                            Họ tên phụ huynh <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Trần Thị Lan"
                            value={inlineParentData.fullName}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                            className="w-full rounded-full border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-secondary mb-1">
                            Số điện thoại <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="09xxxxxxxx"
                            value={inlineParentData.phoneNumber}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                            }
                            className="w-full rounded-full border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-secondary mb-1">
                            Mật khẩu (tùy chọn)
                          </label>
                          <input
                            type="password"
                            placeholder="Để trống đặt sau (≥8 ký tự)"
                            value={inlineParentData.password}
                            onChange={(e) =>
                              setInlineParentData((prev) => ({ ...prev, password: e.target.value }))
                            }
                            className="w-full rounded-full border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <SecondaryButton
                          type="button"
                          disabled={inlineParentSubmitting}
                          onClick={() => setShowInlineParentForm(false)}
                          className="px-3.5 py-1.5 text-[11px]"
                        >
                          Đóng
                        </SecondaryButton>
                        <PrimaryButton
                          type="button"
                          disabled={inlineParentSubmitting}
                          onClick={handleCreateInlineParent}
                          className="px-3.5 py-1.5 text-[11px]"
                        >
                          {inlineParentSubmitting ? 'Đang tạo...' : 'Tạo & chọn phụ huynh'}
                        </PrimaryButton>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cơ sở */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Cơ sở trung tâm {!editingStudent && <span className="text-rose-500">*</span>}
                  </label>
                  <CustomSelect
                    disabled={isBranchManager || (editingStudent && !isSuperAdmin)}
                    value={formData.branchId}
                    onChange={(v) => setFormData({ ...formData, branchId: v })}
                    options={[
                      ...(isSuperAdmin ? [{ value: '', label: '-- Chọn cơ sở --' }] : []),
                      ...branches.map((b) => ({
                        value: b.id,
                        label: b.branchName,
                      })),
                    ]}
                  />
                  {isBranchManager && (
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Tự động gắn vào chi nhánh bạn đang quản lý
                    </p>
                  )}
                </div>

                {/* Trường học */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Trường học hiện tại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tiểu học An Phú"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                {/* Khối lớp */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Khối lớp
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Lớp 2A / Mầm non"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                {/* Trạng thái (Chỉ hiện khi Sửa) */}
                {editingStudent && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink-secondary mb-1">
                      Trạng thái hồ sơ
                    </label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(v) => setFormData({ ...formData, status: v })}
                      options={[
                        { value: 'Active', label: 'Đang học (Active)' },
                        { value: 'Paused', label: 'Tạm dừng (Paused)' },
                        { value: 'Graduated', label: 'Tốt nghiệp (Graduated)' },
                        { value: 'Dropped', label: 'Thôi học (Dropped)' },
                      ]}
                    />
                  </div>
                )}

                {/* Ghi chú nội bộ (Note) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-amber-800">
                      ⚠️ Ghi chú nội bộ (Tâm lý, sức khỏe, can thiệp đặc biệt...)
                    </label>
                    <span className="text-[11px] text-ink-muted">Chỉ cán bộ &amp; giáo viên xem</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Nhập lưu ý dành cho giáo viên: tính cách, sự tập trung, thói quen, can thiệp chuyên biệt..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full rounded-2xl border border-amber-300 bg-amber-50/40 p-3 text-xs md:text-sm text-ink focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none placeholder:text-ink-muted"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-line pt-4">
                <SecondaryButton
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs"
                >
                  {formSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu hồ sơ...</span>
                    </>
                  ) : (
                    'Lưu hồ sơ học viên'
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Tạo tài khoản Học viên / Đặt lại mật khẩu Học viên */}
      {accountModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !accountModal.submitting && setAccountModal(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10">
            <div className="flex items-start justify-between border-b border-line pb-3.5">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {accountModal.mode === 'create'
                    ? 'Tạo tài khoản cho học viên'
                    : 'Đặt lại mật khẩu học viên'}
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Học viên: <span className="font-semibold text-ink">{accountModal.student.fullName}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={accountModal.submitting}
                onClick={() => setAccountModal(null)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentAccountSubmit} className="mt-4 space-y-3.5 text-xs">
              {accountModal.error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700">
                  ⚠️ {accountModal.error}
                </div>
              )}

              {accountModal.mode === 'create' ? (
                <>
                  <div>
                    <label className="block font-semibold text-ink-secondary mb-1">
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
                      className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Mỗi tài khoản sử dụng một số điện thoại riêng (10 chữ số, bắt đầu bằng 0).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-secondary mb-1">
                      Mật khẩu (tùy chọn)
                    </label>
                    <input
                      type="password"
                      placeholder="Để trống nếu chưa đặt, tối thiểu 8 ký tự"
                      value={accountModal.password}
                      onChange={(e) =>
                        setAccountModal((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
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
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <SecondaryButton
                  type="button"
                  disabled={accountModal.submitting}
                  onClick={() => setAccountModal(null)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={accountModal.submitting}
                  className="px-4 py-2 text-xs"
                >
                  {accountModal.submitting
                    ? 'Đang xử lý...'
                    : accountModal.mode === 'create'
                    ? 'Tạo tài khoản'
                    : 'Đặt lại mật khẩu'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal "Đăng ký lớp cho con" — CHỈ HIỂN THỊ CHO Parent */}
      {isParent && registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !registerSubmitting && setRegisterModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl rounded-card-lg border border-line/60 bg-surface p-5 md:p-6 shadow-modal modal-panel z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-3.5 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold tracking-tight text-ink">
                  Đăng ký lớp cho con
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Chọn học viên và lớp đang mở tuyển sinh tại cơ sở tương ứng
                </p>
              </div>
              <button
                type="button"
                disabled={registerSubmitting}
                onClick={() => setRegisterModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink active:scale-95 transition-transform cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            {registerError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                ⚠️ {registerError}
              </div>
            )}

            {eligibleChildren.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-subtle p-5 text-center text-xs text-ink-secondary">
                Hiện không có hồ sơ học viên nào đang hoạt động để đăng ký lớp. Vui lòng liên hệ trung tâm để được hỗ trợ.
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs md:text-sm">
                {/* Chọn con */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Chọn học viên <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    value={registerForm.studentId}
                    onChange={(v) => {
                      setRegisterError('');
                      setRegisterForm((prev) => ({
                        ...prev,
                        studentId: v,
                        classId: '',
                      }));
                    }}
                    options={[
                      ...(eligibleChildren.length > 1
                        ? [{ value: '', label: '-- Chọn con để đăng ký --' }]
                        : []),
                      ...eligibleChildren.map((child) => ({
                        value: child.id,
                        label: `${child.fullName} — ${child.branchName || `Cơ sở #${child.branchId}`}`,
                      })),
                    ]}
                  />
                </div>

                {/* Danh sách lớp đang mở đăng ký đúng chi nhánh */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-ink-secondary">
                      Chọn lớp đang mở đăng ký <span className="text-rose-500">*</span>
                    </label>
                    {selectedRegisterChild && (
                      <span className="text-[11px] text-ink-secondary">
                        Cơ sở: <strong className="text-ink">{selectedRegisterChild.branchName || `#${selectedRegisterChild.branchId}`}</strong>
                      </span>
                    )}
                  </div>

                  {!selectedRegisterChild ? (
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface-subtle p-4 text-center text-xs text-ink-muted">
                      Vui lòng chọn học viên phía trên để xem các lớp đang mở tuyển sinh.
                    </div>
                  ) : availableOpenClassesForChild.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-surface-subtle p-4 text-center text-xs text-ink-muted">
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
                            className={`block rounded-2xl border p-3.5 transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? 'border-gold bg-gold-soft/50 ring-2 ring-gold/25'
                                : 'border-line bg-surface hover:border-line-strong hover:bg-mint-canvas/40'
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
                                className="mt-1 h-4 w-4 accent-teal border-line focus:ring-gold/30"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-bold text-ink text-xs md:text-sm">
                                    {cls.className}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {alreadyRegistered && (
                                      <Badge variant="amber" className="normal-case tracking-normal">
                                        Đã đăng ký
                                      </Badge>
                                    )}
                                    <Badge variant="gold" className="normal-case tracking-normal">
                                      {formatCurrencyVnd(cls.tuitionFee)}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-ink-secondary">
                                  <div>
                                    <span className="text-ink-muted">Khóa học:</span>{' '}
                                    <span className="font-medium text-ink">{cls.courseName || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-ink-muted">Cơ sở:</span>{' '}
                                    <span className="font-medium text-ink">{cls.branchName || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-ink-muted">Giáo viên:</span>{' '}
                                    <span className="font-medium text-ink">{cls.teacherName || 'Đang cập nhật'}</span>
                                  </div>
                                  <div>
                                    <span className="text-ink-muted">Khai giảng:</span>{' '}
                                    <span className="font-medium text-ink">{formatDate(cls.startDate)}</span>
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
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Mong muốn học buổi sáng cuối tuần, lưu ý đưa đón..."
                    value={registerForm.note}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, note: e.target.value }))}
                    className="w-full rounded-2xl border border-line bg-surface p-3 text-xs md:text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 border-t border-line pt-4">
                  <SecondaryButton
                    type="button"
                    disabled={registerSubmitting}
                    onClick={() => setRegisterModalOpen(false)}
                    className="px-4 py-2 text-xs"
                  >
                    Hủy bỏ
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    disabled={registerSubmitting || !registerForm.studentId || !registerForm.classId}
                    className="px-5 py-2 text-xs"
                  >
                    {registerSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Đang gửi đăng ký...</span>
                      </>
                    ) : (
                      'Gửi đăng ký lớp'
                    )}
                  </PrimaryButton>
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
            className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
            onClick={() => !parentEditSubmitting && setParentEditOpen(false)}
            aria-hidden="true"
          />

          <div className="modal-panel relative z-10 w-full max-w-md rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal max-h-[90vh] overflow-y-auto">
            {/* Header chỉ đọc */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Cập nhật thông tin liên hệ
                </h3>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {parentEditStudent.fullName} • #STU-{parentEditStudent.id}
                </p>
              </div>
              <button
                type="button"
                disabled={parentEditSubmitting}
                onClick={() => setParentEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-subtle hover:text-ink disabled:opacity-50 cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitParentEdit} className="mt-5 space-y-4">
              {parentEditError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  ⚠️ {parentEditError}
                </div>
              )}

              {/* Trường 1: Ảnh đại diện (avatarUrl) kèm live preview 56x56px */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-ink-secondary">
                  Ảnh đại diện
                </label>
                <div className="flex items-start gap-3.5">
                  <StudentAvatar
                    src={parentEditForm.avatarUrl}
                    name={parentEditStudent.fullName}
                    sizeClass="h-14 w-14"
                    textClass="text-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <ImageUpload
                      value={parentEditForm.avatarUrl}
                      onChange={(url) => {
                        setParentEditForm((prev) => ({ ...prev, avatarUrl: url }));
                        if (parentEditError) setParentEditError('');
                      }}
                      folder="general"
                      disabled={parentEditSubmitting}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  Tải ảnh đại diện lên hoặc xóa ảnh để dùng chữ cái đầu.
                </p>
              </div>

              {/* Trường 2: Trường học (school) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-secondary">
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
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* Trường 3: Khối / Lớp (grade) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-secondary">
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
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 border-t border-line pt-4">
                <SecondaryButton
                  type="button"
                  disabled={parentEditSubmitting}
                  onClick={() => setParentEditOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={parentEditSubmitting}
                  className="px-5 py-2 text-xs"
                >
                  {parentEditSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa học viên */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
            onClick={() => !deleteConfirmModal.submitting && setDeleteConfirmModal(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="modal-panel relative z-10 w-full max-w-md rounded-card-lg border border-line/60 bg-surface p-5 md:p-6 shadow-modal"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-600">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-ink">
                  Xác nhận xóa học viên
                </h3>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                  Bạn có chắc chắn muốn xóa học viên{' '}
                  <span className="font-semibold text-ink">
                    {deleteConfirmModal.student.fullName}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1.5">
              <p className="font-semibold">Thao tác này sẽ thực hiện:</p>
              <ul className="list-disc pl-4 space-y-1 text-amber-800">
                <li>
                  Chuyển trạng thái học viên sang <strong>Đã nghỉ (Dropped)</strong>.
                </li>
                <li>
                  Tự động chuyển các đăng ký lớp đang học hoặc chờ duyệt sang <strong>Đã nghỉ</strong>.
                </li>
                <li>Khóa tài khoản đăng nhập của học viên (nếu có).</li>
                <li>
                  <strong>Giữ nguyên</strong> toàn bộ dữ liệu học phí và thanh toán.
                </li>
              </ul>
            </div>

            {deleteConfirmModal.error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                ⚠️ {deleteConfirmModal.error}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-line pt-4">
              <SecondaryButton
                type="button"
                disabled={deleteConfirmModal.submitting}
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-xs"
              >
                Hủy
              </SecondaryButton>
              <button
                type="button"
                disabled={deleteConfirmModal.submitting}
                onClick={handleConfirmDeleteStudent}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out cursor-pointer disabled:opacity-70"
              >
                {deleteConfirmModal.submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận xóa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
