import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import ClassList from './pages/ClassList';
import Schedules from './pages/Schedules';
import Attendance from './pages/Attendance';
import Tuitions from './pages/Tuitions';
import Payments from './pages/Payments';
import Homeworks from './pages/Homeworks';
import LeaveRequests from './pages/LeaveRequests';
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/classes" element={<ClassList />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/tuitions" element={<Tuitions />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/homeworks" element={<Homeworks />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
