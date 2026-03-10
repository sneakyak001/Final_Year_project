import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Activity } from 'lucide-react';
import { gsap } from 'gsap';
import { DnaBackground } from './DnaBackground';
import { Environment, OrbitControls } from '@react-three/drei';
import './SplashScreen.css';

export default function SplashScreen() {
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const taglineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();

        tl.fromTo(logoRef.current,
            { scale: 0, opacity: 0, rotation: -180 },
            { scale: 1, opacity: 1, rotation: 0, duration: 1, ease: 'back.out(1.8)' }
        )
            .fromTo(titleRef.current,
                { y: 30, opacity: 0, letterSpacing: '0.5em' },
                { y: 0, opacity: 1, letterSpacing: '-0.02em', duration: 0.8, ease: 'power3.out' },
                '-=0.3'
            )
            .fromTo(subtitleRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
                '-=0.2'
            )
            .fromTo(taglineRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
                '-=0.1'
            )
            .fromTo(barRef.current,
                { scaleX: 0, transformOrigin: 'left center' },
                { scaleX: 1, transformOrigin: 'left center', duration: 1.4, ease: 'power2.inOut' },
                '-=0.1'
            );
    }, []);

    return (
        <motion.div
            className="splash-container"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
            {/* Full-screen 3D DNA */}
            <div className="splash-canvas">
                <Canvas camera={{ position: [0, 0, 18], fov: 45 }}>
                    <ambientLight intensity={0.4} />
                    <DnaBackground />
                    <Environment preset="night" />
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} />
                </Canvas>
            </div>

            {/* Dark overlay for readability */}
            <div className="splash-overlay" />

            <div className="splash-content">
                <div ref={logoRef} className="splash-logo-container">
                    <div className="logo-icon-bg pulse splash-logo-xl">
                        <Activity color="white" size={52} />
                    </div>
                    <div className="splash-logo-ring ring-1" />
                    <div className="splash-logo-ring ring-2" />
                </div>

                <h1 ref={titleRef} className="splash-title mt-6">
                    HMS Enterprise
                </h1>

                <div ref={taglineRef} className="splash-tagline">
                    Clinical Decision Support System
                </div>

                <p ref={subtitleRef} className="splash-subtitle mt-3">
                    Initializing secure environment...
                </p>

                <div className="loading-bar-container mt-8">
                    <div ref={barRef} className="loading-bar-fill" />
                </div>

                <div className="splash-modules mt-4">
                    {['AI Engine', 'Dexie DB', 'Field Sync', 'Encryption'].map((m, i) => (
                        <motion.span
                            key={m}
                            className="splash-module-tag"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.4 + i * 0.12, duration: 0.4 }}
                        >
                            {m}
                        </motion.span>
                    ))}
                </div>
            </div>

            <div className="splash-background" />
        </motion.div>
    );
}
