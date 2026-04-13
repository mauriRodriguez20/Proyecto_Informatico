'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { questionsService, Question, Answer } from '@/services/questions.service';
import { useAuth } from '@/hooks/useAuth';
import AnswerCard from '@/components/dashboard/AnswerCard';
import CommentsSection from '@/components/dashboard/CommentsSection';
import styles from './QuestionDetail.module.css';

export default function QuestionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [data, setData] = useState<{ question: Question & { answers: Answer[] } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answerContent, setAnswerContent] = useState('');
    const [answerCode, setAnswerCode] = useState('');
    const [answerLang, setAnswerLang] = useState('');

    const loadData = async () => {
        if (!id) return;
        try {
            const result = await questionsService.getQuestionById(id as string);
            setData(result);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const intervalId = window.setInterval(() => {
            void loadData();
        }, 12000);

        return () => window.clearInterval(intervalId);
    }, [id]);

    const handleAnswerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !answerContent.trim()) return;

        setIsSubmitting(true);
        try {
            await questionsService.answerQuestion(id as string, {
                content: answerContent,
                codeBlock: answerCode || undefined,
                language: answerCode ? (answerLang || 'text') : undefined
            });
            setAnswerContent('');
            setAnswerCode('');
            setAnswerLang('');
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Error posting answer');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <div className="spinner" />
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <h2>Question not found</h2>
                    <button onClick={() => router.push('/dashboard/questions')} className={styles.backLink}>Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    const { question } = data;
    const isOwner = user?.id === question.authorId;

    return (
        <DashboardLayout>
            <div className={styles.page}>
                <button onClick={() => router.push('/dashboard/questions')} className={styles.backLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to questions
                </button>

                <article className={styles.questionSection}>
                    <div className={styles.tagline}>
                        <span className={`${styles.area} ${question.area === 'FRONTEND' ? 'icon_cyan' : 'icon_purple'}`}
                            style={{ background: 'var(--color-surface-2)', color: 'white', padding: '2px 10px', borderRadius: '4px' }}>
                            {question.area}
                        </span>
                    </div>

                    <h1 className={styles.title}>{question.title}</h1>

                    <div className={styles.authorCard}>
                        <div className={styles.authorAvatar}>
                            {question.author?.avatarUrl ? (
                                <img
                                    src={question.author.avatarUrl}
                                    alt={question.author?.username || 'Author avatar'}
                                    className={styles.authorAvatarImg}
                                />
                            ) : (
                                <span className={styles.authorAvatarFallback}>
                                    {question.author?.username?.[0].toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className={styles.authorName}>{question.author?.username || 'Anonymous'}</span>
                            <span className={styles.authorDate}>posted on {new Date(question.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className={styles.description}>{question.description}</div>

                    {question.codeBlock && (
                        <div className={styles.codeBlock}>
                            <div className={styles.codeLang}>{question.language}</div>
                            <pre><code>{question.codeBlock}</code></pre>
                        </div>
                    )}

                    <div style={{ marginTop: 'var(--space-8)' }}>
                        <CommentsSection
                            id={question.id}
                            type="QUESTION"
                            comments={[]} // Backend doesn't return them yet, so empty list
                        />
                    </div>
                </article>

                <section>
                    <div className={styles.answersHeader}>
                        <h2 className={styles.answerCount}>{question.answers.length} Answers</h2>
                    </div>

                    <div className={styles.answerList}>
                        {question.answers.map(answer => (
                            <AnswerCard
                                key={answer.id}
                                answer={answer}
                                questionId={question.id}
                                isQuestionAuthor={isOwner}
                                onUpdate={loadData}
                            />
                        ))}
                    </div>
                </section>

                <section className={styles.answerForm}>
                    <h3 className={styles.formTitle}>Your Answer</h3>
                    <form onSubmit={handleAnswerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <textarea
                            className={styles.textarea}
                            placeholder="Write your solution here..."
                            value={answerContent}
                            onChange={e => setAnswerContent(e.target.value)}
                            required
                            style={{ minHeight: '150px' }}
                        />

                        <div className={styles.formGrid}>
                            <textarea
                                className={styles.textarea}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                                placeholder="Optional code block..."
                                value={answerCode}
                                onChange={e => setAnswerCode(e.target.value)}
                            />
                            <input
                                className={styles.input}
                                placeholder="Language (e.g. js)"
                                value={answerLang}
                                onChange={e => setAnswerLang(e.target.value)}
                                required={answerCode.length > 0}
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Posting...' : 'Post Answer'}
                        </button>
                    </form>
                </section>
            </div>
        </DashboardLayout>
    );
}
