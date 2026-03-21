'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PublicationType, DevArea } from '@/types/publications.types';
import { publicationService } from '@/services/publication.service';
import styles from './PublicationCreate.module.css';

interface PublicationCreateProps {
    onSuccess?: () => void;
}

export default function PublicationCreate({ onSuccess }: PublicationCreateProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<PublicationType>('CODE_SNIPPET');
    const [area, setArea] = useState<DevArea>('FRONTEND');
    const [technology, setTechnology] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await publicationService.create({
                title,
                content,
                type,
                area,
                technology,
                imageUrl: imageUrl || undefined
            });

            // Reset form
            setTitle('');
            setContent('');
            setTechnology('');
            setImageUrl('');
            setIsExpanded(false);
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'Failed to create publication');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}>
            <div className={styles.header} onClick={() => !isExpanded && setIsExpanded(true)}>
                <div className={styles.avatar}>
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} />
                    ) : (
                        <span>{user.username[0].toUpperCase()}</span>
                    )}
                </div>
                {!isExpanded ? (
                    <div className={styles.placeholder}>
                        What's on your mind, {user.username}?
                    </div>
                ) : (
                    <div className={styles.expandedHeader}>
                        <h3>Create Publication</h3>
                        <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <form className={styles.form} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Title of your publication..."
                        className={styles.titleInput}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    <textarea
                        placeholder="Share your code snippet or error solution..."
                        className={styles.contentTextarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                    />

                    <div className={styles.segmentsRow}>
                        <div className={styles.segmentField}>
                            <label>Content Type</label>
                            <div className={styles.segments}>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${type === 'CODE_SNIPPET' ? styles.active : ''}`}
                                    onClick={() => setType('CODE_SNIPPET')}
                                >
                                    Snippet
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${type === 'ERROR_SOLUTION' ? styles.active : ''}`}
                                    onClick={() => setType('ERROR_SOLUTION')}
                                >
                                    Solution
                                </button>
                            </div>
                        </div>

                        <div className={styles.segmentField}>
                            <label>Dev Area</label>
                            <div className={styles.segments}>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${area === 'FRONTEND' ? styles.active : ''}`}
                                    onClick={() => setArea('FRONTEND')}
                                >
                                    Frontend
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${area === 'BACKEND' ? styles.active : ''}`}
                                    onClick={() => setArea('BACKEND')}
                                >
                                    Backend
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Technology</label>
                        <input
                            type="text"
                            placeholder="e.g. Next.js, FastAPI, CSS..."
                            className={styles.techInput}
                            value={technology}
                            onChange={(e) => setTechnology(e.target.value)}
                        />
                    </div>

                    {imageUrl && (
                        <div className={styles.imagePreview}>
                            <img src={imageUrl} alt="Preview" />
                            <button className={styles.removeImage} onClick={() => setImageUrl('')}>×</button>
                        </div>
                    )}

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.footer}>
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => fileInputRef.current?.click()}
                                title="Add Image"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // Simple preview for demo. In real app, upload to storage.
                                        const url = URL.createObjectURL(file);
                                        setImageUrl(url);
                                    }
                                }}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Publishing...' : 'Publish'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
