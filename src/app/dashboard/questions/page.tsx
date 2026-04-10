'use client';

// Force recompile to clear bundler cache

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import QuestionsFeed from '@/components/dashboard/QuestionsFeed';
import QuestionCreate from '@/components/dashboard/QuestionCreate';

export default function QuestionsPage() {
    const [feedKey, setFeedKey] = useState(0);

    const handleSuccess = () => {
        setFeedKey(prev => prev + 1);
    };

    return (
        <DashboardLayout>
            <div style={{ opacity: 0, animation: 'fadeInUp 0.6s var(--ease-bounce) forwards' }}>
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
                        Questions & <span style={{ color: 'var(--color-primary)' }}>Answers</span>
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                        The hub for developers to collab, learn and resolve complex issues.
                    </p>
                </header>

                <QuestionCreate onSuccess={handleSuccess} />

                <QuestionsFeed key={feedKey} />
            </div>
        </DashboardLayout>
    );
}
