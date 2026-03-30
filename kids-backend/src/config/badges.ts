export interface Badge {
    id: string;
    label: string;
    emoji: string;
    desc: string;
    color: string;
    condition: (activity: any, currentBadges?: string[]) => boolean;
}

export const ALL_BADGES: Badge[] = [
    { 
        id: '🌟 Star Learner', 
        label: 'Star Learner', 
        emoji: '🌟', 
        desc: 'Đạt 500 điểm trở lên', 
        color: 'from-yellow-400 to-orange-400',
        condition: (data) => data.points >= 500
    },
    { 
        id: '🎮 Game Master', 
        label: 'Game Master', 
        emoji: '🎮', 
        desc: 'Tổng trò chơi đã chơi đạt 10 lần', 
        color: 'from-purple-400 to-indigo-500',
        condition: (data) => data.totalGames >= 10
    },
    { 
        id: '📚 Bookworm', 
        label: 'Bookworm', 
        emoji: '📚', 
        desc: 'Tổng video đã xem đạt 10 lần', 
        color: 'from-blue-400 to-cyan-400',
        condition: (data) => (data.videos_watched_count ?? 0) >= 10
    }, 

    { 
        id: '🏆 Top Scorer', 
        label: 'Top Scorer', 
        emoji: '🏆', 
        desc: 'Đạt điểm trên 100', 
        color: 'from-amber-400 to-yellow-500',
        condition: (data) => data.score >= 100
    },
    { 
        id: '🔥 Color Streak Master', 
        label: 'Color Streak Master', 
        emoji: '🔥', 
        desc: '8 chuỗi thắng liên tiếp trong Color Match!', 
        color: 'from-orange-500 to-red-600',
        condition: (data) => data.game_type === 'color-match' && data.streak >= 8
    },
    { 
        id: '🧩 Puzzle Pro', 
        label: 'Puzzle Pro', 
        emoji: '🧩', 
        desc: 'Hoàn thành Puzzle mức độ Trung bình!', 
        color: 'from-blue-500 to-indigo-600',
        condition: (data) => data.game_type === 'puzzle' && (data.level === 'medium' || data.level === 'hard')
    },
    { 
        id: '🧠 Puzzle Zen Master', 
        label: 'Puzzle Zen Master', 
        emoji: '🧠', 
        desc: 'Hoàn thành Puzzle mức độ Khó!', 
        color: 'from-purple-600 to-pink-600',
        condition: (data) => data.game_type === 'puzzle' && data.level === 'hard'
    },
    {
        id: '🌈 Rainbow Achiever',
        label: 'Rainbow Achiever',
        emoji: '🌈',
        desc: 'Đạt được tất cả huy hiệu khác!',
        color: 'from-red-400 via-yellow-400 to-blue-400',
        condition: (data, currentBadges: string[] = []) => {
            const otherBadgeIds = ALL_BADGES
                .filter(b => b.id !== '🌈 Rainbow Achiever')
                .map(b => b.id);
            return otherBadgeIds.every(id => currentBadges.includes(id));
        }
    },
];
