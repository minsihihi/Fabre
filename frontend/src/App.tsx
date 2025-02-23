import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import Schedule from './Schedule';
import Diet from './Diet';
import Report from './Report';
import logo from './assets/logo.png';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

        {/* 왼쪽 사이드바 (모바일에서는 숨김 처리) */}
        <div className={`left-sidebar ${isMobile ? (isSidebarOpen ? "open" : "closed") : ""}`}>
          <img src={logo} alt="채찍피티 로고" className="logo" />
          <h1 className="logo-text">채찍피티</h1>
          <div className="space-y-4">
            <Link to="/home" className="sidebar-link">🏠 H O M E</Link>
            <Link to="/schedule" className="sidebar-link">📅 S C H E D U L E</Link>
            <Link to="/diet" className="sidebar-link">🍽️ D I E T</Link>
            <Link to="/report" className="sidebar-link">📝 R E P O R T</Link>
          </div>
        </div>

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;

