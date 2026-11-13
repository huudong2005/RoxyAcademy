import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // Tăng số này lên để tải lại danh sách

  // 1. Khởi tạo State cho Modal và Form dữ liệu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    className: '',
    courseId: 1, // Tạm thời hardcode ID Khóa học (bài sau sẽ làm Dropdown)
    branchId: 1, // Tạm thời hardcode ID Cơ sở
    maxCapacity: 20,
    startDate: '',
    endDate: '',
    status: 'Upcoming'
  });

  useEffect(() => {
    let ignore = false; // Tránh cập nhật state nếu màn hình đã đóng hoặc có lần tải mới hơn
  
    const load = async () => {
      try {
        const response = await axiosClient.get('/Classes');
        if (!ignore) setClasses(response.data);
      } catch (err) {
        if (!ignore) setError('Không thể tải dữ liệu lớp học.');
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
  
    load();
  
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // 2. Hàm bắt sự kiện khi gõ vào Input (ô số được chuyển thành số thật)
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

 // 3. Hàm gửi dữ liệu lên Backend
const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
  
    try {
      // Gọi API POST để thêm lớp
      await axiosClient.post('/Classes', formData);
  
      // Thành công: Đóng Modal, Reset Form và Tải lại danh sách
      setIsModalOpen(false);
      setFormData((prev) => ({ ...prev, className: '', startDate: '', endDate: '' }));
      setReloadKey((k) => k + 1); // Tăng số này để useEffect tự tải lại danh sách
  
    } catch (err) {
      // Lấy lý do cụ thể mà backend trả về (dạng { message } hoặc { errors })
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '');
      setSubmitError(`Lỗi khi thêm lớp học. ${detail}`);
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-800">Quản lý Lớp học</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          + Thêm Lớp Mới
        </button>
      </div>

      {/* Bảng danh sách lớp */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Mã Lớp</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Tên Lớp</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Khóa Học</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Sĩ Số</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {classes.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">Chưa có lớp học nào.</td></tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.id} className="transition hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{cls.classCode || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-blue-600">{cls.className}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{cls.courseName || 'N/A'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span className="font-medium text-gray-800">{cls.currentCapacity || 0}</span> / {cls.maxCapacity || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                      cls.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cls.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Modal Thêm Lớp (Sử dụng absolute và z-index để nổi lên trên cùng) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-800">Tạo Lớp Học Mới</h2>

            {submitError && <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-600">{submitError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Tên Lớp</label>
                <input
                  type="text" name="className" required
                  value={formData.className} onChange={handleChange}
                  className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: Lớp IELTS 6.5 Tối 2-4-6"
                />
              </div>

              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ngày Khai Giảng</label>
                  <input
                    type="date" name="startDate" required
                    value={formData.startDate} onChange={handleChange}
                    className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ngày Kết Thúc</label>
                  <input
                    type="date" name="endDate" required
                    value={formData.endDate} onChange={handleChange}
                    className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6 flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sĩ Số Tối Đa</label>
                  <input
                    type="number" name="maxCapacity" min="1" required
                    value={formData.maxCapacity} onChange={handleChange}
                    className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Trạng Thái</label>
                  <select
                    name="status"
                    value={formData.status} onChange={handleChange}
                    className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Upcoming">Sắp mở</option>
                    <option value="Active">Đang hoạt động</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Lưu Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}