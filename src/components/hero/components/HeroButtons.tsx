import styles from './HeroButtons.module.css';

interface HeroButtonsProps {
    onLogin: () => void;
    onSignUp: () => void;
}

/**
 * HeroButtons — floating animated CTA buttons with glow effect.
 */
export default function HeroButtons({ onLogin, onSignUp }: HeroButtonsProps) {
    return (
        <div className={styles.wrapper} style={{ animationDelay: '0.45s' }}>
            {/* Primary — Sign In */}
            <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={onLogin}
                aria-label="Abrir formulario de inicio de sesión"
            >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        stroke="currentColor"
                        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M14 12H3"
                    />
                </svg>
                Sign In
            </button>

            {/* Secondary — Create Account */}
            <button
                className={`${styles.btn} ${styles.outline}`}
                onClick={onSignUp}
                aria-label="Abrir formulario de registro"
            >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        stroke="currentColor"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Create Account
            </button>
        </div>
    );
}
