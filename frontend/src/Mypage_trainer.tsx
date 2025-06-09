import React, { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Mypage.css";

interface Member {
  id: string;
  name: string;
  photo?: string;
}

export default function MypageTrainer() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState("");
  const [myMembers, setMyMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // 🔐 로컬스토리지에서 토큰 가져와서 axios 기본 헤더 설정
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data } = await axios.get("http://13.209.19.146:3000/api/users/me");
      setUserId(data.id);
      localStorage.setItem("userId", data.id); // 💾 다른 곳에서도 쓸 수 있도록 저장
      fetchProfileImage(data.id);
      fetchMyMembers();
    } catch (error) {
      console.error("유저 정보 조회 실패", error);
    }
  };

  const fetchProfileImage = async (id: string) => {
    try {
      const { data } = await axios.get("http://13.209.19.146:3000/api/images/profile", {
        params: { userId: id },
      });
      setProfileImage(data.imageUrl);
    } catch (error) {
      console.error("프로필 이미지 로드 실패", error);
    }
  };

  const fetchMyMembers = async () => {
    try {
      const { data } = await axios.get("http://13.209.19.146:3000/api/trainer/members");
      const members = data.data.map((member: any) => ({
        id: member.member.id,
        name: member.member.name,
        photo: member.member.photo || "", // 사진이 있으면 포함
      }));
      setMyMembers(members);
    } catch (error) {
      console.error("회원 목록 불러오기 실패", error);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file); // ✅ key는 image!

      try {
        await axios.post("http://13.209.19.146:3000/api/upload/profile", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ 토큰 직접 삽입
          },
        });
        fetchProfileImage(userId);
      } catch (error) {
        console.error("프로필 업로드 실패", error);
      }
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;
    try {
      const { data } = await axios.post("http://13.209.19.146:3000/api/trainer/members", {
        memberId: newMemberId,
        sessionsLeft: 10,
      });

      const memberName = `회원 ${newMemberId}`;
      setMyMembers([...myMembers, { id: data.data.memberId, name: memberName }]);
      setNewMemberId("");
    } catch (error: any) {
      console.error("회원 추가 실패", error);
      alert(error?.response?.data?.message || "회원 추가 실패");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await axios.put(`http://13.209.19.146:3000/api/trainer/members/${memberId}`);
      setMyMembers(myMembers.filter((member) => member.id !== memberId));
    } catch (error) {
      console.error("회원 삭제 실패", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://13.209.19.146:3000/api/logout");
      localStorage.removeItem("token");
      localStorage.removeItem("id");
      localStorage.removeItem("userId");
      // window.location.href = "/login";
      navigate("/login");  
    } catch (error) {
      console.error("로그아웃 실패", error);
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
        <input id="profileUpload" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
      </div>

      <div className="member-registration">
        <h3>회원 등록</h3>
        <input
          type="text"
          placeholder="회원 번호 입력"
          value={newMemberId}
          onChange={(e) => setNewMemberId(e.target.value)}
        />
        <button onClick={handleAddMember}>등록</button>
      </div>

      <div className="members-list">
        <h3>나의 회원들</h3>
        <div className="members-container">
          {myMembers.length > 0 ? (
            myMembers.map((member) => (
              <div key={member.id} className="member-card">
                <p className="member-name">{member.name}</p>
                <button onClick={() => handleDeleteMember(member.id)}>삭제</button>
              </div>
            ))
          ) : (
            <p>등록된 회원이 없습니다.</p>
          )}
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}
