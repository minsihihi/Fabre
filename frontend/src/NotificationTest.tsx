// src/components/NotificationTest.tsx
import React, { useEffect } from 'react';

// Electron API 타입 정의
interface ElectronAPI {
    showNotification: (data: { title: string; message: string }) => void;
    onNotification: (callback: (data: any) => void) => void;
}

// Window 객체에 electronAPI 속성 추가
declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

function NotificationTest() {
  // 알림 테스트 함수
    const handleTestNotification = () => {
        if (window.electronAPI) {
        window.electronAPI.showNotification({
            title: '테스트 알림',
            message: '이것은 테스트 알림입니다.'
        });
        } else {
        console.log('electronAPI를 사용할 수 없습니다.');
        }
    };

  // 알림 수신 리스너 설정
    useEffect(() => {
        if (window.electronAPI) {
        window.electronAPI.onNotification((data) => {
            console.log('알림 수신:', data);
            // 필요한 처리 수행
        });
        }
    }, []);

    return (
        <div>
        <h2>알림 테스트</h2>
        <button onClick={handleTestNotification}>테스트 알림 보내기</button>
        </div>
    );
}

export default NotificationTest;
