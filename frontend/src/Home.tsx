import React, { useState } from "react";
import Calendar from "react-calendar"; // react-calendar import
import "react-calendar/dist/Calendar.css"; // Calendar 스타일 import
import "./Home.css"; // 스타일시트 import
import { useNavigate } from "react-router-dom";

// 로컬 날짜를 "yyyy-MM-dd" 형식으로 포맷팅하는 함수
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [date, setDate] = useState(new Date());
  // 오운완 사진 상태: key는 "yyyy-MM-dd", value는 이미지 URL (또는 base64 문자열)
  const [image, setImage] = useState<{ [key: string]: string | null }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // 날짜 클릭 시, 해당 날짜를 저장하고 모달을 엽니다.
  const handleDateClick = (value: Date) => {
    setDate(value);
    setModalOpen(true);
  };

  return (
    <div className="home-container">
      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          formatDay={(locale, date) => date.getDate().toString()}
          // 해당 날짜에 이미지가 있으면 "has-image" 클래스를 부여하여 달력에 색상이 칠해집니다.
          tileClassName={({ date }) => {
            const dateString = formatLocalDate(date);
            return image[dateString] ? "has-image" : null;
          }}
        />
      </div>

      {/* 모달: 클릭한 날짜의 오운완 사진이 있으면 보여주고, 없으면 "운동하러 가기" 버튼을 표시 */}
      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            {image[formatLocalDate(date)] ? (
              <div>
                <h2>{formatLocalDate(date)} 오운완 인증</h2>
                <img
                  src={image[formatLocalDate(date)] as string}
                  alt="오운완 사진"
                  className="image-preview"
                />
                <button onClick={() => setModalOpen(false)}>닫기</button>
              </div>
            ) : (
              <div>
                <h2>{formatLocalDate(date)}에 오운완 사진이 없습니다!</h2>
                <button onClick={() => navigate("/schedule")}>
                  운동하러 가기 💪
                </button>
                <button onClick={() => setModalOpen(false)}>닫기</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
