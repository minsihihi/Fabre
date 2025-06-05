// 📁 frontend/src/Meals.tsx

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
  // { "2025-06-02": { 아침: imageUrl|null, 점심: imageUrl|null, 저녁: imageUrl|null } }
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});

  // 식단 내용(탄/단/지)
  const [dailyPlans, setDailyPlans] = useState<Record<MealTime, MealPlan | null>>({
    아침: null,
    점심: null,
    저녁: null,
  });

  // 분석 결과(일치율)
  // { "2025-06-02": { 아침: "75%", 점심: "없음", 저녁: "60%" } }
  const [analysisResults, setAnalysisResults] = useState<Record<string, Record<MealTime, string>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ─────────────────────────────────────────────────────────────────
  // 1) Axios 기본 헤더에 토큰 세팅
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  // 2) 내 정보(회원 ID) 가져오기
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

  // ─────────────────────────────────────────────────────────────────
  // 3) 선택한 날짜에 대해 아침/점심/저녁 각각 사진 및 식단 내용만 불러오는 함수
  const loadImagesAndPlans = async (date: Date) => {
    if (!userId) return;
    const mealDate = formatDate(date);

    // 초기화
    const dayImages: Record<MealTime, string | null> = {
      아침: null,
      점심: null,
      저녁: null,
    };
    const dayPlans: Record<MealTime, MealPlan | null> = {
      아침: null,
      점심: null,
      저녁: null,
    };

    // 아침/점심/저녁 각각에 대해 membermeals 호출
    for (const time of ["아침", "점심", "저녁"] as MealTime[]) {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/membermeals", {
          params: {
            mealDate,
            mealType: mealTypeMap[time],
          },
        });
        const meal = res.data.meal;

        // imageUrl이 있으면 저장
        if (meal.imageUrl) {
          dayImages[time] = meal.imageUrl;
        }

        // 식단 내용(탄수/단백/지방)도 저장
        dayPlans[time] = {
          carb: meal.carb,
          protein: meal.protein,
          fat: meal.fat,
        };

        // **matchRate는 여기서 가져오지 않습니다.** 분석 버튼 클릭 시 별도로 요청합니다.
      } catch {
        // 404(식단 없음) 등 에러 발생 시 → null 그대로 두기
        dayImages[time] = null;
        dayPlans[time] = null;
      }
    }

    setMealImages((prev) => ({ ...prev, [mealDate]: dayImages }));
    setDailyPlans(dayPlans);
    // 분석결과는 초기화(팝업에서 보여주기 전까지 빈 상태)
    setAnalysisResults((prev) => ({
      ...prev,
      [mealDate]: {
        아침: "",
        점심: "",
        저녁: "",
      },
    }));
  };

  // selectedDate 또는 userId가 바뀔 때마다 loadImagesAndPlans 실행
  useEffect(() => {
    loadImagesAndPlans(selectedDate);
  }, [selectedDate, userId]);

  // ─────────────────────────────────────────────────────────────────
  // 4) 캘린더 날짜 클릭 처리
  const onClickDay = (date: Date) => {
    setSelectedDate(date);
    setSelectedMealTime(null);
    setShowPopup(true);
  };

  // ─────────────────────────────────────────────────────────────────
  // 5) 파일 선택창 열기
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 6) 파일 선택 시 업로드
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 7) 실제 업로드 로직
  const uploadFile = async (file: File) => {
    if (!selectedMealTime || !userId) return;

    const mealType = mealTypeMap[selectedMealTime];
    const mealDate = formatDate(selectedDate);

    const form = new FormData();
    form.append("image", file);
    // query param 으로 같은 mealDate, mealType 전송
    form.append("mealDate", mealDate);
    form.append("mealType", mealType);

    try {
      const url = `http://13.209.19.146:3000/api/upload/meal`;
      const res = await axios.patch(url, form, {
        params: { mealDate, mealType },
      });
      alert(res.data.message);
      // 업로드 후 새로 불러오기
      await loadImagesAndPlans(selectedDate);
      setShowPopup(false);
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(`업로드 실패: ${error.response?.data?.message || error.message}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 8) “식단 분석” 버튼 클릭 시 호출: matchRate 값만 /api/membermeals 에서 다시 가져오기
  const analyzeMeal = async () => {
    if (!selectedMealTime || userId === null) return;
    const mealType = mealTypeMap[selectedMealTime];
    const mealDate = formatDate(selectedDate);

    try {
      // membermeals 호출해서 matchRate 값을 확인
      const res = await axios.get("http://13.209.19.146:3000/api/membermeals", {
        params: { mealDate, mealType },
      });
      const meal = res.data.meal;
      // meal.matchRate 가 숫자(%) 형태로 존재하면 저장, 아니면 “없음”
      const rateText =
        meal.matchRate !== undefined && meal.matchRate !== null
          ? `${meal.matchRate}%`
          : "없음";

      setAnalysisResults((prev) => ({
        ...prev,
        [mealDate]: {
          ...((prev[mealDate] as Record<MealTime, string>) || {
            아침: "",
            점심: "",
            저녁: "",
          }),
          [selectedMealTime]: rateText,
        },
      }));
    } catch (error: any) {
      console.error("분석 실패:", error);
      const msg = error.response?.data?.message || error.message;
      alert(`분석 실패: ${msg}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };
  const todayAnalysis = analysisResults[dateKey] || { 아침: "", 점심: "", 저녁: "" };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="meal-container">
      <h1>식단 기록</h1>
      <Calendar onClickDay={onClickDay} value={selectedDate} />

      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            {!selectedMealTime ? (
              <>
                <h3>{dateKey} 식사 선택</h3>
                {(["아침", "점심", "저녁"] as MealTime[]).map((m) => (
                  <button key={m} onClick={() => setSelectedMealTime(m)}>
                    {m}
                  </button>
                ))}
                <button onClick={() => setShowPopup(false)}>취소</button>
              </>
            ) : (
              <>
                <h3>{selectedMealTime} 사진</h3>

                {todayMeals[selectedMealTime] ? (
                  <div className="uploaded-image-preview">
                    <img
                      src={todayMeals[selectedMealTime]!}
                      alt={`${selectedMealTime} 사진`}
                      style={{ width: 200, height: "auto", marginBottom: 10 }}
                    />
                  </div>
                ) : (
                  <button onClick={handleFileButtonClick}>사진 업로드</button>
                )}

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />

                {/* 업로드된 사진이 있으면 “식단 분석” 버튼 + 결과 */}
                {todayMeals[selectedMealTime] && (
                  <>
                    <button onClick={analyzeMeal}>식단 분석</button>
                    {todayAnalysis[selectedMealTime] && (
                      <p style={{ marginTop: "0.5rem" }}>
                        일치율: {todayAnalysis[selectedMealTime]}
                      </p>
                    )}
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
          {(["아침", "점심", "저녁"] as MealTime[]).map((time) => (
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
