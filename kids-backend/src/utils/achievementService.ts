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
     * @param userId The ID of the user (profile user_id)
     * @param activityData The data from the recent activity
     * @returns List of newly earned badges
     */
    checkAchievements: async (userId: string, activityData: ActivityData) => {
        try {
            // 1. Fetch current profile
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('badges, points')
                .eq('user_id', userId)
                .single();

            if (fetchError || !profile) {
                console.error('AchievementService: Failed to fetch profile', fetchError);
                return [];
            }

            const currentBadges = Array.isArray(profile.badges) ? profile.badges : [];
            const mergedData = { ...activityData, points: profile.points };

            // 2. Filter badges that the user doesn't have yet but qualifies for
            const newBadges = ALL_BADGES.filter(badge => {
                const alreadyHas = currentBadges.includes(badge.id);
                if (alreadyHas) return false;
                
                try {
                    return badge.condition(mergedData);
                } catch (e) {
                    console.error(`AchievementService: Error checking condition for badge ${badge.id}`, e);
                    return false;
                }
            });

            if (newBadges.length === 0) return [];

            // 3. Update profile with new badges
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
