import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import './App.css';

const hours = Array.from({ length: 10 }, (_, i) => i + 9);
const days = ['월', '화', '수', '목', '금', '토', '일'];

function formatTimeSlot(day: string, hour: number): string {
  return `${day} ${hour}:00`;
}

const ReservationGrid: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [workoutImage, setWorkoutImage] = useState<string | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [openSlots, setOpenSlots] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('토큰이 없습니다!');
      return;
    }
  
    // 1. 로그인한 사용자 정보 가져오기
    axios
      .get('http://localhost:3000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const userData = res.data;
        console.log('로그인 사용자 정보:', userData);
  
        // 2. 트레이너 정보 조회
        axios
          .get('http://localhost:3000/api/member/trainer', {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((trainerRes) => {
            setTrainerInfo(trainerRes.data.trainer);
            console.log('트레이너 정보:', trainerRes.data.trainer);
  
            // 3. 트레이너 스케줄 가져오기
            const trainerId = trainerRes.data.trainer.id;
            axios
              .get(`http://localhost:3000/api/trainer/schedule/${trainerId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .then((scheduleRes) => {
                console.log("✅ 트레이너 스케줄 연동 성공:", scheduleRes.data);
                const fetchedSchedule = scheduleRes.data.schedule || scheduleRes.data;
                const now = new Date();
  
                const upcomingSchedule = fetchedSchedule.filter((item: any) => {
                  const endDateTime = new Date(`${item.date}T${item.end_time}`);
                  return endDateTime > now;
                });
                setScheduleData(upcomingSchedule);
  
                const slots: { [key: string]: boolean } = {};
                upcomingSchedule.forEach((item: any) => {
                  if (!item.date || !item.start_time) return;
                  const date = new Date(item.date);
                  const dayIndex = date.getDay();
                  const day = days[(dayIndex + 6) % 7];
                  const hour = parseInt(item.start_time.split(':')[0], 10);
                  slots[`${day}-${hour}`] = true;
                });
                setOpenSlots(slots);
              })
              .catch((err) => console.error('스케줄 조회 오류:', err));
          })
          .catch((err) => console.error('트레이너 정보 조회 오류:', err));
      })
      .catch((err) => {
        console.error('사용자 정보 조회 오류:', err);
      });
  
    // 4. 예약 조회
    axios
      .get('http://localhost:3000/api/member/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setBookings(response.data.upcomingBookings);
      })
      .catch((error) => {
        console.error('예약 조회 오류:', error);
      });
  
    // 5. 오운완 이미지 조회
    const workoutDate = new Date().toISOString().slice(0, 10);
    const userId = localStorage.getItem("userId"); // userId를 쿼리로 전달
    if (!userId) {
      console.warn("❗ userId가 없습니다.");
      return;
    }
    axios
      .get('http://localhost:3000/api/images/workout', {
        params: { userId, workoutDate },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.workouts && res.data.workouts.length > 0) {
          setWorkoutImage(res.data.workouts[0].imageUrl);
        } else {
          setWorkoutImage(null);
        }
      })
      .catch((error) => {
        console.error('오운완 이미지 조회 오류:', error);
        setWorkoutImage(null);
      });
  }, []);
  
  const handleCellClick = (day: string, hour: number) => {
    const timeSlot = formatTimeSlot(day, hour);
    setSelectedTime(timeSlot);
  };
  
  const handleReservation = () => {
    if (!selectedTime) return;
  
    const selectedSchedule = scheduleData.find((slot) => {
      const slotTime = `${slot.date} ${slot.start_time.split(':')[0]}:00`;
      return slotTime === selectedTime;
    });
  
    if (!selectedSchedule) {
      alert("해당 시간의 예약 가능한 스케줄이 없습니다.");
      return;
    }
  
    const token = localStorage.getItem('token');
    axios
      .post(
        'http://localhost:3000/api/trainer/schedule/book',
        { scheduleId: selectedSchedule.id },
        {
          headers: { Authorization: `Bearer ${token}` },
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
  
  // ★ 여기가 변경된 부분: 오운완 이미지 업로드 (서버 API 호출)
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const token = localStorage.getItem('token');
      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      try {
        const res = await axios.post("http://localhost:3000/api/upload/workout", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("✅ 이미지 업로드 성공:", res.data);
        // 서버에서 반환된 imageUrl을 반영함
        setWorkoutImage(res.data.imageUrl);
      } catch (error) {
        console.error("❌ 이미지 업로드 실패:", error);
        alert("이미지 업로드에 실패했습니다.");
      }
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
            <h2>오운완 인증 📸</h2>
            {workoutImage ? (
              <img src={workoutImage} alt="오운완 인증" className="image-preview" />
            ) : (
              <div>
                <input type="file" accept="image/*" onChange={handleFileUpload} />
              </div>
            )}
          </div>
          <div className="schedule-box">
            <h2>운동 일지 📝</h2>
            <textarea placeholder="오늘의 운동 내용을 입력하세요..." rows={5}></textarea>
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
