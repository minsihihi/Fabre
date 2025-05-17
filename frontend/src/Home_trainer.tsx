import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Home_trainer.css"; // Make sure this file exists or styles are handled
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
  profileImage: string | null; // Matches backend: b.Member.profile_image
}

interface BookingSchedule {
  id: number;
  date: string; // Format: YYYY-MM-DD
  startTime: string; // Format: HH:MM:SS or HH:MM
  endTime: string; // Format: HH:MM:SS or HH:MM
}

interface Booking {
  id: number;
  status: string; // e.g., "confirmed", "pending", "cancelled"
  createdAt: string; // ISO date string
  member: BookingMember;
  schedule: BookingSchedule;
}

// --- Helper Function ---
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TrainerHome() {
  const [date, setDate] = useState<Date>(new Date()); // For calendar selection
  const [members, setMembers] = useState<Member[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [bookings, setBookings] = useState<Booking[]>([]); // State for trainer bookings
  const token = localStorage.getItem("token");

  useEffect(() => {
    // Fetch initial data when the component mounts or token is available
    if (token) {
      fetchMembers();
      fetchTrainerBookings();
    } else {
      console.error("토큰이 없습니다. 로그인이 필요합니다.");
      alert("로그인이 필요합니다.");
      // Potentially redirect to login page here
    }
  }, [token]); // Re-fetch if token changes (e.g., after login)

  const fetchMembers = async () => {
    try {
      // Token is already checked in useEffect, but good practice to have it here if called independently
      if (!token) return;

      const response = await axios.get("http://13.209.19.146:3000/api/trainer/members", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const membersData: { member: { id: number; name: string } }[] = response.data.data;

      if (!membersData || !membersData.length) {
        console.log("등록된 회원이 없습니다.");
        setMembers([]);
        return;
      }

      const updatedMembersPromises = membersData.map(async (memberData) => {
        const userId = memberData.member?.id;
        const userName = memberData.member?.name;
      
        try {
          const profileRes = await axios.get("http://13.209.19.146:3000/api/images/profile", {
            params: { userId },
            headers: { Authorization: `Bearer ${token}` },
          });
      
          return {
            id: userId,
            name: userName,
            completed: false,
            profileImageUrl: profileRes.data.imageUrl || "/default-profile.png",
          };
        } catch (error) {
          console.error(`프로필 이미지 조회 실패 for member ${userId}`, error);
          return {
            id: userId,
            name: userName,
            completed: false,
            profileImageUrl: "/default-profile.png",
          };
        }
      });
      
      const resolvedMembers = await Promise.all(updatedMembersPromises);
      setMembers(resolvedMembers);
    } catch (error: unknown) {
      console.error("회원 목록 불러오기 실패", error);
      if ((error as any).response?.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      } else {
        // alert("회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  const fetchTrainerBookings = async () => {
    try {
      if (!token) return; // Should be redundant due to useEffect check

      const response = await axios.get<{ bookings: Booking[] }>("http://13.209.19.146:3000/api/trainer/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data.bookings || []); // Set to empty array if undefined
      console.log("트레이너 예약 조회 성공:", response.data.bookings);
    } catch (error: unknown) {
      console.error("트레이너 예약 목록 불러오기 실패", error);
      if ((error as any).response?.status === 401) {
        alert("세션이 만료되었습니다. (예약 조회 중)");
      } else {
        // alert("예약 목록을 불러오지 못했습니다.");
      }
    }
  };

  const updateMembersCompletion = async (selectedDate: Date) => {
    const formattedDate = formatLocalDate(selectedDate);
    // Ensure members array is not empty before mapping
    if (members.length === 0) {
        console.log("업데이트할 회원이 없습니다. (updateMembersCompletion)");
        return;
    }
    const updatedMembersPromises = members.map(async (member: Member) => {
      try {
        const response = await axios.get("http://13.209.19.146:3000/api/images/workout", {
          params: { userId: member.id, workoutDate: formattedDate },
          headers: { Authorization: `Bearer ${token}` },
        });
        const completed = response.data.workouts && response.data.workouts.length > 0;
        return { ...member, completed };
      } catch (error: unknown) {
        console.error(`운동 기록 조회 실패 for member ${member.id} on ${formattedDate}`, error);
        return { ...member, completed: false }; // Keep member, set completion to false on error
      }
    });
    const resolvedMembers = await Promise.all(updatedMembersPromises);
    setMembers(resolvedMembers);
  };

  const handleDateClick = async (value: Date) => {
    setDate(value);
    // Only update completion if there are members to update
    if (members.length > 0) {
        await updateMembersCompletion(value);
    } else {
        console.log("캘린더 날짜 클릭: 현재 회원 목록이 비어있어 완료 상태를 업데이트하지 않습니다.");
    }
    setModalOpen(true);
  };

  // Memoized selectors for today's and tomorrow's bookings
  const todayDateString = formatLocalDate(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(new Date().getDate() + 1);
  const tomorrowDateString = formatLocalDate(tomorrowDate);

  const todaysBookings = useMemo(() =>
    bookings
        .filter(b => b.schedule.date === todayDateString && b.status !== 'cancelled') // Example: filter out cancelled
        .sort((a,b) => a.schedule.startTime.localeCompare(b.schedule.startTime)), // Sort by time
    [bookings, todayDateString]
  );

  const tomorrowsBookings = useMemo(() =>
    bookings
        .filter(b => b.schedule.date === tomorrowDateString && b.status !== 'cancelled')
        .sort((a,b) => a.schedule.startTime.localeCompare(b.schedule.startTime)),
    [bookings, tomorrowDateString]
  );


  return (
    <div className="home-container">
      <style>
        {`
          .profile-img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 10px;
          }
          .member-item {
            display: flex;
            align-items: center;
            padding: 8px 0; /* Increased padding for better spacing */
            border-bottom: 1px solid #eee; /* Separator for items */
          }
          .member-item:last-child {
            border-bottom: none; /* No border for the last item */
          }
          .member-item p {
            margin: 0;
            font-size: 0.95em;
          }
          .upcoming-bookings-container {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .bookings-section {
            margin-bottom: 15px;
          }
          .bookings-section:last-child {
            margin-bottom: 0;
          }
          .bookings-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #333;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 5px;
          }
          .booking-item {
            padding: 5px 0;
            font-size: 0.9em;
            color: #555;
          }
          .booking-item-details {
            display: flex;
            align-items: center;
          }
          .booking-member-profile {
            width: 30px; /* Smaller profile image for booking list */
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 8px;
          }
          .modal .members-container { /* Ensure modal styles don't conflict */
            display: flex;
            justify-content: space-between;
          }
          .modal .completed, .modal .not-completed {
            width: 48%;
          }
        `}
      </style>

      {/* Upcoming Bookings Display */}
      <div className="upcoming-bookings-container">
        <div className="bookings-section">
          <h4>오늘 예약된 스케줄 ({todayDateString})</h4>
          {todaysBookings.length > 0 ? (
            todaysBookings.map(booking => (
              <div key={booking.id} className="booking-item">
                <div className="booking-item-details">
                  {booking.member.profileImage && (
                    <img 
                        src={booking.member.profileImage} 
                        alt={booking.member.name} 
                        className="booking-member-profile" 
                        onError={(e) => (e.currentTarget.src = '/default-profile.png')} // Fallback for broken image links
                    />
                  )}
                  <span>{booking.member.name} - {booking.schedule.startTime.substring(0,5)}</span>
                </div>
              </div>
            ))
          ) : (
            <p>오늘 예약된 스케줄이 없습니다.</p>
          )}
        </div>

        <div className="bookings-section">
          <h4>내일 예약된 스케줄 ({tomorrowDateString})</h4>
          {tomorrowsBookings.length > 0 ? (
            tomorrowsBookings.map(booking => (
              <div key={booking.id} className="booking-item">
                 <div className="booking-item-details">
                  {booking.member.profileImage && (
                    <img 
                        src={booking.member.profileImage} 
                        alt={booking.member.name} 
                        className="booking-member-profile"
                        onError={(e) => (e.currentTarget.src = '/default-profile.png')}
                    />
                  )}
                  <span>{booking.member.name} - {booking.schedule.startTime.substring(0,5)}</span>
                </div>
              </div>
            ))
          ) : (
            <p>내일 예약된 스케줄이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick} // This is ValuePiece | ValuePiece[] -> Date, so casting to Date might be needed if strict
          value={date}
          formatDay={(locale: string, dateToFormat: Date) => dateToFormat.getDate().toString()}
        />
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>{formatLocalDate(date)} 운동 현황</h2>
            <div className="members-container">
              <div className="completed">
                <h3>운동 완료 회원</h3>
                {members.filter((m: Member) => m.completed).length > 0 ? (
                  members.filter((m: Member) => m.completed).map((member: Member) => (
                    <div key={member.id} className="member-item">
                      <img
                        src={member.profileImageUrl}
                        alt={member.name}
                        className="profile-img"
                        onError={(e) => (e.currentTarget.src = '/default-profile.png')}
                      />
                      <p>{member.name}</p>
                    </div>
                  ))
                ) : (
                  <p>없음</p>
                )}
              </div>
              <div className="not-completed">
                <h3>운동 미완료 회원</h3>
                {members.filter((m: Member) => !m.completed).length > 0 ? (
                  members.filter((m: Member) => !m.completed).map((member: Member) => (
                    <div key={member.id} className="member-item">
                      <img
                        src={member.profileImageUrl}
                        alt={member.name}
                        className="profile-img"
                        onError={(e) => (e.currentTarget.src = '/default-profile.png')}
                      />
                      <p>{member.name}</p>
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