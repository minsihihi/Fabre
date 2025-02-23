import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css"; // 스타일 추가

// 로컬 날짜를 "yyyy-MM-dd" 형식으로 포맷팅하는 함수
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SchedulePage() {
  const [date, setDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<{ [key: string]: string }>({});
  const [image, setImage] = useState<{ [key: string]: string | null }>({});
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false); // 모달 열기 상태
  const [selectedWorkout, setSelectedWorkout] = useState(""); // 선택된 운동

  // 운동 선택 팝업을 여는 함수
  const handleDateClick = (value: Date) => {
    setDate(value); // 선택한 날짜 저장
    setModalOpen(true); // 모달 열기
  };

  // 운동 버튼 클릭 시 선택된 운동 저장
  const handleWorkoutSelect = (workout: string) => {
    const selectedDate = formatLocalDate(date);
    setWorkouts((prev) => ({ ...prev, [selectedDate]: workout }));
    setSelectedWorkout(workout);
    setModalOpen(false); // 모달 닫기
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
    <div className="schedule-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📅 S C H E D U L E</h1>

      <div className="schedule-main">
        {/* 왼쪽: 달력 */}
        <div className="left-calendar">
          <Calendar
            onChange={setDate}
            value={date}
            onClickDay={handleDateClick}
            tileContent={({ date }) => {
              const selectedDate = formatLocalDate(date);
              return workouts[selectedDate] ? (
                <p className="text-blue-500 text-sm">{workouts[selectedDate]}</p>
              ) : null;
            }}
          />
        </div>

        {/* 오른쪽: 오운완 사진 업로드 & 운동 일지 */}
        <div className="right-content">
          <div className="schedule-box">
            <h2>📸 오운완 사진</h2>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {image[formatLocalDate(date)] && (
              <img
                src={image[formatLocalDate(date)]!}
                alt="운동 사진"
              />
            )}
          </div>

          <div className="schedule-box">
            <h2>📝 운동 일지</h2>
            <textarea
              rows={3}
              placeholder="고통 부위, 정도 등을 입력하세요."
              value={feedback[formatLocalDate(date)] || ""}
              onChange={handleFeedbackChange}
            />
          </div>
        </div>
      </div>

      {/* 운동 선택 모달 */}
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
