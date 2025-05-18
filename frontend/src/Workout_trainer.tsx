import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Workout_trainer.css";

interface UserInfo {
  id: number;
  login_id: string;
  name: string;
  role: string;
}

interface TrainerMember {
  member: {
    id: number;
    login_id: string;
    name: string;
  };
}

interface WorkoutDetail {
  id: number;
  exercise: {
    id: number;
    name: string;
    category: string;
  };
  sets: number;
  reps: number;
  weight: number;
  note: string;
}

interface WorkoutRecord {
  id: number;
  workout_date: string;
  start_time: string;
  end_time: string;
  total_duration: number;
  workout_details: WorkoutDetail[];
}

const TrainerRecordsPage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserInfo(res.data);
      } catch (err) {
        console.error(err);
        alert("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      }
    };
    fetchUserInfo().finally(() => setIsLoading(false));
  }, [token, navigate]);

  useEffect(() => {
    if (!token || userInfo?.role !== "trainer") return;
    axios
      .get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMembers(res.data.data))
      .catch((err) => console.error("회원 목록 조회 오류:", err));
  }, [token, userInfo]);

  const fetchWorkoutRecords = async (memberId: number) => {
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/record", {
        headers: { Authorization: `Bearer ${token}` },
        params: { memberId },
      });
      setWorkoutRecords(res.data.data || []);
    } catch (err: any) {
      console.error("운동 기록 조회 오류:", err);
      alert(err.response?.data?.message || "운동 기록 조회 실패");
    }
  };

  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedMemberId(id);
    fetchWorkoutRecords(id);
  };

  if (isLoading) return <p>로딩 중...</p>;

  return (
    <div className="trainer-records-container">
      <h1>Workout</h1>

      <div className="member-select-area">
        <label htmlFor="memberSelect">회원 선택: </label>
        <select
          id="memberSelect"
          value={selectedMemberId ?? ""}
          onChange={handleMemberChange}
        >
          <option value="" disabled>
            -- 회원 선택 --
          </option>
          {members.map((m) => (
            <option key={m.member.id} value={m.member.id}>
              {m.member.name} ({m.member.login_id})
            </option>
          ))}
        </select>
      </div>

      <div className="records-list">
        {workoutRecords.length > 0 ? (
          workoutRecords.map((r) => (
            <div key={r.id} className="record-item">
              <p>날짜: {r.workout_date}</p>
              <p>
                시간: {r.start_time} - {r.end_time} ({r.total_duration}분)
              </p>
              <div className="detail-list">
                {r.workout_details.map((d) => (
                  <div key={d.id} className="detail-item">
                    <p>운동: {d.exercise.name} ({d.exercise.category})</p>
                    <p>세트: {d.sets}, 반복: {d.reps}, 중량: {d.weight}kg</p>
                    {d.note && <p>메모: {d.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>운동 기록이 없습니다.</p>
        )}
      </div>

      {/* 원시 데이터 출력 영역 */}
      {workoutRecords.length > 0 && (
        <div className="raw-json-container">
          <h2>🔍 원본 운동 로그(JSON)</h2>
          <pre>{JSON.stringify(workoutRecords, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TrainerRecordsPage;
