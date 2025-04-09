import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Schedule_trainer.css';

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

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getDayIndex = (korDay: string): number => {
  const map: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
  return map[korDay];
};

const getNearestDateForDay = (dayKor: string, selectedTime?: string): Date => {
  const today = new Date();
  const todayDay = today.getDay();
  const targetDay = getDayIndex(dayKor);
  let diff = (targetDay + 7 - todayDay) % 7;
  if (diff === 0 && selectedTime) {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const selectedMinutes = timeToMinutes(selectedTime);
    if (selectedMinutes <= nowMinutes) {
      diff = 7;
    }
  }
  const resultDate = new Date(today);
  resultDate.setDate(today.getDate() + diff);
  return resultDate;
};

const getDateOnly = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatToTimeWithSeconds = (time: string): string => {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
};

interface ScheduleItem {
  id: number; // 🔥 scheduleId 포함
  date: string;
  start_time: string;
  end_time: string;
}

interface BookingItem {
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
  };
  member: {
    id: number;
    name: string;
  };
}

const TrainerScheduleGrid: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<{ day: string; start: string; end: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; time: string } | null>(null);
  const [hoverRange, setHoverRange] = useState<{ day: string; start: string; end: string } | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [bookingsData, setBookingsData] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null); // 🔥 삭제 대상 스케줄 ID 저장
  const [deleteRange, setDeleteRange] = useState<{ day: string; time: string } | null>(null); // 🔥 팝업에서 사용할 day/time
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const scheduleRes = await axios.get('http://localhost:3000/api/trainer/schedule', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setScheduleData(scheduleRes.data.schedules);

        const bookingsRes = await axios.get('http://localhost:3000/api/trainer/bookings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookingsData(bookingsRes.data.bookings);

        setLoading(false);
      } catch (err) {
        console.error('데이터 조회 오류:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const computeRange = (start: string, end: string) => {
    const times = [start, end].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    return { start: times[0], end: times[1] };
  };

  const handleStart = (day: string, time: string) => {
    // 🔥 이미 등록된 스케줄 클릭 시 → 삭제 팝업
    const existing = findScheduleByDayAndTime(day, time);
    if (existing) {
      setDeleteTargetId(existing.id);
      setDeleteRange({ day, time });
      return;
    }
    setDragging(true);
    setDragStart({ day, time });
    setHoverRange(null);
  };

  const handleMove = (day: string, time: string) => {
    if (!dragging || !dragStart || dragStart.day !== day) return;
    const range = computeRange(dragStart.time, time);
    setHoverRange({ day, ...range });
  };

  const handleEnd = (day: string, time: string) => {
    if (!dragStart || dragStart.day !== day) {
      setDragging(false);
      setDragStart(null);
      setHoverRange(null);
      return;
    }
    let range = computeRange(dragStart.time, time);
    if (range.start === range.end) {
      const startMin = timeToMinutes(range.start);
      range.end = minutesToTime(startMin + 30);
    }
    setSelectedRange({ day, ...range });
    setDragging(false);
    setDragStart(null);
    setHoverRange(null);
  };

  const handleRegisterSchedule = () => {
    if (!selectedRange) return;
    const startMin = timeToMinutes(selectedRange.start);
    const endMin = timeToMinutes(selectedRange.end);
    if (endMin <= startMin) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    const targetDate = getNearestDateForDay(selectedRange.day, selectedRange.start);
    const dateOnly = getDateOnly(targetDate);
    const formattedStart = formatToTimeWithSeconds(selectedRange.start);
    const formattedEnd = formatToTimeWithSeconds(selectedRange.end);

    axios
      .post(
        'http://localhost:3000/api/trainer/schedule',
        {
          date: dateOnly,
          start_time: formattedStart,
          end_time: formattedEnd,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        alert('스케줄 등록 완료!');
        setScheduleData((prev) => [
          ...prev,
          {
            id: res.data.id, // 🔥 백엔드 응답에 id 포함되어야 함
            date: dateOnly,
            start_time: formattedStart,
            end_time: formattedEnd,
          },
        ]);
        setSelectedRange(null);
      })
      .catch((err) => {
        console.error('[스케줄 등록 오류]', err.response?.data || err);
        alert(err.response?.data?.message || '스케줄 등록 실패!');
      });
  };

  // 🔥 삭제 처리
  const handleDeleteSchedule = () => {
    if (!deleteTargetId) return;
    axios
      .delete(`http://localhost:3000/api/trainer/schedule/${deleteTargetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        alert('스케줄이 삭제되었습니다.');
        setScheduleData((prev) => prev.filter((item) => item.id !== deleteTargetId));
        setDeleteTargetId(null);
        setDeleteRange(null);
      })
      .catch((err) => {
        console.error('[스케줄 삭제 오류]', err);
        alert('스케줄 삭제에 실패했습니다.');
      });
  };

  // 🔥 특정 셀에 해당하는 등록된 스케줄 찾기
  const findScheduleByDayAndTime = (day: string, time: string): ScheduleItem | undefined => {
    const cellMinutes = timeToMinutes(time);
    return scheduleData.find((item) => {
      const date = new Date(item.date);
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      const start = timeToMinutes(item.start_time);
      const end = timeToMinutes(item.end_time);
      return dayName === day && cellMinutes >= start && cellMinutes < end;
    });
  };

  const isRegistered = (day: string, time: string): boolean => !!findScheduleByDayAndTime(day, time);

  const isBookedByMember = (day: string, time: string): boolean => {
    const cellMinutes = timeToMinutes(time);
    return bookingsData.some((booking) => {
      const scheduleDate = new Date(booking.schedule.date);
      const koreanDay = ['일', '월', '화', '수', '목', '금', '토'][scheduleDate.getDay()];
      const scheduleStart = timeToMinutes(booking.schedule.startTime);
      const scheduleEnd = timeToMinutes(booking.schedule.endTime);
      return koreanDay === day && cellMinutes >= scheduleStart && cellMinutes < scheduleEnd;
    });
  };

  return (
    <div className="schedule-container">
      <h1>📅 T R A I N E R - S C H E D U L E</h1>
      {loading ? (
        <p>스케줄을 불러오는 중...</p>
      ) : (
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
                      const isSelected =
                        selectedRange &&
                        selectedRange.day === day &&
                        time >= selectedRange.start &&
                        time < selectedRange.end;
                      const isHovering =
                        hoverRange &&
                        hoverRange.day === day &&
                        time >= hoverRange.start &&
                        time < hoverRange.end;
                      const isAlreadyRegistered = isRegistered(day, time);
                      const isBooked = isBookedByMember(day, time);
                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`schedule-cell 
                            ${isSelected ? 'selected' : ''} 
                            ${isHovering ? 'hovering' : ''} 
                            ${isBooked ? 'booked' : isAlreadyRegistered ? 'registered' : ''}`}
                          onMouseDown={() => handleStart(day, time)}
                          onMouseEnter={() => handleMove(day, time)}
                          onMouseUp={() => handleEnd(day, time)}
                          onTouchStart={() => handleStart(day, time)}
                          onTouchMove={() => handleMove(day, time)}
                          onTouchEnd={() => handleEnd(day, time)}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRange && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {selectedRange.day} {selectedRange.start} ~ {selectedRange.end} 시간에 스케줄 등록할까요?
            </p>
            <button onClick={handleRegisterSchedule}>네</button>
            <button onClick={() => setSelectedRange(null)}>취소</button>
          </div>
        </div>
      )}

      {/* 🔥 삭제 확인 모달 */}
      {deleteTargetId && deleteRange && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {deleteRange.day} {deleteRange.time} 시간의 스케줄을 닫으시겠습니까?
            </p>
            <button onClick={handleDeleteSchedule}>네</button>
            <button onClick={() => {
              setDeleteTargetId(null);
              setDeleteRange(null);
            }}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerScheduleGrid;
