import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Students from './pages/Students';
import ClassList from './pages/ClassList';
import Schedules from './pages/Schedules';
import Attendance from './pages/Attendance';
import Tuitions from './pages/Tuitions';
import Payments from './pages/Payments';
import Homeworks from './pages/Homeworks';
import Grades from './pages/Grades';
import LeaveRequests from './pages/LeaveRequests';
import Branches from './pages/Branches';
import BranchDetail from './pages/BranchDetail';
import Teachers from './pages/Teachers';
import Messages from './pages/Messages';
import Newsfeed from './pages/Newsfeed';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './context/AuthProvider';

const ALL_ROLES = ['SuperAdmin', 'BranchManager', 'Teacher', 'Parent', 'Student'];
const STAFF_ROLES = ['SuperAdmin', 'BranchManager'];
const TUITION_ROLES = ['SuperAdmin', 'BranchManager', 'Parent', 'Student'];
const PAYMENT_ROLES = ['SuperAdmin', 'BranchManager', 'Parent'];
const SUPERADMIN_ONLY = ['SuperAdmin'];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/classes" element={<ClassList />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/homeworks" element={<Homeworks />} />
                <Route path="/grades" element={<Grades />} />
                <Route path="/leave-requests" element={<LeaveRequests />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/newsfeed" element={<Newsfeed />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
                <Route path="/courses" element={<Courses />} />
                <Route path="/teachers" element={<Teachers />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={TUITION_ROLES} />}>
                <Route path="/tuitions" element={<Tuitions />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={PAYMENT_ROLES} />}>
                <Route path="/payments" element={<Payments />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={SUPERADMIN_ONLY} />}>
                <Route path="/branches" element={<Branches />} />
                <Route path="/branches/:id" element={<BranchDetail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
