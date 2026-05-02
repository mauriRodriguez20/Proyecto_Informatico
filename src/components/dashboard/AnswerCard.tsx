'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Answer, questionsService } from '@/services/questions.service';
import { useAuth } from '@/hooks/useAuth';
import styles from './AnswerCard.module.css';

interface AnswerCardProps {
    answer: Answer;
    questionId: string;
    isQuestionAuthor: boolean;
    onUpdate: () => void;
}

function nextVoteState(currentUserVote: 1 | -1 | 0, currentScore: number, clickedValue: 1 | -1) {
    if (currentUserVote === clickedValue) {
        return {
            userVote: 0 as const,
            voteScore: currentScore - clickedValue,
        };
    }

    if (currentUserVote === 0) {
        return {
            userVote: clickedValue,
            voteScore: currentScore + clickedValue,
        };
    }

    return {
        userVote: clickedValue,
        voteScore: currentScore + (clickedValue - currentUserVote),
    };
}

export default function AnswerCard({ answer, questionId, isQuestionAuthor, onUpdate }: AnswerCardProps) {
    const { user } = useAuth();
    const [isVoting, setIsVoting] = useState(false);
    const [voteScore, setVoteScore] = useState(answer.voteScore);
    const [userVote, setUserVote] = useState<1 | -1 | 0>(answer.userVote ?? 0);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editContent, setEditContent] = useState(answer.content);
    const [editCode, setEditCode] = useState(answer.codeBlock || '');
    const [editLang, setEditLang] = useState(answer.language || '');

    const isOwner = user?.id === answer.authorId;
    const canVote = !!user && !isOwner;

    useEffect(() => {
        setVoteScore(answer.voteScore);
        setUserVote(answer.userVote ?? 0);
        setEditContent(answer.content);
        setEditCode(answer.codeBlock || '');
        setEditLang(answer.language || '');
    }, [answer]);

    const upvoteClassName = useMemo(() => {
        const active = userVote === 1 ? styles.voteBtnActiveUp : '';
        const disabled = isVoting ? styles.voteBtnDisabled : '';
        return `${styles.voteBtn} ${active} ${disabled}`.trim();
    }, [userVote, isVoting]);

    const downvoteClassName = useMemo(() => {
        const active = userVote === -1 ? styles.voteBtnActiveDown : '';
        const disabled = isVoting ? styles.voteBtnDisabled : '';
        return `${styles.voteBtn} ${active} ${disabled}`.trim();
    }, [userVote, isVoting]);

    const handleVote = async (value: 1 | -1) => {
        if (isVoting) return;

        if (!user) {
            alert('You must be signed in to vote on answers.');
            return;
        }

        if (isOwner) {
            alert('You cannot vote on your own answer.');
            return;
        }

        const previousUserVote = userVote;
        const previousVoteScore = voteScore;
        const optimisticState = nextVoteState(previousUserVote, previousVoteScore, value);

        setUserVote(optimisticState.userVote);
        setVoteScore(optimisticState.voteScore);
        setIsVoting(true);

        try {
            const result = await questionsService.voteAnswer(questionId, answer.id, value);

            if (typeof result?.voteScore === 'number') {
                setVoteScore(result.voteScore);
            }
            if (result?.userVote === 1 || result?.userVote === -1 || result?.userVote === 0) {
                setUserVote(result.userVote);
            }

            void onUpdate();
        } catch (err: any) {
            setUserVote(previousUserVote);
            setVoteScore(previousVoteScore);
            alert(err.message || 'Error while voting on this answer.');
        } finally {
            setIsVoting(false);
        }
    };

    const handleAccept = async () => {
        const actionLabel = answer.isAccepted ? 'remove acceptance from this answer' : 'mark this as the accepted answer';
        if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;

        try {
            const response = await questionsService.acceptAnswer(questionId, answer.id);
            if (response.notification?.status === 'failed') {
                alert(response.notification.details || 'Answer was updated, but the notification could not be sent.');
            }
            void onUpdate();
        } catch (err: any) {
            alert(err.message || 'Error changing accepted answer state.');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this answer?')) return;

        setIsDeleting(true);
        try {
            await questionsService.deleteAnswer(questionId, answer.id);
            void onUpdate();
        } catch (err: any) {
            alert(err.message || 'Could not delete this answer.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await questionsService.updateAnswer(questionId, answer.id, {
                content: editContent,
                codeBlock: editCode || null,
                language: editCode ? editLang || 'text' : null,
            });
            setIsEditing(false);
            onUpdate();
        } catch (err: any) {
            alert(err.message || 'Error updating answer');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const acceptButtonLabel = answer.isAccepted ? 'Unaccept Solution' : 'Accept Solution';

    return (
        <div className={`${styles.card} ${answer.isAccepted ? styles.isAccepted : ''}`}>
            <div className={styles.voteColumn}>
                <button
                    className={upvoteClassName}
                    type="button"
                    onClick={() => handleVote(1)}
                    disabled={isVoting}
                    title={canVote ? 'Vote up' : user ? 'You cannot vote on your own answer' : 'Sign in to vote'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={18} height={18}>
                        <path d="M18 15l-6-6-6 6" />
                    </svg>
                </button>
                <span className={styles.voteCount}>{voteScore}</span>
                <button
                    className={downvoteClassName}
                    type="button"
                    onClick={() => handleVote(-1)}
                    disabled={isVoting}
                    title={canVote ? 'Vote down' : user ? 'You cannot vote on your own answer' : 'Sign in to vote'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={18} height={18}>
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>

                {answer.isAccepted && (
                    <div className={styles.acceptedBadge} title="Author accepted this solution">
                        <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24}>
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                    </div>
                )}
            </div>

            <div className={styles.contentColumn}>
                {isEditing ? (
                    <form className={styles.editForm} onSubmit={handleEditUpdate}>
                        <textarea
                            className={styles.editTextarea}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            required
                            placeholder="Clarify your answer..."
                        />
                        <div className={styles.editRow}>
                            <textarea
                                className={`${styles.editTextarea} ${styles.codeArea}`}
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                placeholder="Edit code block (optional)..."
                            />
                            <input
                                className={styles.editInput}
                                value={editLang}
                                onChange={(e) => setEditLang(e.target.value)}
                                placeholder="Language"
                                required={editCode.length > 0}
                            />
                        </div>
                        <div className={styles.editActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className={styles.content}>{answer.content}</div>
                )}

                {answer.codeBlock && (
                    <div className={styles.codeWrapper}>
                        <div className={styles.codeHeader}>
                            <span>{answer.language || 'code'}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
                            </div>
                        </div>
                        <div className={styles.code}>
                            <pre><code>{answer.codeBlock}</code></pre>
                        </div>
                    </div>
                )}

                <div className={styles.footer}>
                    <Link href={`/profile/${answer.authorId}`} className={styles.authorInfoLink}>
                        <div className={styles.authorInfo}>
                            <div className={styles.avatar}>
                                {answer.author?.avatarUrl ? (
                                    <img src={answer.author.avatarUrl} alt={answer.author.username} />
                                ) : (
                                    <span>{answer.author?.username?.[0].toUpperCase() || 'U'}</span>
                                )}
                            </div>
                            <div className={styles.authorMeta}>
                                <span className={styles.authorName}>{answer.author?.username || 'Anonymous'}</span>
                                <span className={styles.date}>answered {formatDate(answer.createdAt)}</span>
                            </div>
                        </div>
                    </Link>

                    <div className={styles.actions}>
                        {isOwner && !isEditing && (
                            <>
                                <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                                    Edit
                                </button>
                                <button className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </>
                        )}
                        {isQuestionAuthor && (
                            <button className={styles.acceptBtn} onClick={handleAccept}>
                                {acceptButtonLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
