import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import EnquiriesPage from './pages/EnquiriesPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import InventoryPage from './pages/InventoryPage';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/enquiries" /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/enquiries" />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/enquiries" element={<EnquiriesPage />} />
                <Route path="/quotations" element={<QuotationsPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
