'use client';

import { useState } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
    initialRating?: number;
    onRate: (rating: number) => Promise<void>;
    readonly?: boolean;
}

export default function StarRating({ initialRating = 0, onRate, readonly = false }: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRate = async (rating: number) => {
        if (readonly || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onRate(rating);
        } catch (err) {
            console.error('Failed to rate:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${styles.starContainer} ${readonly ? styles.readonly : ''}`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`${styles.starBtn} ${(hoverRating || initialRating) >= star ? styles.filled : ''
                        }`}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    onClick={() => handleRate(star)}
                    disabled={readonly || isSubmitting}
                    aria-label={`Rate ${star} stars`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth={2}
                        width={18}
                        height={18}
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                </button>
            ))}
            {isSubmitting && <div className={styles.miniSpinner} />}
        </div>
    );
}
