'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { publicationService } from '@/services/publication.service';
import { questionsService } from '@/services/questions.service';
import { Comment } from '@/types/publications.types';
import styles from './CommentsSection.module.css';

const MAX_CHARS = 500;
const COMMENTS_FETCH_LIMIT = 50;
const COMMENTS_POLL_MS = 10000;

interface CommentsSectionProps {
    id: string;
    type?: 'PUBLICATION' | 'QUESTION';
    comments: Comment[];
    onCommentAdded?: () => void;
    onCommentDeleted?: (commentId: string) => void;
    onCommentsSynced?: (totalComments: number) => void;
}

function areCommentsDifferent(prev: Comment[], next: Comment[]): boolean {
    if (prev.length !== next.length) return true;

    for (let i = 0; i < prev.length; i += 1) {
        const prevComment = prev[i];
        const nextComment = next[i];

        if (!nextComment) return true;
        if (prevComment.id !== nextComment.id) return true;
        if (prevComment.createdAt !== nextComment.createdAt) return true;
        if (prevComment.content !== nextComment.content) return true;
    }

    return false;
}

function CommentAvatar({ username, avatarUrl }: { username: string; avatarUrl?: string }) {
    if (avatarUrl) {
        return <img src={avatarUrl} alt={username} className={styles.avatarImg} />;
    }
    return <span className={styles.avatarInitial}>{username[0]?.toUpperCase() || 'U'}</span>;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    return (
        <div className={`${styles.toast} ${styles[`toast_${type}`]}`} role="alert">
            <span className={styles.toastIcon}>
                {type === 'success' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )}
            </span>
            <span>{message}</span>
            <button className={styles.toastClose} onClick={onClose} aria-label="Close">×</button>
        </div>
    );
}

