/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                "montserrat": ['Montserrat-Regular', 'sans-serif'],
                "montserrat-bold": ['Montserrat-Bold', 'sans-serif'],
                "montserrat-extrabold": ['Montserrat-ExtraBold', 'sans-serif'],
                "montserrat-medium": ['Montserrat-Medium', 'sans-serif'],
                "montserrat-light": ['Montserrat-Light', 'sans-serif'],
                "montserrat-semibold": ['Montserrat-SemiBold', 'sans-serif'],
            },
            colors: {
                // Primary - Sage Green (Growth & Progress)
                primary: {
                    50: "#F0FDF4",
                    100: "#DCFCE7",
                    200: "#BBF7D0",
                    300: "#86EFAC",
                    400: "#4ADE80",
                    500: "#22C55E", // Main brand color
                    600: "#16A34A",
                    700: "#15803D",
                    800: "#166534",
                    900: "#14532D",
                    950: "#052E16"
                },
                // Secondary - Deep Purple (Focus & Mindfulness)
                secondary: {
                    50: "#F5F3FF",
                    100: "#EDE9FE",
                    200: "#DDD6FE",
                    300: "#C4B5FD",
                    400: "#A78BFA",
                    500: "#8B5CF6", // Secondary actions
                    600: "#7C3AED",
                    700: "#6D28D9",
                    800: "#5B21B6",
                    900: "#4C1D95",
                    950: "#2E1065"
                },
                // Accent - Amber (Energy & Motivation)
                accent: {
                    50: "#FFFBEB",
                    100: "#FEF3C7",
                    200: "#FDE68A",
                    300: "#FCD34D",
                    400: "#FBBF24",
                    500: "#F59E0B", // Highlights & CTAs
                    600: "#D97706",
                    700: "#B45309",
                    800: "#92400E",
                    900: "#78350F",
                    950: "#451A03"
                },
                // Theme colors with dark mode support
                theme: {
                    // Background colors
                    background: {
                        DEFAULT: '#FFFFFF',
                        dark: '#0F172A', // Deep blue-gray for dark mode
                    },
                    card: {
                        DEFAULT: '#F8FAFC',
                        dark: '#1E293B',
                    },
                    surface: {
                        DEFAULT: '#FFFFFF',
                        dark: '#334155',
                    },
                    input: {
                        DEFAULT: '#F1F5F9',
                        dark: '#475569',
                    },
                    // Text colors
                    text: {
                        primary: {
                            DEFAULT: '#0F172A',
                            dark: '#F8FAFC',
                        },
                        secondary: {
                            DEFAULT: '#334155',
                            dark: '#E2E8F0',
                        },
                        muted: {
                            DEFAULT: '#64748B',
                            dark: '#94A3B8',
                        },
                    },
                    // Border colors
                    border: {
                        DEFAULT: '#E2E8F0',
                        dark: '#475569',
                    },
                },
                // Semantic colors with dark mode variants
                success: {
                    100: "#DCFCE7",
                    300: "#86EFAC",
                    500: "#22C55E",
                    600: "#16A34A",
                    dark: "#4ADE80",
                },
                warning: {
                    100: "#FEF3C7",
                    300: "#FCD34D",
                    500: "#F59E0B",
                    600: "#D97706",
                    dark: "#FBBF24",
                },
                error: {
                    100: "#FEE2E2",
                    300: "#FCA5A5",
                    500: "#EF4444",
                    600: "#DC2626",
                    dark: "#F87171",
                },
            },
            // Enhanced spacing system
            spacing: {
                'screen-header': '88px',
                'card-padding': '24px',
                'section-spacing': '32px',
                'element-gap': '16px',
            },
            // Enhanced border radius system
            borderRadius: {
                'xs': '4px',
                'sm': '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '24px',
                '2xl': '32px',
                'card': '24px',
                'button': '16px',
                'input': '12px',
                'pill': '9999px',
            },
            // Enhanced shadow system
            boxShadow: {
                'sm': '0 1px 2px rgba(15, 23, 42, 0.05)',
                'md': '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
                'lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1)',
                'card-light': '0 4px 6px -1px rgba(34, 197, 94, 0.1)',
                'card-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                'button-light': '0 2px 4px rgba(34, 197, 94, 0.2)',
                'button-dark': '0 2px 4px rgba(0, 0, 0, 0.4)',
                'focus-ring': '0 0 0 3px rgba(34, 197, 94, 0.35)',
            },
            // Animation durations
            transitionDuration: {
                '250': '250ms',
                '350': '350ms',
                '450': '450ms',
            },
            // Animation timing functions
            transitionTimingFunction: {
                'bounce-sm': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'bounce-md': 'cubic-bezier(0.8, 0, 0.2, 1)',
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [],
}