// ==================== GAMEHUB ARCADIA - Type Definitions ====================

// Auth Types
export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    avatar: string;
    role: 'user' | 'organizer' | 'admin';
    is_verified: boolean;
    is_banned: boolean;
    login_attempts: number;
    locked_until: string | null;
    reputation_score: number;
    arcadia_points: number;
    referral_code: string;
    onboarding_done: number;
    created_at: string;
    updated_at: string;
}

export interface UserPublic {
    id: string;
    username: string;
    avatar: string;
    role: string;
    reputation_score: number;
    arcadia_points: number;
    created_at: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

// Game Types
export interface Game {
    id: string;
    name: string;
    slug: string;
    icon: string;
    banner: string;
    description: string;
    is_active: boolean;
    created_at: string;
}

export interface Rank {
    id: string;
    game_id: string;
    name: string;
    tier: number;
    icon: string;
}

export interface GameMode {
    id: string;
    game_id: string;
    name: string;
}

export interface GameRole {
    id: string;
    game_id: string;
    name: string;
    icon: string;
}

export interface UserGame {
    id: string;
    user_id: string;
    game_id: string;
    rank_id: string;
    role_id: string | null;
    is_favorite: boolean;
    game?: Game;
    rank?: Rank;
    role?: GameRole;
}

// Party Types
export interface Party {
    id: string;
    game_id: string;
    creator_id: string;
    title: string;
    description: string;
    min_rank_tier: number;
    game_mode_id: string | null;
    max_players: number;
    current_players: number;
    status: 'open' | 'full' | 'closed';
    region: string;
    scheduled_at: string | null;
    expires_at: string;
    created_at: string;
    game?: Game;
    creator?: UserPublic;
    members?: PartyMember[];
}

export interface PartyMember {
    id: string;
    party_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    user?: UserPublic;
}

export interface ChatMessage {
    id: string;
    party_id: string;
    user_id: string;
    message: string;
    created_at: string;
    user?: UserPublic;
}

// Tournament Types
export interface Tournament {
    id: string;
    game_id: string;
    organizer_id: string;
    name: string;
    description: string;
    mode: 'solo' | 'team';
    format: 'single_elimination' | 'double_elimination';
    max_participants: number;
    current_participants: number;
    team_size: number;
    prize_pool: string;
    entry_fee: number;
    status: 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
    registration_start: string;
    registration_end: string;
    start_date: string;
    end_date: string | null;
    rules: string;
    created_at: string;
    game?: Game;
    organizer?: UserPublic;
}

export interface TournamentParticipant {
    id: string;
    tournament_id: string;
    user_id: string;
    team_id: string | null;
    seed: number | null;
    status: 'registered' | 'checked_in' | 'eliminated' | 'winner';
    registered_at: string;
    user?: UserPublic;
}

export interface Team {
    id: string;
    tournament_id: string;
    name: string;
    captain_id: string;
    created_at: string;
    members?: TournamentParticipant[];
}

export interface Match {
    id: string;
    tournament_id: string;
    round: number;
    match_number: number;
    player1_id: string | null;
    player2_id: string | null;
    winner_id: string | null;
    score1: number | null;
    score2: number | null;
    status: 'pending' | 'ongoing' | 'completed';
    scheduled_at: string | null;
    completed_at: string | null;
    player1?: UserPublic | Team;
    player2?: UserPublic | Team;
}

// Reward Types
export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    type: 'earn' | 'spend' | 'expire';
    amount: number;
    description: string;
    reference_type: string | null;
    reference_id: string | null;
    created_at: string;
}

export interface RewardItem {
    id: string;
    name: string;
    description: string;
    category: 'voucher' | 'merchandise' | 'tournament_entry' | 'gaming_cafe';
    cost: number;
    stock: number;
    image: string;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

export interface RedeemHistory {
    id: string;
    user_id: string;
    reward_id: string;
    claim_code: string;
    status: 'pending' | 'claimed' | 'expired';
    redeemed_at: string;
    expires_at: string;
    reward?: RewardItem;
}

// Leaderboard Types
export interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    avatar: string;
    score: number;
    wins: number;
    games_played: number;
}

// Rating Types
export interface UserRating {
    id: string;
    rater_id: string;
    rated_id: string;
    party_id: string;
    rating: number;
    comment: string;
    created_at: string;
}

// Analytics Types
export interface AdminStats {
    total_users: number;
    daily_active_users: number;
    total_parties: number;
    active_parties: number;
    total_tournaments: number;
    active_tournaments: number;
    total_points_circulation: number;
    new_users_today: number;
}

// API Response Type
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Navigation Types
export interface NavItem {
    label: string;
    href: string;
    icon: string;
    badge?: number;
}
