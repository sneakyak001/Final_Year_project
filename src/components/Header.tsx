import { useEffect, useRef, useState } from 'react';
import { Search, Bell, AlertOctagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';
import './Header.css';

export default function Header() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [sosActive, setSosActive] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const sosBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        gsap.fromTo(headerRef.current,
            { y: -8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.2 }
        );
    }, []);

    const triggerSos = () => {
        setSosActive(true);
        if (sosBtnRef.current) {
            // GSAP shake animation
            gsap.fromTo(sosBtnRef.current,
                { x: 0 },
                { x: 6, duration: 0.08, ease: 'power1.inOut', repeat: 7, yoyo: true }
            );
        }
        setTimeout(() => setSosActive(false), 5000);
    };

    return (
        <header ref={headerRef} className="header">
            <div className="header-search">
                <div className="search-bar header-search-bar">
                    <Search size={16} color="var(--text-muted)" />
                    <input type="text" placeholder="Search patients, records..." />
                </div>
            </div>

            <div className="header-actions">
                <div className="header-clock">
                    <span className="clock-dot" />
                    <span>{currentTime}</span>
                </div>

                <motion.button
                    ref={sosBtnRef}
                    onClick={triggerSos}
                    className={`sos-btn ${sosActive ? 'sos-active' : ''}`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    aria-label={sosActive ? 'SOS broadcasting' : 'Trigger emergency SOS'}
                >
                    <AlertOctagon size={16} />
                    {sosActive ? 'SOS BROADCASTING...' : 'Emergency SOS'}
                </motion.button>

                <motion.button
                    className="icon-btn header-bell"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="View notifications"
                >
                    <div className="notification-badge" />
                    <Bell size={18} />
                </motion.button>

                <div className="user-profile">
                    <motion.div
                        className="avatar header-avatar"
                        whileHover={{ scale: 1.08 }}
                    >
                        {user?.name?.charAt(0) ?? 'U'}
                    </motion.div>
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Clinical Physician'}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
