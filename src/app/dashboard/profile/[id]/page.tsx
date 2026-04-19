'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PublicationFeed from '@/components/dashboard/PublicationFeed';
import { useAuth } from '@/hooks/useAuth';
import { interactionsService, UserPublicStats } from '@/services/interactions.service';
import { userService } from '@/services/user.service';
import { UserProfile } from '@/types/user.types';
import styles from './PublicProfile.module.css';

function formatMemberSince(dateValue?: string | Date): string {
    if (!dateValue) return 'Unknown';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
    });
}

export default function PublicProfilePage() {
    const params = useParams();
    const { user } = useAuth();

    const profileId = useMemo(() => {
        const rawId = params?.id;
        if (typeof rawId === 'string') return rawId;
        if (Array.isArray(rawId)) return rawId[0] || '';
        return '';
    }, [params]);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UserPublicStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profileId) {
            setError('Invalid profile id.');
            setIsLoading(false);
            return;
        }

        let isCancelled = false;

        const loadProfile = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [profileResult, statsResult] = await Promise.allSettled([
                    userService.getProfile(profileId),
                    interactionsService.getUserPublicStats(profileId),
                ]);

                if (isCancelled) return;

                if (profileResult.status === 'rejected') {
                    throw profileResult.reason;
                }

                setProfile(profileResult.value);

                if (statsResult.status === 'fulfilled') {
                    setStats(statsResult.value);
                } else {
                    setStats(null);
                }
            } catch (err: any) {
                if (isCancelled) return;
                setError(err?.message || 'Could not load this profile right now.');
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadProfile();

        return () => {
            isCancelled = true;
        };
    }, [profileId]);

    const isOwnProfile = !!(user && profile && user.id === profile.id);

    const avgRating = Number(stats?.avgRating ?? profile?.avgRating ?? 0);
    const totalRatings = Number(stats?.totalRatings ?? profile?.totalRatings ?? 0);
    const publicationsCount = Number(stats?.publicationsCount ?? 0);
    const questionsCount = Number(stats?.questionsCount ?? 0);
    const answersCount = Number(stats?.answersCount ?? 0);
    const commentsCount = Number(profile?.commentsCount ?? 0);
    const solutionsCount = Number(profile?.solutionsCount ?? 0);

    return (
        <DashboardLayout>
            <div className={styles.page}>
                {isLoading ? (
                    <div className={styles.stateCard}>
                        <div className={styles.spinner} />
                        <p>Loading profile...</p>
                    </div>
                ) : error || !profile ? (
                    <div className={styles.stateCard}>
                        <h2>Profile not available</h2>
                        <p>{error || 'We could not find this user profile.'}</p>
                        <Link href="/dashboard" className={styles.actionLink}>
                            Back to dashboard
                        </Link>
                    </div>
                ) : (
                    <>
                        <section className={styles.heroCard}>
                            <div className={styles.cover} />

                            <div className={styles.heroContent}>
                                <div className={styles.avatarWrap}>
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt={profile.username} className={styles.avatar} />
                                    ) : (
                                        <div className={styles.avatarFallback}>
                                            {(profile.username?.[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.identity}>
                                    <h1 className={styles.username}>{profile.username}</h1>
                                    <p className={styles.meta}>{profile.role} Developer</p>
                                    <p className={styles.description}>{profile.description || 'This user has not added a profile description yet.'}</p>
                                </div>

                                <div className={styles.heroActions}>
                                    {isOwnProfile ? (
                                        <Link href="/dashboard/profile" className={styles.actionLink}>
                                            Edit my profile
                                        </Link>
                                    ) : (
                                        <Link href="/dashboard/profile" className={styles.actionLinkSecondary}>
                                            Go to my profile
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className={styles.contentGrid}>
                            <aside className={styles.sidePanel}>
                                <div className={styles.card}>
                                    <h3>Stats</h3>
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{avgRating.toFixed(1)}</span>
                                            <span className={styles.statLabel}>Average rating</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{totalRatings}</span>
                                            <span className={styles.statLabel}>Ratings received</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{publicationsCount}</span>
                                            <span className={styles.statLabel}>Publications</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{questionsCount}</span>
                                            <span className={styles.statLabel}>Questions</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{answersCount}</span>
                                            <span className={styles.statLabel}>Answers</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{commentsCount}</span>
                                            <span className={styles.statLabel}>Comments</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <span className={styles.statValue}>{solutionsCount}</span>
                                            <span className={styles.statLabel}>Solutions</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.card}>
                                    <h3>About</h3>
                                    <p><strong>Email:</strong> {profile.email}</p>
                                    <p><strong>Member since:</strong> {formatMemberSince(profile.createdAt)}</p>
                                </div>
                            </aside>

                            <div className={styles.timeline}>
                                <div className={styles.timelineHeader}>
                                    <h2>Publications by {profile.username}</h2>
                                    <span>{publicationsCount} total</span>
                                </div>
                                <PublicationFeed authorId={profile.id} />
                            </div>
                        </section>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

