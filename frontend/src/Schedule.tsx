import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css"; // 스타일 추가

export default function SchedulePage() {
  const [date, setDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<{ [key: string]: string }>({});
  const [image, setImage] = useState<{ [key: string]: string | null }>({});
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});

  const handleDateClick = (value: Date) => {
    const selectedDate = value.toISOString().split("T")[0];
    const workout = prompt("운동 계획을 입력하세요:", workouts[selectedDate] || "");
    if (workout !== null) {
      setWorkouts((prev) => ({ ...prev, [selectedDate]: workout }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImage((prev) => ({
          ...prev,
          [date.toISOString().split("T")[0]]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFeedbackChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback((prev) => ({
      ...prev,
      [date.toISOString().split("T")[0]]: event.target.value,
    }));
  };

  return (
    <div className="schedule-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📅 S C H E D U L E</h1>

      {/* 🗓️ 달력 */}
    <div className="calendar-container w-[100%]"> {/* 달력 가로 넓히기 */}
      <Calendar
        onChange={setDate}
        value={date}
        onClickDay={handleDateClick}
        tileContent={({ date }) => {
          const selectedDate = date.toISOString().split("T")[0];
          return workouts[selectedDate] ? (
            <p className="text-blue-500 text-sm">{workouts[selectedDate]}</p>
        ) : null;
      }}
      />
    </div>

      {/* 🏋️‍♂️ 가로 정렬된 날짜, 사진 업로드, 운동 일지 */}
    <div className="schedule-row">
      {/* 📅 선택한 날짜 */}
      <div className="schedule-box">
        <h2>📅 선택한 날짜</h2>
        <p>
          {date.toISOString().split("T")[0]}: {workouts[date.toISOString().split("T")[0]] || "운동 계획 없음"}
        </p>
      </div>

      {/* 📸 오운완 사진 업로드 */}
      <div className="schedule-box">
        <h2>📸 오운완 사진</h2>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {image[date.toISOString().split("T")[0]] && (
          <img src={image[date.toISOString().split("T")[0]]!} alt="운동 사진" />
        )}
      </div>

      {/* 📝 운동 일지 입력란 */}
      <div className="schedule-box">
        <h2>📝 운동 일지</h2>
        <textarea
          rows={3}
          placeholder="고통 부위, 정도 등을 입력하세요."
          value={feedback[date.toISOString().split("T")[0]] || ""}
          onChange={handleFeedbackChange}
        />
      </div>
    </div>

  </div>
  );
}
