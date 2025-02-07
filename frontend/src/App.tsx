import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Schedule from './Schedule';
import Diet from './Diet';
import Feedback from './Feedback';
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
            <a href="/home" className="block py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">🏠 H O M E </a>
            <a href="/schedule" className="block py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">📅 S C H E D U L E</a>
            <a href="/diet" className="block py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">🍽️ D I E T</a>
            <a href="/feedback" className="block py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">📝 F E E D B A C K</a>
          </div>
        </div>

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="main-content">
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;

