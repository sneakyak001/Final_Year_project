import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

// ------ Types ------
type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

// ------ Context ------
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const dismiss = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div aria-live="polite" style={{
                position: 'fixed', bottom: '24px', right: '24px',
                display: 'flex', flexDirection: 'column', gap: '10px',
                zIndex: 9999, pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const icons: Record<ToastType, ReactNode> = {
        success: <CheckCircle size={18} />,
        error: <XCircle size={18} />,
        info: <Info size={18} />,
    };

    const colors: Record<ToastType, { bg: string; border: string; color: string }> = {
        success: { bg: '#F0FDF4', border: '#86EFAC', color: '#15803D' },
        error: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
        info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB' },
    };

    const c = colors[toast.type];

    return (
        <div
            role="alert"
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: c.bg, border: `1px solid ${c.border}`, color: c.color,
                borderRadius: '8px', padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                fontWeight: 500, fontSize: '14px', minWidth: '280px', maxWidth: '380px',
                pointerEvents: 'all',
                transform: visible ? 'translateX(0)' : 'translateX(120%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
            }}
        >
            {icons[toast.type]}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{ color: 'inherit', opacity: 0.6, padding: '2px', display: 'flex', cursor: 'pointer', border: 'none', background: 'none' }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

// ------ Hook ------
export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}
