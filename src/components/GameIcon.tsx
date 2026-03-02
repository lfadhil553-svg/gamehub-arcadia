'use client';

interface GameIconProps {
    icon: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
};

export default function GameIcon({ icon, name, size = 'md', className = '' }: GameIconProps) {
    const isUrl = icon && (icon.startsWith('http') || icon.startsWith('/'));
    const sizeClass = sizeMap[size];

    if (isUrl) {
        return (
            <div className={`${sizeClass} rounded-lg overflow-hidden bg-surface-light flex items-center justify-center shrink-0 ${className}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={icon}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback to first letter of game name  
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                            parent.innerHTML = `<span class="text-lg font-bold">${name.charAt(0)}</span>`;
                        }
                    }}
                />
            </div>
        );
    }

    // Fallback for emoji icons
    return <span className={`text-2xl shrink-0 ${className}`}>{icon || '🎮'}</span>;
}
