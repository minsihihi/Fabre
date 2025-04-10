// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
<<<<<<< HEAD
  root: __dirname,
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

=======
  root: path.resolve(__dirname), // 현재 위치가 frontend
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
  },
});
>>>>>>> main/main
