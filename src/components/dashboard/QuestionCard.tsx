'use client';

import React from 'react';
import Link from 'next/link';
import { Question } from '@/services/questions.service';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
    question: Question;
}

export default function QuestionCard({ question }: QuestionCardProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const author = question.author;
    const date = formatDate(question.createdAt);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div className={styles.authorInfo}>
                    <div className={styles.avatar}>
                        {author?.avatarUrl ? (
                            <img src={author.avatarUrl} alt={author.username} />
                        ) : (
                            <span>{(author?.username || 'U')[0].toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <div className={styles.authorNameRow}>
                            <h4 className={styles.authorName}>{author?.username || `User ${question.authorId.slice(0, 5)}`}</h4>
                            <span className={styles.authorAvgRating}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width={10} height={10}>
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                {typeof author?.avgRating === 'number' ? author.avgRating.toFixed(1) : '—'}
                            </span>
                        </div>
                        <span className={styles.meta}>{author?.role || 'Developer'} • {date}</span>
                    </div>
                </div>

                <div className={styles.tags}>
                    <span className={`${styles.area} ${question.area === 'FRONTEND' ? styles.frontend : styles.backend}`}>
                        {question.area}
                    </span>
                </div>
            </header>

            <Link href={`/dashboard/questions/${question.id}`} className={styles.content}>
                <h3 className={styles.title}>{question.title}</h3>
                <p className={styles.description}>{question.description}</p>
            </Link>

            <footer className={styles.footer}>
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {question.answerCount || 0} answers
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    {question.acceptedAnswerId && (
                        <div className={styles.accepted}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={14} height={14}>
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Solved</span>
                        </div>
                    )}
                    <Link href={`/dashboard/questions/${question.id}#answer-form`} className={styles.replyBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                            <path d="M15 10l5 5-5 5" />
                            <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                        </svg>
                        Reply
                    </Link>
                </div>
            </footer>
        </article>
    );
}
