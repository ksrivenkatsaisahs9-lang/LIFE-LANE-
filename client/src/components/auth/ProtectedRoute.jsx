import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ROLE_ROUTES = {
  AMBULANCE: '/ambulance',
  POLICE: '/police',
  HOSPITAL: '/hospital',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#667085] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified and user's role is not in the list, redirect to their own page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const correctRoute = ROLE_ROUTES[user.role] || '/login';
    return <Navigate to={correctRoute} replace />;
  }

  return children;
}
