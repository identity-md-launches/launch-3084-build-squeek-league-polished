import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022', sourcemap: false,
    rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/ethers/') ? 'ethers' : id.includes('node_modules/react') || id.includes('node_modules/scheduler/') ? 'react' : undefined } },
  },
});
