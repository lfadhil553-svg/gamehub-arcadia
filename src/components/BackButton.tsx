'use client';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
    label?: string;
    fallback?: string;
}

export default function BackButton({ label = 'Kembali', fallback }: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (fallback) {
            router.push(fallback);
        } else {
            router.back();
        }
    };

    return (
        <button onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-4 group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {label}
        </button>
    );
}
