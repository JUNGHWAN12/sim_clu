/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 하위 경로(https://junghwan12.github.io/sim_clu/)에 맞춘 base
export default defineConfig({
  plugins: [react()],
  base: '/sim_clu/',
  test: {
    environment: 'jsdom',
  },
});
