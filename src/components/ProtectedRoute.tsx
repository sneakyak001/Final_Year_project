import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireRole?: Role;
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // Still restoring session from DB token — show a spinner, not a redirect
    if (isLoading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: 'var(--bg-color)', flexDirection: 'column', gap: 16
            }}>
                <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Verifying session...</p>
            </div>
        );
    }

    // Not authenticated → go to login, preserve intended destination
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Wrong role → redirect to their home
    if (requireRole && user?.role !== requireRole) {
        return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
    }

    return <>{children}</>;
}
