'use client';

import { useState, useEffect } from 'react';
import { Publication, PublicationFilters } from '@/types/publications.types';
import { publicationService } from '@/services/publication.service';
import PublicationCard from './PublicationCard';
import styles from './PublicationFeed.module.css';

interface PublicationFeedProps {
    authorId?: string;
}

export default function PublicationFeed({ authorId }: PublicationFeedProps) {
    const [publications, setPublications] = useState<Publication[]>([]);
    const [filters, setFilters] = useState<PublicationFilters>({
        sortBy: 'recent',
        authorId,
        page: 1
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPublications = async () => {
        setIsLoading(true);
        try {
            const result = await publicationService.list(filters);
            setPublications(result.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load feed');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPublications();
    }, [filters]);

    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            authorId,
            page: 1,
        }));
    }, [authorId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this publication?')) return;
        try {
            await publicationService.delete(id);
            setPublications(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <section className={styles.feed}>
            <header className={styles.feedHeader}>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${!filters.type ? styles.active : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: undefined }))}
                    >
                        All
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filters.type === 'ERROR_SOLUTION' ? styles.active : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'ERROR_SOLUTION' }))}
                    >
                        Error Solutions
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filters.type === 'CODE_SNIPPET' ? styles.active : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'CODE_SNIPPET' }))}
                    >
                        Code Snippets
                    </button>
                </div>

                <div className={styles.sort}>
                    <span className={styles.sortLabel}>Sort by:</span>
                    <div className={styles.sortSegments}>
                        <button
                            className={`${styles.sortBtn} ${filters.sortBy === 'recent' ? styles.active : ''}`}
                            onClick={() => setFilters(prev => ({ ...prev, sortBy: 'recent' }))}
                        >
                            Latest
                        </button>
                        <button
                            className={`${styles.sortBtn} ${filters.sortBy === 'most_voted' ? styles.active : ''}`}
                            onClick={() => setFilters(prev => ({ ...prev, sortBy: 'most_voted' }))}
                        >
                            Popular
                        </button>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    Loading publications...
                </div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : publications.length === 0 ? (
                <div className={styles.empty}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} width={64} height={64}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <p>No publications found yet.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {publications.map(pub => (
                        <PublicationCard
                            key={pub.id}
                            publication={pub}
                            onDelete={handleDelete}
                            onUpdate={loadPublications}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
