import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const days = ['월', '화', '수', '목', '금', '토', '일'];
const hours = Array.from({ length: (22 - 9 + 1) * 2 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m === 0 ? '00' : m}`;
};

const getDayIndex = (korDay: string) => {
  const map = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
  return map[korDay as keyof typeof map];
};

const getNearestDateForDay = (dayKor: string) => {
  const today = new Date();
  const todayDay = today.getDay();
  const targetDay = getDayIndex(dayKor);
  const diff = (targetDay + 7 - todayDay) % 7;
  const resultDate = new Date(today);
  resultDate.setDate(today.getDate() + diff);
  return resultDate;
};

const getDateOnly = (date: Date) => date.toISOString().split('T')[0];

const Schedule: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [openSlots, setOpenSlots] = useState<{ [key: string]: boolean }>({});
  const [mySlots, setMySlots] = useState<{ [key: string]: boolean }>({});
  const [selectedTime, setSelectedTime] = useState<{ day: string; time: string; scheduleId: string } | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('토큰이 없습니다!');
      return;
    }

    axios
      .get('http://localhost:3000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        axios
          .get('http://localhost:3000/api/member/trainer', {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((trainerRes) => {
            setTrainerInfo(trainerRes.data.trainer);
            const trainerId = trainerRes.data.trainer.id;
            axios
              .get(`http://localhost:3000/api/trainer/schedule/${trainerId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .then((scheduleRes) => {
                const fetchedSchedule = scheduleRes.data.schedule || scheduleRes.data;
                const now = new Date();

                const upcomingSchedule = fetchedSchedule.filter((item: any) => {
                  const endDateTime = new Date(`${item.date}T${item.end_time}`);
                  return endDateTime > now;
                });

                setScheduleData(upcomingSchedule);

                const slots: { [key: string]: boolean } = {};
                upcomingSchedule.forEach((item: any) => {
                  const date = new Date(item.date);
                  const dayIndex = date.getDay();
                  const day = days[(dayIndex + 6) % 7];
                  const hour = parseInt(item.start_time.split(':')[0], 10);
                  slots[`${day}-${hour}`] = true;
                });
                setOpenSlots(slots);
              });
          });
      });

    axios
      .get('http://localhost:3000/api/member/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const bookingList = response.data.upcomingBookings || [];
        const my: { [key: string]: boolean } = {};
        bookingList.forEach((item: any) => {
          const date = new Date(item.schedule?.date);
          const dayIndex = date.getDay();
          const day = days[(dayIndex + 6) % 7];
          const hour = parseInt(item.schedule?.start_time.split(':')[0], 10);
          my[`${day}-${hour}`] = true;
        });
        setMySlots(my);
      });
  }, []);

  const handleBook = () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedTime) return;

    axios
      .post(
        'http://localhost:3000/api/trainer/schedule/book',
        { scheduleId: selectedTime.scheduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        alert("예약 성공!");
        setSelectedTime(null);
        window.location.reload();
      })
      .catch((error) => {
        console.error("예약 오류:", error);
        alert("예약 실패");
      });
  };

  const isBookable = (day: string, time: string) => {
    const hour = parseInt(time.split(':')[0], 10);
    return openSlots[`${day}-${hour}`] && !mySlots[`${day}-${hour}`];
  };

  const findScheduleId = (day: string, time: string) => {
    const date = getDateOnly(getNearestDateForDay(day));
    return scheduleData.find((item) => item.date === date && item.start_time.startsWith(time))?.id;
  };

  return (
    <div className="schedule-container">
      <h1>📅 S C H E D U L E</h1>
      <div className="scroll-wrapper">
        <div className="schedule-main">
          <div className="left-calendar">
            <div className="schedule-grid">
              <div className="empty-cell" />
              {days.map((day) => (
                <div key={day} className="day-header">{day}</div>
              ))}

              {hours.map((time) => (
                <React.Fragment key={time}>
                  <div className="hour-label">{time}</div>
                  {days.map((day) => {
                    const bookable = isBookable(day, time);
                    const booked = mySlots[`${day}-${parseInt(time.split(':')[0], 10)}`];
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`schedule-cell ${bookable ? 'hovering' : ''} ${booked ? 'selected' : ''}`}
                        onClick={() => {
                          if (bookable) {
                            const id = findScheduleId(day, time);
                            if (id) setSelectedTime({ day, time, scheduleId: id });
                          }
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedTime && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {selectedTime.day} {selectedTime.time} 시간에 예약할까요?
            </p>
            <button onClick={handleBook}>네</button>
            <button onClick={() => setSelectedTime(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;