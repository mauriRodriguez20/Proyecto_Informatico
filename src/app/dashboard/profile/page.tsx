'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import styles from './Profile.module.css';

export default function RedesignedProfilePage() {
    const { user, isLoading, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role
            });
        }
    }, [user]);

    if (isLoading || !user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));
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
        <DashboardLayout>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>User Profile</h1>
                        <p className={styles.subtitle}>Manage your personal information and developer settings.</p>
                    </div>
                    <button className={`${styles.editBtn} ${isEditing ? styles.active : ''}`} onClick={toggleEdit}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            {isEditing ? (
                                <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            )}
                        </svg>
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </header>

                <div className={styles.contentGrid}>
                    <div className={styles.mainCard}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatar}>
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.username} />
                                    ) : (
                                        <span>{user.username[0].toUpperCase()}</span>
                                    )}
                                </div>
                                {isEditing && (
                                    <div className={styles.avatarOverlay}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className={styles.userInfo}>
                                <h2>{user.username}</h2>
                                <span>{user.role} Developer</span>
                            </div>
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label>Username</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={styles.input}
                                    />
                                ) : (
                                    <p className={styles.value}>{user.username}</p>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={styles.input}
                                    />
                                ) : (
                                    <p className={styles.value}>{user.email}</p>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Professional Role</label>
                                {isEditing ? (
                                    <div className={styles.customSelect}>
                                        <button
                                            className={styles.selectBtn}
                                            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                        >
                                            {formData.role} Developer
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                        {showRoleDropdown && (
                                            <div className={styles.dropdown}>
                                                {['FRONTEND', 'BACKEND'].map(role => (
                                                    <button
                                                        key={role}
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, role }));
                                                            setShowRoleDropdown(false);
                                                        }}
                                                    >
                                                        {role} Developer
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className={styles.value}>{user.role} Developer</p>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Member Since</label>
                                <p className={styles.value}>March 2026</p>
                            </div>
                        </div>

                        {isEditing && (
                            <div className={styles.actions}>
                                <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.sidePanel}>
                        <div className={styles.statsCard}>
                            <h3>Stats Overview</h3>
                            <div className={styles.statList}>
                                <div className={styles.statItem}>
                                    <span>Rating</span>
                                    <strong>{user.rating || 5.0}</strong>
                                </div>
                                <div className={styles.statItem}>
                                    <span>Publications</span>
                                    <strong>12</strong>
                                </div>
                            </div>
                        </div>

                        <div className={styles.infoCard}>
                            <h3>Security</h3>
                            <p>Manage your account security and password settings.</p>
                            <button className={styles.secondaryBtn}>Change Password</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
