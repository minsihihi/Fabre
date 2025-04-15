import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

import Login from './Login';
import Register from './Register';
import Home from './Home';
import Home_trainer from './Home_trainer';
import Schedule from './Schedule';
import Schedule_trainer from './Schedule_trainer';
import Meals from './Meals';
import Record from './Record';
import Mypage from './Mypage';
import Mypage_trainer from './Mypage_trainer';
import Workout from './Workout';
import logo from './assets/CGPT.png';

const App: React.FC = () => {
  // 로컬스토리지에 저장된 role 값을 초기 상태로 읽어옴 (로그인 전이면 null)
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기에 따라 모바일 여부 판단
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 메뉴 (사이드바) 렌더링 - 역할에 따라 다른 링크 표시
  const renderSidebarLinks = () => {
    if (role === 'member') {
      return (
        <>
          <Link to="/home" className="sidebar-link">🏠 H O M E</Link>
          <Link to="/schedule" className="sidebar-link">📅 S C H E D U L E</Link>
          <Link to="/workout" className="sidebar-link">🏋️ W O R K O U T</Link>
          <Link to="/meals" className="sidebar-link">🍽️ M E A L S</Link>
          <Link to="/record" className="sidebar-link">📝 R E C O R D</Link>
          <Link to="/mypage" className="sidebar-link">🙋 M Y P A G E</Link>
        </>
      );
    } else if (role === 'trainer') {
      return (
        <>
          <Link to="/home_trainer" className="sidebar-link">🏠 H O M E T</Link>
          <Link to="/schedule_trainer" className="sidebar-link">📅 S C H E D U L E T</Link>
          <Link to="/meals" className="sidebar-link">🍽️ M E A L S</Link>
          <Link to="/record" className="sidebar-link">📝 R E C O R D</Link>
          <Link to="/mypage_trainer" className="sidebar-link">🙋 M Y P A G E T</Link>
        </>
      );
    }
    return null;
  };

  // 라우트 렌더링 - 역할에 따라 다른 페이지 컴포넌트 표시
  const renderRoutes = () => {
    if (role === 'member') {
      return (
        <>
          <Route path="/home" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/record" element={<Record />} />
          <Route path="/mypage" element={<Mypage />} />
        </>
      );
    } else if (role === 'trainer') {
      return (
        <>
          <Route path="/home_trainer" element={<Home_trainer />} />
          <Route path="/schedule_trainer" element={<Schedule_trainer />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/record" element={<Record />} />
          <Route path="/mypage_trainer" element={<Mypage_trainer />} />
        </>
      );
    }
    return null;
  };

  return (
    <Router>
      <div className="container">
        {isMobile && (
          <button className="menu-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            ☰
          </button>
        )}
        <div className={`left-sidebar ${isMobile ? (isSidebarOpen ? "open" : "closed") : ""}`}>
          <img src={logo} alt="채찍피티 로고" className="logo" />
          <h1 className="logo-text">채찍피티</h1>
          <div className="space-y-4">
            {renderSidebarLinks()}
          </div>
        </div>
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {renderRoutes()}
            {/* 등록되지 않은 경로는 로그인 페이지로 리디렉트 */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
