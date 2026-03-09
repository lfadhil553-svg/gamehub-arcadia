'use client';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type Language = 'id' | 'en' | 'ja' | 'zh';

const translations: Record<Language, Record<string, string>> = {
    id: {
        // Profile
        'profile.title': 'Profil',
        'profile.points': 'Points',
        'profile.reputation': 'Reputasi',
        'profile.party_joined': 'Party Joined',
        'profile.win_rate': 'Win Rate',
        'profile.my_games': '🎮 Game Saya',
        'profile.add_game': 'Tambah game →',
        'profile.no_games': 'Belum ada game.',
        'profile.stats': '📊 Statistik Detail',
        'profile.tournaments_played': 'Tournament Dimainkan',
        'profile.tournaments_won': 'Tournament Menang',
        'profile.total_ratings': 'Total Rating',
        'profile.avg_rating': 'Rating Rata-rata',
        'profile.edit_game': '🎮 Edit Game',
        'profile.logout': '🚪 Logout',
        'profile.joined': 'Bergabung',
        'profile.referral': '🔗 Referral:',
        'profile.language': '🌐 Bahasa',
        'profile.settings': '⚙️ Pengaturan',
        // Common
        'common.loading': 'Memuat...',
        'common.error': 'Gagal memuat',
    },
    en: {
        'profile.title': 'Profile',
        'profile.points': 'Points',
        'profile.reputation': 'Reputation',
        'profile.party_joined': 'Party Joined',
        'profile.win_rate': 'Win Rate',
        'profile.my_games': '🎮 My Games',
        'profile.add_game': 'Add game →',
        'profile.no_games': 'No games yet.',
        'profile.stats': '📊 Detailed Stats',
        'profile.tournaments_played': 'Tournaments Played',
        'profile.tournaments_won': 'Tournaments Won',
        'profile.total_ratings': 'Total Ratings',
        'profile.avg_rating': 'Average Rating',
        'profile.edit_game': '🎮 Edit Games',
        'profile.logout': '🚪 Logout',
        'profile.joined': 'Joined',
        'profile.referral': '🔗 Referral:',
        'profile.language': '🌐 Language',
        'profile.settings': '⚙️ Settings',
        'common.loading': 'Loading...',
        'common.error': 'Failed to load',
    },
    ja: {
        'profile.title': 'プロフィール',
        'profile.points': 'ポイント',
        'profile.reputation': '評判',
        'profile.party_joined': 'パーティー参加',
        'profile.win_rate': '勝率',
        'profile.my_games': '🎮 マイゲーム',
        'profile.add_game': 'ゲーム追加 →',
        'profile.no_games': 'ゲームはまだありません。',
        'profile.stats': '📊 詳細統計',
        'profile.tournaments_played': 'トーナメント参加',
        'profile.tournaments_won': 'トーナメント優勝',
        'profile.total_ratings': '合計レーティング',
        'profile.avg_rating': '平均評価',
        'profile.edit_game': '🎮 ゲーム編集',
        'profile.logout': '🚪 ログアウト',
        'profile.joined': '参加日',
        'profile.referral': '🔗 紹介コード:',
        'profile.language': '🌐 言語',
        'profile.settings': '⚙️ 設定',
        'common.loading': '読み込み中...',
        'common.error': '読み込みに失敗しました',
    },
    zh: {
        'profile.title': '个人资料',
        'profile.points': '积分',
        'profile.reputation': '声望',
        'profile.party_joined': '加入队伍',
        'profile.win_rate': '胜率',
        'profile.my_games': '🎮 我的游戏',
        'profile.add_game': '添加游戏 →',
        'profile.no_games': '还没有游戏。',
        'profile.stats': '📊 详细统计',
        'profile.tournaments_played': '参加锦标赛',
        'profile.tournaments_won': '赢得锦标赛',
        'profile.total_ratings': '总评分',
        'profile.avg_rating': '平均评分',
        'profile.edit_game': '🎮 编辑游戏',
        'profile.logout': '🚪 退出登录',
        'profile.joined': '加入于',
        'profile.referral': '🔗 推荐码:',
        'profile.language': '🌐 语言',
        'profile.settings': '⚙️ 设置',
        'common.loading': '加载中...',
        'common.error': '加载失败',
    },
};

export const languageNames: Record<Language, string> = {
    id: '🇮🇩 Indonesia',
    en: '🇬🇧 English',
    ja: '🇯🇵 日本語',
    zh: '🇨🇳 中文',
};

const LanguageContext = createContext<{
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}>({
    language: 'id',
    setLanguage: () => { },
    t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('id');

    useEffect(() => {
        const saved = localStorage.getItem('arcadia_language') as Language | null;
        if (saved && translations[saved]) setLanguageState(saved);
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('arcadia_language', lang);
    }, []);

    const t = useCallback((key: string) => {
        return translations[language]?.[key] || translations['id']?.[key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
