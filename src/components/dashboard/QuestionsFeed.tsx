'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/services/questions.service';
import { questionsService } from '@/services/questions.service';
import QuestionCard from './QuestionCard';
import styles from './QuestionsFeed.module.css';

export default function QuestionsFeed() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [page, setPage] = useState(1);
    const [unanswered, setUnanswered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadQuestions = async () => {
        setIsLoading(true);
        try {
            const result = await questionsService.getQuestions(page, unanswered);
            setQuestions(result.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load questions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, [page, unanswered]);

    return (
        <section className={styles.feed}>
            <header className={styles.feedHeader}>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${!unanswered ? styles.active : ''}`}
                        onClick={() => setUnanswered(false)}
                    >
                        All Questions
                    </button>
                    <button
                        className={`${styles.filterBtn} ${unanswered ? styles.active : ''}`}
                        onClick={() => setUnanswered(true)}
                    >
                        Unanswered
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Fetching community questions...</p>
                </div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : questions.length === 0 ? (
                <div className={styles.empty}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} width={64} height={64}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <p>No questions found in this category.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {questions.map(q => (
                        <QuestionCard
                            key={q.id}
                            question={q}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
