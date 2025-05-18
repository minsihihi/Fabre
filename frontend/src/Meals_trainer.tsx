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

interface RecommendProduct {
  title: string;
  price: string;
  link: string;
}

interface MealPlan {
  mealType: MealTime;
  carbohydrate: string;
  protein: string;
  fat: string;
}

const foodOptions = {
  carbohydrate: ["고구마", "현미밥", "오트밀", "바나나", "감자"],
  protein: ["닭가슴살", "계란", "두부", "소고기", "그릭요거트"],
  fat: ["아보카도", "올리브오일", "견과류", "치즈", "땅콩버터"]
};

export default function MealsTrainer() {
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TrainerMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});
  const [recommend, setRecommend] = useState<{ food: string; products: RecommendProduct[] } | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const [mealPlan, setMealPlan] = useState<MealPlan>({
    mealType: "아침",
    carbohydrate: "",
    protein: "",
    fat: ""
  });

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

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
      const res = await axios.get("http://13.209.19.146:3000/api/images/meal", {
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

  useEffect(() => {
    if (!selectedMember) return;
    fetchMealImages(selectedMember.member.id, selectedDate);
  }, [selectedMember, selectedDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowPopup(true);
  };

  const closePopup = () => setShowPopup(false);

  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };

  const handleRegisterMealPlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const failedMembers: string[] = [];

    for (const m of members) {
      try {
        await axios.post(
          "http://13.209.19.146:3000/api/meal",
          {
            userId: m.member.id,
            carb: mealPlan.carbohydrate,
            protein: mealPlan.protein,
            fat: mealPlan.fat,
            mealDate: dateKey,
            mealType: mealTypeMap[mealPlan.mealType],
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error: any) {
        failedMembers.push(m.member.name);
      }
    }

    if (failedMembers.length > 0) {
      alert(`❗일부 회원에게 식단 등록 실패:\n${failedMembers.join(", ")}`);
    } else {
      alert(`✅ 전체 ${members.length}명 회원에게 식단이 등록되었습니다!`);
    }
  };

  return (
    <div className="meal-container">
      <h2>회원 식단 관리</h2>
      <div className="member-select-wrapper">
        <label>회원 선택 (사진 조회용):</label>
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
          <h3>🍱 식단 추천 박스</h3>

          <div className="meal-plan-form">
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
              value={mealPlan.carbohydrate}
              onChange={e => setMealPlan({ ...mealPlan, carbohydrate: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.carbohydrate.map((food, i) => (
                <option key={i} value={food}>{food}</option>
              ))}
            </select>

            <label>단백질:</label>
            <select
              value={mealPlan.protein}
              onChange={e => setMealPlan({ ...mealPlan, protein: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.protein.map((food, i) => (
                <option key={i} value={food}>{food}</option>
              ))}
            </select>

            <label>지방:</label>
            <select
              value={mealPlan.fat}
              onChange={e => setMealPlan({ ...mealPlan, fat: e.target.value })}
            >
              <option value="">선택하세요</option>
              {foodOptions.fat.map((food, i) => (
                <option key={i} value={food}>{food}</option>
              ))}
            </select>
          </div>

          <button onClick={handleRegisterMealPlan}>식단 등록</button>
        </div>
      )}

      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <h3>{dateKey} 식단 사진</h3>
            <div className="meal-images">
              {(["아침", "점심", "저녁"] as MealTime[]).map(t => (
                <div key={t} className="meal-image-box">
                  <strong>{t}</strong><br />
                  {todayMeals[t] ? (
                    <img src={todayMeals[t] || ""} alt={`${t} 식단 사진`} />
                  ) : (
                    <span>사진 없음</span>
                  )}
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
