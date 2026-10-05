import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f6b4a",      // 상시운영 개편: 브랜드 초록
        "primary-bg": "#e7f2ed",
        "primary-dark": "#0a5238",
      },
    },
  },
  plugins: [],
} satisfies Config;
