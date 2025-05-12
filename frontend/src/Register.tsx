import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css"; // 회원가입 전용 CSS 파일

export default function Join() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
        const response = await fetch("http://13.209.19.146:3000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ login_id: loginId, password, name, role }),
        });

        // 응답 상태 코드가 200 또는 201일 때만 JSON 처리
        if (response.ok) {
            const data = await response.json(); // 응답이 JSON이면 처리
            console.log("회원가입 성공:", data);
            navigate("/login");
        } else {
            const errorData = await response.text(); // 오류 메시지를 텍스트로 받아서 처리
            console.error("회원가입 실패:", errorData);
            alert(`회원가입 실패: ${errorData}`);
        }
    } catch (error) {
        console.error("회원가입 요청 중 오류 발생:", error);
        alert("회원가입 요청 중 오류가 발생했습니다.");
    }
  };



  return (
    <div className="join-container">
      <div className="join-box">
        <h1 className="join-title">J O I N</h1>
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
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="name">NAME</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="role">ROLE</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">회원</option>
              <option value="trainer">트레이너</option>
            </select>
          </div>
          <button type="submit" className="join-button">
            J O I N
          </button>
        </form>
      </div>
    </div>
  );
}
