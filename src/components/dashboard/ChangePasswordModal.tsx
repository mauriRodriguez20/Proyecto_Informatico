'use client';

import { useState } from 'react';
import { userService } from '@/services/user.service';
import FormInput from '@/components/auth/components/FormInput';
import PasswordStrength from '@/components/auth/components/PasswordStrength';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
    onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!currentPassword) {
            setError('Ingresa tu contraseña actual.');
            return;
        }
        if (newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('La nueva contraseña debe ser diferente a la actual.');
            return;
        }

        setIsLoading(true);
        try {
            await userService.changePassword(currentPassword, newPassword);
            setSuccess(true);
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            setError(err.message || 'No se pudo cambiar la contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className={styles.header}>
                    <h2 className={styles.title} id="modal-title">Change Password</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className={styles.success} role="status">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Contraseña actualizada exitosamente.
                    </div>
                ) : (
                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div className={styles.alert} role="alert">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <FormInput
                            id="modal-current-password"
                            label="Contraseña actual"
                            type="password"
                            icon="lock"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                        />

                        <FormInput
                            id="modal-new-password"
                            label="Nueva contraseña"
                            type="password"
                            icon="lock"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={setNewPassword}
                        />
                        <PasswordStrength password={newPassword} />

                        <FormInput
                            id="modal-confirm-password"
                            label="Confirmar nueva contraseña"
                            type="password"
                            icon="lock"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                        />

                        <div className={styles.actions}>
                            <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                                {isLoading ? (
                                    <><span className={styles.spinner} />Saving…</>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
