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
    <div className="report-container">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 R E P O R T</h1>
      {/* 상단 선택란 */}
      <div className="report-selectors">
        {/* 월 선택 */}
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

        {/* 주/월 선택 */}
        <div className="week-selector">
          <label htmlFor="week">주차/월:</label>
          <select id="week" value={viewType} onChange={handleViewChange}>
            <option value="주간">주간</option>
            <option value="월간">월간</option>
          </select>
        </div>

        {/* 주차 선택 (주간 선택 시 나타남) */}
        {viewType === "주간" && (
          <div className="week-selector">
            <label htmlFor="week">주차:</label>
            <select id="week" value={selectedWeek} onChange={handleWeekChange}>
              {[1, 2, 3, 4].map((week) => (
                <option key={week} value={week}>
                  {week}주
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 리포트 내용 */}
      <div className="report-content">
        <h2 className="report-title">{`${selectedMonth}월 ${viewType} 리포트`}</h2>
        <div className="report-box">
          {/* 리포트 내용 */}
          <p>
            선택한 기간에 대한 AI 분석 리포트가 여기에 표시됩니다.
            {/* 예시로 아래에 리포트 내용을 추가 */}
          </p>
          <div className="report-data">
            {/* 여기에 AI 리포트 데이터를 추가해줘 */}
            <p>AI 분석 결과: {/* AI 분석 결과 데이터 */}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
