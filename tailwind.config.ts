import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2f4bdb", dark: "#2339b0", soft: "#eef1ff" },
      },
    },
  },
  plugins: [],
};
export default config;
