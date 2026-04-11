'use client';

import { useEffect, useState } from 'react';
import { Publication } from '@/types/publications.types';
import { useAuth } from '@/hooks/useAuth';
import { publicationService } from '@/services/publication.service';
import MarkdownContent from '@/components/shared/MarkdownContent/MarkdownContent';
import CommentsSection from './CommentsSection';
import StarRating from './StarRating';
import styles from './PublicationCard.module.css';

interface PublicationCardProps {
    publication: Publication;
    onDelete?: (id: string) => void;
    onUpdate?: (publication: Publication) => void;
}

export default function PublicationCard({ publication, onDelete, onUpdate }: PublicationCardProps) {
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [commentsCount, setCommentsCount] = useState(publication.commentsCount);

    // Rating state
    const [authorRating, setAuthorRating] = useState(publication.author?.rating || 0);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(publication.title);
    const [editedContent, setEditedContent] = useState(publication.content);
    const [isUpdating, setIsUpdating] = useState(false);

    const isOwner = user?.id === (publication.author?.id || publication.authorId);
    const date = new Date(publication.createdAt).toLocaleDateString();
    const snippetCode = publication.codeBlock || publication.content;
    const snippetDescription =
        publication.type === 'CODE_SNIPPET' &&
            publication.description &&
            publication.description !== snippetCode
            ? publication.description
            : '';

    useEffect(() => {
        setCommentsCount(publication.commentsCount ?? 0);
    }, [publication.commentsCount]);

    useEffect(() => {
        setAuthorRating(publication.author?.rating || 0);
    }, [publication.author?.rating, publication.id]);

    const handleUpdate = async () => {
        if (!editedTitle.trim() || !editedContent.trim()) return;
        setIsUpdating(true);
        try {
            const updated = await publicationService.update(publication.id, {
                title: editedTitle,
                content: editedContent
            });
            setIsEditing(false);
            onUpdate?.(updated);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Error updating publication');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRate = async (rating: number) => {
        try {
            const result = await publicationService.rate(publication.id, rating);
            // Updating the author's rating in real-time for this card
            // In a real app, this might come from a global state or websocket
            setAuthorRating(result.averageRating);
        } catch (err: any) {
            alert(err.message || 'Error submitting rating');
        }
    };

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div className={styles.authorInfo}>
                    <div className={styles.avatar}>
                        {publication.author?.avatarUrl ? (
                            <img src={publication.author.avatarUrl} alt={publication.author.username} />
                        ) : (
                            <span>{(publication.author?.username || 'U')[0].toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <div className={styles.authorNameRow}>
                            <h4 className={styles.authorName}>{publication.author?.username || `User ${publication.authorId.slice(0, 5)}`}</h4>
                            <span className={styles.authorAvgRating}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width={10} height={10}>
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                {Number(authorRating).toFixed(1)}
                            </span>
                        </div>
                        <span className={styles.meta}>{publication.author?.role || 'Developer'} • {date}</span>
                    </div>
                </div>

                <div className={styles.tags}>
                    <span className={`${styles.tag} ${styles[publication.type.toLowerCase()]}`}>
                        {publication.type.replace('_', ' ')}
                    </span>
                    <span className={styles.tagArea}>{publication.area}</span>
                </div>
            </header>

            <div className={styles.content}>
                {isEditing ? (
                    <div className={styles.editForm}>
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className={styles.editTitleInput}
                        />
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className={styles.editTextArea}
                        />
                        <div className={styles.editActions}>
                            <button onClick={handleUpdate} disabled={isUpdating} className={styles.saveBtn}>
                                {isUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setIsEditing(false)} className={styles.cancelBtn}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className={styles.title}>{publication.title}</h3>
                        {publication.type === 'CODE_SNIPPET' ? (
                            <>
                                {snippetDescription && (
                                    <MarkdownContent content={snippetDescription} className={styles.text} />
                                )}
                                <MarkdownContent
                                    content={snippetCode}
                                    className={styles.text}
                                    forceCodeBlock
                                    languageHint={publication.language}
                                />
                            </>
                        ) : (
                            <MarkdownContent content={publication.content} className={styles.text} />
                        )}
                    </>
                )}
                {publication.imageUrl && (
                    <div className={styles.imageWrapper}>
                        <img src={publication.imageUrl} alt={publication.title} />
                    </div>
                )}
                {publication.technologyName && (
                    <div className={styles.techTag}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                        {publication.technologyName}
                    </div>
                )}
            </div>

            <footer className={styles.footer}>
                <div className={styles.stats}>
                    <div className={styles.ratingWrapper}>
                        <span className={styles.statLabel}>Rate this:</span>
                        <StarRating onRate={handleRate} />
                    </div>

                    <button
                        className={`${styles.statBtn} ${showComments ? styles.statBtnActive : ''}`}
                        onClick={() => setShowComments(!showComments)}
                        aria-expanded={showComments}
                        aria-label="Toggle comments"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {commentsCount}
                    </button>
                </div>

                {isOwner && (
                    <div className={styles.ownerActions}>
                        <button className={styles.actionBtn} onClick={() => setIsEditing(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete?.(publication.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>
                )}
            </footer>

            {showComments && (
                <CommentsSection
                    id={publication.id}
                    type="PUBLICATION"
                    comments={publication.comments ?? []}
                    onCommentsSynced={(total) => setCommentsCount(total)}
                />
            )}
        </article>
    );
}
