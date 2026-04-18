import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--bg-page)",
        panel: "var(--bg-panel)",
        "panel-2": "var(--bg-panel-2)",
        border: "var(--border)",
        "border-hi": "var(--border-hi)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        pos: "var(--pos)",
        neg: "var(--neg)",
        neu: "var(--neu)",
      },
      fontFamily: {
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
      },
      borderRadius: {
        theme: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
