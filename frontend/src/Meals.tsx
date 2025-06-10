import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Meals.css";

type MealTime = "아침" | "점심" | "저녁";

interface MealPlan {
  carb: string;
  protein: string;
  fat: string;
}

const mealTypeMap: Record<MealTime, string> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
};

export default function Meals() {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState(false);
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | null>(null);

  // 사진 URL
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});
  // 식단 내용(탄/단/지)
  const [dailyPlans, setDailyPlans] = useState<Record<MealTime, MealPlan | null>>({ 아침: null, 점심: null, 저녁: null });
  // 분석 결과(일치율)
  const [analysisResults, setAnalysisResults] = useState<Record<string, Record<MealTime, string>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Axios 기본 설정
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // 내 정보 가져오기
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/users/me");
        setUserId(res.data.id);
      } catch {
        alert("로그인 상태를 확인해주세요.");
      }
    })();
  }, []);

  // 선택한 날짜의 이미지 및 추천 식단 불러오기
  const loadImagesAndPlans = async (date: Date) => {
    if (!userId) return;
    const mealDate = formatDate(date);
    const images: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };
    const plans: Record<MealTime, MealPlan | null> = { 아침: null, 점심: null, 저녁: null };

    for (const time of ["아침", "점심", "저녁"] as MealTime[]) {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/membermeals", {
          params: { mealDate, mealType: mealTypeMap[time] },
        });
        const meal = res.data.meal;
        images[time] = meal.imageUrl ?? null;
        plans[time] = { carb: meal.carb, protein: meal.protein, fat: meal.fat };
      } catch {
        images[time] = null;
        plans[time] = null;
      }
    }

    setMealImages(prev => ({ ...prev, [mealDate]: images }));
    setDailyPlans(plans);
    setAnalysisResults(prev => ({ ...prev, [mealDate]: { 아침: "", 점심: "", 저녁: "" } }));
  };

  useEffect(() => { loadImagesAndPlans(selectedDate); }, [selectedDate, userId]);

  // 캘린더 날짜 클릭
  const onClickDay = (date: Date) => {
    setSelectedDate(date);
    setSelectedMealTime(null);
    setShowPopup(true);
  };

  // 파일 업로드 핸들러
  const handleFileButtonClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && uploadFile(e.target.files[0]);

  // 실제 이미지 업로드
  const uploadFile = async (file: File) => {
    if (!selectedMealTime || !userId) return;
    const mealType = mealTypeMap[selectedMealTime];
    const mealDate = formatDate(selectedDate);
    const form = new FormData();
    form.append("image", file);
    form.append("mealDate", mealDate);
    form.append("mealType", mealType);

    try {
      const res = await axios.patch("http://13.209.19.146:3000/api/upload/meal", form, { params: { mealDate, mealType } });
      alert(res.data.message);
      await loadImagesAndPlans(selectedDate);
      setShowPopup(false);
    } catch (err: any) {
      console.error(err);
      alert(`업로드 실패: ${err.response?.data?.message || err.message}`);
    }
  };

  // 식단 분석 (DetectMeal) - POST 후 GET /api/meals/analyze 사용
  const detectMeal = async () => {
    if (!selectedMealTime || userId === null) return;
    const mealType = mealTypeMap[selectedMealTime];
    const mealDate = formatDate(selectedDate);

    try {
      // 8) 감지 요청 (POST)
      await axios.post(
        "http://13.209.19.146:3000/api/meals/analyze",
        null,
        { params: { memberId: userId, mealDate, mealType } }
      );

      // 8.5) 분석 결과 조회 (GET)
      const res8_5 = await axios.get(
        "http://13.209.19.146:3000/api/meals/analyze",
        { params: { memberId: userId, mealDate, mealType } }
      );
      console.log("analysisResult from 8.5 API:", res8_5.data.analysis.analysisResult);

      // 9) memberMeals 재호출로 matchRate 가져오기
      const res2 = await axios.get(
        "http://13.209.19.146:3000/api/membermeals",
        { params: { mealDate, mealType } }
      );
      console.log("memberMeals response:", res2.data);
      const mmRate = res2.data.meal.matchRate;
      const rateText = mmRate != null ? `${mmRate}%` : "없음";

      // 일치율 업데이트
      setAnalysisResults(prev => ({
        ...prev,
        [mealDate]: {
          ...prev[mealDate],
          [selectedMealTime]: rateText,
        },
      }));

    } catch (err: any) {
      console.error(err);
      alert(`분석 실패: ${err.response?.data?.message || err.message}`);
    }
  };

  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };
  const todayAnalysis = analysisResults[dateKey] || { 아침: "", 점심: "", 저녁: "" };
  
  return (
    <div className="meal-container">
      <h1>식단 기록</h1>
      <Calendar onClickDay={onClickDay} value={selectedDate} />

      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            {!selectedMealTime ? (
              <>
                <h3>{dateKey} 식사 선택</h3>
                {(["아침", "점심", "저녁"] as MealTime[]).map(m => (
                  <button key={m} onClick={() => setSelectedMealTime(m)}>{m}</button>
                ))}
                <button onClick={() => setShowPopup(false)}>취소</button>
              </>
            ) : (
              <>
                <h3>{selectedMealTime} 사진</h3>
                {todayMeals[selectedMealTime] ? (
                  <div className="uploaded-image-preview">
                    <img src={todayMeals[selectedMealTime]!} alt={`${selectedMealTime} 사진`} style={{ width: 200, marginBottom: 10 }} />
                  </div>
                ) : (
                  <button onClick={handleFileButtonClick}>사진 업로드</button>
                )}

                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />

                {todayMeals[selectedMealTime] && (
                  <>
                    <button onClick={detectMeal}>식단 분석</button>
                    {todayAnalysis[selectedMealTime] && <p style={{ marginTop: "0.5rem" }}>일치율: {todayAnalysis[selectedMealTime]}</p>}
                  </>
                )}

                <button onClick={() => setShowPopup(false)}>닫기</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="daily-meals">
        <h2>나의 하루 식사</h2>
        <div className="daily-meals-grid">
          {(["아침", "점심", "저녁"] as MealTime[]).map(time => (
            <div key={time} className="meal-card">
              <h3>{time}</h3>
              {todayMeals[time] && <img src={todayMeals[time]!} alt={`${time} 사진`} />}
              <div className="plan-text">
                {dailyPlans[time] ? (
                  <>
                    <p>탄수화물 : {dailyPlans[time]!.carb}</p>
                    <p>단백질 : {dailyPlans[time]!.protein}</p>
                    <p>지방 : {dailyPlans[time]!.fat}</p>
                  </>
                ) : (
                  <p>추천 식단 없음</p>
                )}
                {todayAnalysis[time] && <p>일치율: {todayAnalysis[time]}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}