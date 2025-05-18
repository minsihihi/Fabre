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

interface ExerciseInput {
  name: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  note?: string;
}

interface WorkoutDetail {
  id: number;
  sets: number;
  reps: number;
  weight: number;
  note: string;
  Exercise: {
    id: number;
    name: string;
    category: string;
  };
}

interface WorkoutLog {
  id: number;
  workout_date: string;
  start_time: string;
  end_time: string;
  total_duration: number;
  note: string;
  WorkoutDetails: WorkoutDetail[];
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
        setUserInfo(response.data);
      } catch (err: any) {
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

  // 트레이너 정보 조회
  useEffect(() => {
    if (!token || !userInfo) return;
    axios
      .get("http://13.209.19.146:3000/api/member/trainer", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.trainer) {
          setTrainerInfo(res.data.trainer);
        }
      })
      .catch(() => {});
  }, [token, userInfo]);

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
      const allRecords: WorkoutLog[] = response.data.data || [];
      const formattedDate = formatLocalDate(date);
      const record = allRecords.find((r) => r.workout_date === formattedDate);

      if (record) {
        setStartTime(record.start_time);
        setEndTime(record.end_time);
        setTotalDuration(record.total_duration);
        setExercises(
          record.WorkoutDetails.length > 0
            ? record.WorkoutDetails.map((d) => ({
                name: d.Exercise.name,
                category: CATEGORY_REVERSE_MAP[d.Exercise.category] || d.Exercise.category,
                sets: d.sets,
                reps: d.reps,
                weight: d.weight,
                note: d.note,
              }))
            : [{ name: "", category: "", sets: 0, reps: 0, weight: 0 }],
        );
      } else {
        setStartTime("");
        setEndTime("");
        setTotalDuration("");
        setExercises([{ name: "", category: "", sets: 0, reps: 0, weight: 0 }]);
      }
      setCurrentExerciseIndex(0);
    } catch {
      alert("운동 기록 조회 실패");
    }
  };

  // 달력 클릭 시 처리
  const handleDateClick = async (value: Date) => {
    setWorkoutDate(value);
    const formattedDate = formatLocalDate(value);

    // 이미지 조회
    const userIdStr = userInfo?.id.toString();
    if (userIdStr) {
      try {
        const imgRes = await axios.get("http://13.209.19.146:3000/api/images/workout", {
          params: { userId: userIdStr, workoutDate: formattedDate },
          headers: { Authorization: `Bearer ${token}` },
        });
        setWorkoutImages(imgRes.data.workouts || []);
      } catch {}
    }

    await fetchWorkoutRecords(value);

    // 오늘일 때 팝업
    const todayStr = formatLocalDate(new Date());
    if (formattedDate === todayStr && workoutImages.length === 0) {
      setShowChoicePopup(true);
    } else {
      setShowImagePopup(true);
    }
  };

  // 운동 기록 저장
  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      alert("시작 시간과 종료 시간을 입력해주세요.");
      return;
    }
    if (isLoading || !userInfo) {
      alert("사용자 정보를 불러오는 중입니다.");
      return;
    }

    const formattedDate = formatLocalDate(workoutDate);
    const valid = exercises.filter((ex) => ex.name && ex.sets > 0 && ex.reps > 0);
    if (!valid.length) {
      alert("유효한 운동 항목을 입력해주세요.");
      return;
    }

    const payload: any = {
      userId: userInfo.id,
      workout_date: formattedDate,
      start_time: startTime,
      end_time: endTime,
      total_duration: typeof totalDuration === "number" ? totalDuration : null,
      note: "",
      exercises: valid.map((ex) => ({
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
    } else {
      const memberIdLocal = localStorage.getItem("memberId");
      if (!memberIdLocal) {
        alert("회원 ID를 선택해주세요.");
        return;
      }
      payload.memberId = memberIdLocal;
    }

    try {
      await axios.post("http://13.209.19.146:3000/api/record", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("운동 기록이 저장되었습니다!");
      await fetchWorkoutRecords(workoutDate);
    } catch {
      alert("운동 기록 저장에 실패했습니다.");
    }
  };

  // 이미지 업로드
  const uploadImage = async (file: File) => {
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("workoutDate", formatLocalDate(workoutDate));
    try {
      const res = await axios.post("http://13.209.19.146:3000/api/upload/workout", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message || "이미지 업로드 성공");
    } catch {
      alert("이미지 업로드 실패");
    }
  };

  // 카메라 촬영
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
        if (!blob) return;
        const file = new File([blob], "workout.jpg", { type: "image/jpeg" });
        await uploadImage(file);
        setShowCameraModal(false);
        // 재조회
        handleDateClick(workoutDate);
      }, "image/jpeg");
    }
  };

  // 카테고리 태그 클래스
  const getCategoryClass = (c: string) => {
    switch (c) {
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

  // 세트 입력 handlers
  const handleExerciseChange = (i: number, f: keyof ExerciseInput, v: any) => {
    const arr = [...exercises];
    arr[i] = { ...arr[i], [f]: v };
    setExercises(arr);
  };
  const addExerciseField = () => {
    setExercises([...exercises, { name: "", category: "", sets: 0, reps: 0, weight: 0 }]);
    setCurrentExerciseIndex(exercises.length);
  };
  const deleteExerciseField = (i: number) => {
    const arr = exercises.filter((_, idx) => idx !== i);
    setExercises(arr);
    setCurrentExerciseIndex(Math.max(0, i - 1));
  };

  // 운동 시간 계산
  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const mins = eh * 60 + em - (sh * 60 + sm);
      setTotalDuration(mins > 0 ? mins : 0);
    } else {
      setTotalDuration("");
    }
  }, [startTime, endTime]);

  // 카메라 권한 요청
  useEffect(() => {
    const reqCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    Notification.requestPermission();
    reqCam();
  }, []);

  // 카메라 스트림 관리
  useEffect(() => {
    if (showCameraModal && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => {});
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [showCameraModal]);

  return (
    <div className="record-page-container">
      <h1 className="page-title">🏋️ WORKOUT</h1>
      <div className="form-layout">
        <div className="calendar-section">
          <Calendar
            onClickDay={handleDateClick}
            value={workoutDate}
            formatDay={(locale, date) => date.getDate().toString()}
            className="custom-calendar"
          />
          <div className="time-input-group">
            <label>시작 시간 *</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <label>종료 시간 *</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <label>총 운동 시간</label>
            <input type="number" value={totalDuration} readOnly />
          </div>
        </div>

        <div className="exercise-section">
          <h2 className="exercise-title">운동 내용</h2>
          {exercises.length > 1 && (
            <div className="exercise-navigation">
              <button onClick={() => setCurrentExerciseIndex((p) => Math.max(0, p - 1))}>◀</button>
              <span>
                {currentExerciseIndex + 1}/{exercises.length}
              </span>
              <button onClick={() => setCurrentExerciseIndex((p) => Math.min(exercises.length - 1, p + 1))}>▶</button>
            </div>
          )}
          <div className="exercise-box">
            <select
              value={exercises[currentExerciseIndex].name}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "name", e.target.value)}
            >
              <option value="">운동 선택</option>
              {EXERCISE_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={exercises[currentExerciseIndex].category}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "category", e.target.value)}
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className={`category-tag ${getCategoryClass(exercises[currentExerciseIndex].category)}`}>
              {exercises[currentExerciseIndex].category}
            </div>
            <label>세트</label>
            <input
              type="number"
              value={exercises[currentExerciseIndex].sets}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "sets", Number(e.target.value))}
            />
            <label>반복</label>
            <input
              type="number"
              value={exercises[currentExerciseIndex].reps}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "reps", Number(e.target.value))}
            />
            <label>중량(kg)</label>
            <select
              value={exercises[currentExerciseIndex].weight}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "weight", Number(e.target.value))}
            >
              {[...Array(41)].map((_, i) => (
                <option key={i} value={i * 5}>
                  {i * 5} kg
                </option>
              ))}
            </select>
            <input
              placeholder="메모"
              value={exercises[currentExerciseIndex].note || ""}
              onChange={(e) => handleExerciseChange(currentExerciseIndex, "note", e.target.value)}
            />
            <button className="delete-btn" onClick={() => deleteExerciseField(currentExerciseIndex)}>
              🗑️
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

      {/* 오운완 사진 선택 팝업 */}
      {showChoicePopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>오운완 사진 등록하기</h3>
            <button onClick={() => { setShowChoicePopup(false); setShowCameraModal(true); }}>
              📷 카메라로 찍기
            </button>
            <button onClick={() => setShowChoicePopup(false)}>닫기</button>
          </div>
        </div>
      )}

      {/* 운동 인증샷 팝업 */}
      {showImagePopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>운동 인증샷</h3>
            {workoutImages.length > 0 ? (
              <div className="image-gallery">
                {workoutImages.map((img) => (
                  <img key={img.id} src={img.imageUrl} alt="운동 인증샷" className="workout-image" />
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
            <button onClick={() => setShowImagePopup(false)}>닫기</button>
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
