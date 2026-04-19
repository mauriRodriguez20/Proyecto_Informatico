'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { interactionsService, UserPublicStats } from '@/services/interactions.service';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ChangePasswordModal from '@/components/dashboard/ChangePasswordModal';
import styles from './Profile.module.css';

export default function RedesignedProfilePage() {
    const { user, isLoading, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [stats, setStats] = useState<UserPublicStats | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: '',
        description: '',
        avatarUrl: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role,
                description: '',
                avatarUrl: user.avatarUrl || ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        userService
            .getProfile(user.id)
            .then((profile) => {
                setFormData((prev) => ({
                    ...prev,
                    description: profile.description || '',
                    avatarUrl: profile.avatarUrl || prev.avatarUrl || '',
                }));
            })
            .catch(() => {
                // Keep local fallback values if profile fetch fails.
            });
    }, [user]);

    useEffect(() => {
        if (!user) return;

        let isCancelled = false;

        interactionsService
            .getUserPublicStats(user.id)
            .then((response) => {
                if (isCancelled) return;
                setStats(response);
                setStatsError(null);
                updateUser({ rating: response.avgRating });
            })
            .catch(() => {
                if (isCancelled) return;
                setStatsError('Could not refresh profile stats right now.');
            });

        return () => {
            isCancelled = true;
        };
    }, [user?.id, updateUser]);

    if (isLoading || !user) return null;

    const ratingValue = Number(stats?.avgRating ?? user.rating ?? 0);
    const publicationsCount = Number(stats?.publicationsCount ?? 0);
    const questionsCount = Number(stats?.questionsCount ?? 0);
    const answersCount = Number(stats?.answersCount ?? 0);
    const totalRatings = Number(stats?.totalRatings ?? 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, description: e.target.value }));
    };

    const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setSaveError('Please select an image file.');
            return;
        }

        if (file.size > 1_500_000) {
            setSaveError('Image is too large. Max size is 1.5 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setFormData(prev => ({ ...prev, avatarUrl: result }));
                setSaveError(null);
            }
        };
        reader.onerror = () => {
            setSaveError('Could not read the image file.');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const updatedProfile = await userService.updateProfile(user.id, {
                username: formData.username.trim(),
                role: formData.role,
                avatarUrl: formData.avatarUrl || undefined,
                description: formData.description || undefined,
            });

            updateUser({
                username: updatedProfile.username || formData.username,
                role: updatedProfile.role || formData.role,
                avatarUrl: updatedProfile.avatarUrl || undefined,
            });

            setFormData((prev) => ({
                ...prev,
                username: updatedProfile.username || prev.username,
                role: updatedProfile.role || prev.role,
                description: updatedProfile.description || '',
                avatarUrl: updatedProfile.avatarUrl || prev.avatarUrl || '',
            }));

            setIsEditing(false);
        } catch (err: any) {
            setSaveError(err.message || 'Could not save profile changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role,
                description: formData.description,
                avatarUrl: user.avatarUrl || formData.avatarUrl || ''
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
                {saveError && <div className={styles.errorMessage}>{saveError}</div>}

                <div className={styles.contentGrid}>
                    <div className={styles.mainCard}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatar}>
                                    {(isEditing ? formData.avatarUrl : user.avatarUrl) ? (
                                        <img src={(isEditing ? formData.avatarUrl : user.avatarUrl) || ''} alt={user.username} />
                                    ) : (
                                        <span>{user.username[0].toUpperCase()}</span>
                                    )}
                                </div>
                                {isEditing && (
                                    <button
                                        type="button"
                                        className={styles.avatarOverlay}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleAvatarFile}
                            />
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

                            <div className={styles.field}>
                                <label>Profile Description</label>
                                {isEditing ? (
                                    <textarea
                                        value={formData.description}
                                        onChange={handleDescriptionChange}
                                        className={styles.input}
                                        placeholder="Tell the community about you..."
                                    />
                                ) : (
                                    <p className={styles.value}>{formData.description || 'No description yet.'}</p>
                                )}
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
                                    <strong>{ratingValue.toFixed(1)}</strong>
                                </div>
                                <div className={styles.statItem}>
                                    <span>Publications</span>
                                    <strong>{publicationsCount}</strong>
                                </div>
                                <div className={styles.statItem}>
                                    <span>Questions</span>
                                    <strong>{questionsCount}</strong>
                                </div>
                                <div className={styles.statItem}>
                                    <span>Answers</span>
                                    <strong>{answersCount}</strong>
                                </div>
                                <div className={styles.statItem}>
                                    <span>Ratings Received</span>
                                    <strong>{totalRatings}</strong>
                                </div>
                            </div>
                            {stats?.label && <p className={styles.statsHint}>{stats.label}</p>}
                            {statsError && <p className={styles.statsError}>{statsError}</p>}
                        </div>

                        <div className={styles.infoCard}>
                            <h3>Security</h3>
                            <p>Manage your account security and password settings.</p>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowChangePassword(true)}
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showChangePassword && (
                <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
            )}
        </DashboardLayout>
    );
}
