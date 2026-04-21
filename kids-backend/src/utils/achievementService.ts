import { supabase } from '../config/supabase';
import { ALL_BADGES } from '../config/badges';

export interface ActivityData {
    game_type?: string;
    level?: string;
    score?: number;
    streak?: number;
    points?: number;
    totalGames?: number;
}

export const achievementService = {
    /**
     * Checks if a user has earned any new badges based on their activity data.
     * Fetches all cumulative stats (total games played, current points) from the
     * database so that badges like 🎮 Game Master and 🌟 Star Learner can be
     * evaluated correctly regardless of the current activity payload.
     *
     * @param userId The ID of the user (profile user_id)
     * @param activityData The data from the recent activity
     * @returns List of newly earned badges
     */
    checkAchievements: async (userId: string, activityData: ActivityData) => {
        try {
            // 1. Fetch current profile (points + videos)
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('badges, points, videos_watched_count')
                .eq('user_id', userId)
                .single();

            if (fetchError || !profile) {
                console.error('AchievementService: Failed to fetch profile', fetchError);
                return [];
            }

            // 2. Fetch enriched historical stats
            // Get total games
            const { count: totalGames } = await supabase
                .from('game_activities')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Get completed unique levels
            const { data: completedLevels } = await supabase
                .from('game_activities')
                .select('game_type, level')
                .eq('user_id', userId);

            // Get max score ever
            const { data: maxScoreData } = await supabase
                .from('game_activities')
                .select('score')
                .eq('user_id', userId)
                .order('score', { ascending: false })
                .limit(1);
            
            // Get max streak in color-match
            const { data: maxStreakData } = await supabase
                .from('game_activities')
                .select('streak')
                .eq('user_id', userId)
                .eq('game_type', 'color-match')
                .order('streak', { ascending: false })
                .limit(1);

            const mergedData = {
                ...activityData,
                points: profile.points,
                totalGames: totalGames ?? 0,
                videos_watched_count: profile.videos_watched_count ?? 0,
                completedLevels: completedLevels || [],
                maxScore: maxScoreData?.[0]?.score || 0,
                maxStreakColorMatch: maxStreakData?.[0]?.streak || 0
            };

            // 3. Re-evaluate ALL badges to see which ones are currently earned
            const earnedBadgeIds: string[] = [];
            
            // First pass: Evaluate all regular badges
            ALL_BADGES.filter(b => b.id !== '🌈 Rainbow Achiever').forEach(badge => {
                try {
                    if (badge.condition(mergedData)) {
                        earnedBadgeIds.push(badge.id);
                    }
                } catch (e) {
                    console.error(`AchievementService: Error checking badge ${badge.id}`, e);
                }
            });

            // Second pass: Evaluate Rainbow Achiever (which depends on other badges)
            const rainbowBadge = ALL_BADGES.find(b => b.id === '🌈 Rainbow Achiever');
            if (rainbowBadge) {
                try {
                    if (rainbowBadge.condition(mergedData, earnedBadgeIds)) {
                        earnedBadgeIds.push(rainbowBadge.id);
                    }
                } catch (e) {
                    console.error(`AchievementService: Error checking Rainbow Achiever`, e);
                }
            }

            // 4. Compare with current badges to find NEW ones and detect changes
            const currentBadges = Array.isArray(profile.badges) ? profile.badges : [];
            
            // Determine if the badges list has actually changed
            const earnedSet = new Set(earnedBadgeIds);
            const currentSet = new Set(currentBadges);
            const isChanged = earnedBadgeIds.length !== currentBadges.length || 
                              earnedBadgeIds.some(id => !currentSet.has(id));

            if (!isChanged) return [];

            // 5. Update database with the CURRENT accurate list
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    badges: earnedBadgeIds,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) {
                console.error('AchievementService: Failed to update profile badges', updateError);
                return [];
            }

            // Return only the NEWLY earned badges for the UI notification
            const newBadgeIds = earnedBadgeIds.filter(id => !currentSet.has(id));
            return ALL_BADGES.filter(b => newBadgeIds.includes(b.id));
        } catch (error) {
            console.error('AchievementService: Unexpected error', error);
            return [];
        }
    }
};
