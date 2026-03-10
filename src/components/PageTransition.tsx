import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap } from 'gsap';

interface PageTransitionProps {
    children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = wrapperRef.current;
        const overlay = overlayRef.current;
        if (!el || !overlay) return;

        // Slide-in curtain + content rise
        const tl = gsap.timeline();
        tl.set(overlay, { scaleX: 1, transformOrigin: 'left center' })
            .set(el, { opacity: 0, y: 18 })
            .to(overlay, { scaleX: 0, transformOrigin: 'right center', duration: 0.45, ease: 'power3.inOut' })
            .to(el, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }, '-=0.18');

        return () => { tl.kill(); };
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            {/* Curtain overlay */}
            <div
                ref={overlayRef}
                style={{
                    position: 'fixed', inset: 0, background: 'var(--accent-blue)',
                    zIndex: 200, pointerEvents: 'none', transformOrigin: 'left center',
                    opacity: 0.15,
                }}
            />
            <div ref={wrapperRef} className="page-transition-wrapper">
                {children}
            </div>
        </div>
    );
}
