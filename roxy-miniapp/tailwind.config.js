module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#2F4F4A",
          hover: "#243F3B",
          deep: "#1E2E2B",
        },
        gold: {
          DEFAULT: "#D9A441",
          hover: "#C69232",
          active: "#B58226",
          soft: "#FBF4E4",
        },
        "mint-canvas": "#F3F6F4",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAF9",
        },
        line: {
          DEFAULT: "#DCE5E0",
          strong: "#C5D3CC",
        },
        ink: {
          DEFAULT: "#1E2E2B",
          secondary: "#435A55",
          muted: "#6E827D",
        },
      },
      borderRadius: {
        card: "1rem",
        "card-lg": "1.5rem",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 2px 10px -2px rgba(30, 46, 43, 0.05), 0 1px 3px 0 rgba(30, 46, 43, 0.04)",
        "card-hover":
          "0 10px 24px -6px rgba(30, 46, 43, 0.08), 0 4px 8px -4px rgba(30, 46, 43, 0.04)",
        modal:
          "0 24px 48px -12px rgba(30, 46, 43, 0.18), 0 8px 16px -6px rgba(30, 46, 43, 0.08)",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
};
