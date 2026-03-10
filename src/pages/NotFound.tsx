import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function NotFound() {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'HMS Enterprise – Page Not Found';
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100vh', gap: '16px',
                background: 'var(--bg-color)', textAlign: 'center', padding: '32px',
            }}
        >
            <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--accent-danger-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-danger)', marginBottom: 8,
            }}>
                <AlertCircle size={36} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Page Not Found
            </h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
                The page you're looking for doesn't exist or you don't have permission to access it.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft size={16} /> Go to Dashboard
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => navigate(-1)}
                >
                    Go Back
                </button>
            </div>
        </motion.div>
    );
}
