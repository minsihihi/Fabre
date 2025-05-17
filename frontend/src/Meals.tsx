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

export default function Diet() {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showMealTimePopup, setShowMealTimePopup] = useState(false);
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | null>(null);
  const [mealImages, setMealImages] = useState<Record<string, Record<MealTime, string | null>>>({});

  // 날짜 포맷 YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  // 현재 로그인한 사용자 정보 조회 (ID 획득)
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token"); // 토큰 위치에 맞게 수정하세요
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const res = await axios.get("http://13.209.19.146:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserId(res.data.id);
    } catch (error) {
      console.error("사용자 정보 조회 실패", error);
      alert("사용자 정보를 가져오는데 실패했습니다. 로그인 상태를 확인해주세요.");
    }
  };

  // 선택된 날짜 기준 이미지 서버에서 조회
  const fetchMealImages = async (date: Date) => {
    if (!userId) return; // userId가 없으면 조회하지 않음
    try {
      const mealDate = formatDate(date);
      const res = await axios.get("http://13.209.19.146:3000/api/images/meal", {
        params: { userId, mealDate },
      });

      const meals = res.data.meals;
      const dayMeals: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };

      meals.forEach((meal: { mealType: string; imageUrl: string }) => {
        const key = Object.entries(mealTypeMap).find(([, v]) => v === meal.mealType)?.[0];
        if (key) {
          dayMeals[key] = meal.imageUrl;
        }
      });

      setMealImages((prev) => ({
        ...prev,
        [mealDate]: dayMeals,
      }));
    } catch (error) {
      console.error("식단 이미지 조회 실패", error);
      const mealDate = formatDate(date);
      setMealImages((prev) => ({
        ...prev,
        [mealDate]: { 아침: null, 점심: null, 저녁: null },
      }));
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchMealImages(selectedDate);
  }, [selectedDate, userId]);

  const onDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowMealTimePopup(true);
    setSelectedMealTime(null);
  };

  const onMealTimeSelect = (mealTime: MealTime) => {
    setSelectedMealTime(mealTime);
    setShowMealTimePopup(false);
  };

  // 이미지 업로드 & 서버 전송
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedMealTime && userId) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mealType", mealTypeMap[selectedMealTime]);
      formData.append("mealDate", formatDate(selectedDate));
      formData.append("userId", userId.toString());

      try {
        const res = await axios.post("http://13.209.19.146:3000/api/upload/meal", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await fetchMealImages(selectedDate);
        alert(res.data.message);
      } catch (error: any) {
        console.error("이미지 업로드 실패", error);
        alert(error.response?.data?.message || "업로드 실패");
      }
    }
  };

  const dateKey = formatDate(selectedDate);
  const imagesForSelectedDate = mealImages[dateKey] || { 아침: null, 점심: null, 저녁: null };
  const selectedImage = selectedMealTime ? imagesForSelectedDate[selectedMealTime] : null;

  return (
    <div className="meal-container" style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <Calendar onChange={onDateChange} value={selectedDate} />

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <h3>선택된 날짜: {dateKey}</h3>
        {selectedMealTime && <h4>선택된 식사 시간: {selectedMealTime}</h4>}
      </div>

      {showMealTimePopup && (
        <div
          className="popup-overlay"
          onClick={() => setShowMealTimePopup(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            className="popup-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              textAlign: "center",
              minWidth: 250,
            }}
          >
            <h3>사진 올리기 - 식사 시간 선택</h3>
            {(["아침", "점심", "저녁"] as MealTime[]).map((meal) => (
              <button
                key={meal}
                onClick={() => onMealTimeSelect(meal)}
                style={{ margin: "10px", padding: "10px 20px" }}
              >
                {meal === "아침" ? "🍽 아침" : meal === "점심" ? "🍱 점심" : "🍜 저녁"}
              </button>
            ))}
            <br />
            <button onClick={() => setShowMealTimePopup(false)} style={{ marginTop: 10 }}>
              취소
            </button>
          </div>
        </div>
      )}

      {selectedMealTime && (
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {selectedImage && (
            <div style={{ marginTop: 20 }}>
              <img
                src={selectedImage}
                alt={`${selectedMealTime} 식사 사진`}
                style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 10 }}
              />
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h2 style={{ textAlign: "center" }}>나의 하루 식사</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: 20,
            gap: 20,
          }}
        >
          {(["아침", "점심", "저녁"] as MealTime[]).map((meal) => (
            <div
              key={meal}
              style={{
                flex: 1,
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 10,
                textAlign: "center",
              }}
            >
              <h3>{meal}</h3>
              {imagesForSelectedDate[meal] ? (
                <img
                  src={imagesForSelectedDate[meal]!}
                  alt={`${meal} 식사 사진`}
                  style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }}
                />
              ) : (
                <p style={{ color: "#888", marginTop: 40 }}>사진 없음</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

