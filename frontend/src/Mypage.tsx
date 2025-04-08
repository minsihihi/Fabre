import React, { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Mypage.css";

function MypageMember() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [memberNumber, setMemberNumber] = useState<string>("");
  const navigate = useNavigate();

  // 🔐 공통 axios 설정: 인증 토큰 포함
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/users/me");
      const user = response.data;

      if (user) {
        setMemberNumber(user.id.toString());

        localStorage.setItem("id", user.id.toString());
        localStorage.setItem("userId", user.id.toString());
        console.log("🔥 userId in localStorage:", localStorage.getItem("userId"));

        fetchProfileImage(user.id.toString());

        const token = localStorage.getItem("token");
        axios
          .get("http://localhost:3000/api/member/trainer", {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((trainerRes) => {
            if (trainerRes.data.trainer) {
              setTrainerInfo(trainerRes.data.trainer);
              console.log("✅ 트레이너 정보 조회 성공:", trainerRes.data.trainer);
            } else {
              console.warn("트레이너 정보가 없습니다.");
            }
          })
          .catch((err) => console.error("트레이너 정보 조회 오류:", err));
      } else {
        console.error("유저 정보를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("유저 정보 불러오기 실패:", error);
    }
  };

  const fetchProfileImage = async (userId: string) => {
    try {
      const response = await axios.get("http://localhost:3000/api/images/profile", {
        params: { userId },
      });
      setProfileImage(response.data.imageUrl);
    } catch (error) {
      console.error("프로필 이미지 불러오기 실패:", error);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await axios.post("http://localhost:3000/api/upload/profile", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        console.log("✅ 업로드 성공:", response.data);

        const userId = localStorage.getItem("userId");
        if (userId) fetchProfileImage(userId);
      } catch (error) {
        console.error("❌ 프로필 업로드 실패:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:3000/api/logout");
      localStorage.removeItem("token");
      localStorage.removeItem("id");
      localStorage.removeItem("userId");
      window.location.href = "/login";
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const goToRecordPage = () => {
    navigate("/record");
  };

  return (
    <div className="mypage-container">
      {/* 회원 프로필 이미지 업로드 영역 */}
      <div className="profile-upload-container">
        <label htmlFor="profileUpload" className="profile-upload-label">
          {profileImage ? (
            <img src={profileImage} alt="프로필" className="profile-image" />
          ) : (
            <div className="placeholder">프로필 사진 업로드</div>
          )}
        </label>
        <input
          id="profileUpload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
      </div>

      {/* 회원 정보 영역 */}
      <div className="member-number">
        <strong>나의 회원 번호:</strong> {memberNumber}
      </div>

      {/* 트레이너 정보 영역 */}
      {trainerInfo && (
        <div className="trainer-info">
          <img
            src={trainerInfo.imageUrl ? trainerInfo.imageUrl : "https://via.placeholder.com/50"}
            alt="트레이너"
            className="trainer-pic"
          />
          <div className="trainer-details">
            <p className="trainer-name">나의 트레이너 : {trainerInfo.name}</p>
          </div>
        </div>
      )}

      {/* 운동 기록 페이지 이동 */}
      <div className="workout-records">
        <button className="workout-records-btn" onClick={goToRecordPage}>
          나의 운동기록 확인하기
        </button>
      </div>

      {/* 로그아웃 버튼 */}
      <button className="logout-btn" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}

export default MypageMember;
