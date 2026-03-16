export interface Badge {
    id: string;
    label: string;
    emoji: string;
    desc: string;
    color: string;
    condition: (activity: any) => boolean;
}

export const ALL_BADGES: Badge[] = [
    { 
        id: '🌟 Star Learner', 
        label: 'Star Learner', 
        emoji: '🌟', 
        desc: 'Học giỏi xuất sắc!', 
        color: 'from-yellow-400 to-orange-400',
        condition: (data) => data.points >= 500
    },
    { 
        id: '🎮 Game Master', 
        label: 'Game Master', 
        emoji: '🎮', 
        desc: 'Bậc thầy trò chơi!', 
        color: 'from-purple-400 to-indigo-500',
        condition: (data) => data.totalGames >= 25
    },
    { 
        id: '📚 Bookworm', 
        label: 'Bookworm', 
        emoji: '📚', 
        desc: 'Yêu thích đọc sách!', 
        color: 'from-blue-400 to-cyan-400',
        condition: () => false // Placeholder
    },
    { 
        id: '🎨 Creative Kid', 
        label: 'Creative Kid', 
        emoji: '🎨', 
        desc: 'Bé sáng tạo tuyệt vời!', 
        color: 'from-pink-400 to-fuchsia-500',
        condition: () => false // Placeholder
    },
    { 
        id: '🏆 Top Scorer', 
        label: 'Top Scorer', 
        emoji: '🏆', 
        desc: 'Người ghi điểm cao nhất!', 
        color: 'from-amber-400 to-yellow-500',
        condition: (data) => data.score >= 100
    },
    { 
        id: '🔥 Color Streak Master', 
        label: 'Color Streak Master', 
        emoji: '🔥', 
        desc: '10 chuỗi thắng liên tiếp trong Color Match!', 
        color: 'from-orange-500 to-red-600',
        condition: (data) => data.game_type === 'color-match' && data.streak >= 10
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
    }
];
