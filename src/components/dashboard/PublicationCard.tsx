'use client';

import { useState } from 'react';
import { Publication } from '@/types/publications.types';
import { useAuth } from '@/hooks/useAuth';
import { publicationService } from '@/services/publication.service';
import styles from './PublicationCard.module.css';

interface PublicationCardProps {
    publication: Publication;
    onDelete?: (id: string) => void;
    onUpdate?: (publication: Publication) => void;
}

export default function PublicationCard({ publication, onDelete, onUpdate }: PublicationCardProps) {
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [commentContent, setCommentContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(publication.title);
    const [editedContent, setEditedContent] = useState(publication.content);
    const [isUpdating, setIsUpdating] = useState(false);

    const isOwner = user?.id === (publication.author?.id || publication.authorId);
    const date = new Date(publication.createdAt).toLocaleDateString();

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim() || isPosting) return;

        setIsPosting(true);
        try {
            await publicationService.addComment(publication.id, commentContent);
            setCommentContent('');
            alert('Comment added successfully!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsPosting(false);
        }
    };

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
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdating(false);
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
                        <h4 className={styles.authorName}>{publication.author?.username || `User ${publication.authorId.slice(0, 5)}`}</h4>
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
                        <p className={styles.text}>{publication.content}</p>
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
                    <button className={styles.statBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {publication.likesCount}
                    </button>
                    <button className={styles.statBtn} onClick={() => setShowComments(!showComments)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {publication.commentsCount}
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
                <div className={styles.commentsSection}>
                    <form className={styles.commentForm} onSubmit={handleSubmitComment}>
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            className={styles.commentInput}
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            disabled={isPosting}
                        />
                        <button className={styles.sendBtn} disabled={isPosting || !commentContent.trim()}>
                            {isPosting ? <div className={styles.smallSpinner} /> : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            )}
                        </button>
                    </form>
                    <div className={styles.commentsList}>
                        {publication.comments?.length ? (
                            publication.comments.map((comment, idx) => (
                                <div key={comment.id || idx} className={styles.comment}>
                                    <div className={styles.commentHeader}>
                                        <span className={styles.commentAuthor}>{comment.author?.username || 'User'}</span>
                                        <span className={styles.commentDate}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className={styles.commentText}>{comment.content}</p>
                                </div>
                            ))
                        ) : (
                            <p className={styles.noComments}>No comments yet. Be the first!</p>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}
