'use client';

import { useState, useEffect } from 'react';
import styles from './HeroTitle.module.css';

const THEMES = ['primary', 'violet', 'cyan'] as const;
type Theme = (typeof THEMES)[number];

const PHRASES = [
    "No passwords stored in plain text. Ever.",
    "End-to-end encryption for every interaction.",
    "Built with security-first architecture.",
    "Seamless integration, maximum protection.",
    "Modern auth for modern developers."
];

/**
 * HeroTitle — staggered fade-in with triple-click theme easter egg.
 */
export default function HeroTitle() {
    const [theme, setTheme] = useState<Theme>('primary');
    const [clicks, setClicks] = useState(0);
    const [lastClick, setLastClick] = useState(0);
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
                setIsTransitioning(false);
            }, 500); // Wait for fade out
        }, 4000); // Change phrase every 4 seconds

        return () => clearInterval(interval);
    }, []);

    const handleTitleClick = () => {
        const now = Date.now();
        const count = now - lastClick < 500 ? clicks + 1 : 1;
        setClicks(count);
        setLastClick(now);

        if (count >= 3) {
            setTheme((t) => {
                const idx = THEMES.indexOf(t);
                return THEMES[(idx + 1) % THEMES.length];
            });
            setClicks(0);
            // 🚀 Developer easter egg
            if (process.env.NODE_ENV === 'development') {
                console.log('%c🚀 Theme changed! You found the easter egg.', 'color: #6366f1; font-size: 14px; font-weight: bold;');
            }
        }
    };

    return (
        <div className={styles.wrapper}>
            {/* Badge */}
            <div className={`${styles.badge} ${styles[`badge_${theme}`]}`} style={{ animationDelay: '0s' }}>
                <span className={styles.badgeDot} />
                Developer&apos;s Portal
            </div>

            {/* Main heading — triple click to change theme */}
            <h1
                className={`${styles.heading} ${styles[`accent_${theme}`]}`}
                onClick={handleTitleClick}
                title="Try triple-clicking 👀"
                style={{ animationDelay: '0.15s' }}
            >
                Code.{' '}
                <span className={`${styles.gradient} ${styles[`gradient_${theme}`]}`}>Create.</span>{' '}
                Innovate.
            </h1>

            {/* Sub-heading */}
            <p className={styles.sub} style={{ animationDelay: '0.3s' }}>
                Authentication reimagined for the modern web.
                <br />
                <span className={`${styles.mono} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
                    // {PHRASES[phraseIndex]}
                </span>
            </p>
        </div>
    );
}
