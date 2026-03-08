import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: "Developer's Portal — Auth Reimagined",
    description:
        'A modern, animated authentication interface built with Next.js and TypeScript. Clean architecture, fluid animations, and senior-quality code.',
    keywords: ['authentication', 'next.js', 'typescript', 'developer'],
    authors: [{ name: 'Developer' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
