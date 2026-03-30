'use client';

interface PlayerAvatarProps {
    avatar?: string;
    username: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeMap = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-14 h-14 text-2xl',
};

export default function PlayerAvatar({ avatar, username, size = 'md', className = '' }: PlayerAvatarProps) {
    const sizeClass = sizeMap[size];

    if (avatar && avatar.startsWith('/avatars/')) {
        return (
            <div className={`${sizeClass} rounded-xl overflow-hidden shrink-0 ${className}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt={username} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold shrink-0 ${className}`}>
            {username.charAt(0).toUpperCase()}
        </div>
    );
}
