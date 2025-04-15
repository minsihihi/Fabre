import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Schedule.css';

// --- Helper Functions ---

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

const timeToMinutes = (time: string): number => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

// --- Type Definitions ---

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
  id: number;
  schedule: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  };
}

interface DayHeader {
  day: string;
  date: Date;
}

interface SelectedSlot {
  scheduleId: number;
  date: string;
  start_time: string;
  end_time: string;
  isBooked: boolean;
}

// --- Main Component ---

const MemberScheduleGrid: React.FC = () => {
  // 주 이동을 위한 상태
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const monday = getMonday(new Date(today.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000));
  const dayHeaders: DayHeader[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    return { day: dayNames[i], date: d };
  });

  // Time slots (09:00 ~ 22:30, 30-minute intervals)
  const hours = Array.from({ length: (22 - 9 + 1) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
  });

  // States
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [isCancelMode, setIsCancelMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  // Fetch trainer, schedule, and bookings
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

  // Find schedule for a specific cell
  const findScheduleByDayAndTime = (dayHeader: DayHeader, time: string): ScheduleItem | undefined => {
    const cellMinutes = timeToMinutes(time);
    return scheduleData.find(item => {
      const itemDateOnly = item.date.split('T')[0] || item.date;
      const headerDateOnly = getDateOnly(dayHeader.date);
      if (itemDateOnly !== headerDateOnly) return false;
      const start = timeToMinutes(item.start_time);
      const end = timeToMinutes(item.end_time);
      return cellMinutes >= start && cellMinutes < end;
    });
  };

  // Find booking for a specific cell
  const findBookingByDayAndTime = (dayHeader: DayHeader, time: string): Booking | undefined => {
    const cellMinutes = timeToMinutes(time);
    return bookings.find(booking => {
      const bookingDateOnly = booking.schedule.date.split('T')[0] || booking.schedule.date;
      const headerDateOnly = getDateOnly(dayHeader.date);
      if (bookingDateOnly !== headerDateOnly) return false;
      const scheduleStart = timeToMinutes(booking.schedule.startTime);
      const scheduleEnd = timeToMinutes(booking.schedule.endTime);
      return cellMinutes >= scheduleStart && cellMinutes < scheduleEnd;
    });
  };

  // Handle cell click
  const handleCellClick = (dayHeader: DayHeader, time: string) => {
    const schedule = findScheduleByDayAndTime(dayHeader, time);
    if (!schedule) return;

    const cellMinutes = timeToMinutes(time);
    const scheduleStartMinutes = timeToMinutes(schedule.start_time);
    // Only allow interaction with the start time of the schedule
    if (cellMinutes !== scheduleStartMinutes) return;

    const myBooking = findBookingByDayAndTime(dayHeader, time);

    if (schedule.isBooked) {
      if (myBooking) {
        // User's own booking: allow cancellation
        setSelectedSlot({
          scheduleId: schedule.id,
          date: schedule.date,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          isBooked: true,
        });
        setIsCancelMode(true);
      } else {
        // Another user's booking
        alert('이미 예약된 스케줄입니다.');
        setSelectedSlot(null);
        setIsCancelMode(false);
      }
    } else {
      // Available slot: allow booking
      setSelectedSlot({
        scheduleId: schedule.id,
        date: schedule.date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        isBooked: false,
      });
      setIsCancelMode(false);
    }
  };

  // Book a schedule
  const handleBookSchedule = async () => {
    if (!selectedSlot) return;
    try {
      const res = await axios.post(
        'http://localhost:3000/api/trainer/schedule/book',
        { scheduleId: selectedSlot.scheduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('예약 성공!');
      setScheduleData(prev =>
        prev.map(item =>
          item.id === selectedSlot.scheduleId ? { ...item, isBooked: true } : item
        )
      );
      setBookings(prev => [
        ...prev,
        {
          id: res.data.bookingId,
          schedule: {
            id: selectedSlot.scheduleId,
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

  // Cancel a booking
  const handleCancelSchedule = async () => {
    if (!selectedSlot) return;
    const booking = bookings.find(b => b.schedule.id === selectedSlot.scheduleId);
    if (!booking) {
      alert('예약 정보를 찾을 수 없습니다.');
      return;
    }
    try {
      await axios.delete(`http://localhost:3000/api/member/bookings/${booking.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('예약 취소 성공!');
      setScheduleData(prev =>
        prev.map(item =>
          item.id === selectedSlot.scheduleId ? { ...item, isBooked: false } : item
        )
      );
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      setSelectedSlot(null);
      setIsCancelMode(false);
    } catch (err: any) {
      console.error('예약 취소 오류:', err);
      alert(err.response?.data?.message || '예약 취소 실패!');
    }
  };

  return (
    <div className="schedule-container">
      {loading ? (
        <p>스케줄을 불러오는 중...</p>
      ) : !trainer ? (
        <p>등록된 트레이너가 없습니다.</p>
      ) : (
        <>
          <h2>트레이너: {trainer.name}</h2>
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
                  {dayHeaders.map(header => (
                    <div key={header.day} className="day-header">
                      {header.day} ({getDateOnly(header.date)})
                    </div>
                  ))}
                  {hours.map(time => (
                    <React.Fragment key={time}>
                      <div className="hour-label">{time}</div>
                      {dayHeaders.map(header => {
                        const cellDateOnly = getDateOnly(header.date);
                        const todayOnly = getDateOnly(new Date());
                        const isPast = cellDateOnly < todayOnly;
                        const schedule = findScheduleByDayAndTime(header, time);
                        const myBooking = findBookingByDayAndTime(header, time);
                        let cellClass = '';
                        if (!schedule) {
                          cellClass = 'empty';
                        } else {
                          cellClass = schedule.isBooked
                            ? myBooking
                              ? 'my-booking'
                              : 'booked'
                            : 'available';
                        }
                        if (isPast) cellClass += ' past';
                        return (
                          <div
                            key={`${header.day}-${time}`}
                            className={`schedule-cell ${cellClass}`}
                            onClick={() => !isPast && handleCellClick(header, time)} // 지난 시간 클릭 비활성화
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

      {/* Booking/Cancellation Modal */}
      {selectedSlot && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {selectedSlot.start_time.slice(0, 5)} ~ {selectedSlot.end_time.slice(0, 5)} 시간에{' '}
              {isCancelMode ? '예약을 취소하시겠습니까?' : '예약하시겠습니까?'}
            </p>
            <button onClick={isCancelMode ? handleCancelSchedule : handleBookSchedule}>
              {isCancelMode ? '예약 취소' : '예약하기'}
            </button>
            <button onClick={() => setSelectedSlot(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberScheduleGrid;