import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 部署路径：
// - 本地 dev / preview：base 为 '/'
// - GitHub Pages：部署时注入 VITE_BASE=/daily-drill/
// - 绑定独立域名：不注入即可，保持 '/'
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
