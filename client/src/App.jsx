import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import Wardrobe from './pages/Wardrobe';
import DailyTop5 from './pages/DailyTop5';
import WeeklyPlan from './pages/WeeklyPlan';
import Profile from './pages/Profile';
import Laundry from './pages/Laundry';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="wardrobe" element={<Wardrobe />} />
        <Route path="daily" element={<DailyTop5 />} />
        <Route path="weekly" element={<WeeklyPlan />} />
        <Route path="profile" element={<Profile />} />
        <Route path="laundry" element={<Laundry />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
