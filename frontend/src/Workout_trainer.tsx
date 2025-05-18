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

  // 1) 사용자 정보 조회
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
        console.log("유저 정보 조회 성공:", res.data);
        setUserInfo(res.data);
      } catch (err) {
        console.error("유저 정보 조회 실패:", err);
        alert("사용자 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, [token, navigate]);

  // 2) 트레이너 회원 목록 조회
  useEffect(() => {
    if (!token || userInfo?.role !== "trainer") return;
    axios
      .get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("회원 목록 조회 성공:", res.data.data);
        setMembers(res.data.data);
      })
      .catch((err) => {
        console.error("회원 목록 조회 오류:", err);
      });
  }, [token, userInfo]);

  // 3) 운동 기록 조회 & normalize
  const fetchWorkoutRecords = async (memberId: number) => {
    console.log("운동 기록 조회 요청, memberId:", memberId);
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/record", {
        headers: { Authorization: `Bearer ${token}` },
        params: { memberId },
      });
      console.log("원본 운동 기록 응답:", res.data.data);

      // 서버 필드 `WorkoutDetails`를 `workout_details`로 매핑
      const normalized: WorkoutRecord[] = (res.data.data || []).map((r: any) => ({
        id: r.id,
        workout_date: r.workout_date,
        start_time: r.start_time,
        end_time: r.end_time,
        total_duration: r.total_duration,
        workout_details: (r.WorkoutDetails || []).map((d: any) => ({
          id: d.id,
          exercise: d.Exercise || d.exercise,
          sets: d.sets,
          reps: d.reps,
          weight: d.weight,
          note: d.note,
        })),
      }));

      setWorkoutRecords(normalized);
    } catch (err: any) {
      console.error("운동 기록 조회 오류:", err);
      alert(err.response?.data?.message || "운동 기록 조회 실패");
    }
  };

  // 4) 회원 선택 핸들러
  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedMemberId(id);
    fetchWorkoutRecords(id);
  };

  if (isLoading) return <p>로딩 중...</p>;

  return (
    <div className="trainer-records-container">
      <h1>Workout Records</h1>

      {/* 회원 선택 */}
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

      {/* 운동 기록 리스트 */}
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
                    <p>
                      운동: {d.exercise.name} ({d.exercise.category})
                    </p>
                    <p>
                      세트: {d.sets}, 반복: {d.reps}, 중량: {d.weight}kg
                    </p>
                    {d.note && <p>메모: {d.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : selectedMemberId ? (
          <p>선택된 회원의 운동 기록이 없습니다.</p>
        ) : (
          <p>회원 선택 후 기록을 확인하세요.</p>
        )}
      </div>

    </div>
  );
};

export default TrainerRecordsPage;
