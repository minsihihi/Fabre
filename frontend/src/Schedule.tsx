import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const hours = Array.from({ length: 10 }, (_, i) => i + 9);
const days = ['월', '화', '수', '목', '금', '토', '일'];

// 예시: "월 9:00" 형식의 시간 문자열 생성 함수
function formatTimeSlot(day: string, hour: number): string {
  return `${day} ${hour}:00`;
}

const ReservationGrid: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  // 오운완 인증 이미지를 저장하는 상태
  const [workoutImage, setWorkoutImage] = useState<string | null>(null);

  // 예시: trainerId와 userId를 상수로 사용 (실제 사용시 로그인 정보 등에서 가져오기)
  const trainerId = '1';
  const userId = '1';

  // 백엔드에서 스케줄 데이터를 가져옵니다.
  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/trainer/schedule/${trainerId}`, {
        headers: {
          // Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        // response.data.schedule를 스케줄 데이터로 가정
        setScheduleData(response.data.schedule);
      })
      .catch((error) => {
        console.error('스케줄 조회 오류:', error);
      });
      
    // 회원의 예약 데이터도 조회 (필요한 경우)
    axios
      .get('http://localhost:3000/api/member/bookings', {
        headers: {
          // Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        // response.data.upcomingBookings를 예약 데이터로 가정
        setBookings(response.data.upcomingBookings);
      })
      .catch((error) => {
        console.error('예약 조회 오류:', error);
      });
      
    // 현재 날짜(또는 원하는 날짜)를 기준으로 오운완 인증 이미지를 조회합니다.
    const workoutDate = new Date().toISOString().slice(0,10); // yyyy-MM-dd
    axios
      .get("http://localhost:3000/api/images/workout", {
        params: { userId, workoutDate }
      })
      .then((res) => {
        if (res.data.workouts && res.data.workouts.length > 0) {
          setWorkoutImage(res.data.workouts[0].imageUrl);
        } else {
          setWorkoutImage(null);
        }
      })
      .catch((error) => {
        console.error("오운완 이미지 조회 오류:", error);
        setWorkoutImage(null);
      });
  }, [trainerId, userId]);

  // 셀 클릭 시, 예약을 위한 시간대를 선택합니다.
  const handleCellClick = (day: string, hour: number) => {
    const timeSlot = formatTimeSlot(day, hour);
    setSelectedTime(timeSlot);
  };

  // 예약 처리: 선택한 시간과 일치하는 스케줄 데이터를 찾아 예약 요청
  const handleReservation = () => {
    if (!selectedTime) return;
    
    // 선택한 시간에 해당하는 스케줄 슬롯을 찾습니다.
    const selectedSchedule = scheduleData.find((slot) => {
      const slotTime = `${slot.date} ${slot.start_time}`; // 실제 데이터 형식에 맞게 수정 필요
      return slotTime === selectedTime;
    });

    if (!selectedSchedule) {
      alert("해당 시간의 예약 가능한 스케줄이 없습니다.");
      return;
    }

    axios
      .post(
        'http://localhost:3000/api/trainer/schedule/book',
        { scheduleId: selectedSchedule.id },
        {
          headers: {
            // Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => {
        alert("예약 성공!");
        setSelectedTime(null);
      })
      .catch((error) => {
        console.error("예약 오류:", error);
        alert("예약 실패");
      });
  };

  // 파일 업로드 핸들러 (오운완 인증 이미지 업로드)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // 파일 업로드 API가 없다면, 우선 로컬 미리보기 처리
      const reader = new FileReader();
      reader.onload = () => {
        const uploadedImage = reader.result as string;
        setWorkoutImage(uploadedImage);
        // 실제 환경에서는 업로드 API 호출 후, 반환된 이미지 URL로 setWorkoutImage 처리
      };
      reader.readAsDataURL(file);
    }
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
            {workoutImage ? (
              <img
                src={workoutImage}
                alt="오운완 인증 사진"
                className="image-preview"
              />
            ) : (
              <div>
                <input type="file" accept="image/*" onChange={handleFileUpload} />
              </div>
            )}
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
