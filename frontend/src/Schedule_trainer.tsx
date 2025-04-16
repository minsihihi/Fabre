import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Schedule_trainer.css';

// --- 헬퍼 함수들 ---

const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const getDateOnly = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatToTimeWithSeconds = (time: string): string => {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- 타입 정의 ---

interface DayHeader {
  day: string;
  date: Date;
}

interface ScheduleItem {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface BookingItem {
  id: number;
  status: string;
  createdAt: string;
  member: {
    id: number;
    name: string;
    profileImage?: string | null;
  };
  schedule: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  };
}

interface SelectedRange {
  day: DayHeader;
  start: string;
  end: string;
}

// --- 메인 컴포넌트 ---

const TrainerScheduleGrid: React.FC = () => {
  // 주 이동 상태
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const monday = getMonday(new Date(today.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000));
  const dayHeaders: DayHeader[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    return { day: dayNames[i], date: d };
  });

  // 시간 목록 (9:00 ~ 22:30, 30분 단위)
  const hours = Array.from({ length: (22 - 9 + 1) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
  });

  // 상태들
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: DayHeader; time: string } | null>(null);
  const [hoverRange, setHoverRange] = useState<SelectedRange | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [bookingsData, setBookingsData] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteRange, setDeleteRange] = useState<{ day: DayHeader; time: string } | null>(null);
  const [bookingModal, setBookingModal] = useState<BookingItem | null>(null);

  const token = localStorage.getItem('token');

  // 데이터 가져오기 함수
  const fetchData = async () => {
    try {
      const scheduleRes = await axios.get('http://localhost:3000/api/trainer/schedule', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setScheduleData(scheduleRes.data.schedules);

      const bookingsRes = await axios.get('http://localhost:3000/api/trainer/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookingsData(
        bookingsRes.data.bookings.filter((booking: BookingItem) => booking.status !== 'cancelled')
      );

      setLoading(false);
    } catch (err) {
      console.error('데이터 조회 오류:', err);
      setLoading(false);
    }
  };

  // 최초 데이터 조회 및 주기적 재조회
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // 선택 영역 계산
  const computeRange = (start: string, end: string) => {
    const times = [start, end].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    return { start: times[0], end: times[1] };
  };

  // 예약 정보 찾기
  const findBookingByDayAndTime = (day: DayHeader, time: string): BookingItem | undefined => {
    const cellMinutes = timeToMinutes(time);
    return bookingsData.find((booking) => {
      if (booking.status === 'cancelled') return false;
      const bookingDateOnly = booking.schedule.date.split('T')[0] || booking.schedule.date;
      const dayDateOnly = getDateOnly(day.date);
      if (bookingDateOnly !== dayDateOnly) return false;
      const scheduleStart = timeToMinutes(booking.schedule.startTime);
      const scheduleEnd = timeToMinutes(booking.schedule.endTime);
      return cellMinutes >= scheduleStart && cellMinutes < scheduleEnd;
    });
  };

  // 스케줄 찾기
  const findScheduleByDayAndTime = (day: DayHeader, time: string): ScheduleItem | undefined => {
    const cellMinutes = timeToMinutes(time);
    return scheduleData.find((item) => {
      const itemDateOnly = item.date.split('T')[0] || item.date;
      const dayDateOnly = getDateOnly(day.date);
      if (itemDateOnly !== dayDateOnly) return false;
      const start = timeToMinutes(item.start_time);
      const end = timeToMinutes(item.end_time);
      return cellMinutes >= start && cellMinutes < end;
    });
  };

  const isRegistered = (day: DayHeader, time: string): boolean =>
    !!findScheduleByDayAndTime(day, time);

  const isBookedByMember = (day: DayHeader, time: string): boolean => {
    const cellMinutes = timeToMinutes(time);
    return bookingsData.some((booking) => {
      if (booking.status === 'cancelled') return false;
      const bookingDateOnly = booking.schedule.date.split('T')[0] || booking.schedule.date;
      const dayDateOnly = getDateOnly(day.date);
      if (bookingDateOnly !== dayDateOnly) return false;
      const scheduleStart = timeToMinutes(booking.schedule.startTime);
      const scheduleEnd = timeToMinutes(booking.schedule.endTime);
      return cellMinutes >= scheduleStart && cellMinutes < scheduleEnd;
    });
  };

  // 마우스 또는 터치 시작
  const handleStart = (day: DayHeader, time: string) => {
    const booking = findBookingByDayAndTime(day, time);
    if (booking) {
      setBookingModal(booking);
      return;
    }
    const existing = findScheduleByDayAndTime(day, time);
    if (existing) {
      setDeleteTargetId(existing.id);
      setDeleteRange({ day, time });
      return;
    }
    const cellDateOnly = getDateOnly(day.date);
    const todayOnly = getDateOnly(new Date());
    if (cellDateOnly < todayOnly) {
      return;
    }
    setDragging(true);
    setDragStart({ day, time });
    setHoverRange(null);
  };

  // 마우스 이동
  const handleMove = (day: DayHeader, time: string) => {
    if (!dragging || !dragStart || dragStart.day.day !== day.day) return;
    const range = computeRange(dragStart.time, time);
    setHoverRange({ day, ...range });
  };

  // 마우스 또는 터치 종료
  const handleEnd = (day: DayHeader, time: string) => {
    if (!dragStart || dragStart.day.day !== day.day) {
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

  // 스케줄 등록
  const handleRegisterSchedule = () => {
    if (!selectedRange) return;
    const startMin = timeToMinutes(selectedRange.start);
    const endMin = timeToMinutes(selectedRange.end);
    if (endMin <= startMin) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }
    const cellDateOnly = getDateOnly(selectedRange.day.date);
    const todayOnly = getDateOnly(new Date());
    if (cellDateOnly < todayOnly) {
      alert('지난 날짜의 스케줄은 등록할 수 없습니다.');
      return;
    }
    const dateOnly = getDateOnly(selectedRange.day.date);
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
            id: res.data.id,
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

  // 스케줄 삭제
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

  return (
    <div className="schedule-container">
      <h1>📅 T R A I N E R - S C H E D U L E</h1>
      {loading ? (
        <p>스케줄을 불러오는 중...</p>
      ) : (
        <>
          {/* 주 이동 버튼 추가 */}
          <div className="week-navigation">
            <button onClick={() => setWeekOffset(prev => prev - 1)}>이전 주</button>
            <button onClick={() => setWeekOffset(prev => prev + 1)}>다음 주</button>
          </div>
          <div className="scroll-wrapper">
            <div className="schedule-main">
              <div className="left-calendar">
                <div className="schedule-grid">
                  <div className="empty-cell" />
                  {dayHeaders.map((dayHeader) => (
                    <div key={dayHeader.day} className="day-header">
                      {dayHeader.day} ({getDateOnly(dayHeader.date)})
                    </div>
                  ))}
                  {hours.map((time) => (
                    <React.Fragment key={time}>
                      <div className="hour-label">{time}</div>
                      {dayHeaders.map((dayHeader) => {
                        const dayDateOnly = getDateOnly(dayHeader.date);
                        const todayOnly = getDateOnly(new Date());
                        const isPast = dayDateOnly < todayOnly;
                        const isSelected =
                          selectedRange &&
                          selectedRange.day.day === dayHeader.day &&
                          time >= selectedRange.start &&
                          time < selectedRange.end;
                        const isHovering =
                          hoverRange &&
                          hoverRange.day.day === dayHeader.day &&
                          time >= hoverRange.start &&
                          time < hoverRange.end;
                        const isAlreadyRegistered = isRegistered(dayHeader, time);
                        const isBooked = isBookedByMember(dayHeader, time);
                        return (
                          <div
                            key={`${dayHeader.day}-${time}`}
                            className={`schedule-cell 
                              ${isSelected ? 'selected' : ''} 
                              ${isHovering ? 'hovering' : ''} 
                              ${isBooked ? 'booked' : isAlreadyRegistered ? 'registered' : ''} 
                              ${isPast ? 'past' : ''}`}
                            onMouseDown={() => handleStart(dayHeader, time)}
                            onMouseEnter={() => handleMove(dayHeader, time)}
                            onMouseUp={() => handleEnd(dayHeader, time)}
                            onTouchStart={() => handleStart(dayHeader, time)}
                            onTouchMove={() => handleMove(dayHeader, time)}
                            onTouchEnd={() => handleEnd(dayHeader, time)}
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

      {/* 스케줄 등록 모달 */}
      {selectedRange && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {selectedRange.day.day} {selectedRange.start} ~ {selectedRange.end} 시간에 스케줄 등록할까요?
            </p>
            <button onClick={handleRegisterSchedule}>네</button>
            <button onClick={() => setSelectedRange(null)}>취소</button>
          </div>
        </div>
      )}

      {/* 스케줄 삭제 모달 */}
      {deleteTargetId && deleteRange && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {deleteRange.day.day} {deleteRange.time} 시간의 스케줄을 닫으시겠습니까?
            </p>
            <button onClick={handleDeleteSchedule}>네</button>
            <button
              onClick={() => {
                setDeleteTargetId(null);
                setDeleteRange(null);
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 예약된 셀 모달 */}
      {bookingModal && (
        <div className="modal">
          <div className="modal-content">
            <p>{bookingModal.member.name} 회원이 예약되어 있습니다.</p>
            <button onClick={() => setBookingModal(null)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerScheduleGrid;