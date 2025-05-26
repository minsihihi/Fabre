import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Meals.css";

type MealTime = "아침" | "점심" | "저녁";

const mealTypeMap: Record<MealTime, string> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
};

interface MealPlan {
  carb: string;
  protein: string;
  fat: string;
}

export default function Meals() {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState(false);
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | null>(null);
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});
  const [dailyPlans, setDailyPlans] = useState<Record<MealTime, MealPlan | null>>({
    아침: null,
    점심: null,
    저녁: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

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

  const loadImages = async (date: Date) => {
    if (!userId) return;
    const mealDate = formatDate(date);
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/images/meal", {
        params: { memberId: userId, mealDate },
      });
      const meals: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };
      res.data.meals.forEach((m: { mealType: string; imageUrl: string }) => {
        const time = (Object.entries(mealTypeMap).find(([, v]) => v === m.mealType)?.[0]) as MealTime;
        if (time) meals[time] = m.imageUrl;
      });
      setMealImages((prev) => ({ ...prev, [mealDate]: meals }));
    } catch {
      setMealImages((prev) => ({
        ...prev,
        [mealDate]: { 아침: null, 점심: null, 저녁: null },
      }));
    }
  };

  const loadDailyPlans = async (date: Date) => {
    const mealDate = formatDate(date);
    const plans: Record<MealTime, MealPlan | null> = { 아침: null, 점심: null, 저녁: null };
    for (const time of ["아침", "점심", "저녁"] as MealTime[]) {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/membermeals", {
          params: { mealDate, mealType: mealTypeMap[time] },
        });
        const { carb, protein, fat } = res.data.meal;
        plans[time] = { carb, protein, fat };
      } catch {
        plans[time] = null;
      }
    }
    setDailyPlans(plans);
  };

  useEffect(() => {
    loadImages(selectedDate);
    loadDailyPlans(selectedDate);
  }, [selectedDate, userId]);

  const onClickDay = (date: Date) => {
    setSelectedDate(date);
    setSelectedMealTime(null);
    setShowPopup(true);
  };

  const uploadFile = async (file: File) => {
    if (!selectedMealTime || !userId) return;
    const form = new FormData();
    form.append("image", file);

    const mealType = mealTypeMap[selectedMealTime];
    const mealDate = formatDate(selectedDate);

    try {
      const res = await axios.patch("http://13.209.19.146:3000/upload/meal", form, {
        params: { mealDate, mealType },
      });
      alert(res.data.message);
      await loadImages(selectedDate);
      await loadDailyPlans(selectedDate);
      setShowPopup(false);
    } catch (e: any) {
      alert(`업로드 실패: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleFileButtonClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
  };

  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };

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
                <h3>{selectedMealTime} 사진 업로드</h3>
                <button onClick={handleFileButtonClick}>사진 업로드</button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
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
