import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, hasPermission, DashboardFeature } from './useAuth';

interface RbacGuardProps {
  feature: DashboardFeature;
  children: React.ReactNode;
  /** Where to redirect if access is denied. Defaults to /unauthorized */
  redirectTo?: string;
}

/**
 * HOC that checks the current user's role against the permission matrix
 * before rendering children. Requirements 6.5.
 */
export function RbacGuard({
  feature,
  children,
  redirectTo = '/unauthorized',
}: RbacGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user.role, feature)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/** Wraps a route element with an auth check (no feature restriction) */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
