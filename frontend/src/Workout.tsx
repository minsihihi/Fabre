import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Workout.css';

const EXERCISE_NAMES = ['벤치프레스', '스쿼트', '데드리프트', '풀업'];
const CATEGORIES = ['가슴', '등', '하체', '어깨', '팔'];

const getCategoryClass = (category: string) => {
  switch (category) {
    case '가슴': return 'category-가슴';
    case '등': return 'category-등';
    case '하체': return 'category-하체';
    case '어깨': return 'category-어깨';
    case '팔': return 'category-팔';
    default: return '';
  }
};

type ExerciseInput = {
  name: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  note?: string;
};

const WorkoutPage = () => {
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<number | ''>('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { name: '', category: '', sets: 0, reps: 0, weight: 0 },
  ]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  
  // 카메라/앨범 관련 상태
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showChoicePopup, setShowChoicePopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  const handleExerciseChange = (index: number, field: string, value: any) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const addExerciseField = () => {
    setExercises([
      ...exercises,
      { name: '', category: '', sets: 0, reps: 0, weight: 0 },
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
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);
      setTotalDuration(duration > 0 ? duration : 0);
    }
  };

  useEffect(() => {
    calculateDuration();
  }, [startTime, endTime]);

  useEffect(() => {
    if (showCameraModal && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error('카메라 접근 오류:', err));
    }
  }, [showCameraModal]);

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      alert('시작 시간과 종료 시간을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const payload = {
        workout_date: workoutDate,
        start_time: startTime,
        end_time: endTime,
        total_duration: totalDuration || null,
        exercises,
      };

      await axios.post('http://localhost:3000/api/workout/record', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert('운동 기록이 저장되었습니다!');
      navigate('/workout/history');
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || '운동 기록 저장 실패');
    }
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    setWorkoutDate(date);
    if (isToday) {
      setShowChoicePopup(true);
    }
  };

  // 기존 choice popup에서, 'camera' 선택 시 카메라 모달, 'upload' 선택 시 파일업로드 모달을 보여줌
  const handlePopupChoice = (choice: 'camera' | 'upload') => {
    setShowChoicePopup(false);
    if (choice === 'camera') {
      setShowCameraModal(true);
    } else if (choice === 'upload') {
      setShowUploadModal(true);
    }
  };

  // 사진 찍기: video 스트림 캡처 후 캔버스로 변환하여 blob 생성, API 업로드
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    // 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'workout.jpg', { type: 'image/jpeg' });
          await uploadImage(file);
          setShowCameraModal(false);
        }
      }, 'image/jpeg');
    }
  };

  // 파일 업로드 (앨범 선택) 처리
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }
    await uploadImage(selectedFile);
    setShowUploadModal(false);
  };

  // 이미지 업로드 API 호출 (카테고리는 "workout")
  const uploadImage = async (file: File) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);
      const response = await axios.post('http://localhost:3000/api/upload/workout', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      alert(response.data.message);
    } catch (error: any) {
      console.error('업로드 오류:', error);
      alert(error.response?.data?.message || '업로드 실패');
    }
  };

  return (
    <div className="record-page-container">
      <h1 className="page-title">🏋️ W O R K O U T</h1>

      <div className="form-layout">
        <div className="calendar-section">
          <div className="calendar-wrapper">
            <Calendar
              onClickDay={handleDateClick}
              value={workoutDate}
              className="custom-calendar"
            />
          </div>
          <div className="time-input-group">
            <div>
              <label>시작 시간 *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label>종료 시간 *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <label>총 운동 시간 (분)</label>
              <input
                type="number"
                value={totalDuration}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="exercise-section">
          <h2 className="exercise-title">운동 내용</h2>
          {exercises.length > 1 && (
            <div className="exercise-navigation">
              <button
                onClick={() =>
                  setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))
                }
              >
                ◀
              </button>
              <span>({currentExerciseIndex + 1}/{exercises.length})</span>
              <button
                onClick={() =>
                  setCurrentExerciseIndex((prev) =>
                    Math.min(exercises.length - 1, prev + 1)
                  )
                }
              >
                ▶
              </button>
            </div>
          )}
          <div className="exercise-box">
            <select
              value={exercises[currentExerciseIndex].name}
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'name', e.target.value)
              }
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
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'category', e.target.value)
              }
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
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'sets', Number(e.target.value))
              }
            />
            <label>반복 수</label>
            <input
              type="number"
              value={exercises[currentExerciseIndex].reps}
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'reps', Number(e.target.value))
              }
            />
            <label>중량 (kg)</label>
            <select
              className="weight-select"
              value={exercises[currentExerciseIndex].weight}
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'weight', Number(e.target.value))
              }
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
              value={exercises[currentExerciseIndex].note || ''}
              onChange={(e) =>
                handleExerciseChange(currentExerciseIndex, 'note', e.target.value)
              }
            />
            <button
              className="delete-btn"
              onClick={() => deleteExerciseField(currentExerciseIndex)}
            >
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

      {/* 사진 촬영/업로드 선택 팝업 */}
      {showChoicePopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>오운완 사진 등록 방법</h3>
            <button onClick={() => handlePopupChoice('camera')}>📷 카메라로 찍기</button>
            <button onClick={() => handlePopupChoice('upload')}>🖼️ 갤러리에서 선택</button>
            <button onClick={() => setShowChoicePopup(false)}>닫기</button>
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

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="upload-modal">
          <div className="upload-content">
            <h3>갤러리에서 사진 선택</h3>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <div className="upload-buttons">
              <button onClick={handleFileUpload}>사진 업로드</button>
              <button onClick={() => setShowUploadModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPage;
