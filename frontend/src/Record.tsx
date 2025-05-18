import { useState, useEffect } from "react";
import BodyVisualization from "./BodyVisualization"; // 시각화 컴포넌트 추가
import "./Record.css";

export default function Report() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentWeek = Math.ceil(today.getDate() / 7);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [viewType, setViewType] = useState<string>("주간");
  const [reportData, setReportData] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleWeekChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(Number(event.target.value));
  };

  const handleViewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewType(event.target.value);
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("http://13.209.19.146:3000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setUserInfo(data);
      } catch (error) {
        console.error("사용자 정보 불러오기 실패:", error);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!userInfo?.id) return;

      try {
        const response = await fetch("http://13.209.19.146:3000/api/workouts/analyze-weekly", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ memberId: userInfo.id }),
        });
        const data = await response.json();
        if (data.report) {
          setReportData({
            ...data.report,
            muscle_breakdown: data.muscle_breakdown || [],
          });
        } else {
          console.error("리포트가 없습니다.");
        }
      } catch (error) {
        console.error("리포트 불러오기 실패:", error);
      }
    };

    fetchReport();
  }, [userInfo, selectedMonth, selectedWeek, viewType]);

  return (
    <div className="record-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 R E C O R D</h1>

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
              <option key={index} value={index + 1}>{index + 1}월</option>
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
              <option key={week} value={week}>{week}주</option>
            ))}
          </select>
        </div>
      </div>

      <div className="record-content">
        <h2 className="record-title">{`${selectedMonth}월 ${viewType} 리포트`}</h2>
        <div className="record-box">
          {reportData ? (
            <div className="record-data">
              {console.log("✅ muscle_breakdown:", reportData.muscle_breakdown)}
              <p>🔥 총 소모 칼로리: {reportData.total_calories_burned} kcal</p>
              <p>💪 근육 변화: {reportData.muscle_change} kg</p>
              <p>⚖️ 체중 변화: {reportData.body_change} kg</p>
              <p>📢 피드백: {reportData.feedback}</p>

              {reportData.muscle_breakdown && (
                <div>
                  <h3 className="record-subtitle">📍 부위별 근육 증가</h3>
                  <BodyVisualization data={reportData.muscle_breakdown} />
                </div>
              )}
            </div>
          ) : (
            <p>리포트를 불러오는 중...</p>
          )}
        </div>
      </div>
    </div>
  );
}
