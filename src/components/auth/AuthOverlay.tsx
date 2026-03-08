'use client';

import { useEffect, useCallback } from 'react';
import styles from './AuthOverlay.module.css';
import AuthSlidingPanel from './AuthSlidingPanel';
import { useClickOutside } from '@/hooks/useClickOutside';
import { AuthMode } from '@/types/auth.types';

interface AuthOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode: AuthMode;
}

/**
 * AuthOverlay — full-screen backdrop with blur.
 * Handles: ESC key, click-outside, and renders the sliding panel.
 */
export default function AuthOverlay({ isOpen, onClose, initialMode }: AuthOverlayProps) {
    // Close on ESC
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose],
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    // Click-outside closes only the panel (not the backdrop)
    const panelRef = useClickOutside<HTMLDivElement>(onClose);

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Authentication">
            <div ref={panelRef} className={styles.panelWrapper}>
                <AuthSlidingPanel initialMode={initialMode} onClose={onClose} />
            </div>
        </div>
    );
}
