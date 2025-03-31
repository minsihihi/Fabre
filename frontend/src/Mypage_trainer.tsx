import React, { useState, useEffect, ChangeEvent } from "react";
import axios from "axios";
import "./Mypage.css";

export default function MypageTrainer() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState("");
  const [myMembers, setMyMembers] = useState<{ id: string; name: string; photo?: string }[]>([]);

  useEffect(() => {
    fetchProfileImage();
    fetchMyMembers();
  }, []);

  const fetchProfileImage = async () => {
    try {
      const { data } = await axios.get("/images/profile", { params: { userId: "trainer123" } });
      setProfileImage(data.imageUrl);
    } catch (error) {
      console.error("프로필 이미지 로드 실패", error);
    }
  };

  const fetchMyMembers = async () => {
    try {
      const { data } = await axios.get("/trainer/members");
      setMyMembers(data.data.map((member: any) => ({ id: member.id, name: member.User.name })));
    } catch (error) {
      console.error("회원 목록 불러오기 실패", error);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("profileImage", file);
      try {
        await axios.post("/images/profile/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
        fetchProfileImage();
      } catch (error) {
        console.error("프로필 업로드 실패", error);
      }
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;
    try {
      const { data } = await axios.post("/trainer/members", { memberId: newMemberId, sessionsLeft: 10 });
      setMyMembers([...myMembers, { id: data.data.memberId, name: `회원 ${data.data.memberId}` }]);
      setNewMemberId("");
    } catch (error) {
      console.error("회원 추가 실패", error);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await axios.put(`/trainer/members/${memberId}`);
      setMyMembers(myMembers.filter((member) => member.id !== memberId));
    } catch (error) {
      console.error("회원 삭제 실패", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("/logout");
      alert("로그아웃 되었습니다.");
      window.location.href = "/login";
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
        <input type="text" placeholder="회원 번호 입력" value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} />
        <button onClick={handleAddMember}>등록</button>
      </div>

      <div className="members-list">
        <h3>나의 회원들</h3>
        <div className="members-container">
          {myMembers.length > 0 ? (
            myMembers.map((member) => (
              <div key={member.id} className="member-card">
                <img src={member.photo || "https://via.placeholder.com/50"} alt={member.name} className="member-photo" />
                <p className="member-name">{member.name}</p>
                <button onClick={() => handleDeleteMember(member.id)}>삭제</button>
              </div>
            ))
          ) : (
            <p>등록된 회원이 없습니다.</p>
          )}
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
    </div>
  );
}
