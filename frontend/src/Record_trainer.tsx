// 📁 frontend/src/Record_Trainer.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import "./Record.css";

interface TrainerMember {
  member: {
    id: number;
    login_id: string;
    name: string;
  };
}

export default function RecordTrainer() {
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentWeek = Math.ceil(today.getDate() / 7);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [viewType, setViewType] = useState<string>("주간");
  const [reportData, setReportData] = useState<any>(null);

  const handleMemberChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMemberId(Number(event.target.value));
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleWeekChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(Number(event.target.value));
  };

  const handleViewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewType(event.target.value);
  };

  // 1) 트레이너 회원 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://13.209.19.146:3000/api/trainer/members", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMembers(res.data.data);
      } catch (error) {
        console.error("회원 목록 불러오기 실패:", error);
      }
    })();
  }, []);

  // 2) 선택된 회원/기간/타입이 바뀔 때마다 리포트 호출
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedMemberId) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://13.209.19.146:3000/api/workouts/analyze-weekly",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              memberId: selectedMemberId,
              viewType,
              month: selectedMonth,
              week: selectedWeek,
            }),
          }
        );
        const data = await response.json();
        if (data.report) {
          setReportData(data.report);
        } else {
          console.error("리포트가 없습니다.");
          setReportData(null);
        }
      } catch (error) {
        console.error("리포트 불러오기 실패:", error);
        setReportData(null);
      }
    };

    fetchReport();
  }, [selectedMemberId, selectedMonth, selectedWeek, viewType]);

  return (
    <div className="record-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 트레이너 리포트 조회</h1>

      {/* 회원 선택 */}
      <div className="member-selector">
        <label htmlFor="memberSelect">회원 선택:</label>
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

      {/* 주차/월, 월/주 선택 */}
      <div className="record-selectors">
        <div className="view-selector">
          <label htmlFor="viewType">주차/월:</label>
          <select id="viewType" value={viewType} onChange={handleViewChange}>
            <option value="주간">주간</option>
            <option value="월간">월간</option>
          </select>
        </div>

        <div className="month-selector">
          <label htmlFor="month">월:</label>
          <select id="month" value={selectedMonth} onChange={handleMonthChange}>
            {[...Array(12)].map((_, index) => (
              <option key={index} value={index + 1}>
                {index + 1}월
              </option>
            ))}
          </select>
        </div>

        <div
          className="week-selector"
          style={{ visibility: viewType === "주간" ? "visible" : "hidden" }}
        >
          <label htmlFor="week">주차:</label>
          <select id="week" value={selectedWeek} onChange={handleWeekChange}>
            {[1, 2, 3, 4].map((week) => (
              <option key={week} value={week}>
                {week}주
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 리포트 내용 */}
      <div className="record-content">
        <h2 className="record-title">
          {selectedMemberId
            ? `${selectedMonth}월 ${viewType} 리포트`
            : "회원 선택 후 리포트를 확인하세요"}
        </h2>
        <div className="record-box">
          {selectedMemberId ? (
            reportData ? (
              <div className="record-data">
                <p>🔥 총 소모 칼로리: {reportData.total_calories_burned} kcal</p>
                <p>💪 근육 변화: {reportData.muscle_change} kg</p>
                <p>⚖️ 체중 변화: {reportData.body_change} kg</p>
                <p>📢 피드백: {reportData.feedback}</p>
              </div>
            ) : (
              <p>리포트를 불러오는 중...</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
