const API_BASE_URL = 'http://localhost:3000/api'; // 백엔드 API URL

// 화면 전환 함수
const showPage = (pageId) => {
    document.getElementById('main').style.display = 'none';
    document.getElementById('register').style.display = 'none';
    document.getElementById('login').style.display = 'none';
    document.getElementById(pageId).style.display = 'block';
};

// 초기 화면 설정
showPage('main');

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
        const data = await response.json();

        alert('회원가입 성공! 로그인 페이지로 이동합니다.');
        showPage('login');
    } catch (error) {
        document.getElementById('register-message').innerText = '회원가입 에러: ' + error.message;
    }
});

// 로그인 이벤트
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

        alert(`로그인 성공! 환영합니다, ${data.user.name}`);
        document.getElementById('user-name').innerText = data.user.name;
        document.getElementById('user-role').innerText = data.user.role;
        document.getElementById('user-info').style.display = 'block';
        showPage('main');
    } catch (error) {
        document.getElementById('login-message').innerText = '로그인 에러: ' + error.message;
    }
});
