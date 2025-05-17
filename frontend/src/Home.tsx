import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Home.css";

// --- Helper Functions ---

const dayMap: { [key: number]: string } = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// --- Type Definitions ---

interface UserInfo {
  id: number;
  login_id: string;
  name: string;
  role: string;
}

interface WorkoutSchedule {
  id: number;
  workoutTime: string;
  days: string;
}

interface AttendanceData {
  date: string;
  hasImage: boolean;
}

// --- MiniCalendar Component ---

const MiniCalendar: React.FC<{ year: number; month: number; attendance: AttendanceData[]; }> = ({ year, month, attendance }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleString("ko-KR", { month: "long" });

  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="mini-calendar">
      <h3 className="calendar-title">{`${year}년 ${monthName}`}</h3>
      <div className="calendar-header">
        {Object.values(dayMap).map((day, index) => (
          <div key={index} className="day-name">
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-body">
        {emptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-cell empty" />
        ))}
        {dates.map((date) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
            date
          ).padStart(2, "0")}`;
          const hasImage = attendance.find((a) => a.date === dateStr)?.hasImage || false;
          return (
            <div
              key={dateStr}
              className={`calendar-cell ${hasImage ? "attended" : ""}`}
              title={hasImage ? "오운완 이미지 등록됨" : undefined}
            >
              {date}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main Component ---

export default function WorkoutTable() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [workoutTimes, setWorkoutTimes] = useState<{ [key: number]: string }>({});
  const [schedules, setSchedules] = useState<{ [key: number]: WorkoutSchedule }>({});
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<{
    prevMonth: AttendanceData[];
    currentMonth: AttendanceData[];
    nextMonth: AttendanceData[];
  }>({ prevMonth: [], currentMonth: [], nextMonth: [] });
  const token = localStorage.getItem("token");

  // 내 정보 조회
  useEffect(() => {
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    axios
      .get("http://13.209.19.146:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("유저 정보 조회 성공:", res.data);
        setUserInfo(res.data);
      })
      .catch((err) => {
        console.error("유저 정보 조회 실패:", err);
        if (err.response?.status === 401)
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      });
  }, [token]);

  // 스케줄 조회 함수
  const fetchSchedules = async () => {
    if (!userInfo) return;
    try {
      const res = await axios.get<WorkoutSchedule[]>(
        `http://13.209.19.146:3000/api/workout-schedule/${userInfo.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("스케줄 조회 성공:", res.data);
      const fetched = res.data;
      const mapRes: { [key: number]: WorkoutSchedule } = {};
      const times: { [key: number]: string } = {};
      const days: number[] = [];

      fetched.forEach((s) => {
        s.days.split(",").forEach((d) => {
          const idx = Object.entries(dayMap).find(([, v]) => v === d)?.[0];
          if (idx != null) {
            const num = Number(idx);
            mapRes[num] = s;
            times[num] = s.workoutTime;
            days.push(num);
          }
        });
      });

      setSchedules(mapRes);
      setWorkoutTimes(times);
      setSelectedDays(days);
    } catch (e) {
      console.error("스케줄 조회 에러:", e);
    }
  };

  // 출석 데이터 조회
  const fetchAttendance = async () => {
    if (!userInfo) return;
    const now = new Date();
    const months = [
      new Date(now.getFullYear(), now.getMonth() - 1),
      now,
      new Date(now.getFullYear(), now.getMonth() + 1),
    ];
    const results = await Promise.all(
      months.map(async (m) => {
        const year = m.getFullYear();
        const month0 = m.getMonth();
        const maxDay = new Date(year, month0 + 1, 0).getDate();
        const list: AttendanceData[] = [];
        for (let d = 1; d <= maxDay; d++) {
          const dateStr = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(
            d
          ).padStart(2, "0")}`;
          try {
            const resp = await axios.get(
              `http://13.209.19.146:3000/api/images/workout?userId=${userInfo.id}&workoutDate=${dateStr}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            list.push({ date: dateStr, hasImage: resp.data.workouts.length > 0 });
          } catch {
            list.push({ date: dateStr, hasImage: false });
          }
        }
        return list;
      })
    );
    console.log("출석 데이터 조회 완료");
    setAttendance({ prevMonth: results[0], currentMonth: results[1], nextMonth: results[2] });
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (userInfo) {
      fetchSchedules();
      fetchAttendance();
    }
  }, [userInfo]);

  // 핸들러
  const handleTimeChange = (day: number, value: string) => {
    setWorkoutTimes((prev) => ({ ...prev, [day]: value }));
  };

  const handleCheckboxChange = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleRegister = async () => {
    if (!userInfo) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (selectedDays.length === 0) {
      alert("요일을 선택해 주세요.");
      return;
    }
    try {
      const responses = await Promise.all(
        selectedDays.map((day) => {
          const time = workoutTimes[day];
          if (!time) throw new Error("시간을 입력해 주세요.");
          return axios.post(
            `http://13.209.19.146:3000/api/workout-schedule`,
            { userId: userInfo.id, workoutTime: time, days: [day] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );
      console.log("등록 응답:", responses.map(r => r.data));
      alert("등록 완료");
      fetchSchedules();
    } catch (e: any) {
      console.error("등록 실패:", e);
      alert(e.message || e.response?.data?.message || "등록 실패");
    }
  };

  const handleUpdate = async () => {
    try {
      const responses = await Promise.all(
        selectedDays.map((day) => {
          const sched = schedules[day];
          const time = workoutTimes[day];
          if (sched && time) {
            return axios.put(
              `http://13.209.19.146:3000/api/workout-schedule/${sched.id}`,
              { workoutTime: time, days: [day] },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
          return Promise.resolve(null);
        })
      );
      console.log("수정 응답:", responses.filter(r => r)?.map(r => r!.data));
      alert("수정 완료");
      fetchSchedules();
    } catch (e) {
      console.error("수정 실패:", e);
      alert("수정 실패");
    }
  };

  const handleDelete = async () => {
    try {
      const responses = await Promise.all(
        selectedDays.map((day) => {
          const sched = schedules[day];
          if (sched) {
            return axios.delete(
              `http://13.209.19.146:3000/api/workout-schedule/${sched.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
          return Promise.resolve(null);
        })
      );
      console.log("삭제 응답:", responses.filter(r => r)?.map(r => r!.data));
      alert("삭제 완료");
      setSelectedDays([]);
      fetchSchedules();
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제 실패");
    }
  };

  // 렌더링
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="table-container">
      <h2>
        {userInfo
          ? `안녕하세요, ${userInfo.name}님 👋`
          : "요일별 운동시간 설정"}
      </h2>
      <div className="calendar-container">
        <MiniCalendar
          year={prev.getFullYear()}
          month={prev.getMonth()}
          attendance={attendance.prevMonth}
        />
        <MiniCalendar
          year={now.getFullYear()}
          month={now.getMonth()}
          attendance={attendance.currentMonth}
        />
        <MiniCalendar
          year={next.getFullYear()}
          month={next.getMonth()}
          attendance={attendance.nextMonth}
        />
      </div>

      <table className="workout-table">
        <thead>
          <tr>
            <th>선택</th>
            <th>요일</th>
            <th>시간</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(dayMap).map(([key, label]) => {
            const day = Number(key);
            return (
              <tr key={day}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => handleCheckboxChange(day)}
                  />
                </td>
                <td>{label}</td>
                <td>
                  <input
                    type="time"
                    value={workoutTimes[day] || ""}
                    onChange={(e) => handleTimeChange(day, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="action-buttons">
        <button onClick={handleRegister}>등록</button>
        <button onClick={handleUpdate}>수정</button>
        <button onClick={handleDelete}>삭제</button>
      </div>
    </div>
  );
}