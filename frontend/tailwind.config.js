/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        baloo: ['"Baloo 2"', "cursive"],
      },
    },
  },
  plugins: [],
};
