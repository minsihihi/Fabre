import React, { useState } from 'react';
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

const getDateOnly = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const formatToTimeWithSeconds = (time: string) => {
  return `${time}:00`;
};

const TrainerScheduleGrid: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<{ day: string; start: string; end: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; time: string } | null>(null);
  const [hoverRange, setHoverRange] = useState<{ day: string; start: string; end: string } | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  const token = localStorage.getItem('token');

  const computeRange = (start: string, end: string) => {
    const times = [start, end].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    return { start: times[0], end: times[1] };
  };

  const handleStart = (day: string, time: string) => {
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

    const range = computeRange(dragStart.time, time);
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

    // ❗️종료 시간이 시작 시간보다 같거나 이전이면 등록 안 함
    if (endMin <= startMin) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    const targetDate = getNearestDateForDay(selectedRange.day);
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
        setScheduleData((prev) => [...prev, {
          date: dateOnly,
          start_time: formattedStart,
          end_time: formattedEnd,
        }]);
        setSelectedRange(null);
      })
      .catch((err) => {
        console.error('스케줄 등록 오류:', err.response?.data || err);
        alert(err.response?.data?.message || '스케줄 등록 실패!');
      });
  };

  const isRegistered = (day: string, time: string) => {
    const targetDate = getNearestDateForDay(day);
    const dateOnly = getDateOnly(targetDate);
    const currentTime = formatToTimeWithSeconds(time);

    return scheduleData.some(
      (item) =>
        item.date === dateOnly &&
        currentTime >= item.start_time &&
        currentTime < item.end_time
    );
  };

  return (
    <div className="schedule-container">
      <h1>📅 T R A I N E R - S C H E D U L E</h1>

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

                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`schedule-cell ${isSelected ? 'selected' : ''} ${isHovering ? 'hovering' : ''} ${isAlreadyRegistered ? 'registered' : ''}`}
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
    </div>
  );
};

export default TrainerScheduleGrid;

