import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Home.css";

interface UserInfo {
  id: number;
  login_id: string;
  name: string;
  role: string;
}

interface WorkoutSchedule {
  id: number;
  workoutTime: string;
  days: string; // 요일이 문자열로 저장됨 (예: "Monday,Wednesday,Friday")
}

const dayMap: { [key: number]: string } = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

export default function WorkoutTable() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [workoutTimes, setWorkoutTimes] = useState<{ [key: number]: string }>({});
  const [schedules, setSchedules] = useState<{ [key: number]: WorkoutSchedule }>({});
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const token = localStorage.getItem("token");

  // 사용자 정보 조회
  useEffect(() => {
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    axios
      .get("http://localhost:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("사용자 정보 조회 성공:", res.data);
        setUserInfo(res.data);
      })
      .catch((err) => {
        console.error("사용자 정보 조회 실패:", err);
        if (err.response?.status === 401) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        }
      });
  }, [token]);

  // 운동 스케줄 조회
  useEffect(() => {
    if (!userInfo) return;
    axios
      .get(`http://localhost:3000/api/workout-schedule/${userInfo.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const fetchedSchedules: WorkoutSchedule[] = res.data;
        const dayScheduleMap: { [key: number]: WorkoutSchedule } = {};
        const times: { [key: number]: string } = {};
        const daysWithSchedules: number[] = [];

        fetchedSchedules.forEach((schedule) => {
          const dayNums = schedule.days
            .split(",")
            .map((day) => {
              const found = Object.entries(dayMap).find(([, v]) => {
                const enDay =
                  v === "일"
                    ? "Sunday"
                    : v === "월"
                    ? "Monday"
                    : v === "화"
                    ? "Tuesday"
                    : v === "수"
                    ? "Wednesday"
                    : v === "목"
                    ? "Thursday"
                    : v === "금"
                    ? "Friday"
                    : v === "토"
                    ? "Saturday"
                    : "";
                return enDay === day.trim();
              });
              return found ? Number(found[0]) : null;
            })
            .filter((num): num is number => num !== null);

          dayNums.forEach((dayNum) => {
            dayScheduleMap[dayNum] = schedule;
            times[dayNum] = schedule.workoutTime;
            daysWithSchedules.push(dayNum);
          });
        });

        console.log("운동 스케줄 조회 성공:", fetchedSchedules);
        setSchedules(dayScheduleMap);
        setWorkoutTimes(times);
        setSelectedDays(daysWithSchedules);
      })
      .catch((err) => {
        console.error("운동 스케줄 불러오기 실패:", err);
      });
  }, [userInfo, token]);

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
      alert("사용자 정보가 없습니다. 로그인해 주세요.");
      return;
    }
    if (selectedDays.length === 0) {
      alert("최소 하나의 요일을 선택해 주세요.");
      return;
    }

    // 선택된 요일에 대해 유효한 시간 입력 확인
    const invalidDays = selectedDays.filter((day) => !workoutTimes[day]);
    if (invalidDays.length > 0) {
      alert("모든 선택된 요일에 운동 시간을 입력해 주세요.");
      return;
    }

    try {
      // 각 요일에 대해 개별적으로 API 호출
      for (const day of selectedDays) {
        const workoutTime = workoutTimes[day];
        const payload = {
          userId: userInfo.id,
          workoutTime, // 해당 요일의 시간
          days: [day], // 단일 요일 배열
        };

        await axios.post("http://localhost:3000/api/workout-schedule", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`${dayMap[day]}요일 등록 성공`);
      }

      alert("운동 시간 등록 완료!");
      window.location.reload();
    } catch (err: any) {
      console.error("등록 오류:", err);
      alert(err.response?.data?.message || "운동 시간 등록 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = () => {
    if (selectedDays.length === 0) {
      alert("수정할 요일을 선택해 주세요.");
      return;
    }

    selectedDays.forEach((day) => {
      const schedule = schedules[day];
      const workoutTime = workoutTimes[day];

      if (schedule && workoutTime) {
        axios
          .put(
            `http://localhost:3000/api/workout-schedule/${schedule.id}`,
            {
              workoutTime,
              days: [day], // 숫자 배열로 전송
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .then(() => {
            console.log(`${dayMap[day]}요일 수정 완료`);
          })
          .catch((err) => {
            console.error(`${dayMap[day]} 수정 오류:`, err);
          });
      }
    });

    alert("수정 완료!");
    window.location.reload();
  };

  const handleDelete = () => {
    if (selectedDays.length === 0) {
      alert("삭제할 요일을 선택해 주세요.");
      return;
    }

    selectedDays.forEach((day) => {
      const schedule = schedules[day];
      if (schedule) {
        axios
          .delete(`http://localhost:3000/api/workout-schedule/${schedule.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then(() => {
            console.log(`${dayMap[day]} 삭제 완료`);
          })
          .catch((err) => {
            console.error(`${dayMap[day]} 삭제 오류:`, err);
          });
      }
    });

    alert("삭제 완료!");
    window.location.reload();
  };

  return (
    <div className="table-container">
      <h2>요일별 운동시간 설정</h2>
      <table className="workout-table">
        <thead>
          <tr>
            <th>선택</th>
            <th>요일</th>
            <th>운동 시간</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(dayMap).map(([key, label]) => {
            const day = parseInt(key);
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