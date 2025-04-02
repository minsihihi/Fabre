import React, { useState, useEffect, ChangeEvent } from "react";
import axios from "axios";
import "./Mypage.css";

export default function MypageMember() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [memberNumber, setMemberNumber] = useState<string>("");
  const [workoutRecords, setWorkoutRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchProfileImage();
    fetchUserInfo();
  }, []);

  const fetchProfileImage = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await axios.get(`http://localhost:3000/api/images/profile?userId=${userId}`);
      setProfileImage(response.data.imageUrl);
    } catch (error) {
      console.error("프로필 이미지 불러오기 실패:", error);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/users");
      const user = response.data.find((u: any) => u.id === localStorage.getItem("userId"));
      if (user) {
        setTrainerInfo({ name: user.name, info: "피트니스 전문가" });
        setMemberNumber(user.login_id);
      }
    } catch (error) {
      console.error("유저 정보 불러오기 실패:", error);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file);

      try {
        await axios.post("http://localhost:3000/api/images/profile", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        fetchProfileImage();
      } catch (error) {
        console.error("프로필 업로드 실패:", error);
      }
    }
  };

  const fetchWorkoutRecords = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/record");
      setWorkoutRecords(response.data.data);
    } catch (error) {
      console.error("운동 기록 불러오기 실패:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:3000/api/logout");
      localStorage.removeItem("userId");
      window.location.href = "/login";
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <div className="mypage-container">
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

      {trainerInfo && (
        <div className="trainer-info">
          <img src="https://via.placeholder.com/50" alt="트레이너" className="trainer-pic" />
          <div className="trainer-details">
            <p className="trainer-name">{trainerInfo.name}</p>
            <p className="trainer-description">{trainerInfo.info}</p>
          </div>
        </div>
      )}

      <div className="member-number">
        <strong>나의 회원 번호:</strong> {memberNumber}
      </div>

      <div className="workout-records">
        <button className="workout-records-btn" onClick={fetchWorkoutRecords}>
          나의 운동기록 확인하기
        </button>
        {workoutRecords.length > 0 && (
          <ul>
            {workoutRecords.map((record, index) => (
              <li key={index}>{record.workout_date} - {record.exercise_name}</li>
            ))}
          </ul>
        )}
      </div>

      <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
    </div>
  );
}
