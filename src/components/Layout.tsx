import { Outlet } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Global3DBackground } from './Global3DBackground';
import Sidebar from './Sidebar';
import Header from './Header';
import { AiChatWidget } from './AiChatWidget';

export default function Layout() {
    return (
        <div className="app-container" style={{ position: 'relative' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', background: 'var(--bg-color)' }}>
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                    <Global3DBackground />
                </Canvas>
            </div>

            <Sidebar />
            <div className="main-content" style={{ position: 'relative', zIndex: 1, background: 'transparent' }}>
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>

            <AiChatWidget />
        </div>
    );
}
