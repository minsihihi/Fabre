const axios = require('axios'); 

const API_BASE_URL = 'http://localhost:3000/api'; // 백엔드 API URL

// 회원가입 이벤트
document.getElementById('register-btn').addEventListener('click', async () => {
    console.log('회원가입 버튼 클릭됨'); 
    const loginId = document.getElementById('register-id').value;
    const password = document.getElementById('register-password').value;
    const name = document.getElementById('register-name').value;
    const role = document.getElementById('register-role').value;

    console.log('입력 데이터:', { loginId, password, name, role });

    try {
        const response = await axios.post(`${API_BASE_URL}/register`, {
            login_id: loginId,
            password,
            name,
            role,
        });
        console.log('회원가입 성공:', response.data); // 성공 로그
        document.getElementById('register-message').innerText = response.data.message;
    } catch (error) {
        console.error('회원가입 실패:', error); // 에러 로그
        document.getElementById('register-message').innerText =
            error.response?.data?.message || '회원가입 실패';
    }
});


// 로그인 이벤트
document.getElementById('login-btn').addEventListener('click', async () => {
    const loginId = document.getElementById('login-id').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await axios.post(`${API_BASE_URL}/login`, {
            login_id: loginId,
            password,
        });
        document.getElementById('login-message').innerText =
            `환영합니다, ${response.data.user.name}`;
    } catch (error) {
        document.getElementById('login-message').innerText =
            error.response?.data?.message || '로그인 실패';
    }
});
