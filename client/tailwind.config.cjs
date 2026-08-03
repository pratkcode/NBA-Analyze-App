module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#7c5cff'
      },
      backgroundImage: {
        'sports-anim': "radial-gradient(circle at 10% 10%, rgba(124,92,255,0.12), transparent 15%), radial-gradient(circle at 90% 90%, rgba(0,200,255,0.06), transparent 15%)"
      }
    }
  },
  plugins: [],
}
