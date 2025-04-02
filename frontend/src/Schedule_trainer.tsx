import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const hours = Array.from({ length: 10 }, (_, i) => i + 9);
const days = ['월', '화', '수', '목', '금', '토', '일'];

function formatTimeSlot(day: string, hour: number): string {
  return `${day} ${hour}:00`;
}

const TrainerSchedule: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const trainerId = '1';

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/trainer/schedule/${trainerId}`)
      .then((response) => {
        setScheduleData(response.data.schedule);
      })
      .catch((error) => console.error('스케줄 조회 오류:', error));

    axios
      .get('http://localhost:3000/api/members')
      .then((response) => {
        setMembers(response.data.members);
      })
      .catch((error) => console.error('회원 조회 오류:', error));
  }, [trainerId]);

  const handleCellClick = (day: string, hour: number) => {
    const timeSlot = formatTimeSlot(day, hour);
    setSelectedTime(timeSlot);
  };

  const handleOpenReservation = () => {
    if (!selectedTime) return;
    alert(`${selectedTime} 시간대를 예약 가능하도록 열었습니다.`);
    setSelectedTime(null);
  };

  return (
    <div className="schedule-container">
      <h1>📅 S C H E D U L E</h1>
      <div className="schedule-main">
        <div className="left-calendar">
          <div className="schedule-grid">
            <div className="empty-cell" />
            {days.map((day) => (
              <div key={day} className="day-header">{day}</div>
            ))}
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="hour-label">{hour}:00</div>
                {days.map((day) => (
                  <div
                    key={`${day}-${hour}`}
                    className="schedule-cell"
                    onClick={() => handleCellClick(day, hour)}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="right-content">
          <div className="schedule-box">
            <h2>💁 회원 선택</h2>
            <select onChange={(e) => setSelectedMember(e.target.value)}>
              <option value="">회원 선택</option>
              {members.map((member) => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </div>
          <div className="schedule-box">
            <h2>운동 일지 📝</h2>
            <textarea placeholder="운동 내용을 입력하세요..." rows={5}></textarea>
          </div>
        </div>
      </div>

      {selectedTime && (
        <div className="modal">
          <div className="modal-content">
            <p>{selectedTime} 시간대를 예약 가능하도록 열어놓을까요?</p>
            <button onClick={handleOpenReservation}>네</button>
            <button onClick={() => setSelectedTime(null)}>아니오</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerSchedule;
