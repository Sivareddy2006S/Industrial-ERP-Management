import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  ShoppingCart,
  Package,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'SALES'] },
  { to: '/enquiries', label: 'Enquiries', icon: FileText, roles: ['ADMIN', 'SALES'] },
  { to: '/quotations', label: 'Quotations', icon: FileCheck, roles: ['ADMIN', 'SALES'] },
  { to: '/sales-orders', label: 'Sales Orders', icon: ShoppingCart, roles: ['ADMIN', 'SALES'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'SALES'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <LayoutDashboard className="w-6 h-6 text-blue-400 mr-3" />
          <h1 className="text-lg font-bold tracking-tight">ERP System</h1>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500 hidden sm:block">
            {user?.email} · <span className="font-medium text-gray-700">{user?.role}</span>
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
