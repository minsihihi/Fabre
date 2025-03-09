import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Register from './Register';
import Home from './Home';
import Schedule from './Schedule';
import Meals from './Meals';
import Record from './Record';
import logo from './assets/logo.png';
import NotificationTest from './NotificationTest';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [apiMessage, setApiMessage] = useState<string>('');

  // 화면 크기에 따라 모바일 여부 판단
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Router>
      <div className="container">
        {/* 모바일에서만 보이는 메뉴 버튼 */}
        {isMobile && (
          <button className="menu-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            ☰
          </button>
        )}

        {/* 왼쪽 사이드바 */}
        <div className={`left-sidebar ${isMobile ? (isSidebarOpen ? "open" : "closed") : ""}`}>
          <img src={logo} alt="채찍피티 로고" className="logo" />
          <h1 className="logo-text">채찍피티</h1>
          <div className="space-y-4">
            <Link to="/home" className="sidebar-link">🏠 H O M E</Link>
            <Link to="/schedule" className="sidebar-link">📅 S C H E D U L E</Link>
            <Link to="/meals" className="sidebar-link">🍽️ M E A L S</Link>
            <Link to="/record" className="sidebar-link">📝 R E C O R D</Link>
          </div>
        </div>

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/record" element={<Record />} />
          </Routes>

          {/* API 연결 확인 메시지 출력 */}
          <div className="api-status">
            <p>{apiMessage}</p>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
