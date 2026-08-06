import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AmbulancePage from './pages/AmbulancePage';
import PolicePage from './pages/PolicePage';
import HospitalPage from './pages/HospitalPage';
import DemoControlPage from './pages/DemoControlPage';
import NotFoundPage from './pages/NotFoundPage';
import { Loader2 } from 'lucide-react';

const ROLE_ROUTES = {
  AMBULANCE: '/ambulance',
  POLICE: '/police',
  HOSPITAL: '/hospital',
};

function LoginGuard() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#667085] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const destination = ROLE_ROUTES[user.role] || '/';
    return <Navigate to={destination} replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginGuard />} />
            <Route
              path="/ambulance"
              element={
                <ProtectedRoute allowedRoles={['AMBULANCE']}>
                  <AmbulancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/police"
              element={
                <ProtectedRoute allowedRoles={['POLICE']}>
                  <PolicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospital"
              element={
                <ProtectedRoute allowedRoles={['HOSPITAL']}>
                  <HospitalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo"
              element={
                <ProtectedRoute allowedRoles={['AMBULANCE', 'POLICE', 'HOSPITAL']}>
                  <DemoControlPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
