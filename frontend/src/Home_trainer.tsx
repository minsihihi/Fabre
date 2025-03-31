import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home.css";
import axios from "axios";

// 날짜 포맷 함수
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TrainerHome() {
  const [date, setDate] = useState(new Date());
  const [members, setMembers] = useState<{ id: string; name: string; completed: boolean }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // 컴포넌트가 마운트되면 트레이너의 회원 목록을 불러옴
  useEffect(() => {
    fetchMembers();
  }, []);

  // 트레이너의 회원 목록 불러오기 (백엔드: /trainer/members)
  const fetchMembers = async () => {
    try {
      const response = await axios.get("/trainer/members");
      const membersData = response.data.data;
      const mappedMembers = membersData.map((member: any) => ({
        id: member.User.id,
        name: member.User.name,
        completed: false,
      }));
      setMembers(mappedMembers);
    } catch (error) {
      console.error("회원 목록 불러오기 실패", error);
    }
  };

  // 선택한 날짜에 대해 각 회원의 운동 기록 조회 후, 완료 여부 업데이트
  const updateMembersCompletion = async (selectedDate: Date) => {
    const formattedDate = formatLocalDate(selectedDate);
    const updatedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const response = await axios.get("/record", { params: { memberId: member.id } });
          const records = response.data.data || [];
          // record.workout_date가 ISO 문자열 형태라고 가정하고, 선택한 날짜와 일치하는지 확인
          const completed = records.some((record: any) => {
            if (record.workout_date) {
              return record.workout_date.startsWith(formattedDate);
            }
            return false;
          });
          return { ...member, completed };
        } catch (error) {
          console.error(`운동 기록 조회 실패 for member ${member.id}`, error);
          return { ...member, completed: false };
        }
      })
    );
    setMembers(updatedMembers);
  };

  // 달력 날짜 클릭 시: 선택 날짜 업데이트, 운동 기록 조회 후 모달 오픈
  const handleDateClick = async (value: Date) => {
    setDate(value);
    await updateMembersCompletion(value);
    setModalOpen(true);
  };

  return (
    <div className="home-container">
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
                    <p key={member.id}>{member.name}</p>
                  ))
                ) : (
                  <p>없음</p>
                )}
              </div>
              <div className="not-completed">
                <h3>운동 미완료 회원</h3>
                {members.filter((m) => !m.completed).length > 0 ? (
                  members.filter((m) => !m.completed).map((member) => (
                    <p key={member.id}>{member.name}</p>
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
