/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    "gradient-text",
    "gradient-logo",
    "button-gradient",
    "glass",
    "glass-card",
    "footer-gradient"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        codfence: {
          dark: "#0B0F28",
          mid: "#12163A",
          end: "#181C3B",
          violet: "#8B5CF6",
          cyan: "#06B6D4",
          light: "#E5E7EB",
        },
      },
      backgroundImage: {
        "codfence-gradient":
          "linear-gradient(to bottom right, #0B1437 0%, #1E3A8A 45%, #4B3087 100%)",
        "codfence-accent":
          "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 55%, #06B6D4 100%)",
      },
      boxShadow: {
        "codfence-glow": "0 0 18px rgba(139, 92, 246, 0.45)",
      },
      keyframes: {
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        gradientShift: "gradientShift 3s ease infinite",
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.gradient-logo': {
          backgroundImage: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 55%, #06B6D4 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'color': 'transparent',
          'filter': 'brightness(1.25) contrast(1.15)',
        },
        '.gradient-text': {
          backgroundImage: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 55%, #06B6D4 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'color': 'transparent',
          'filter': 'brightness(1.25) contrast(1.15)',
        },
      });
    }
  ],
};
