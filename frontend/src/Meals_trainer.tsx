import { useState, useEffect } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Meals_Trainer.css";

type MealTime = "아침" | "점심" | "저녁";
const mealTypeMap: Record<MealTime, string> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
};

interface TrainerMember {
  id: number;
  memberId: number;
  member: { id: number; login_id: string; name: string; createdAt: string };
  startDate: string;
  sessionsLeft: number;
  status: string;
}

interface MealPlan {
  mealType: MealTime;
  carb: string;
  protein: string;
  fat: string;
}

const foodOptions = {
  carb: ["삶은고구마", "밥", "바나나", "단호박"],
  protein: ["닭가슴살구이", "쇠고기구이", "두부", "연어구이", "삶은달걀"],
  fat: ["아몬드", "캐슈넛", "방울토마토"]
};

export default function MealsTrainer() {
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TrainerMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});
  const [fetchedMealPlans, setFetchedMealPlans] = useState<Record<string, Record<MealTime, MealPlan | null>>>({});
  const [showPopup, setShowPopup] = useState(false);

  const [mealPlan, setMealPlan] = useState<MealPlan>({
    mealType: "아침",
    carb: "",
    protein: "",
    fat: ""
  });

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://13.209.19.146:3000/api/trainer/members", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMembers(res.data.data);
      } catch {
        alert("회원 목록 불러오기 실패");
      }
    })();
  }, []);

  const fetchMealImages = async (memberId: number, date: Date) => {
    const mealDate = formatDate(date);
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/meals", {
        params: { userId: memberId, mealDate },
      });
      const day: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };
      res.data.meals.forEach((m: { mealType: string; imageUrl: string }) => {
        const key = (Object.entries(mealTypeMap).find(([, v]) => v === m.mealType)?.[0]) as MealTime;
        day[key] = m.imageUrl;
      });
      setMealImages(prev => ({ ...prev, [mealDate]: day }));
    } catch {
      setMealImages(prev => ({ ...prev, [mealDate]: { 아침: null, 점심: null, 저녁: null } }));
    }
  };

  const fetchMealPlans = async (memberId: number, date: Date) => {
    const token = localStorage.getItem("token");
    const mealDate = formatDate(date);
    const dateData: Record<MealTime, MealPlan | null> = { 아침: null, 점심: null, 저녁: null };

    console.log(`📅 Fetching meal plans for memberId=${memberId} on ${mealDate}...`);
    for (const t of ["아침", "점심", "저녁"] as MealTime[]) {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/trainermeals", {
          params: {
            memberId,
            mealDate,
            mealType: mealTypeMap[t],
          },
          headers: { Authorization: `Bearer ${token}` },
        });

        // res.data.meal 에 식단 객체가 들어옵니다
        const meal = res.data.meal;
        dateData[t] = {
          mealType: t,
          carb: meal.carb,
          protein: meal.protein,
          fat: meal.fat,
        };

        console.log(`✅ ${t} 식단 불러오기 성공:`, dateData[t]);
      } catch (err: any) {
        dateData[t] = null;
        console.warn(`⚠️ ${t} 식단 불러오기 실패:`, err?.response?.data || err.message);
      }
    }

    setFetchedMealPlans(prev => ({ ...prev, [mealDate]: dateData }));
  };

  useEffect(() => {
    if (selectedMember) {
      fetchMealImages(selectedMember.member.id, selectedDate);
      fetchMealPlans(selectedMember.member.id, selectedDate);
    }
  }, [selectedMember, selectedDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowPopup(true);
  };

  const closePopup = () => setShowPopup(false);

  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };
  const todayMealPlans = fetchedMealPlans[dateKey] || { 아침: null, 점심: null, 저녁: null };

  const handleRegisterMealPlan = async () => {
    if (!selectedMember) {
      alert("회원이 선택되지 않았습니다.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const payload = JSON.parse(window.atob(token.split(".")[1]));
    const trainerId = payload.id;

    try {
      const response = await axios.post(
        "http://13.209.19.146:3000/api/meal",
        {
          userId: trainerId,
          memberId: selectedMember.member.id,
          carb: mealPlan.carb,
          protein: mealPlan.protein,
          fat: mealPlan.fat,
          mealDate: dateKey,
          mealType: mealTypeMap[mealPlan.mealType],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("✅ 식단 전송 성공:", response.data);
      alert("✅ 식단이 성공적으로 등록되었습니다!");
      fetchMealPlans(selectedMember.member.id, selectedDate); // 등록 후 새로고침
    } catch (error: any) {
      console.error("Request payload:", {
        userId: trainerId,
        memberId: selectedMember.member.id,
        carb: mealPlan.carb,
        protein: mealPlan.protein,
        fat: mealPlan.fat,
        mealDate: dateKey,
        mealType: mealTypeMap[mealPlan.mealType],
      });
      console.error("Response error data:", error.response?.data);
      alert("❗식단 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="meal-container">
      <h2>회원 식단 관리</h2>

      <div className="member-select-wrapper">
        <label>회원 선택:</label>
        <select
          value={selectedMember?.member.id || ""}
          onChange={e => {
            const mem = members.find(m => m.member.id === +e.target.value) || null;
            setSelectedMember(mem);
          }}
        >
          <option value="" disabled>-- 회원을 선택하세요 --</option>
          {members.map(m => (
            <option key={m.member.id} value={m.member.id}>
              {m.member.name} ({m.member.login_id})
            </option>
          ))}
        </select>
      </div>

      <Calendar onClickDay={handleDateClick} value={selectedDate} />

      {selectedMember && (
        <div className="meal-plan-section">
          <h3>🍱 식단 등록</h3>
          <div className="meal-plan-form meal-summary-box">
            <label>식사 시간:</label>
            <select
              value={mealPlan.mealType}
              onChange={e => setMealPlan({ ...mealPlan, mealType: e.target.value as MealTime })}
            >
              {["아침", "점심", "저녁"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label>탄수화물:</label>
            <select
              value={mealPlan.carb}
              onChange={e => setMealPlan({ ...mealPlan, carb: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.carb.map(food => (
                <option key={food} value={food}>{food}</option>
              ))}
            </select>

            <label>단백질:</label>
            <select
              value={mealPlan.protein}
              onChange={e => setMealPlan({ ...mealPlan, protein: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.protein.map(food => (
                <option key={food} value={food}>{food}</option>
              ))}
            </select>

            <label>지방:</label>
            <select
              value={mealPlan.fat}
              onChange={e => setMealPlan({ ...mealPlan, fat: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.fat.map(food => (
                <option key={food} value={food}>{food}</option>
              ))}
            </select>

            <button onClick={handleRegisterMealPlan}>식단 등록</button>
          </div>
        </div>
      )}

      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <h3>식단 사진 & 내용 ({dateKey})</h3>
            <div className="meal-images">
              {(["아침", "점심", "저녁"] as MealTime[]).map(t => (
                <div key={t} className="meal-image-box">
                  <strong>{t}</strong><br />
                  {todayMeals[t] ? (
                    <img src={todayMeals[t] || ""} alt={`${t} 식단 사진`} />
                  ) : (
                    <span>사진 없음</span>
                  )}
                  <div className="meal-plan-text">
                    {todayMealPlans[t] ? (
                      <p>
                        탄: {todayMealPlans[t]!.carb}<br />
                        단: {todayMealPlans[t]!.protein}<br />
                        지: {todayMealPlans[t]!.fat}
                      </p>
                    ) : (
                      <p>식단 내용 없음</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={closePopup}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
