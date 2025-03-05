import { useState } from "react";
import { useNavigate } from "react-router-dom"; // React Router 사용
import "./Login.css"; // CSS 파일 import

export default function Login() {
  const [loginId, setLoginId] = useState(""); // login_id 상태 변수
  const [password, setPassword] = useState(""); // password 상태 변수
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login_id: loginId, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("로그인 성공:", data);
        navigate("/home"); // 로그인 성공 시 홈 화면으로 이동
      } else {
        console.error("로그인 실패");
      }
    } catch (error) {
      console.error("로그인 요청 중 오류 발생:", error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">L O G I N</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="loginId">ID</label>
            <input
              type="text"
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">PW</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <button type="submit" className="login-button">
            LOGIN
          </button>
        </form>
        {/* 로그인 폼 하단에 회원가입 네비게이션 추가 */}
        <p className="login-footer">
          계정이 없으신가요? {" "}
          <span className="register-link" onClick={() => navigate("/register")}>
            회원가입
          </span>
        </p>
      </div>
    </div>
  );
}
