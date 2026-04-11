'use client';

import React, { useEffect, useState } from 'react';
import { Answer, questionsService } from '@/services/questions.service';
import { useAuth } from '@/hooks/useAuth';
import styles from './AnswerCard.module.css';

interface AnswerCardProps {
    answer: Answer;
    questionId: string;
    isQuestionAuthor: boolean;
    onUpdate: () => void;
}

export default function AnswerCard({ answer, questionId, isQuestionAuthor, onUpdate }: AnswerCardProps) {
    const { user } = useAuth();
    const [isVoting, setIsVoting] = useState(false);
    const [voteScore, setVoteScore] = useState(answer.voteScore);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editContent, setEditContent] = useState(answer.content);
    const [editCode, setEditCode] = useState(answer.codeBlock || '');
    const [editLang, setEditLang] = useState(answer.language || '');

    const isOwner = user?.id === answer.authorId;

    useEffect(() => {
        setVoteScore(answer.voteScore);
    }, [answer.voteScore, answer.id]);

    const handleVote = async (value: 1 | -1) => {
        if (isVoting) return;
        setIsVoting(true);
        try {
            const result = await questionsService.voteAnswer(questionId, answer.id, value);
            if (typeof result?.voteScore === 'number') {
                setVoteScore(result.voteScore);
            }
            void onUpdate();
        } catch (err: any) {
            alert(err.message || 'Error voting');
        } finally {
            setIsVoting(false);
        }
    };

    const handleAccept = async () => {
        if (!confirm('Mark this as the accepted answer?')) return;
        try {
            await questionsService.acceptAnswer(questionId, answer.id);
            onUpdate();
        } catch (err: any) {
            alert(err.message || 'Error accepting answer');
        }
    };

    const handleEditUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await questionsService.updateAnswer(questionId, answer.id, {
                content: editContent,
                codeBlock: editCode || null,
                language: editCode ? (editLang || 'text') : null
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

    return (
        <div className={`${styles.card} ${answer.isAccepted ? styles.isAccepted : ''}`}>
            <div className={styles.voteColumn}>
                <button
                    className={styles.voteBtn}
                    type="button"
                    onClick={() => handleVote(1)}
                    disabled={isVoting}
                    title="Correct answer"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={18} height={18}>
                        <path d="M18 15l-6-6-6 6" />
                    </svg>
                </button>
                <span className={styles.voteCount}>{voteScore}</span>
                <button
                    className={styles.voteBtn}
                    type="button"
                    onClick={() => handleVote(-1)}
                    disabled={isVoting}
                    title="Incorrect or unhelpful"
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
                            onChange={e => setEditContent(e.target.value)}
                            required
                            placeholder="Clarify your answer..."
                        />
                        <div className={styles.editRow}>
                            <textarea
                                className={`${styles.editTextarea} ${styles.codeArea}`}
                                value={editCode}
                                onChange={e => setEditCode(e.target.value)}
                                placeholder="Edit code block (optional)..."
                            />
                            <input
                                className={styles.editInput}
                                value={editLang}
                                onChange={e => setEditLang(e.target.value)}
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

                    <div className={styles.actions}>
                        {isOwner && !isEditing && (
                            <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                                Edit
                            </button>
                        )}
                        {isQuestionAuthor && !answer.isAccepted && (
                            <button className={styles.acceptBtn} onClick={handleAccept}>
                                Accept Solution
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
