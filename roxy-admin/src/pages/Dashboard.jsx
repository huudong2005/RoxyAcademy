export default function Dashboard() {
    return (
      <div>
        <h3 className="mb-4 text-2xl font-bold">Tổng quan trung tâm</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Tổng số học viên</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">120</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Lớp đang hoạt động</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">15</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Doanh thu tháng này</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">45,000,000đ</p>
          </div>
        </div>
      </div>
    );
  }