function CommentItem({
    comment,
    canDelete,
    onDelete,
    isDeleting,
}: {
    comment: Comment;
    canDelete: boolean;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) {
    const date = new Date(comment.createdAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const time = new Date(comment.createdAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
    const authorName = comment.author?.username || 'Anonymous';
    const authorId = comment.author?.id;
    const profileHref = authorId ? `/dashboard/profile/${authorId}` : null;

    return (
        <div className={styles.commentItem}>
            <div className={styles.commentAvatar}>
                {profileHref ? (
                    <Link href={profileHref} className={styles.commentAvatarLink}>
                        <CommentAvatar
                            username={comment.author?.username || 'U'}
                            avatarUrl={comment.author?.avatarUrl}
                        />
                    </Link>
                ) : (
                    <CommentAvatar
                        username={comment.author?.username || 'U'}
                        avatarUrl={comment.author?.avatarUrl}
                    />
                )}
            </div>
            <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>
                        {profileHref ? (
                            <Link href={profileHref} className={styles.commentAuthorLink}>
                                {authorName}
                            </Link>
                        ) : (
                            authorName
                        )}
                    </span>
                    {comment.author?.role && comment.author.role !== 'USER' && (
                        <span className={styles.roleBadge}>{comment.author.role}</span>
                    )}
                    <span className={styles.commentTime} title={`${date} at ${time}`}>
                        {date}
                    </span>
                </div>
                <p className={styles.commentText}>{comment.content}</p>
            </div>
            {canDelete && (
                <button
                    className={styles.deleteCommentBtn}
                    onClick={() => onDelete(comment.id)}
                    disabled={isDeleting}
                    title="Delete comment"
                    aria-label="Delete comment"
                >
                    {isDeleting ? (
                        <span className={styles.miniSpinner} />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}

export default function CommentsSection({
    id: resourceId,
    type = 'PUBLICATION',
    comments: initialComments,
    onCommentAdded,
    onCommentDeleted,
    onCommentsSynced,
}: CommentsSectionProps) {
    const initialCommentsCount = Array.isArray(initialComments) ? initialComments.length : 0;
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isSyncingComments, setIsSyncingComments] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showAll, setShowAll] = useState(false);
    const hasCompletedInitialSyncRef = useRef<boolean>(initialCommentsCount > 0);
    const onCommentsSyncedRef = useRef<typeof onCommentsSynced>(onCommentsSynced);
    const commentsRef = useRef<Comment[]>(initialComments);
    const lastSyncedCountRef = useRef<number>(initialCommentsCount);

    const service = type === 'PUBLICATION' ? publicationService : questionsService;

    const PREVIEW_COUNT = 3;
    const sortedComments = [...comments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const visibleComments = showAll ? sortedComments : sortedComments.slice(0, PREVIEW_COUNT);
    const hasMore = sortedComments.length > PREVIEW_COUNT;

    const isAdmin = user?.role === 'ADMIN';
    const charsLeft = MAX_CHARS - content.length;
    const isNearLimit = charsLeft <= 50;
    const isOverLimit = charsLeft < 0;

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        onCommentsSyncedRef.current = onCommentsSynced;
    }, [onCommentsSynced]);

    useEffect(() => {
        commentsRef.current = comments;
    }, [comments]);

    const syncComments = useCallback(async (showLoading = false) => {
        const getComments = (service as any).getComments as
            | ((id: string, page?: number, limit?: number) => Promise<Comment[]>)
            | undefined;

        if (typeof getComments !== 'function') return;

        if (showLoading) {
            setIsSyncingComments(true);
        }

        try {
            const fetchedComments = await getComments(resourceId, 1, COMMENTS_FETCH_LIMIT);
            if (Array.isArray(fetchedComments)) {
                if (areCommentsDifferent(commentsRef.current, fetchedComments)) {
                    setComments(fetchedComments);
                    commentsRef.current = fetchedComments;
                }

                if (lastSyncedCountRef.current !== fetchedComments.length) {
                    lastSyncedCountRef.current = fetchedComments.length;
                    onCommentsSyncedRef.current?.(fetchedComments.length);
                }
            }
        } catch (error) {
            console.error('Failed to sync comments:', error);
        } finally {
            hasCompletedInitialSyncRef.current = true;
            if (showLoading) {
                setIsSyncingComments(false);
            }
        }
    }, [resourceId, service]);

    useEffect(() => {
        setComments(initialCommentsCount > 0 ? initialComments : []);
        commentsRef.current = initialCommentsCount > 0 ? initialComments : [];
        hasCompletedInitialSyncRef.current = initialCommentsCount > 0;
        lastSyncedCountRef.current = initialCommentsCount;
        setIsSyncingComments(false);
        setShowAll(false);
        onCommentsSyncedRef.current?.(initialCommentsCount);
    }, [resourceId, type, initialCommentsCount]);

    useEffect(() => {
        const needsInitialLoading = !hasCompletedInitialSyncRef.current && commentsRef.current.length === 0;
        void syncComments(needsInitialLoading);
    }, [resourceId, type, syncComments]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            void syncComments(false);
        }, COMMENTS_POLL_MS);

        return () => window.clearInterval(intervalId);
    }, [syncComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isPosting || isOverLimit || !user) return;

        setIsPosting(true);
        try {
            await (service as any).addComment(resourceId, content.trim());
            setContent('');
            await syncComments(false);
            showToast('Comment added successfully!', 'success');
            onCommentAdded?.();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to post comment';
            showToast(msg, 'error');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        setDeletingId(commentId);
        try {
            await (service as any).deleteComment(resourceId, commentId);
            await syncComments(false);
            showToast('Comment deleted.', 'success');
            onCommentDeleted?.(commentId);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete comment';
            showToast(msg, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const canDeleteComment = (comment: Comment) => {
        if (!user) return false;
        if (isAdmin) return true;
        return comment.author?.id === user.id;
    };

    return (
        <div className={styles.root}>
            {/* Toast notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Comment Form */}
            {user ? (
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    <div className={styles.formAvatar}>
                        <CommentAvatar
                            username={user.username || user.email || 'U'}
                            avatarUrl={user.avatarUrl}
                        />
                    </div>
                    <div className={styles.inputWrapper}>
                        <textarea
                            className={`${styles.textarea} ${isOverLimit ? styles.textareaError : ''}`}
                            placeholder="Write a comment... (max 500 characters)"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            disabled={isPosting}
                            rows={1}
                            maxLength={MAX_CHARS + 10}
                            aria-label="Comment content"
                        />
                        <div className={styles.formFooter}>
                            <span className={`${styles.charCount} ${isNearLimit ? styles.charCountWarn : ''} ${isOverLimit ? styles.charCountError : ''}`}>
                                {charsLeft} / {MAX_CHARS}
                            </span>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isPosting || !content.trim() || isOverLimit}
                            >
                                {isPosting ? (
                                    <span className={styles.btnSpinner} />
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}>
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                        Comment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className={styles.loginPrompt}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>Sign in to join the conversation</span>
                </div>
            )}

            {/* Divider */}
            {comments.length > 0 && (
                <div className={styles.divider}>
                    <span className={styles.dividerLabel}>
                        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </span>
                </div>
            )}

            {/* Comments List */}
            <div className={styles.list}>
                {visibleComments.length > 0 ? (
                    visibleComments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            canDelete={canDeleteComment(comment)}
                            onDelete={handleDelete}
                            isDeleting={deletingId === comment.id}
                        />
                    ))
                ) : isSyncingComments ? (
                    <div className={styles.empty}>
                        <p>Loading comments...</p>
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} width={32} height={32} opacity={0.3}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                )}
            </div>

            {/* Load more / collapse */}
            {hasMore && (
                <button
                    className={styles.loadMoreBtn}
                    onClick={() => setShowAll(s => !s)}
                >
                    {showAll ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                                <path d="M18 15l-6-6-6 6" />
                            </svg>
                            Show less
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                            Show {sortedComments.length - PREVIEW_COUNT} more comments
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
