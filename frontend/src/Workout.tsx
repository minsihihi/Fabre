import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Workout.css";

// 운동 이름과 카테고리 예시
const EXERCISE_NAMES = ["벤치프레스", "스쿼트", "데드리프트", "풀업"];
const CATEGORIES = ["상체", "하체", "전신", "유산소"];

// 서버의 category 값을 UI에 표시하기 위한 역매핑
const CATEGORY_REVERSE_MAP: { [key: string]: string } = {
  chest: "가슴",
  back: "등",
  legs: "하체",
  shoulders: "어깨",
  arms: "팔",
};

interface UserInfo {
  id: number;
  login_id: string;
  name: string;
  role: string;
}

interface WorkoutSchedule {
  id: number;
  workoutTime: string;
  days: string;
}

interface ExerciseInput {
  name: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  note?: string;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const WorkoutPage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<{ id: number; login_id: string; name: string } | null>(null);
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [totalDuration, setTotalDuration] = useState<number | "">("");
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { name: "", category: "", sets: 0, reps: 0, weight: 0 },
  ]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showChoicePopup, setShowChoicePopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [workoutImages, setWorkoutImages] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // 사용자 정보 조회
  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true);
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      try {
        const response = await axios.get("http://13.209.19.146:3000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("사용자 정보 조회 성공:", response.data);
        setUserInfo(response.data);
      } catch (err: any) {
        console.error("사용자 정보 조회 실패:", err);
        let message = "사용자 정보를 불러오지 못했습니다.";
        if (err.response?.status === 401) {
          message = "세션이 만료되었습니다. 다시 로그인해주세요.";
        } else if (err.response?.status === 404) {
          message = "사용자를 찾을 수 없습니다.";
        }
        alert(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, [token, navigate]);

  // 회원이 자신의 트레이너 정보 조회
  useEffect(() => {
    if (!token || !userInfo) return;
    axios
      .get("http://13.209.19.146:3000/api/member/trainer", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.trainer) {
          console.log("트레이너 정보 조회 성공:", res.data.trainer);
          setTrainerInfo(res.data.trainer);
        } else {
          console.warn("트레이너 정보가 없습니다.");
        }
      })
      .catch((err) => {
        console.error("트레이너 정보 조회 오류:", err);
      });
  }, [token, userInfo]);

  const handleExerciseChange = (index: number, field: string, value: any) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const getCategoryClass = (category: string): string => {
    switch (category) {
      case "가슴":
        return "category-chest";
      case "등":
        return "category-back";
      case "하체":
        return "category-legs";
      case "어깨":
        return "category-shoulders";
      case "팔":
        return "category-arms";
      default:
        return "";
    }
  };

  const addExerciseField = () => {
    setExercises([
      ...exercises,
      { name: "", category: "", sets: 0, reps: 0, weight: 0 },
    ]);
    setCurrentExerciseIndex(exercises.length);
  };

  const deleteExerciseField = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index);
    setExercises(updated);
    setCurrentExerciseIndex(Math.max(0, index - 1));
  };

  const calculateDuration = () => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const duration = endH * 60 + endM - (startH * 60 + startM);
      setTotalDuration(duration > 0 ? duration : 0);
    } else {
      setTotalDuration("");
    }
  };

  useEffect(() => {
    calculateDuration();
  }, [startTime, endTime]);

  useEffect(() => {
    // 알림 권한 요청
    const requestNotificationPermission = async () => {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("알림 권한이 허용되었습니다.");
      } else {
        console.warn("알림 권한 거부:", permission);
      }
    };
  
    // 카메라 권한 요청 (스트림 없이 권한만 요청)
    const requestCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("카메라 권한 허용됨");
        stream.getTracks().forEach((track) => track.stop()); // 권한 확인용 스트림 정리
      } catch (err) {
        console.error("카메라 권한 요청 실패:", err);
      }
    };
  
    requestNotificationPermission();
    requestCameraPermission();
  }, []);
  

  // 카메라 접근 및 촬영
  useEffect(() => {
    if (showCameraModal && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("카메라 접근 오류:", err));
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCameraModal]);

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], "workout.jpg", { type: "image/jpeg" });
          await uploadImage(file);
          setShowCameraModal(false);
          const userId = userInfo?.id.toString();
          if (!userId) {
            alert("사용자 정보가 필요합니다.");
            return;
          }
          const formattedDate = formatLocalDate(workoutDate);
          try {
            const response = await axios.get("http://13.209.19.146:3000/api/images/workout", {
              params: { userId, workoutDate: formattedDate },
              headers: { Authorization: `Bearer ${token}` },
            });
            const images = response.data.workouts || [];
            setWorkoutImages(images);
            setShowImagePopup(true);
          } catch (err) {
            console.error("촬영 후 이미지 재조회 오류:", err);
            alert("이미지 조회 실패");
          }
        }
      }, "image/jpeg");
    }
  };

  const uploadImage = async (file: File) => {
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("workoutDate", formatLocalDate(workoutDate));
      const response = await axios.post("http://13.209.19.146:3000/api/upload/workout", formData, {
        headers: {
          // "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      alert(response.data.message || "이미지 업로드 성공");
    } catch (error: any) {
      console.error("업로드 오류:", error);
      alert(error.response?.data?.message || "업로드 실패");
    }
  };

  // 제출 처리: 운동 기록 저장
  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      alert("시작 시간과 종료 시간을 입력해주세요.");
      return;
    }

    if (isLoading) {
      alert("사용자 정보를 불러오는 중입니다. 잠시 후 시도해주세요.");
      return;
    }

    if (!userInfo) {
      alert("사용자 정보를 불러올 수 없습니다.");
      return;
    }

    try {
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      const formattedWorkoutDate = formatLocalDate(workoutDate);
      const filteredExercises = exercises.filter(
        (ex) => ex.name && ex.sets > 0 && ex.reps > 0
      );

      if (filteredExercises.length === 0) {
        alert("최소한 하나의 유효한 운동 항목을 입력해주세요.");
        return;
      }

      const payload: any = {
        userId: userInfo.id,
        workout_date: formattedWorkoutDate,
        start_time: startTime,
        end_time: endTime,
        total_duration: typeof totalDuration === "number" ? totalDuration : null,
        note: "",
        exercises: filteredExercises.map((ex) => ({
          name: ex.name,
          category: ex.category,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          note: ex.note || "",
        })),
      };

      if (userInfo.role === "member") {
        if (!trainerInfo) {
          alert("트레이너 정보를 불러오지 못했습니다.");
          return;
        }
        payload.trainerId = trainerInfo.id;
      } else if (userInfo.role === "trainer") {
        const memberIdLocal = localStorage.getItem("memberId");
        if (!memberIdLocal) {
          alert("회원 ID를 선택해주세요.");
          return;
        }
        payload.memberId = memberIdLocal;
      } else {
        alert(`유효하지 않은 사용자 역할입니다: ${userInfo.role}`);
        return;
      }

      console.log("전송 페이로드:", JSON.stringify(payload, null, 2));
      console.log("토큰:", token);
      console.log("사용자 역할:", userInfo.role);

      const response = await axios.post("http://13.209.19.146:3000/api/record", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("서버 응답:", response.data);
      alert(response.data.message || "운동 기록이 저장되었습니다!");

      // 저장 후 최신 기록 조회
      await fetchWorkoutRecords(workoutDate);
    } catch (error: any) {
      console.error("운동 기록 저장 오류:", error);
      const errorMessage = error.response?.data?.message || error.message || "운동 기록 저장 실패";
      console.error("서버 오류 상세:", error.response?.data);
      alert(`운동 기록 저장에 실패했습니다: ${errorMessage}`);
    }
  };

  // 달력 클릭 시 처리
  const handleDateClick = async (value: Date) => {
    setWorkoutDate(value);
    const userId = userInfo?.id.toString();
    if (!userId) {
      alert("사용자 정보가 필요합니다.");
      return;
    }
    const formattedDate = formatLocalDate(value);
    try {
      // 운동 인증샷 조회
      const imageResponse = await axios.get("http://13.209.19.146:3000/api/images/workout", {
        params: { userId, workoutDate: formattedDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("이미지 조회 응답:", imageResponse.data);
      const images = imageResponse.data.workouts || [];
      setWorkoutImages(images);

      // 운동 기록 조회
      await fetchWorkoutRecords(value);

      // 당일이면서 이미지가 없으면 사진 등록 선택 팝업
      const today = new Date();
      const isToday = formatLocalDate(value) === formatLocalDate(today);
      if (isToday && images.length === 0) {
        setShowChoicePopup(true);
      } else {
        setShowImagePopup(true);
      }
    } catch (error: any) {
      console.error("운동 인증샷 조회 오류:", error);
      alert(error.response?.data?.message || "운동 인증샷 조회 실패");
    }
  };

  // 운동 기록 조회 함수
  const fetchWorkoutRecords = async (date: Date) => {
    if (!token || !userInfo) return;
    let params: any = {};
    if (userInfo.role === "trainer") {
      const memberIdLocal = localStorage.getItem("memberId");
      if (!memberIdLocal) {
        alert("회원 ID를 선택해주세요.");
        return;
      }
      params.memberId = memberIdLocal;
    }
    try {
      const response = await axios.get("http://13.209.19.146:3000/api/record", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      console.log("운동 기록 조회 응답:", JSON.stringify(response.data, null, 2));
      const allRecords = response.data.data || [];
      const formattedDate = formatLocalDate(date);
      const filteredRecords = allRecords.filter(
        (record: any) => record.workout_date === formattedDate
      );

      if (filteredRecords.length > 0) {
        const record = filteredRecords[0]; // 첫 번째 기록 사용
        setStartTime(record.start_time || "");
        setEndTime(record.end_time || "");
        setTotalDuration(record.total_duration || "");
        setExercises(
          record.WorkoutDetails?.length > 0
            ? record.WorkoutDetails.map((ex: any) => ({
                name: ex.Exercise?.name || "",
                category: CATEGORY_REVERSE_MAP[ex.Exercise?.category] || ex.Exercise?.category || "",
                sets: ex.sets || 0,
                reps: ex.reps || 0,
                weight: ex.weight || 0,
                note: ex.note || "",
              }))
            : [{ name: "", category: "", sets: 0, reps: 0, weight: 0 }]
        );
        setCurrentExerciseIndex(0);
      } else {
        // 기록이 없으면 기본값으로 초기화
        setStartTime("");
        setEndTime("");
        setTotalDuration("");
        setExercises([{ name: "", category: "", sets: 0, reps: 0, weight: 0 }]);
        setCurrentExerciseIndex(0);
      }
    } catch (error: any) {
      console.error("운동 기록 조회 오류:", error);
      console.error("서버 오류 상세:", error.response?.data);
      alert(error.response?.data?.message || "운동 기록 조회 실패");
    }
  };

  // 카메라 촬영 선택
  const handlePopupChoice = (choice: "camera") => {
    setShowChoicePopup(false);
    setShowCameraModal(true);
  };

  return (
    <div className="record-page-container">
      <h1 className="page-title">🏋️ WORKOUT</h1>
      <div className="form-layout">
        <div className="calendar-section">
          <div className="calendar-wrapper">
            <Calendar
              onClickDay={handleDateClick}
              value={workoutDate}
              formatDay={(locale, date) => date.getDate().toString()}
              className="custom-calendar"
            />
          </div>
          <div className="time-input-group">
            <div>
              <label>시작 시간 *</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label>종료 시간 *</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <label>총 운동 시간 (분)</label>
              <input type="number" value={totalDuration} readOnly />
            </div>
          </div>
        </div>

        <div className="exercise-section">
          <h2 className="exercise-title">운동 내용</h2>
          {exercises.length > 1 && (
            <div className="exercise-navigation">
              <button onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}>
                ◀
              </button>
              <span>
                ({currentExerciseIndex + 1}/{exercises.length})
              </span>
              <button onClick={() => setCurrentExerciseIndex((prev) => Math.min(exercises.length - 1, prev + 1))}>
                ▶
              </button>
            </div>
          )}
          <div className="exercise-box">
            <select
              value={exercises[currentExerciseIndex].name}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "name", e.target.value)}
            >
              <option value="">운동 선택</option>
              {EXERCISE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={exercises[currentExerciseIndex].category}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "category", e.target.value)}
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className={`category-tag ${getCategoryClass(exercises[currentExerciseIndex].category)}`}>
              {exercises[currentExerciseIndex].category}
            </div>
            <label>세트 수</label>
            <input
              type="number"
              value={exercises[currentExerciseIndex].sets}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "sets", Number(e.target.value))}
            />
            <label>반복 수</label>
            <input
              type="number"
              value={exercises[currentExerciseIndex].reps}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "reps", Number(e.target.value))}
            />
            <label>중량 (kg)</label>
            <select
              className="weight-select"
              value={exercises[currentExerciseIndex].weight}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "weight", Number(e.target.value))}
            >
              {[...Array(41)].map((_, i) => {
                const weight = i * 5;
                return (
                  <option key={weight} value={weight}>
                    {weight} kg
                  </option>
                );
              })}
            </select>
            <input
              placeholder="운동 메모"
              value={exercises[currentExerciseIndex].note || ""}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "note", e.target.value)}
            />
            <button className="delete-btn" onClick={() => deleteExerciseField(currentExerciseIndex)}>
              🗑️ 삭제
            </button>
          </div>
          <button className="add-btn" onClick={addExerciseField}>
            + 운동 추가
          </button>
          <button className="submit-btn" onClick={handleSubmit}>
            기록 저장
          </button>
        </div>
      </div>

      {/* 오운완 사진 등록 선택 팝업 */}
      {showChoicePopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>오운완 사진 등록하기</h3>
            <button onClick={() => handlePopupChoice("camera")}>📷 카메라로 찍기</button>
            <button onClick={() => setShowChoicePopup(false)}>닫기</button>
          </div>
        </div>
      )}

      {/* 운동 인증샷(오운완) 팝업 */}
      {showImagePopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>운동 인증샷</h3>
            {workoutImages && workoutImages.length > 0 ? (
              <div className="image-gallery">
                {workoutImages.map((item: any) => (
                  <img key={item.id} src={item.imageUrl} alt="운동 인증샷" className="workout-image" />
                ))}
              </div>
            ) : (
              <p>등록된 인증샷이 없습니다.</p>
            )}
            {formatLocalDate(workoutDate) === formatLocalDate(new Date()) && (
              <button onClick={() => { setShowImagePopup(false); setShowCameraModal(true); }}>
                다시 찍기
              </button>
            )}
            <button onClick={() => setShowImagePopup(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 카메라 모달 */}
      {showCameraModal && (
        <div className="camera-modal">
          <div className="camera-content">
            <h3>오늘의 운동 완료 사진 📸</h3>
            <video ref={videoRef} autoPlay playsInline id="camera-feed" />
            <div className="camera-buttons">
              <button onClick={capturePhoto}>사진 찍기</button>
              <button onClick={() => setShowCameraModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPage;