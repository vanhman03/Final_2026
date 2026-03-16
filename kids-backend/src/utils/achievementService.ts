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
            // 1. Fetch current profile (badges + points + videos_watched_count)
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('badges, points, videos_watched_count')
                .eq('user_id', userId)
                .single();

            if (fetchError || !profile) {
                console.error('AchievementService: Failed to fetch profile', fetchError);
                return [];
            }

            // 2. Fetch total games played so cumulative badges can be evaluated
            const { count: totalGames, error: countError } = await supabase
                .from('game_activities')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (countError) {
                console.error('AchievementService: Failed to count game activities', countError);
            }

            const currentBadges = Array.isArray(profile.badges) ? profile.badges : [];

            // Merge activity data with live profile stats so every badge condition
            // has access to both per-game values and cumulative totals.
            const mergedData = {
                ...activityData,
                points: profile.points,
                totalGames: totalGames ?? 0,
                videos_watched_count: profile.videos_watched_count ?? 0,
            };

            // 3. Filter badges the user doesn't have yet but now qualifies for
            const newBadges = ALL_BADGES.filter(badge => {
                const alreadyHas = currentBadges.includes(badge.id);
                if (alreadyHas) return false;

                try {
                    return badge.condition(mergedData, currentBadges);
                } catch (e) {
                    console.error(`AchievementService: Error checking condition for badge ${badge.id}`, e);
                    return false;
                }
            });

            if (newBadges.length === 0) return [];

            // 4. Persist newly earned badges
            const newBadgeIds = newBadges.map(b => b.id);
            const updatedBadges = [...currentBadges, ...newBadgeIds];

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    badges: updatedBadges,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) {
                console.error('AchievementService: Failed to update profile badges', updateError);
                return [];
            }

            return newBadges;
        } catch (error) {
            console.error('AchievementService: Unexpected error', error);
            return [];
        }
    }
};
