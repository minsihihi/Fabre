import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext", // ✅ 추가: 모듈화 타겟 modern 브라우저
    rollupOptions: {
      input: "./index.html", // ✅ 추가: 빌드 진입점을 명확히
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://13.209.19.146:3000/', // 백엔드 서버 주소로 변경
        changeOrigin: true, // CORS 문제 해결
        secure: false, // HTTPS에서 HTTP로의 요청 허용
      },
    },
  },
});
