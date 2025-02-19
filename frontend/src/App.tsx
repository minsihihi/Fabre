import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './Login'; // 로그인 페이지 임포트
import Home from './Home';
import Schedule from './Schedule';
import Diet from './Diet';
import Report from './Report';
import logo from './assets/logo.png'; // 로고 이미지 가져오기

const App: React.FC = () => {
  return (
    <Router>
      <div className="container">
        {/* 왼쪽 사이드바 */}
        <div className="left-sidebar">
          <img src={logo} alt="채찍피티 로고" className="logo" />
          <h1 className="logo-text">채찍피티</h1>
          <div className="space-y-4">
            <Link to="/home" className="block py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">🏠 H O M E</Link>
            <Link to="/schedule" className="block py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">📅 S C H E D U L E</Link>
            <Link to="/diet" className="block py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">🍽️ D I E T</Link>
            <Link to="/report" className="block py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">📝 R E P O R T</Link>
          </div>
        </div>

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Login />} /> {/* 기본 경로를 로그인 페이지로 지정 */}
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
