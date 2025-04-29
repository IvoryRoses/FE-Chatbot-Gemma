export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "inherit",
            a: {
              color: "inherit",
              textDecoration: "underline",
            },
            strong: {
              color: "inherit",
            },
            code: {
              color: "inherit",
            },
          },
        },
      },
    },
  },
  plugins: [],
};
