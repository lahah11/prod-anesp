'use client';

import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  permissionMatch?: 'all' | 'any';
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  permissionMatch = 'all',
  fallbackPath = '/dashboard'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Si aucun rôle requis, autoriser l'accès
      let authorized = true;

      if (requiredRoles.length > 0) {
        authorized = requiredRoles.includes(user.role);
      }

      if (authorized && requiredPermissions.length > 0 && user.role !== 'super_admin') {
        const permissions = user.permissions || [];
        if (permissionMatch === 'any') {
          authorized = requiredPermissions.some((code) => permissions.includes(code));
        } else {
          authorized = requiredPermissions.every((code) => permissions.includes(code));
        }
      }

      if (authorized) {
        setIsAuthorized(true);
      } else {
        console.log(`Accès refusé pour ${user.role}`);
        router.push(fallbackPath);
      }
    }
  }, [user, loading, requiredRoles, requiredPermissions, permissionMatch, router, fallbackPath]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
