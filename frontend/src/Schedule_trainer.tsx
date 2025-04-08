import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9시~18시
const days = ['월', '화', '수', '목', '금', '토', '일'];

function getTrainerIdFromToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
}

const TrainerSchedule: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const trainerId = getTrainerIdFromToken();
  const [openSlots, setOpenSlots] = useState<{ [key: string]: boolean }>({});
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (!trainerId) return;

    const token = localStorage.getItem('token');

        // 스케줄 조회
    axios
    .get(`http://localhost:3000/api/trainer/schedule/${trainerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      const fetchedSchedule = res.data.schedule || res.data;
      
      const now = new Date();
      // 현재 시점 이후의 스케줄만 필터링
      const upcomingSchedule = fetchedSchedule.filter((item: any) => {
        const endDateTime = new Date(`${item.date}T${item.end_time}`);
        console.log('fetchedSchedule:', fetchedSchedule);
        return endDateTime > now;
      });
      
      setScheduleData(upcomingSchedule);
      
      const slots: { [key: string]: boolean } = {};
      upcomingSchedule.forEach((item: any) => {
        // item.date와 item.start_time 필드가 정상적으로 존재해야 함
        if (!item.date || !item.start_time) return;
        const date = new Date(item.date);
        const dayIndex = date.getDay(); // 0(일)~6(토)
        const day = days[(dayIndex + 6) % 7]; // 월요일 기준 변환
        const hour = parseInt(item.start_time.split(':')[0], 10);
        slots[`${day}-${hour}`] = true;
      });
      
      setOpenSlots(slots);
    })
    .catch((err) => console.error('스케줄 조회 오류:', err));
    

    // 회원 조회
    axios
      .get('http://localhost:3000/api/trainer/members', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMembers(
          res.data.data.map((m: any) => ({
            id: m.User.id,
            name: m.User.name,
          }))
        );
      })
      .catch((err) => console.error('회원 조회 오류:', err));
  }, [trainerId]);

  const handleCellClick = (day: string, hour: number) => {
    const key = `${day}-${hour}`;
    const matched = scheduleData.find((item) => {
      const date = new Date(item.date);
      const scheduleDay = days[(date.getDay() + 6) % 7];
      const scheduleHour = parseInt(item.start_time.split(':')[0], 10);
      return scheduleDay === day && scheduleHour === hour;
    });

    if (matched) {
      const confirmed = window.confirm(`${day} ${hour}:00 시간대를 닫으시겠습니까?`);
      if (confirmed) {
        axios
          .delete(`http://localhost:3000/api/trainer/schedule/${matched.id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          })
          .then(() => {
            setOpenSlots((prev) => {
              const updated = { ...prev };
              delete updated[key];
              return updated;
            });
            setScheduleData((prev) => prev.filter((item) => item.id !== matched.id));
            alert(`${day} ${hour}:00 시간대가 삭제되었습니다.`);
          })
          .catch((err) => {
            alert(err?.response?.data?.message || '삭제 실패');
            console.error('삭제 오류:', err);
          });
      }
    } else {
      setSelectedTime(`${day} ${hour}:00`);
    }
  };

  const handleOpenReservation = async () => {
    if (!selectedTime) return;

    const [day, time] = selectedTime.split(' ');
    const hour = parseInt(time.split(':')[0], 10);

    const today = new Date();
    const todayIndex = (today.getDay() + 6) % 7;
    const targetIndex = days.indexOf(day);
    const diff = (targetIndex - todayIndex + 7) % 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    const dateStr = targetDate.toISOString().split('T')[0];

    const body = {
      date: dateStr,
      start_time: `${hour.toString().padStart(2, '0')}:00:00`,
      end_time: `${(hour + 1).toString().padStart(2, '0')}:00:00`,
    };

    try {
      const res = await axios.post('http://localhost:3000/api/trainer/schedule', body, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setOpenSlots((prev) => ({
        ...prev,
        [`${day}-${hour}`]: true,
      }));

      setScheduleData((prev) => [
        ...prev,
        {
          date: dateStr,
          start_time: body.start_time,
          end_time: body.end_time,
          id: Date.now(), // 임시 ID
        },
      ]);

      alert(`${selectedTime} 시간대를 예약 가능하도록 열었습니다.`);
      setSelectedTime(null);
    } catch (error: any) {
      alert(error?.response?.data?.message || '등록 실패');
      console.error('등록 오류:', error);
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
                {days.map((day) => {
                  const key = `${day}-${hour}`;
                  const isOpen = openSlots[key];
                  return (
                    <div
                      key={key}
                      className={`schedule-cell ${isOpen ? 'open-slot' : ''}`}
                      onClick={() => handleCellClick(day, hour)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="right-content">
          <div className="schedule-box">
            <h2>💁 회원 선택</h2>
            <select onChange={(e) => setSelectedMember(e.target.value)} value={selectedMember || ''}>
              <option value="">회원 선택</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="schedule-box">
            <h2>운동 일지 📝</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="운동 내용을 입력하세요..."
              rows={5}
            />
          </div>
        </div>
      </div>

      {selectedTime && (
        <div className="modal">
          <div className="modal-content">
            <p>{selectedTime} 시간대를 예약 가능하도록 열어놓을까요?</p>
            <button onClick={handleOpenReservation}>네</button>
            <button onClick={() => setSelectedTime(null)}>아니오</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerSchedule;