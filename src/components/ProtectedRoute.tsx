
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_ROLES = ['admin', 'super_admin'];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000009]">
        <div className="text-[#45f0df] text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Every admin-panel screen requires an admin/super_admin role. AuthContext
  // already rejects non-admin logins and restored sessions, but this check
  // covers anyone who reaches here by another path (e.g. a still-open tab
  // from before this fix, or a role downgraded mid-session).
  if (!ADMIN_ROLES.includes(user.role ?? '')) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
