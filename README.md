# 채찍피티(Chaejjik-PT)

> An AI-powered personal training management system integrating YOLO object detection, LLM-based reporting, and real-time scheduling.

> YOLO 객체 탐지, LLM 기반 리포트 자동 생성, 실시간 스케줄링 기능을 통합한 AI 기반 퍼스널 트레이닝 관리 시스템입니다.

---

## 팀 소개 (Team Info)

| 역할 | 이름 | 담당 |
|------|------|------|
| 팀장 | 한지인 (Jiin Han) | 백엔드 개발, DB 설계 및 배포 |
| 팀원 | 장다연 (Dayeon Jang) | 프론트엔드 개발, UI/UX |
| 팀원 | 박민서 (Minseo Park) | AI 모델 개발 및 AI리포트 생성, 백엔드 개발 |

---

## Solution | 솔루션

- Automatic analysis of exercise and meal photos using YOLOv8  
- Weekly AI-generated reports using OpenAI APIs  
- Integrated scheduling and push-notification system  
- Centralized dashboard for trainers with full client overview

- YOLOv8을 이용한 운동/식단 이미지 자동 분석  
- OpenAI API를 활용한 주간 리포트 자동 생성  
- 수업 스케줄 관리 및 푸시 알림 기능 통합  
- 트레이너가 모든 회원을 한눈에 관리할 수 있는 대시보드 제공

---

## Key Features | 주요 기능

### 1. Role-Based System  
- Separate access and interfaces for trainers and members  
- Full CRUD support for managing users and schedules  

### 역할 기반 시스템  
- 트레이너/회원 구분 로그인 및 권한 분리  
- 회원 및 스케줄 관리 기능 제공  

---

### 2. AI-Powered Meal & Workout Analysis  
- YOLOv8 + Food101 + volume estimation API  
- Nutrient breakdown and meal goal matching  
- Muscle group detection from workout photos  

### AI 기반 식단/운동 분석  
- YOLOv8 + Food101 모델로 음식 객체 탐지  
- 볼륨 추정 API를 통해 섭취량(g) 분석 및 영양소 계산  
- 운동 사진에서 부위 및 운동 수행량 자동 인식  

---

### 3. Weekly Report Generation  
- OpenAI summarizes patterns and provides custom feedback  
- Member progress, adherence rate, and training suggestions  

### 주간 리포트 자동 생성  
- OpenAI API로 진행률 및 개선사항 요약  
- 달성률, 식단 일치율, 운동 편중도 분석 포함  

---

### 4. Integrated Scheduling & Notifications  
- In-app class booking and cancellation  
- Real-time alerts for missed sessions or class time  

### 스케줄링 & 실시간 알림  
- 어플 내 수업 신청 및 자동 매칭  
- 수업 알림, 오운완 미제출 경고 등 푸시 알림 기능 포함  

---

### 5. Trainer Dashboard  
- Unified view of all clients: workout logs, meal logs, session status  
- Dynamic and real-time updates via REST API  

### 트레이너 전용 대시보드  
- 회원 목록, 식단, 운동, 수업 상태 통합 조회  
- REST API 기반 실시간 정보 반영  


---

## Tech Stack | 기술 스택

**Frontend**
- React.js
- TailwindCSS
- Electron (Desktop App)

**Backend**
- Node.js
- Express.js
- MySQL

**AI**
- YOLOv8 (Object Detection)
- Food101 Dataset
- Volume Estimation API
- OpenAI GPT (Text Summarization)

**Infra**
- AWS S3

---
## License | 라이선스

This project is licensed under the MIT License.
본 프로젝트는 MIT 라이선스를 따릅니다.
