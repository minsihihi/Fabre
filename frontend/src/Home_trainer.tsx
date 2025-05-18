import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home_trainer.css";
import axios from "axios";

// --- Existing Member Interface ---
interface Member {
  id: number;
  name: string;
  completed: boolean;
  profileImageUrl: string;
}

// --- New Interfaces for Trainer Bookings ---
interface BookingMember {
  id: number;
  name: string;
  profileImage: string | null;
}

interface BookingSchedule {
  id: number;
  date: string;       // ISO date string
  startTime: string;  // HH:MM:SS
  endTime: string;    // HH:MM:SS
}

interface Booking {
  id: number;
  status: string;     // e.g. "confirmed"
  createdAt: string;  // ISO date string
  member: BookingMember;
  schedule: BookingSchedule;
}

// --- Helper Function ---
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

  // --- 회원 목록 불러오기 ---
  const fetchMembers = async () => {
    try {
      const res = await axios.get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any[] = res.data.data; // [{ member: { id, name, profileImage } }, ...]
      const updated = await Promise.all(
        data.map(async (rec) => {
          const { id, name } = rec.member;
          let profileImageUrl = "/default-profile.png";
          try {
            const imgRes = await axios.get("http://13.209.19.146:3000/api/images/profile", {
              params: { userId: id },
              headers: { Authorization: `Bearer ${token}` },
            });
            if (imgRes.data.imageUrl) profileImageUrl = imgRes.data.imageUrl;
          } catch {
            /* ignore */
          }
          return { id, name, completed: false, profileImageUrl };
        })
      );
      setMembers(updated);
    } catch (err) {
      console.error("회원 목록 불러오기 실패:", err);
    }
  };

  // --- 트레이너 예약 조회 ---
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

  // --- 회원 운동 완료 여부 업데이트 ---
  const updateMembersCompletion = async (selectedDate: Date) => {
    const dateStr = formatLocalDate(selectedDate);
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
    if (members.length) await updateMembersCompletion(value);
    setModalOpen(true);
  };

  // --- 오늘·내일 확정 예약 필터링 & 정렬 ---
  const today = formatLocalDate(new Date());
  const tomorrow = formatLocalDate(new Date(Date.now() + 86400000));

  const todaysBookings = useMemo(
    () =>
      bookings
        .filter(b => b.schedule.date.startsWith(today) && b.status === "confirmed")
        .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime)),
    [bookings, today]
  );

  const tomorrowsBookings = useMemo(
    () =>
      bookings
        .filter(b => b.schedule.date.startsWith(tomorrow) && b.status === "confirmed")
        .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime)),
    [bookings, tomorrow]
  );

  return (
    <div className="home-container">
      <style>{`
        /* 인라인 스타일 유지 */
      `}</style>

      {/* --- 예약 내역 섹션 --- */}
      <div className="upcoming-bookings-container">
        <div className="bookings-section">
          <h4>오늘 확정된 스케줄 ({today})</h4>
          {todaysBookings.length ? (
            todaysBookings.map(b => (
              <div key={b.id} className="booking-item">
                <div className="booking-item-details">
                  {b.member.profileImage && (
                    <img
                      src={b.member.profileImage}
                      alt={b.member.name}
                      className="booking-member-profile"
                      onError={e => (e.currentTarget.src = '/default-profile.png')}
                    />
                  )}
                  <span>
                    {b.member.name} — {b.schedule.startTime.slice(0,5)}–{b.schedule.endTime.slice(0,5)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p>오늘 확정된 예약이 없습니다.</p>
          )}
        </div>

        <div className="bookings-section">
          <h4>내일 확정된 스케줄 ({tomorrow})</h4>
          {tomorrowsBookings.length ? (
            tomorrowsBookings.map(b => (
              <div key={b.id} className="booking-item">
                <div className="booking-item-details">
                  {b.member.profileImage && (
                    <img
                      src={b.member.profileImage}
                      alt={b.member.name}
                      className="booking-member-profile"
                      onError={e => (e.currentTarget.src = '/default-profile.png')}
                    />
                  )}
                  <span>
                    {b.member.name} — {b.schedule.startTime.slice(0,5)}–{b.schedule.endTime.slice(0,5)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p>내일 확정된 예약이 없습니다.</p>
          )}
        </div>
      </div>

      {/* --- 캘린더 --- */}
      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          formatDay={(locale, d) => d.getDate().toString()}
        />
      </div>

      {/* --- 모달 (운동 완료/미완료 회원) --- */}
      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>{formatLocalDate(date)} 운동 현황</h2>
            <div className="members-container">
              <div className="completed">
                <h3>운동 완료 회원</h3>
                {members.filter(m => m.completed).length ? (
                  members.filter(m => m.completed).map(m => (
                    <div key={m.id} className="member-item">
                      <img
                        src={m.profileImageUrl}
                        alt={m.name}
                        className="profile-img"
                        onError={e => (e.currentTarget.src = '/default-profile.png')}
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
                {members.filter(m => !m.completed).length ? (
                  members.filter(m => !m.completed).map(m => (
                    <div key={m.id} className="member-item">
                      <img
                        src={m.profileImageUrl}
                        alt={m.name}
                        className="profile-img"
                        onError={e => (e.currentTarget.src = '/default-profile.png')}
                      />
                      <p>{m.name}</p>
                    </div>
                  ))
                ) : (
                  <p>없음</p>
                )}
              </div>
            </div>
            <button onClick={() => setModalOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
