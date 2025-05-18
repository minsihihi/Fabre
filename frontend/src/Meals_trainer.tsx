import { useState, useEffect } from "react";
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

interface TrainerMember {
  id: number;
  memberId: number;
  member: {
    id: number;
    login_id: string;
    name: string;
    createdAt: string;
  };
  startDate: string;
  sessionsLeft: number;
  status: string;
}

interface RecommendProduct {
  title: string;
  price: string;
  link: string;
}

export default function MealsTrainer() {
  /* ───────── state ───────── */
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TrainerMember | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [mealImages, setMealImages] = useState<Record<
    string,
    Record<MealTime, string | null>
  >>({});

  const [showPopup, setShowPopup] = useState(false);

  const [recommend, setRecommend] = useState<{
    food: string;
    products: RecommendProduct[];
  } | null>(null);

  /* ───────── utils ───────── */
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  /* ───────── API ───────── */
  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("토큰이 없습니다.");
      const res = await axios.get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(res.data.data);
    } catch (e) {
      console.error(e);
      alert("회원 목록을 불러올 수 없습니다.");
    }
  };

  const fetchMealImages = async (memberId: number, date: Date) => {
    try {
      const mealDate = formatDate(date);
      const res = await axios.get("http://13.209.19.146:3000/api/images/meal", {
        params: { userId: memberId, mealDate },
      });

      const day: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };
      res.data.meals.forEach((m: { mealType: string; imageUrl: string }) => {
        const key = Object.entries(mealTypeMap).find(([, v]) => v === m.mealType)?.[0] as MealTime;
        if (key) day[key] = m.imageUrl;
      });

      setMealImages((prev) => ({ ...prev, [mealDate]: day }));
    } catch (e) {
      console.error(e);
      setMealImages((p) => ({
        ...p,
        [formatDate(date)]: { 아침: null, 점심: null, 저녁: null },
      }));
    }
  };

  // 추천 식단 호출 (analysisId는 예시로 mealDate + memberId 합성)
  const fetchRecommend = async (analysisId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("토큰이 없습니다.");
      const res = await axios.get("http://13.209.19.146:3000/api/meals/recommend", {
        params: { analysisId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecommend({ food: res.data.food, products: res.data.products });
    } catch (e) {
      console.error(e);
      setRecommend(null);
    }
  };

  /* ───────── effect ───────── */
  useEffect(() => {
    fetchMembers();
  }, []);

  // 날짜 또는 회원 바뀔 때 이미지 미리 캐싱
  useEffect(() => {
    if (selectedMember) fetchMealImages(selectedMember.member.id, selectedDate);
  }, [selectedMember, selectedDate]);

  /* ───────── handlers ───────── */
  const handleDateClick = async (date: Date) => {
    if (!selectedMember) return;
    setSelectedDate(date);
    await fetchMealImages(selectedMember.member.id, date);

    // analysisId 예시: "2025-05-17_23" (날짜_회원ID)
    const analysisId = `${formatDate(date)}_${selectedMember.member.id}`;
    await fetchRecommend(analysisId);

    setShowPopup(true);
  };

  /* ───────── render ───────── */
  const dateKey = formatDate(selectedDate);
  const todayMeals = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };

  return (
    <div className="meal-container">
      <h2 style={{ textAlign: "center" }}>회원 식단 관리</h2>

      {/* 회원 선택 */}
      <div className="member-select-wrapper">
        <label>회원 선택:</label>
        <select
          value={selectedMember?.member.id ?? ""}
          onChange={(e) => {
            const m = members.find((x) => x.member.id === Number(e.target.value));
            setSelectedMember(m || null);
          }}
        >
          <option value="" disabled>
            -- 회원을 선택하세요 --
          </option>
          {members.map((m) => (
            <option key={m.member.id} value={m.member.id}>
              {m.member.name} ({m.member.login_id})
            </option>
          ))}
        </select>
      </div>

      {/* 달력 */}
      <Calendar
        onClickDay={(val) => handleDateClick(val as Date)}
        value={selectedDate}
      />

      {/* 팝업 */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              {formatDate(selectedDate)}&nbsp;
              {selectedMember?.member.name}
            </h3>

            {(["아침", "점심", "저녁"] as MealTime[]).map((t) => (
              <div key={t} className="meal-slot">
                <strong>{t}</strong>
                {todayMeals[t] ? (
                  <img src={todayMeals[t]!} alt={`${t} 식사`} />
                ) : (
                  <p>등록하지 않았습니다.</p>
                )}
              </div>
            ))}

            {/* 추천 식단 */}
            {recommend && (
              <div style={{ textAlign: "left", marginTop: 16 }}>
                <h4>🥗 추천 식재료: {recommend.food}</h4>
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  {recommend.products.map((p, idx) => (
                    <li key={idx}>
                      <a href={p.link} target="_blank" rel="noreferrer">
                        {p.title} – {p.price}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="close-btn" onClick={() => setShowPopup(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
