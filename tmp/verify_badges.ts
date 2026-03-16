import { ALL_BADGES } from '../kids-backend/src/config/badges';

const mockActivityData = [
    {
        name: "Color Streak Master (Condition: streak >= 10)",
        data: { game_type: 'color-match', streak: 10 },
        expected: '🔥 Color Streak Master'
    },
    {
        name: "Puzzle Pro (Condition: level === 'medium')",
        data: { game_type: 'puzzle', level: 'medium' },
        expected: '🧩 Puzzle Pro'
    },
    {
        name: "Puzzle Zen Master (Condition: level === 'hard')",
        data: { game_type: 'puzzle', level: 'hard' },
        expected: '🧠 Puzzle Zen Master'
    },
    {
        name: "Star Learner (Condition: points >= 500)",
        data: { points: 600 },
        expected: '🌟 Star Learner'
    }
];

console.log("--- Verifying Badge Conditions ---");

mockActivityData.forEach(test => {
    const badge = ALL_BADGES.find(b => b.id === test.expected);
    if (!badge) {
        console.error(`[FAIL] Badge not found: ${test.expected}`);
        return;
    }
    
    const result = badge.condition(test.data);
    if (result) {
        console.log(`[PASS] ${test.name}`);
    } else {
        console.error(`[FAIL] ${test.name}`);
    }
});

// Test complementary conditions
console.log("\n--- Verifying Complementary Conditions ---");
const puzzlePro = ALL_BADGES.find(b => b.id === '🧩 Puzzle Pro');
if (puzzlePro?.condition({ game_type: 'puzzle', level: 'hard' })) {
    console.log("[PASS] Puzzle Pro also awarded for 'hard' level");
} else {
    console.error("[FAIL] Puzzle Pro should be awarded for 'hard' level");
}
