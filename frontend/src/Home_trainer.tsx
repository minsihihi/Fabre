// 📁 frontend/src/TrainerHome.tsx

import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home_trainer.css";
import axios from "axios";

// --- 기존 Member 인터페이스 ---
interface Member {
  id: number;
  name: string;
  completed: boolean;
  profileImageUrl: string;
}

// --- 예약 관련 인터페이스 ---
interface BookingMember {
  id: number;
  name: string;
  profileImage: string | null;
}

interface BookingSchedule {
  id: number;
  date: string;       // ISO date 문자열
  startTime: string;  // "HH:MM:SS"
  endTime: string;    // "HH:MM:SS"
}

interface Booking {
  id: number;
  status: string;     // "confirmed" | "completed" 등
  createdAt: string;  // ISO date 문자열
  member: BookingMember;
  schedule: BookingSchedule;
}

// Helper: ISO 문자열 → "YYYY-MM-DD" 형태로 변환
function toYMD(isodate: string): string {
  const d = new Date(isodate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 오늘/내일 날짜 문자열
function todayYMD(): string {
  return toYMD(new Date().toISOString());
}
function tomorrowYMD(): string {
  return toYMD(new Date(Date.now() + 86400000).toISOString());
}

export default function TrainerHome() {
  const [date, setDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<Member[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    fetchMembers();
    fetchTrainerBookings();
  }, [token]);

  // 1) 회원 목록 불러오기
  const fetchMembers = async () => {
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any[] = res.data.data;
      const updated = await Promise.all(
        data.map(async (rec) => {
          const { id, name } = rec.member;
          let profileImageUrl = "/default-profile.png";
          try {
            const imgRes = await axios.get("http://13.209.19.146:3000/api/images/profile", {
              params: { userId: id },
              headers: { Authorization: `Bearer ${token}` },
            });
            if (imgRes.data.imageUrl) {
              profileImageUrl = imgRes.data.imageUrl;
            }
          } catch {
            // 실패 시 기본 이미지 유지
          }
          return { id, name, completed: false, profileImageUrl };
        })
      );
      setMembers(updated);
    } catch (err) {
      console.error("회원 목록 불러오기 실패:", err);
    }
  };

  // 2) 트레이너 예약 조회
  const fetchTrainerBookings = async () => {
    try {
      const res = await axios.get<{ bookings: Booking[] }>(
        "http://13.209.19.146:3000/api/trainer/bookings",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(res.data.bookings || []);
      console.log("트레이너 예약 조회 성공:", res.data.bookings);
    } catch (err) {
      console.error("예약 조회 실패:", err);
    }
  };

  // 3) “선택된 날짜” 기준으로 회원별 운동 완료 여부 업데이트
  const updateMembersCompletion = async (selectedDate: Date) => {
    const dateStr = toYMD(selectedDate.toISOString());
    const updated = await Promise.all(
      members.map(async (m) => {
        try {
          const resp = await axios.get("http://13.209.19.146:3000/api/images/workout", {
            params: { userId: m.id, workoutDate: dateStr },
            headers: { Authorization: `Bearer ${token}` },
          });
          return { ...m, completed: resp.data.workouts?.length > 0 };
        } catch {
          return { ...m, completed: false };
        }
      })
    );
    setMembers(updated);
  };

  const handleDateClick = async (value: Date) => {
    setDate(value);
    if (members.length) {
      await updateMembersCompletion(value);
    }
    setModalOpen(true);
  };

  // 오늘/내일 날짜 문자열
  const today = todayYMD();
  const tomorrow = tomorrowYMD();

  // 4) “confirmed” 또는 “completed” 상태인 예약들 중 오늘·내일만 필터 → 정렬
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const day = toYMD(b.schedule.date);
        return (
          (day === today || day === tomorrow) &&
          (b.status === "confirmed" || b.status === "completed")
        );
      })
      .sort((a, b) => {
        const dayA = toYMD(a.schedule.date);
        const dayB = toYMD(b.schedule.date);
        if (dayA !== dayB) {
          // 오늘 먼저 나오도록
          return dayA === today ? -1 : 1;
        }
        return a.schedule.startTime.localeCompare(b.schedule.startTime);
      });
  }, [bookings, today, tomorrow]);

  return (
    <div className="home-container">
      {/* ——— “확정된 스케줄” 섹션 ——— */}
      <div className="bookings-card small-card">
        <h4>확정된 스케줄 (오늘 & 내일)</h4>
        {filteredBookings.length > 0 ? (
          <ul className="booking-list">
            {filteredBookings.map((b) => {
              const bookingDay = toYMD(b.schedule.date) === today ? "오늘" : "내일";
              return (
                <li key={b.id} className="booking-item">
                  <div className="booking-info">
                    {/* 이름 + 시간만 표시 */}
                    <span className="booking-name">{b.member.name}</span>
                    <span className="booking-time">
                      [{bookingDay}] {b.schedule.startTime.slice(0, 5)}–{b.schedule.endTime.slice(0, 5)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="no-booking">오늘·내일 확정된 예약이 없습니다.</p>
        )}
      </div>

      {/* ——— 캘린더 ——— */}
      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          formatDay={(locale, d) => d.getDate().toString()}
        />
      </div>

      {/* ——— 모달 (운동 완료/미완료 회원) ——— */}
      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{toYMD(date.toISOString())} 운동 현황</h2>
            <div className="members-container">
              <div className="completed">
                <h3>운동 완료 회원</h3>
                {members.filter((m) => m.completed).length > 0 ? (
                  members
                    .filter((m) => m.completed)
                    .map((m) => (
                      <div key={m.id} className="member-item">
                        {/* 프로필 이미지 추가 */}
                        <img
                          src={m.profileImageUrl}
                          alt={m.name}
                          className="profile-img"
                          onError={(e) => (e.currentTarget.src = "/default-profile.png")}
                        />
                        <p>{m.name}</p>
                      </div>
                    ))
                ) : (
                  <p>없음</p>
                )}
              </div>
              <div className="not-completed">
                <h3>운동 미완료 회원</h3>
                {members.filter((m) => !m.completed).length > 0 ? (
                  members
                    .filter((m) => !m.completed)
                    .map((m) => (
                      <div key={m.id} className="member-item">
                        {/* 프로필 이미지 추가 */}
                        <img
                          src={m.profileImageUrl}
                          alt={m.name}
                          className="profile-img"
                          onError={(e) => (e.currentTarget.src = "/default-profile.png")}
                        />
                        <p>{m.name}</p>
                      </div>
                    ))
                ) : (
                  <p>없음</p>
                )}
              </div>
            </div>
            <button className="close-btn" onClick={() => setModalOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
