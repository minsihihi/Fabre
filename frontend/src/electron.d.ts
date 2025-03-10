// src/electron.d.ts 파일 생성
interface Window {
    electron?: {
        showNotification: (title: string, body: string) => void;
      // 다른 Electron API들...
    };
}