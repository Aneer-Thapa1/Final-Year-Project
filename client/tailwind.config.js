/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}","./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily:{
        "montserrat": ['Montserrat-Regular', 'sans-serif'],
       " montserrat-bold": ['Montserrat-Bold', 'sans-serif'],
        "montserrat-extrabold": ['Montserrat-ExtraBold', 'sans-serif'],
        "montserrat-medium": ['Montserrat-Medium', 'sans-serif'],
        "montserrat-light": ['Montserrat-Light', 'sans-serif'],
        "montserrat-semibold": ['Montserrat-SemiBold', 'sans-serif'],
      },
      colors: {

          primary: {
            100: "#E3F2FD",
            200: "#90CAF9",
            300: "#42A5F5",
            400: "#1E88E5",
            500: "#1565C0",
          },
          secondary: {
            100: "#F3E5F5",
            200: "#CE93D8",
            300: "#AB47BC",
            400: "#8E24AA",
            500: "#6A1B9A",
          },
          success: {
            100: "#E8F5E9",
            300: "#66BB6A",
            500: "#388E3C",
          },
          warning: {
            100: "#FFF8E1",
            300: "#FFC107",
            500: "#FF6F00",
          },
          error: {
            100: "#FFEBEE",
            300: "#E57373",
            500: "#C62828",
          },
          info: {
            100: "#E3F2FD",
            300: "#64B5F6",
            500: "#1976D2",
          },
      }
    },
  },
  plugins: [],
}