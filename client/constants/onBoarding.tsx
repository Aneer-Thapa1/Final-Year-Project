
export interface OnboardingItem {
    id: string;
    title: string;
    description: string;
    image: any;
    highlight: string;
}
export const onboardingData: OnboardingItem[] = [
    {
        id: '1',
        title: 'Track Your Progress',
        description: 'Visualize your journey with intuitive dashboards and celebrate every achievement along the way.',
        image: require('../assets/images/onboarding1.png'),
        highlight: 'Dashboard & Analytics'
    },
    {
        id: '2',
        title: 'AI-Powered Guidance',
        description: 'Get personalized habit recommendations and real-time support from our intelligent AI coach.',
        image: require('../assets/images/onboarding2.png'),
        highlight: 'Smart Recommendations'
    },
    {
        id: '3',
        title: 'Gamified Experience',
        description: 'Stay motivated with streaks, badges, and points while building lasting habits.',
        image: require('../assets/images/onboarding3.png'),
        highlight: 'Rewards & Achievements'
    },
    {
        id: '4',
        title: 'Community Support',
        description: 'Join a supportive community, share your progress, and inspire others on their journey.',
        image: require('../assets/images/onboarding4.png'),
        highlight: 'Connect & Grow'
    }
]