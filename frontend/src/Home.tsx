import React, { useState, useEffect } from "react";
import Calendar from "react-calendar"; // react-calendar import
import "react-calendar/dist/Calendar.css"; // Calendar 스타일 import
import "./Home.css"; // 스타일시트 import
import { useNavigate } from "react-router-dom";
import axios from "axios";

// 로컬 날짜를 "yyyy-MM-dd" 형식으로 포맷팅하는 함수
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [date, setDate] = useState(new Date());
  const [image, setImage] = useState<{ [key: string]: string | null }>({});
  const [ptBookings, setPtBookings] = useState<{ [key: string]: boolean }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = "현재 사용자 ID"; // 실제 로그인된 사용자 ID로 변경 필요

    // 오운완 사진 조회
    axios.get(`http://localhost:3000/api/images/workout?userId=${userId}`)
      .then((response) => {
        const fetchedImages: { [key: string]: string } = {};
        response.data.workouts.forEach((workout: { imageUrl: string; createdAt: string }) => {
          fetchedImages[workout.createdAt] = workout.imageUrl;
        });
        setImage(fetchedImages);
      })
      .catch((error) => console.error("오운완 이미지 조회 오류:", error));

    // PT 예약 조회
    axios.get(`http://localhost:3000/api/member/bookings`)
      .then((response) => {
        const fetchedBookings: { [key: string]: boolean } = {};
        response.data.upcomingBookings.forEach((booking: { schedule: { date: string } }) => {
          fetchedBookings[booking.schedule.date] = true;
        });
        setPtBookings(fetchedBookings);
      })
      .catch((error) => console.error("PT 예약 조회 오류:", error));
  }, []);

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
          tileClassName={({ date }) => {
            const dateString = formatLocalDate(date);
            if (image[dateString]) return "has-image";
            return null;
          }}
          tileContent={({ date }) => {
            const dateString = formatLocalDate(date);
            return ptBookings[dateString] ? <span role="img" aria-label="workout">🏋️‍♂️</span> : null;
          }}
        />
      </div>

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