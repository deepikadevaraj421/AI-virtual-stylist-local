import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Shirt, Sparkles, Calendar, User, LogOut, Menu, X, Scissors, Droplets
} from 'lucide-react';
import './DashboardLayout.css';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { path: '/dashboard/wardrobe', icon: Shirt, label: 'My Wardrobe' },
  { path: '/dashboard/daily', icon: Sparkles, label: 'Daily Top 5' },
  { path: '/dashboard/weekly', icon: Calendar, label: 'Weekly Plan' },
  { path: '/dashboard/laundry', icon: Droplets, label: 'Laundry Basket' },
  { path: '/dashboard/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-wrapper">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Scissors size={22} />
            </div>
            <div className="logo-text">
              <h1>AI Stylist</h1>
              <span>Virtual Wardrobe</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-gender">{user?.gender}</span>
            </div>
          </div>
          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="header-greeting">
            <h2>Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span></h2>
          </div>
        </header>

        <div className="main-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
