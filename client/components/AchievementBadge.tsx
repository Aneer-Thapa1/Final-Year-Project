import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
    Trophy,
    Clock,
    CheckCircle,
    Calendar,
    Star,
    Layers,
    Shield,
    Users,
    Heart,
    Brain,
    Coffee,
    BookOpen,
    Award,
    Target,
    Flame,
    Zap,
    Medal,
    Compass,
    LineChart,
    BookMarked,
    Music,
    Dumbbell,
    Lightbulb,
    TreePine,
    Mountain,
    Sparkles
} from 'lucide-react-native';

const AchievementBadge = ({ achievement, unlocked = false, size = 'medium' }) => {
    // Map achievement types to their icons and colors with more variety
    const getIconAndColor = () => {
        // Define mappings for achievement criteria types
        const typeMap = {
            'STREAK_LENGTH': { icon: Flame, color: '#3B82F6', bgPattern: 'gradient' },
            'TOTAL_COMPLETIONS': { icon: CheckCircle, color: '#10B981', bgPattern: 'solid' },
            'CONSECUTIVE_DAYS': { icon: Calendar, color: '#8B5CF6', bgPattern: 'dotted' },
            'PERFECT_WEEK': { icon: Star, color: '#F59E0B', bgPattern: 'gradient' },
            'PERFECT_MONTH': { icon: Trophy, color: '#EC4899', bgPattern: 'gradient' },
            'HABIT_DIVERSITY': { icon: Layers, color: '#6366F1', bgPattern: 'solid' },
            'DOMAIN_MASTERY': { icon: Shield, color: '#EF4444', bgPattern: 'shine' },
            'SOCIAL_ENGAGEMENT': { icon: Users, color: '#0EA5E9', bgPattern: 'dotted' }
        };

        // Enhanced mappings for specific achievements with unique icons and colors
        const nameMap = {
            // Milestone achievements with distinct visuals
            'First Steps': { icon: Compass, color: '#059669', bgPattern: 'solid' },
            'Habit Century': { icon: Medal, color: '#8B5CF6', bgPattern: 'shine' },
            'Habit Marathon': { icon: Mountain, color: '#7C3AED', bgPattern: 'gradient' },

            // Streak achievements with a consistent "flame" theme but different colors
            'Consistency is Key': { icon: Flame, color: '#3B82F6', bgPattern: 'gradient' },
            'Two-Week Triumph': { icon: Flame, color: '#4F46E5', bgPattern: 'gradient' },
            'Month Master': { icon: Flame, color: '#7C3AED', bgPattern: 'shine' },
            'Quarterly Champion': { icon: Flame, color: '#9333EA', bgPattern: 'shine' },
            'Half-Year Hero': { icon: Trophy, color: '#C026D3', bgPattern: 'shine' },
            'Year of Discipline': { icon: Trophy, color: '#DB2777', bgPattern: 'shine' },

            // Perfect period achievements
            'Perfect Week': { icon: Sparkles, color: '#F59E0B', bgPattern: 'shine' },
            'Perfect Month': { icon: Sparkles, color: '#D97706', bgPattern: 'shine' },

            // Consistency achievements
            'Daily Dedication': { icon: Zap, color: '#6366F1', bgPattern: 'dotted' },
            'Monthly Momentum': { icon: Zap, color: '#4F46E5', bgPattern: 'dotted' },

            // Diversity achievements
            'Habit Collector': { icon: Layers, color: '#06B6D4', bgPattern: 'solid' },
            'Life Balancer': { icon: Lightbulb, color: '#0EA5E9', bgPattern: 'solid' },

            // Domain-specific achievements
            'Health Enthusiast': { icon: Heart, color: '#EF4444', bgPattern: 'solid' },
            'Fitness Fanatic': { icon: Dumbbell, color: '#F97316', bgPattern: 'solid' },
            'Knowledge Seeker': { icon: BookMarked, color: '#3B82F6', bgPattern: 'solid' },
            'Mindfulness Guru': { icon: Brain, color: '#8B5CF6', bgPattern: 'solid' },

            // Social achievements
            'Social Starter': { icon: Users, color: '#0EA5E9', bgPattern: 'dotted' },
            'Social Butterfly': { icon: Users, color: '#0284C7', bgPattern: 'dotted' },
            'Content Creator': { icon: BookOpen, color: '#F59E0B', bgPattern: 'solid' },
            'Community Influencer': { icon: LineChart, color: '#0EA5E9', bgPattern: 'dotted' }
        };

        // First check for name-based mapping
        if (achievement.name && nameMap[achievement.name]) {
            return nameMap[achievement.name];
        }

        // Then check for type-based mapping
        if (achievement.criteria_type && typeMap[achievement.criteria_type]) {
            return typeMap[achievement.criteria_type];
        }

        // Default fallback
        return { icon: Award, color: '#6366F1', bgPattern: 'solid' };
    };

    const { icon: IconComponent, color, bgPattern } = getIconAndColor();
    const badgeColor = unlocked ? color : '#9CA3AF'; // Gray for locked

    // Size adjustments
    const getBadgeSize = () => {
        switch(size) {
            case 'small': return { outer: 40, inner: 16 };
            case 'large': return { outer: 80, inner: 32 };
            default: return { outer: 60, inner: 24 }; // medium
        }
    };

    const { outer, inner } = getBadgeSize();

    // Add visual distinction based on achievement tier/level
    const getBorderStyle = () => {
        if (!unlocked) return {
            borderWidth: 2,
            borderColor: '#E5E7EB'
        };

        switch (bgPattern) {
            case 'shine':
                return {
                    borderWidth: 3,
                    borderColor: badgeColor,
                    shadowColor: badgeColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 5,
                    elevation: 5,
                };
            case 'gradient':
                return {
                    borderWidth: 3,
                    borderColor: badgeColor,
                };
            case 'dotted':
                return {
                    borderWidth: 2,
                    borderColor: badgeColor,
                    borderStyle: 'dashed',
                };
            case 'solid':
            default:
                return {
                    borderWidth: 2,
                    borderColor: badgeColor,
                };
        }
    };

    // Determine the background opacity based on pattern
    const getBackgroundOpacity = () => {
        if (!unlocked) return '#F3F4F6';

        switch (bgPattern) {
            case 'shine': return `${badgeColor}30`; // 30% opacity
            case 'gradient': return `${badgeColor}20`; // 20% opacity
            case 'dotted': return `${badgeColor}15`; // 15% opacity
            case 'solid':
            default: return `${badgeColor}10`; // 10% opacity
        }
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.badge,
                {
                    backgroundColor: getBackgroundOpacity(),
                    width: outer,
                    height: outer,
                    borderRadius: outer / 2,
                    ...getBorderStyle()
                }
            ]}>
                <IconComponent size={inner} color={badgeColor} />
            </View>
            <Text style={[
                styles.name,
                !unlocked && styles.lockedText,
                size === 'small' && { fontSize: 10 },
                size === 'large' && { fontSize: 14 }
            ]}>
                {achievement.name}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        margin: 8,
        maxWidth: 100,
    },
    badge: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    name: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center'
    },
    lockedText: {
        color: '#9CA3AF'
    }
});

export default AchievementBadge;