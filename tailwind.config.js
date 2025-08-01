/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'insta-blue': '#0095F6',
        'insta-dark-blue': '#00376B',
        'insta-light-blue': '#B3E0FF'
      },
      backgroundImage: {
        'blue-gradient': 'linear-gradient(to right, #0095F6, #00376B)',
      }
    }
  },
  plugins: [require('@tailwindcss/typography'),]
}