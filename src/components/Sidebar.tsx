import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Stethoscope, LogOut } from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const navItemsRef = useRef<HTMLUListElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Patients', path: '/patients', icon: Users },
        { name: 'AI Analysis', path: '/ai-analysis', icon: Activity },
    ];

    useEffect(() => {
        const sidebar = sidebarRef.current;
        const logo = logoRef.current;
        const navList = navItemsRef.current;
        const footer = footerRef.current;
        if (!sidebar || !logo || !navList || !footer) return;

        const items = navList.querySelectorAll('li');
        const tl = gsap.timeline();

        tl.fromTo(sidebar, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo(logo, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, '-=0.2')
            .fromTo(items, { x: -16, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.07, duration: 0.35, ease: 'power2.out' }, '-=0.1')
            .fromTo(footer, { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.1');
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside ref={sidebarRef} className="sidebar">
            <div ref={logoRef} className="sidebar-logo">
                <div className="logo-icon-bg sidebar-logo-icon">
                    <Stethoscope size={20} color="white" />
                </div>
                <div>
                    <span className="logo-text">AuraCare</span>
                    <span className="logo-sub">Enterprise</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul ref={navItemsRef}>
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <div className="nav-icon-wrap">
                                    <item.icon size={18} />
                                </div>
                                <span className="nav-label">{item.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div ref={footerRef} className="sidebar-footer">
                <div className="sidebar-user-card">
                    <div className="avatar sidebar-avatar">
                        {user?.name?.charAt(0) ?? 'U'}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">Clinical User</span>
                    </div>
                    <button onClick={handleLogout} className="sidebar-logout-btn" aria-label="Log out" title="Log out">
                        <LogOut size={15} />
                    </button>
                </div>
                <div className="offline-status mt-3">
                    <div className="status-dot online pulse-dot"></div>
                    <span>Cloud Sync Active</span>
                </div>
            </div>
        </aside>
    );
}
