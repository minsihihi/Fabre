// Meals.tsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Meals.css";

type MealTime = "아침" | "점심" | "저녁";

// 한글 ↔ 영문 매핑
const mealTypeMap: Record<MealTime, string> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
};
const reverseMealTypeMap: Record<string, MealTime> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
};

export default function Meals() {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState(false);
  const [step, setStep] = useState<"selectTime" | "choose" | "camera">("selectTime");
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | null>(null);
  const [mealImages, setMealImages] = useState<
    Record<string, Record<MealTime, string | null>>
  >({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  // 토큰 설정
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // 사용자 정보 조회
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("http://13.209.19.146:3000/api/users/me");
        setUserId(res.data.id);
      } catch (error: any) {
        console.error("사용자 정보 조회 에러:", error.response?.data || error);
        alert(
          error.response?.data?.message ||
            JSON.stringify(error.response?.data) ||
            "로그인 상태를 확인해주세요."
        );
      }
    })();
  }, []);

  // 해당 날짜의 이미지 불러오기
  const loadImages = async (date: Date) => {
    if (!userId) return;
    const mealDate = formatDate(date);
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/images/meal", {
        params: { userId, mealDate },
      });
      const day: Record<MealTime, string | null> = { 아침: null, 점심: null, 저녁: null };
      res.data.meals.forEach((m: { mealType: string; imageUrl: string }) => {
        const t = reverseMealTypeMap[m.mealType];
        if (t) day[t] = m.imageUrl;
      });
      setMealImages((prev) => ({ ...prev, [mealDate]: day }));
    } catch (error: any) {
      console.error("이미지 조회 에러:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          JSON.stringify(error.response?.data) ||
          "식단 이미지 로드 중 오류가 발생했습니다."
      );
      setMealImages((prev) => ({
        ...prev,
        [mealDate]: { 아침: null, 점심: null, 저녁: null },
      }));
    }
  };

  useEffect(() => {
    loadImages(selectedDate);
  }, [selectedDate, userId]);

  // 달력 날짜 클릭
  const onClickDay = (date: Date) => {
    setSelectedDate(date);
    setStep("selectTime");
    setSelectedMealTime(null);
    setShowPopup(true);
  };

  // 식사 시간 선택
  const chooseTime = (meal: MealTime) => {
    setSelectedMealTime(meal);
    setStep("choose");
  };

  // mealId 조회 (POST 전에 반드시 필요)
  const fetchMealId = async (): Promise<number | null> => {
    if (!userId || !selectedMealTime) return null;
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/meal", {
        params: {
          userId,
          mealDate: formatDate(selectedDate),
          mealType: mealTypeMap[selectedMealTime],
        },
      });
      return res.data.id;
    } catch {
      return null;
    }
  };

  // 파일 업로드 (새 API: 쿼리 파라미터로 mealId)
  const uploadFile = async (file: File) => {
    if (!selectedMealTime || !userId) return;
    const mealId = await fetchMealId();
    if (mealId === null) {
      alert("먼저 식단을 생성(탄단지 입력)해야 사진을 업로드할 수 있습니다.");
      return;
    }

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await axios.post(
        `http://13.209.19.146:3000/api/upload/meal?mealId=${mealId}`,
        form
      );
      alert(res.data.message);
      await loadImages(selectedDate);
      setShowPopup(false);
    } catch (error: any) {
      console.error("업로드 에러 응답:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          JSON.stringify(error.response?.data) ||
          "업로드 실패(401/500 확인)"
      );
    }
  };

  // File input 핸들러
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
  };

  // 카메라 스트림 세팅
  useEffect(() => {
    if (step === "camera" && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("카메라 접근 오류:", err));
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, [step]);

  // 촬영
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) uploadFile(new File([blob], "meal.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  };

  // 오늘 식사 데이터
  const key = formatDate(selectedDate);
  const today = mealImages[key] || { 아침: null, 점심: null, 저녁: null };

  return (
    <div className="meal-container">
      <h1>식단 기록</h1>

      <div className="calendar-box">
        <Calendar onClickDay={onClickDay} value={selectedDate} />
      </div>

      {/* 팝업 */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            {/* STEP 1: 시간 선택 */}
            {step === "selectTime" && (
              <>
                <h3>{key} 식사 선택</h3>
                {(["아침", "점심", "저녁"] as MealTime[]).map((m) => (
                  <button
                    key={m}
                    className="popup-button"
                    onClick={() => chooseTime(m)}
                  >
                    {m}
                  </button>
                ))}
                <button
                  className="popup-button"
                  onClick={() => setShowPopup(false)}
                >
                  취소
                </button>
              </>
            )}

            {/* STEP 2: 업로드 방식 */}
            {step === "choose" && selectedMealTime && (
              <>
                <h3>{selectedMealTime} 업로드</h3>

                <button
                  className="popup-button"
                  onClick={() => setStep("camera")}
                >
                  📷 카메라 촬영
                </button>

                <button
                  className="popup-button"
                  onClick={() => setShowPopup(false)}
                >
                  닫기
                </button>
              </>
            )}

            {/* STEP 3: 카메라 모드 */}
            {step === "camera" && (
              <>
                <h3>사진 촬영 ({selectedMealTime})</h3>
                <video ref={videoRef} autoPlay playsInline />
                <div style={{ marginTop: 12 }}>
                  <button
                    className="popup-button"
                    onClick={capturePhoto}
                  >
                    촬영
                  </button>
                  <button
                    className="popup-button"
                    onClick={() => setStep("choose")}
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 나의 하루 식사 */}
      <div className="daily-meals">
        <h2>나의 하루 식사</h2>
        <div className="daily-meals-grid">
          {(["아침", "점심", "저녁"] as MealTime[]).map((m) => (
            <div key={m} className="meal-card">
              <h3>{m}</h3>
              {today[m] ? (
                <img src={today[m]!} alt={m} className="meal-image" />
              ) : (
                <p className="no-image">사진 없음</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
