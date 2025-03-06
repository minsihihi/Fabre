import React, { useState } from 'react';
import './App.css';

const hours = Array.from({ length: 10 }, (_, i) => i + 9);
const days = ['월', '화', '수', '목', '금', '토', '일'];

const ReservationGrid: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleCellClick = (day: string, hour: number) => {
    const timeSlot = `${day} ${hour}:00`;
    setSelectedTime(timeSlot);
  };

  const handleReservation = () => {
    alert(`${selectedTime} 예약 완료!`);
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
              <div key={day} className="day-header">
                {day}
              </div>
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
            <h2>오운완 인증 📸</h2>
            <input type="file" accept="image/*" />
          </div>

          <div className="schedule-box">
            <h2>운동 일지 📝</h2>
            <textarea
              placeholder="오늘의 운동 내용을 적어보세요..."
              rows={5}
            ></textarea>
          </div>
        </div>
      </div>

      {selectedTime && (
        <div className="modal">
          <div className="modal-content">
            <p>{selectedTime} 예약하시겠습니까?</p>
            <button onClick={handleReservation}>네</button>
            <button onClick={() => setSelectedTime(null)}>아니오</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationGrid;