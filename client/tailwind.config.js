/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    darkMode: 'class', // Enable dark mode feature
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
                // Main brand color - Deep Purple/Indigo
                primary: {
                    100: "#F3E8FF",
                    200: "#E4D0FF",
                    300: "#C5A3FF",
                    400: "#9D6FFF",
                    500: "#7C3AED",
                    600: "#6D28D9", // For dark mode interactions
                    700: "#5B21B6",
                    800: "#4C1D95",
                    900: "#2E1065",
                },
                // Vibrant teal
                secondary: {
                    100: "#CCFBF1",
                    200: "#99F6E4",
                    300: "#2DD4BF",
                    400: "#14B8A6",
                    500: "#0D9488",
                    600: "#0F766E",
                    700: "#115E59",
                    800: "#134E4A",
                    900: "#042F2E",
                },
                // Coral/Peach
                accent: {
                    100: "#FFE4E0",
                    200: "#FFC5BB",
                    300: "#FF9B8B",
                    400: "#FF7563",
                    500: "#FF4D4D",
                    600: "#E31A1A",
                    700: "#C51616",
                    800: "#A31212",
                    900: "#800E0E",
                },
                // Theme colors that change with dark mode
                theme: {
                    // Background colors
                    background: {
                        DEFAULT: '#FFFFFF',
                        dark: '#121212',
                    },
                    card: {
                        DEFAULT: '#F8F7FF',
                        dark: '#1E1E1E',
                    },
                    surface: {
                        DEFAULT: '#FFFFFF',
                        dark: '#2A2A2A',
                    },
                    input: {
                        DEFAULT: '#F3F4F6',
                        dark: '#333333',
                    },
                    // Text colors
                    text: {
                        primary: {
                            DEFAULT: '#1F2937',
                            dark: '#F3F4F6',
                        },
                        secondary: {
                            DEFAULT: '#4B5563',
                            dark: '#D1D5DB',
                        },
                        muted: {
                            DEFAULT: '#6B7280',
                            dark: '#9CA3AF',
                        },
                    },
                    // Border colors
                    border: {
                        DEFAULT: '#E5E7EB',
                        dark: '#404040',
                    },
                },
                // Semantic colors (adjusted for dark mode visibility)
                success: {
                    100: "#DCFCE7",
                    300: "#86EFAC",
                    500: "#22C55E",
                    600: "#16A34A",
                    dark: "#4ADE80", // Brighter for dark mode
                },
                warning: {
                    100: "#FEF3C7",
                    300: "#FCD34D",
                    500: "#F59E0B",
                    600: "#D97706",
                    dark: "#FBBF24", // Brighter for dark mode
                },
                error: {
                    100: "#FFE4E6",
                    300: "#FDA4AF",
                    500: "#F43F5E",
                    600: "#E11D48",
                    dark: "#FB7185", // Brighter for dark mode
                },
            },
            // Extended spacing and other utilities
            spacing: {
                'screen-header': '88px',
                'card-padding': '24px',
            },
            borderRadius: {
                'card': '24px',
                'button': '16px',
                'input': '12px',
            },
            boxShadow: {
                'card-light': '0 4px 6px -1px rgba(124, 58, 237, 0.1)',
                'card-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                'button-light': '0 2px 4px rgba(124, 58, 237, 0.2)',
                'button-dark': '0 2px 4px rgba(0, 0, 0, 0.4)',
            }
        },
    },
    plugins: [],
}