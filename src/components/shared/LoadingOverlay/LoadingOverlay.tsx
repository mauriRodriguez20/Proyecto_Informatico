'use client';

import React, { useEffect, useState } from 'react';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

export default function LoadingOverlay({ isVisible, message = 'Preparing your experience...' }: LoadingOverlayProps) {
    const [render, setRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) setRender(true);
    }, [isVisible]);

    const onAnimationEnd = () => {
        if (!isVisible) setRender(false);
    };

    if (!render) return null;

    return (
        <div
            className={`${styles.overlay} ${isVisible ? styles.fadeIn : styles.fadeOut}`}
            onAnimationEnd={onAnimationEnd}
        >
            <div className={styles.content}>
                <div className={styles.orbWrapper}>
                    <div className={styles.orb} />
                    <div className={styles.orbInner} />
                </div>

                <div className={styles.loaderWrapper}>
                    <div className={styles.spinner}>
                        <div className={styles.dot} />
                        <div className={styles.dot} />
                        <div className={styles.dot} />
                    </div>
                </div>

                <div className={styles.textWrapper}>
                    <h2 className={styles.message}>{message}</h2>
                    <p className={styles.subtext}>Initializing secure environment</p>
                </div>
            </div>
        </div>
    );
}
