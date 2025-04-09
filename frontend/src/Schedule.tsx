import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Schedule.css';

const days = ['월', '화', '수', '목', '금', '토', '일'];
const hours = Array.from({ length: (22 - 9 + 1) * 2 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

const timeToMinutes = (time: string): number => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const getDayIndex = (korDay: string): number => {
  const map: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
  return map[korDay];
};

interface Trainer {
  id: number;
  name: string;
}

interface ScheduleItem {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  isBooked: boolean;
}

interface Booking {
  schedule: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  };
}

const MemberScheduleGrid: React.FC = () => {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const trainerRes = await axios.get('http://localhost:3000/api/member/trainer', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTrainer(trainerRes.data.trainer);

        if (trainerRes.data.trainer?.id) {
          const scheduleRes = await axios.get(
            `http://localhost:3000/api/trainer/schedule/${trainerRes.data.trainer.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setScheduleData(scheduleRes.data.schedule);

          const bookingsRes = await axios.get('http://localhost:3000/api/member/bookings', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setBookings(bookingsRes.data.upcomingBookings);
        }
        setLoading(false);
      } catch (err) {
        console.error('데이터 조회 오류:', err);
        alert('데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleBookSchedule = async () => {
    if (!selectedSlot) return;

    try {
      const res = await axios.post(
        'http://localhost:3000/api/trainer/schedule/book',
        { scheduleId: selectedSlot.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('예약 성공!');
      setScheduleData((prev) =>
        prev.map((item) =>
          item.id === selectedSlot.id ? { ...item, isBooked: true } : item
        )
      );
      setBookings((prev) => [
        ...prev,
        {
          schedule: {
            id: selectedSlot.id,
            date: selectedSlot.date,
            startTime: selectedSlot.start_time,
            endTime: selectedSlot.end_time,
          },
        },
      ]);
      setSelectedSlot(null);
    } catch (err: any) {
      console.error('예약 오류:', err);
      alert(err.response?.data?.message || '예약 실패!');
    }
  };

  const isScheduled = (day: string, time: string): { isBooked: boolean; scheduleId?: number; isStart?: boolean } => {
    const cellMinutes = timeToMinutes(time);
    for (const item of scheduleData) {
      const scheduleDate = new Date(item.date);
      const koreanDay = ['일', '월', '화', '수', '목', '금', '토'][scheduleDate.getDay()];
      const startMinutes = timeToMinutes(item.start_time);
      const endMinutes = timeToMinutes(item.end_time);
      if (
        koreanDay === day &&
        cellMinutes >= startMinutes &&
        cellMinutes < endMinutes
      ) {
        const isStart = cellMinutes === startMinutes; // 🔥 클릭한 시간이 시작 시간일 때만 예약 가능
        return { isBooked: item.isBooked, scheduleId: item.id, isStart };
      }
    }
    return { isBooked: false };
  };

  const handleCellClick = (day: string, time: string) => {
    const { isBooked, scheduleId, isStart } = isScheduled(day, time);
    if (!isBooked && scheduleId && isStart) {
      const slot = scheduleData.find((item) => item.id === scheduleId);
      if (slot) {
        setSelectedSlot(slot);
      }
    }
  };

  return (
    <div className="schedule-container">
      <h1>📅 M E M B E R - S C H E D U L E</h1>
      {loading ? (
        <p>스케줄을 불러오는 중...</p>
      ) : !trainer ? (
        <p>등록된 트레이너가 없습니다.</p>
      ) : (
        <>
          <h2>트레이너: {trainer.name}</h2>
          <div className="scroll-wrapper">
            <div className="schedule-main">
              <div className="left-calendar">
                <div className="schedule-grid">
                  <div className="empty-cell" />
                  {days.map((day) => (
                    <div key={day} className="day-header">
                      {day}
                    </div>
                  ))}
                  {hours.map((time) => (
                    <React.Fragment key={time}>
                      <div className="hour-label">{time}</div>
                      {days.map((day) => {
                        const { isBooked, scheduleId, isStart } = isScheduled(day, time);
                        return (
                          <div
                            key={`${day}-${time}`}
                            className={`schedule-cell ${
                              isBooked
                                ? 'booked'
                                : isStart && scheduleId
                                ? 'available'
                                : ''
                            }`}
                            onClick={() => handleCellClick(day, time)}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedSlot && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {selectedSlot.start_time.slice(0, 5)} ~{' '}
              {selectedSlot.end_time.slice(0, 5)} 시간에 예약하시겠습니까?
            </p>
            <button onClick={handleBookSchedule}>예약</button>
            <button onClick={() => setSelectedSlot(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberScheduleGrid;
