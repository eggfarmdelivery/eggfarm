import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#E8940C",   // A1 진한 앰버
        "primary-bg": "#FFEBC2",
        "primary-dark": "#3D2E1A",
      },
    },
  },
} satisfies Config;
