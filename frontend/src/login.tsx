import { useState } from "react";

export default function Login() {
  const [loginId, setLoginId] = useState(""); // login_id로 상태 변수 변경
  const [password, setPassword] = useState(""); // password 그대로 사용

  const handleSubmit = async (e) => {
    e.preventDefault();
    // API 요청을 보내는 부분 추가 (login_id와 password 전달)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login_id: loginId, password }), // login_id와 password 전달
      });

      if (response.ok) {
        // 로그인 성공 처리
        const data = await response.json();
        console.log("로그인 성공:", data);
      } else {
        // 로그인 실패 처리
        console.error("로그인 실패");
      }
    } catch (error) {
      console.error("로그인 요청 중 오류 발생:", error);
    }
  };

  return (
    <div className="login-container">
      <h1 className="text-center text-4xl font-bold mb-8">채찍피티 로그인</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="input-group">
          <label htmlFor="loginId" className="input-label">사용자 이름</label>
          <input
            type="text"
            id="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)} // login_id 업데이트
            className="input-field"
            placeholder="아이디를 입력하세요"
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password" className="input-label">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="비밀번호를 입력하세요"
            required
          />
        </div>
        <button type="submit" className="login-button">로그인</button>
      </form>
    </div>
  );
}
