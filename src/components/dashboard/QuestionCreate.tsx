'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { questionsService } from '@/services/questions.service';
import { technologyService } from '@/services/technology.service';
import { Technology } from '@/types/user.types';
import styles from './QuestionCreate.module.css';

interface QuestionCreateProps {
    onSuccess: () => void;
}

const FALLBACK_TECHNOLOGIES: Technology[] = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'React' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Next.js' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'TypeScript' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'JavaScript' },
    { id: '55555555-5555-5555-5555-555555555555', name: 'Node.js' },
];

export default function QuestionCreate({ onSuccess }: QuestionCreateProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [technologies, setTechnologies] = useState<Technology[]>(FALLBACK_TECHNOLOGIES);
    const [selectedTechId, setSelectedTechId] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        area: 'BACKEND' as 'BACKEND' | 'FRONTEND',
        description: '',
        codeBlock: '',
        language: '',
    });

    const [error, setError] = useState<string | null>(null);
    const [usingFallbacks, setUsingFallbacks] = useState(false);

    useEffect(() => {
        technologyService.list()
            .then(fetchedTechs => {
                if (fetchedTechs && fetchedTechs.length > 0) {
                    setTechnologies(fetchedTechs);
                    setUsingFallbacks(false);
                }
            })
            .catch(() => {
                console.warn('Using fallback technologies');
                setUsingFallbacks(true);
            });
    }, []);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const payload = {
                ...formData,
                technologyIds: selectedTechId ? [selectedTechId] : [],
                language: formData.codeBlock.trim() ? formData.language : undefined,
                codeBlock: formData.codeBlock.trim() || undefined
            };

            await questionsService.createQuestion(payload);
            setFormData({ title: '', area: 'BACKEND', description: '', codeBlock: '', language: '' });
            setSelectedTechId('');
            setIsExpanded(false);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Error creating question');
        } finally {
            setIsLoading(false);
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
                        Have a problem, {user.username}? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Ask the community</span>
                    </div>
                ) : (
                    <div className={styles.expandedHeader}>
                        <h3>Ask a New Question</h3>
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
                        placeholder="What's your question? Be specific."
                        className={styles.titleInput}
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        minLength={15}
                        maxLength={150}
                    />

                    <textarea
                        placeholder="Explain your problem and what you've tried..."
                        className={styles.contentTextarea}
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        required
                    />

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>Dev Area</label>
                            <div className={styles.segments}>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${formData.area === 'FRONTEND' ? styles.active : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, area: 'FRONTEND' }))}
                                >
                                    Frontend
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${formData.area === 'BACKEND' ? styles.active : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, area: 'BACKEND' }))}
                                >
                                    Backend
                                </button>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label>Technology</label>
                            <select
                                className={styles.techInput}
                                value={selectedTechId}
                                onChange={(e) => setSelectedTechId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select a technology...</option>
                                {technologies.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                            {usingFallbacks && <span className={styles.warning}>⚠️ Cannot load real technologies from MS-01</span>}
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>Language</label>
                            <input
                                className={styles.techInput}
                                placeholder="e.g. typescript"
                                value={formData.language}
                                onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
                                required={formData.codeBlock.length > 0}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Code Block (Optional)</label>
                        <textarea
                            className={styles.contentTextarea}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                            placeholder="Paste your code here..."
                            value={formData.codeBlock}
                            onChange={e => setFormData(prev => ({ ...prev, codeBlock: e.target.value }))}
                        />
                    </div>

                    {error && <div className={styles.errorBox}>{error}</div>}

                    <div className={styles.footer}>
                        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                            {isLoading ? 'Posting...' : 'Post Question'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
