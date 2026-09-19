/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  // The app is styled with inline styles + CSS variables; keep Tailwind's reset off
  // so adding utilities doesn't restyle existing elements.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
