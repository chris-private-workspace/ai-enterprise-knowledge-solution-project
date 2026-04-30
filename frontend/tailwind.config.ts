import type { Config } from 'tailwindcss';

import { ekpTokens } from './lib/theming/tokens';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: ekpTokens.colors,
      borderRadius: ekpTokens.radius,
      fontFamily: ekpTokens.fontFamily,
    },
  },
  plugins: [],
};

export default config;
