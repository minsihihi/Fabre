import { useState } from "react";

export default function Report() {
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1월 ~ 12월
  const [selectedWeek, setSelectedWeek] = useState<number>(1); // 1주 ~ 4주
  const [viewType, setViewType] = useState<string>("주간"); // 주간/월간 선택

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleWeekChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(Number(event.target.value));
  };

  const handleViewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewType(event.target.value);
  };

  return (
    <div className="record-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 R E C O R D</h1>

      {/* 상단 선택란 */}
      <div className="record-selectors">
        {/* 주/월 선택 - 위치 고정 */}
        <div className="view-selector">
          <label htmlFor="viewType">주차/월:</label>
          <select id="viewType" value={viewType} onChange={handleViewChange}>
            <option value="주간">주간</option>
            <option value="월간">월간</option>
          </select>
        </div>

        {/* 월 선택 - 위치 고정 */}
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

        {/* 주차 선택 (주간 선택 시만 보임, 월간 선택해도 자리 차지 X) */}
        <div className="week-selector" style={{ visibility: viewType === "주간" ? "visible" : "hidden" }}>
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
        <h2 className="record-title">{`${selectedMonth}월 ${viewType} 리포트`}</h2>
        <div className="record-box">
          <p>선택한 기간에 대한 AI 분석 리포트가 여기에 표시됩니다.</p>
          <div className="record-data">
            <p>AI 분석 결과: {/* AI 분석 결과 데이터 */}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
