import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home.css";
import axios from "axios";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TrainerHome() {
  const [date, setDate] = useState(new Date());
  const [members, setMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/trainer/members");
      const membersData = response.data.data;
      
      const updatedMembers = await Promise.all(
        membersData.map(async (member) => {
          const profileRes = await axios.get("http://localhost:3000/api/images/profile", { params: { userId: member.User.id } });
          return {
            id: member.User.id,
            name: member.User.name,
            completed: false,
            profileImageUrl: profileRes.data.imageUrl || "/default-profile.png"
          };
        })
      );
      setMembers(updatedMembers);
    } catch (error) {
      console.error("회원 목록 불러오기 실패", error);
    }
  };

  const updateMembersCompletion = async (selectedDate) => {
    const formattedDate = formatLocalDate(selectedDate);
    const updatedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const response = await axios.get("http://localhost:3000/api/images/workout", { 
            params: { userId: member.id, workoutDate: formattedDate }
          });
          const completed = response.data.workouts.length > 0;
          return { ...member, completed };
        } catch (error) {
          console.error(`운동 기록 조회 실패 for member ${member.id}`, error);
          return { ...member, completed: false };
        }
      })
    );
    setMembers(updatedMembers);
  };

  const handleDateClick = async (value) => {
    setDate(value);
    await updateMembersCompletion(value);
    setModalOpen(true);
  };

  return (
    <div className="home-container">
      <div className="calendar-container">
        <Calendar onChange={handleDateClick} value={date} formatDay={(locale, date) => date.getDate().toString()} />
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>{formatLocalDate(date)} 운동 현황</h2>
            <div className="members-container">
              <div className="completed">
                <h3>운동 완료 회원</h3>
                {members.filter((m) => m.completed).length > 0 ? (
                  members.filter((m) => m.completed).map((member) => (
                    <div key={member.id} className="member-item">
                      <img src={member.profileImageUrl} alt={member.name} className="profile-img" />
                      <p>{member.name}</p>
                    </div>
                  ))
                ) : (
                  <p>없음</p>
                )}
              </div>
              <div className="not-completed">
                <h3>운동 미완료 회원</h3>
                {members.filter((m) => !m.completed).length > 0 ? (
                  members.filter((m) => !m.completed).map((member) => (
                    <div key={member.id} className="member-item">
                      <img src={member.profileImageUrl} alt={member.name} className="profile-img" />
                      <p>{member.name}</p>
                    </div>
                  ))
                ) : (
                  <p>없음</p>
                )}
              </div>
            </div>
            <button onClick={() => setModalOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
