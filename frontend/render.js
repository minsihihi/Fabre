const API_BASE_URL = 'http://localhost:3000/api'; // 백엔드 API URL

document.addEventListener('DOMContentLoaded', async () => {
    // 화면 전환 함수
    const showPage = (pageId) => {
        document.getElementById('main').style.display = 'none';
        document.getElementById('register').style.display = 'none';
        document.getElementById('login').style.display = 'none';
        document.getElementById(pageId).style.display = 'block';
    };

    // 초기 화면 설정
    showPage('main');

    // 토큰 확인 후 자동 로그인 처리
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/user-info`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                updateUIAfterLogin(data.user);
            } else {
                localStorage.removeItem('token'); // 토큰 만료 시 제거
            }
        } catch (error) {
            console.error('자동 로그인 오류:', error);
        }
    }

    // 메인화면 버튼 이벤트
    document.getElementById('login-page-btn').addEventListener('click', () => showPage('login'));
    document.getElementById('register-page-btn').addEventListener('click', () => showPage('register'));

    // 회원가입 이벤트
    document.getElementById('register-btn').addEventListener('click', async () => {
        const loginId = document.getElementById('register-id').value;
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value;
        const role = document.getElementById('register-role').value;

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login_id: loginId, password, name, role }),
            });

            if (!response.ok) throw new Error('회원가입 실패');
            alert('회원가입 성공! 로그인 페이지로 이동합니다.');
            showPage('login');
        } catch (error) {
            document.getElementById('register-message').innerText = '회원가입 에러: ' + error.message;
        }
    });

    // 로그인 요청
    document.getElementById('login-btn').addEventListener('click', async () => {
        const loginId = document.getElementById('login-id').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login_id: loginId, password }),
            });

            if (!response.ok) throw new Error('로그인 실패');

            const data = await response.json();
            localStorage.setItem('token', data.token);
            updateUIAfterLogin(data.user);

            alert(`로그인 성공! 환영합니다, ${data.user.name}`);
            showPage('main');
        } catch (error) {
            document.getElementById('login-message').innerText = '로그인 에러: ' + error.message;
        }
    });

    // 로그아웃 이벤트
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('로그인 후 로그아웃을 시도해주세요.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('로그아웃 실패');

            localStorage.removeItem('token');
            resetUIAfterLogout();

            alert('로그아웃 되었습니다.');
            showPage('main');
        } catch (error) {
            alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
        }
    });

    // 로그인 후 UI 업데이트 함수
    function updateUIAfterLogin(user) {
        document.getElementById('user-name').innerText = user.name;
        document.getElementById('user-role').innerText = user.role;
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('login-page-btn').style.display = 'none';
        document.getElementById('register-page-btn').style.display = 'none';
    }

    // 로그아웃 후 UI 초기화 함수
    function resetUIAfterLogout() {
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('login-page-btn').style.display = 'block';
        document.getElementById('register-page-btn').style.display = 'block';
        document.getElementById('login-id').value = '';
        document.getElementById('login-password').value = '';
    }
});
