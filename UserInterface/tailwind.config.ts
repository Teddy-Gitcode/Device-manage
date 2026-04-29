import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand:    'var(--m365-brand)',
        canvas:   'var(--neutral-bg-canvas)',
        surface:  'var(--neutral-bg-1)',
        'fg-1':   'var(--neutral-fg-1)',
        'fg-2':   'var(--neutral-fg-2)',
        'fg-3':   'var(--neutral-fg-3)',
      },
      fontFamily: {
        sans: [
          'Segoe UI', 'Segoe UI Web (West European)', '-apple-system',
          'BlinkMacSystemFont', 'Roboto', 'Helvetica Neue', 'sans-serif',
        ],
      },
      borderRadius: {
        card:    '8px',
        control: '4px',
      },
      boxShadow: {
        '2':  'var(--shadow-2)',
        '4':  'var(--shadow-4)',
        '16': 'var(--shadow-16)',
      },
    },
  },
  plugins: [],
}

export default config
