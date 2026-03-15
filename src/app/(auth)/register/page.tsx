'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import RegisterForm from '@/components/auth/components/RegisterForm';
import styles from '../login/LoginPage.module.css'; // Reutilizar estilos

export default function RegisterPage() {
    const router = useRouter();

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Join DevPortal</h1>
                    <p className={styles.subtitle}>Create an account and start building your future</p>
                </header>

                <RegisterForm />

                <footer className={styles.footer}>
                    Already have an account? <button onClick={() => router.push('/login')} className={styles.link}>Sign In</button>
                    <div className={styles.backHome}>
                        <button onClick={() => router.push('/')} className={styles.link}>← Back to Home</button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
