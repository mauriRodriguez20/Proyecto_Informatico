'use client';

import { useEffect, useRef } from 'react';
import styles from './AnimatedBackground.module.css';

/**
 * Animated background — CSS orb layers + canvas star field.
 * No external dependencies, pure CSS + lightweight canvas.
 */
export default function AnimatedBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;
            const progress = Math.min(scrollY / viewportHeight, 1);

            containerRef.current.style.setProperty('--scroll-y', `${scrollY}px`);
            containerRef.current.style.setProperty('--scroll-progress', `${progress}`);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Generate stars
        const STAR_COUNT = 120;
        const stars = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            opacity: Math.random(),
            speed: Math.random() * 0.008 + 0.002,
            phase: Math.random() * Math.PI * 2,
        }));

        let frame = 0;
        let animId: number;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            stars.forEach((s) => {
                const alpha = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(s.phase + frame * s.speed));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`;
                ctx.fill();
            });

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <div ref={containerRef} className={styles.bg} aria-hidden="true" style={{ '--scroll-y': '0px', '--scroll-progress': '0' } as any}>
            {/* CSS animated orbs with parallax wrappers */}
            <div className={styles.parallaxWrapper} style={{ '--parallax-speed': '-0.15' } as any}>
                <div className={styles.orb1} />
            </div>
            <div className={styles.parallaxWrapper} style={{ '--parallax-speed': '0.25' } as any}>
                <div className={styles.orb2} />
            </div>
            <div className={styles.parallaxWrapper} style={{ '--parallax-speed': '0.1' } as any}>
                <div className={styles.orb3} />
            </div>
            {/* Star field canvas */}
            <canvas ref={canvasRef} className={styles.canvas} />
            {/* Noise overlay for depth */}
            <div className={styles.noise} />
        </div>
    );
}
