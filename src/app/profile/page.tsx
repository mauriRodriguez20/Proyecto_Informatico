'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import Link from 'next/link';
import styles from './Profile.module.css';

export default function StandaloneProfilePage() {
    const { user, isLoading, updateUser } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [avgRating, setAvgRating] = useState<number | null>(null);
    const [totalRatings, setTotalRatings] = useState(0);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: ''
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/');
        } else if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role
            });

            userService.getProfile(user.id).then((profile) => {
                if (typeof profile.avgRating === 'number') setAvgRating(profile.avgRating);
                if (typeof profile.totalRatings === 'number') setTotalRatings(profile.totalRatings);
            }).catch(() => {});
        }
    }, [user, isLoading, router]);

    const handleNavigate = (path: string) => {
        setIsExiting(true);
        setTimeout(() => {
            router.push(path);
        }, 300);
    };

    if (isLoading || !user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        updateUser({
            username: formData.username,
            email: formData.email,
            role: formData.role
        });
        setIsSaving(false);
        setIsEditing(false);
    };

    const toggleEdit = () => {
        if (isEditing) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role
            });
            setShowRoleDropdown(false);
        }
        setIsEditing(!isEditing);
    };

    return (
        <div className={isExiting ? 'page-fade-out' : 'page-fade-in'} style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 20px' }}>
            <nav style={{ maxWidth: '900px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    onClick={() => handleNavigate('/dashboard')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: 0
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to home
                </button>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>
                    <span style={{ color: 'var(--color-primary)' }}>•</span> DevPortal
                </div>
            </nav>

            <main className={`${styles.profileContainer} ${isEditing ? styles.isEditing : ''}`}>
                <div className={styles.card}>
                    <div className={styles.editButtonWrapper}>
                        <button className={styles.editToggleButton} onClick={toggleEdit}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                                {isEditing ? (
                                    <path d="M18 6L6 18M6 6l12 12" />
                                ) : (
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                )}
                            </svg>
                            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                        </button>
                    </div>

                    <div className={styles.headerSection}>
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={64} height={64} style={{ color: 'var(--color-primary)' }}>
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                )}
                            </div>
                            {isEditing && (
                                <div className={styles.pencilIcon}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {!isEditing ? (
                            <>
                                <h1 className={styles.userName}>{user.username}</h1>
                                <p className={styles.userEmail}>{user.email}</p>
                                <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{user.role} Developer</p>
                            </>
                        ) : (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Editing Profile Details</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>
                                {totalRatings === 0
                                    ? '—'
                                    : avgRating?.toFixed(1) ?? '—'}
                            </span>
                            <span className={styles.statLabel}>
                                {totalRatings === 0 ? 'Sin calificaciones' : 'User Rating'}
                            </span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>12</span>
                            <span className={styles.statLabel}>Projects</span>
                        </div>
                    </div>

                    <div className={styles.infoGrid}>
                        <div className={styles.infoRow}>
                            <label className={styles.label}>FULL NAME</label>
                            {isEditing ? (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className={styles.input}
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                    <div className={styles.pencilSmall}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <span className={styles.value}>{user.username}</span>
                            )}
                        </div>

                        <div className={styles.infoRow}>
                            <label className={styles.label}>EMAIL ADDRESS</label>
                            {isEditing ? (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className={styles.input}
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                    <div className={styles.pencilSmall}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <span className={styles.value}>{user.email}</span>
                            )}
                        </div>

                        <div className={styles.infoRow}>
                            <label className={styles.label}>PROFESSIONAL ROLE</label>
                            {isEditing ? (
                                <div className={styles.customSelect}>
                                    <div
                                        className={styles.selectDisplay}
                                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                    >
                                        {formData.role || 'Select Role'}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} style={{ transition: '0.3s', transform: showRoleDropdown ? 'rotate(180deg)' : 'none' }}>
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>
                                    {showRoleDropdown && (
                                        <div className={styles.selectDropdown}>
                                            {['FRONTEND', 'BACKEND'].map(r => (
                                                <div
                                                    key={r}
                                                    className={styles.selectOption}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, role: r }));
                                                        setShowRoleDropdown(false);
                                                    }}
                                                >
                                                    {r} Developer
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className={styles.value}>{user.role} Developer</span>
                            )}
                        </div>

                        <div className={`${styles.infoRow} ${styles.readOnly}`}>
                            <label className={styles.label}>MEMBER SINCE</label>
                            <span className={styles.value} style={{ color: 'var(--color-text-subtle)' }}>March 2026</span>
                        </div>
                    </div>

                    {isEditing && (
                        <div className={styles.saveActions}>
                            <button className={styles.cancelButton} onClick={toggleEdit}>Discard</button>
                            <button className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
