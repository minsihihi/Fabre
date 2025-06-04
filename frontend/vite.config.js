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
});
