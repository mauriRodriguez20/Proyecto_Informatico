'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MarkdownContent.module.css';

type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'python'
  | 'java'
  | 'markup'
  | 'css'
  | 'sql';

interface MarkdownContentProps {
  content: string;
  className?: string;
  compact?: boolean;
  forceCodeBlock?: boolean;
  languageHint?: string;
}

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  js: 'javascript',
  javascript: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  python: 'python',
  java: 'java',
  html: 'markup',
  xml: 'markup',
  markup: 'markup',
  css: 'css',
  sql: 'sql',
};

function detectLanguageFromCode(code: string): SupportedLanguage {
  const source = code.toLowerCase();

  if (/^\s*<(!doctype\s+html|html[\s>])/m.test(source) || source.includes('</')) {
    return 'markup';
  }
  if (/select\s+.+\s+from\s+/m.test(source) || /insert\s+into\s+/m.test(source)) {
    return 'sql';
  }
  if (/^\s*(def\s+\w+\(|import\s+\w+|from\s+\w+\s+import\s+)/m.test(source)) {
    return 'python';
  }
  if (/^\s*(public\s+class\s+\w+|system\.out\.println|private\s+\w+)/m.test(source)) {
    return 'java';
  }
  if (/^\s*(interface\s+\w+|type\s+\w+\s*=|enum\s+\w+)/m.test(source)) {
    return 'typescript';
  }
  if (/^\s*\.?[\w-]+\s*\{[^}]*\}/m.test(source) || source.includes('@media')) {
    return 'css';
  }
  if (/from\s+["'][^"']+["']/m.test(source) || /const\s+\w+\s*:\s*\w+/m.test(source)) {
    return 'typescript';
  }

  return 'javascript';
}

function resolveLanguage(languageHint: string | null, code: string): SupportedLanguage {
  if (languageHint) {
    const normalized = languageHint.toLowerCase().trim();
    const mapped = LANGUAGE_ALIASES[normalized];
    if (mapped) return mapped;
  }

  return detectLanguageFromCode(code);
}

function hasFencedCode(text: string): boolean {
  return /```[\s\S]*?```/m.test(text);
}

function getLanguageLabel(language: SupportedLanguage): string {
  switch (language) {
    case 'javascript':
      return 'javascript';
    case 'typescript':
      return 'typescript';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'python':
      return 'python';
    case 'java':
      return 'java';
    case 'markup':
      return 'html';
    case 'css':
      return 'css';
    case 'sql':
      return 'sql';
    default:
      return 'code';
  }
}

function CodeBlock({ code, language }: { code: string; language: SupportedLanguage }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}>{getLanguageLabel(language)}</span>
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'transparent',
          padding: '0 14px 14px',
          fontSize: '0.9rem',
          lineHeight: 1.55,
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MarkdownContent({
  content,
  className,
  compact = false,
  forceCodeBlock = false,
  languageHint,
}: MarkdownContentProps) {
  const renderedContent = useMemo(() => content ?? '', [content]);
  const containerClassName = `${styles.markdown}${compact ? ` ${styles.compact}` : ''}${className ? ` ${className}` : ''}`;

  if (forceCodeBlock && renderedContent.trim() && !hasFencedCode(renderedContent)) {
    const language = resolveLanguage(languageHint ?? null, renderedContent);
    return (
      <div className={containerClassName}>
        <CodeBlock code={renderedContent} language={language} />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(codeProps: any) {
            const { inline, className: codeClassName, children } = codeProps;
            const code = String(children).replace(/\n$/, '');

            if (inline) {
              return <code className={styles.inlineCode}>{code}</code>;
            }

            const match = /language-([\w-]+)/.exec(codeClassName || '');
            const language = resolveLanguage(match?.[1] ?? null, code);

            return <CodeBlock code={code} language={language} />;
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            );
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}
