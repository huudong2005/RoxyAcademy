import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassList from './pages/ClassList'; // <--- Import thêm trang Lớp học
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/classes" element={<ClassList />} /> {/* <--- Khai báo đường dẫn ở đây */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}