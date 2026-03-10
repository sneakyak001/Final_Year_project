import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { useAuth } from '../context/AuthContext';
import { DnaBackground } from '../components/DnaBackground';
import { Activity, ShieldCheck, User, Loader2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { gsap } from 'gsap';
import './Login.css';

function formatCountdown(ms: number) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);
    const [countdown, setCountdown] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = 'HMS Enterprise – Sign In';
    }, []);

    // Lockout countdown timer
    useEffect(() => {
        if (!lockedUntil) return;
        const tick = () => {
            const remaining = lockedUntil - Date.now();
            if (remaining <= 0) {
                setLockedUntil(null);
                setCountdown('');
                setErrorMsg('');
            } else {
                setCountdown(formatCountdown(remaining));
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockedUntil]);

    // GSAP shake on error
    const shakeBox = () => {
        if (boxRef.current) {
            gsap.fromTo(boxRef.current,
                { x: 0 },
                { x: 10, duration: 0.07, ease: 'power1.inOut', repeat: 5, yoyo: true }
            );
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || isSubmitting || !!lockedUntil) return;

        setErrorMsg('');
        setIsSubmitting(true);

        try {
            const result = await login(email, password, rememberMe);

            if (result.success) {
                // Navigate to intended destination or role-appropriate home
                navigate(from, { replace: true });
            } else {
                shakeBox();
                if (result.error === 'account_locked') {
                    setLockedUntil(result.lockedUntil ?? Date.now() + 15 * 60 * 1000);
                    setErrorMsg('Account locked due to too many failed attempts.');
                } else if (result.error === 'server_error') {
                    setErrorMsg('A server error occurred. Please try again.');
                } else {
                    setErrorMsg('Invalid email or password. Please try again.');
                }
            }
        } catch {
            shakeBox();
            setErrorMsg('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            {/* 3D Background */}
            <div className="login-canvas-bg">
                <Canvas camera={{ position: [0, 0, 18], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1.5} />
                    <DnaBackground />
                    <Environment preset="city" />
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                </Canvas>
            </div>

            <div className="login-overlay">
                <motion.div
                    ref={boxRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="login-box card"
                >
                    {/* Header */}
                    <div className="login-header">
                        <div className="login-logo-wrap">
                            <div className="login-logo-ring" />
                            <div className="logo-icon-bg login-logo">
                                <Activity color="white" size={22} />
                            </div>
                        </div>
                        <h1 className="title-lg mt-4">HMS Enterprise</h1>
                        <p className="text-muted text-sm mt-1">Clinical Decision Support Portal</p>
                    </div>

                    {/* Credentials hint (dev) */}
                    <div className="login-hint-box">
                        <div className="hint-row">
                            <ShieldCheck size={13} />
                            <span><strong>Admin:</strong> admin@hms.local / Admin@123</span>
                        </div>
                        <div className="hint-row">
                            <User size={13} />
                            <span><strong>Doctor:</strong> Add via Admin Dashboard</span>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="login-form" noValidate>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="form-fields"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Lockout banner */}
                                {lockedUntil && (
                                    <div role="alert" className="login-error-banner">
                                        <Lock size={14} />
                                        Account locked. Try again in <strong>&nbsp;{countdown}</strong>
                                    </div>
                                )}

                                {/* Error banner */}
                                {errorMsg && !lockedUntil && (
                                    <div role="alert" className="login-error-banner">
                                        {errorMsg}
                                    </div>
                                )}

                                {/* Email */}
                                <div className="input-group">
                                    <label htmlFor="login-email" className="input-label">Email Address</label>
                                    <div className="input-icon-wrap">
                                        <Mail size={15} className="input-icon" />
                                        <input
                                            id="login-email"
                                            type="email"
                                            className="input-field input-with-icon"
                                            placeholder="you@hms.local"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="input-group">
                                    <label htmlFor="login-password" className="input-label">Password</label>
                                    <div className="input-icon-wrap">
                                        <Lock size={15} className="input-icon" />
                                        <input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            className="input-field input-with-icon input-with-icon-right"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            className="input-icon-right-btn"
                                            onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <div className="login-remember-row">
                                    <label className="remember-label" htmlFor="remember-me">
                                        <input
                                            id="remember-me"
                                            type="checkbox"
                                            className="remember-checkbox"
                                            checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                        />
                                        <span>Remember me for 7 days</span>
                                    </label>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="btn-primary w-full login-submit-btn"
                                    disabled={isSubmitting || !!lockedUntil}
                                    aria-busy={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                            Authenticating...
                                        </>
                                    ) : lockedUntil ? (
                                        `Locked — wait ${countdown}`
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </form>

                    <p className="login-footer-note">
                        Secured with PBKDF2 (SHA-256) · Session expires in {rememberMe ? '7 days' : '1 hour'}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
