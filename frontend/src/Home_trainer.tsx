import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home_trainer.css";
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
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      if (!token) {
        console.error("토큰이 없습니다. 로그인이 필요합니다.");
        alert("로그인이 필요합니다.");
        return;
      }

      const response = await axios.get("http://localhost:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const membersData = response.data.data;

      if (!membersData.length) {
        console.log("등록된 회원이 없습니다.");
        setMembers([]);
        return;
      }

      const updatedMembers = await Promise.all(
        membersData.map(async (member) => {
          try {
            const profileRes = await axios.get("http://localhost:3000/api/images/profile", {
              params: { userId: member.User.id },
              headers: { Authorization: `Bearer ${token}` },
            });
            return {
              id: member.User.id,
              name: member.User.name,
              completed: false,
              profileImageUrl: profileRes.data.imageUrl || "/default-profile.png",
            };
          } catch (error) {
            console.error(`프로필 이미지 조회 실패 for member ${member.User.id}`, {
              error,
              userId: member.User.id,
              status: error.response?.status,
              message: error.response?.data?.message,
            });
            return {
              id: member.User.id,
              name: member.User.name,
              completed: false,
              profileImageUrl: "/default-profile.png",
            };
          }
        })
      );
      setMembers(updatedMembers);
    } catch (error) {
      console.error("회원 목록 불러오기 실패", {
        error,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      if (error.response?.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      } else {
        alert("회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  const updateMembersCompletion = async (selectedDate) => {
    const formattedDate = formatLocalDate(selectedDate);
    const updatedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const response = await axios.get("http://localhost:3000/api/images/workout", {
            params: { userId: member.id, workoutDate: formattedDate },
            headers: { Authorization: `Bearer ${token}` },
          });
          const completed = response.data.workouts.length > 0;
          return { ...member, completed };
        } catch (error) {
          console.error(`운동 기록 조회 실패 for member ${member.id}`, {
            error,
            status: error.response?.status,
            message: error.response?.data?.message,
          });
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
      {/* CSS를 컴포넌트 내부에 추가 */}
      <style>
        {`
          .profile-img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 10px;
          }
          .member-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .member-item p {
            margin: 0;
          }
        `}
      </style>

      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          formatDay={(locale, date) => date.getDate().toString()}
        />
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
                      <img
                        src={member.profileImageUrl}
                        alt={member.name}
                        className="profile-img"
                      />
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
                      <img
                        src={member.profileImageUrl}
                        alt={member.name}
                        className="profile-img"
                      />
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