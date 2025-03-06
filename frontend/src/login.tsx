import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    try {
      const apiUrl = "http://localhost:3000/api/login"; // 백엔드 서버 URL
      // const apiUrl = "/api/login"; // 프록시 설정이 작동하는 경우
      
      console.log("로그인 요청 전송:", { login_id: loginId, password: "***" });
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login_id: loginId, password }),
      });
      
      console.log("서버 응답 상태:", response.status);
      
      // 응답이 JSON이 아닌 경우 처리
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("API 경로를 찾을 수 없습니다. 서버가 실행 중인지 확인하세요.");
        }
        
        let errorData;
        try {
          errorData = await response.json();
          setError(errorData.message || `오류 발생: ${response.status}`);
        } catch (e) {
          setError(`서버 오류: ${response.status} ${response.statusText}`);
        }
        return;
      }
      
      // 성공 응답 처리
      const data = await response.json();
      console.log("로그인 성공:", data);
      
      // 토큰 및 사용자 정보 저장
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // 리디렉션
      navigate("/home");
      
    } catch (error: any) {
      console.error("로그인 요청 중 오류 발생:", error);
      setError(error.message || "로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">L O G I N</h1>
        {error && <div className="error-message">{error}</div>}
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


