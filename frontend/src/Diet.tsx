import { useState } from "react";

export default function Diet() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("월요일");
  const [selectedMealTime, setSelectedMealTime] = useState<string>("아침");
  const [selectedMeal, setSelectedMeal] = useState<string>("Meal1");

  const [mealPlan, setMealPlan] = useState<{ [key: string]: { [key: string]: string[] } }>({
    월요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    화요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    수요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    목요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    금요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    토요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
    일요일: {
      아침: ["Meal 1", "Meal 2", "Meal 3"],
      점심: ["Meal 1", "Meal 2", "Meal 3"],
      저녁: ["Meal 1", "Meal 2", "Meal 3"],
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="diet-container">

      {/* 📸 AI 분석 박스 */}
      <div className="diet-box">
        <h2>📸 AI 식단 분석</h2>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {selectedImage && (
          <img
            src={selectedImage}
            alt="분석할 음식"
            className="diet-image"
          />
        )}
      </div>

      {/* 🍽️ 요일별 추천 식단 박스 */}
      <div className="diet-box">
        <h2>🍽️ 요일별 추천 식단</h2>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="diet-select"
        >
          {Object.keys(mealPlan).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>

        {/* Meal 시간 선택 */}
        <select
          value={selectedMealTime}
          onChange={(e) => setSelectedMealTime(e.target.value)}
          className="diet-select"
        >
          <option value="아침">아침</option>
          <option value="점심">점심</option>
          <option value="저녁">저녁</option>
        </select>

        {/* Meal 선택 */}
        <select
          value={selectedMeal}
          onChange={(e) => setSelectedMeal(e.target.value)}
          className="diet-select"
        >
          {mealPlan[selectedDay][selectedMealTime].map((meal, index) => (
            <option key={index} value={`Meal${index + 1}`}>
              {meal}
            </option>
          ))}
        </select>

        <p className="meal-plan">{selectedMeal}</p>
      </div>

      {/* 🛒 건강식품 구매 박스 */}
      <div className="diet-box">
        <h2>🛒 건강식품 구매</h2>
        <a
          href="https://example.com/health-foods"
          target="_blank"
          rel="noopener noreferrer"
          className="purchase-link"
        >
          건강식품 보러가기 →
        </a>
      </div>
    </div>
  );
}
