import React, { useState } from "react";
import Calendar from "react-calendar"; // react-calendar import
import "react-calendar/dist/Calendar.css"; // Calendar 스타일 import
import "./Home.css"; // 스타일시트 import

// 로컬 날짜를 "yyyy-MM-dd" 형식으로 포맷팅하는 함수
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [date, setDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<{ [key: string]: string }>({});
  const [image, setImage] = useState<{ [key: string]: string | null }>({});
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState("");

  const handleDateClick = (value: Date) => {
    setDate(value);
    setModalOpen(true);
  };

  const handleWorkoutSelect = (workout: string) => {
    const selectedDate = formatLocalDate(date);
    setWorkouts((prev) => ({ ...prev, [selectedDate]: workout }));
    setSelectedWorkout(workout);
    setModalOpen(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImage((prev) => ({
          ...prev,
          [formatLocalDate(date)]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFeedbackChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback((prev) => ({
      ...prev,
      [formatLocalDate(date)]: event.target.value,
    }));
  };

  return (
    <div className="home-container">
      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          formatDay={(locale, date) => date.getDate().toString()}
          tileClassName={({ date }) => {
            const dateString = formatLocalDate(date);
            if (workouts[dateString]) {
              return `workout-${workouts[dateString]}`;
            }
            return null;
          }}
        />
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>운동을 선택하세요</h2>
            <div className="button-container">
              <button onClick={() => handleWorkoutSelect("상체")}>상체</button>
              <button onClick={() => handleWorkoutSelect("하체")}>하체</button>
              <button onClick={() => handleWorkoutSelect("전신")}>전신</button>
              <button onClick={() => handleWorkoutSelect("유산소")}>유산소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
