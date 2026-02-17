
# Nunma Development Log & Feature Roadmap

## 🎯 Project Overview
Nunma is a next-generation Learning Management System (LMS) built for the decentralized era. It focuses on **Verifiable Mastery**, combining high-performance live streaming, AI-driven content generation, and cryptographically secure certifications.

---

## ⚡ Key Features Implemented

### 1. Unified Dashboard & Role Management
- **Binary Roles**: Complete separation of **Tutor** (Management) and **Student** (Learning) workflows.
- **Smart Onboarding**: Personalized multi-step onboarding capturing professional and personal data.
- **Interactive Calendar**: Centralized hub for managing sessions, exams, and personal tasks.

### 2. The "Zone" Ecosystem (Tutor Side)
- **Course Launchpad**: Full-featured creation flow for Courses, Workshops, and Class Management.
- **AI-Powered Assessments**: Gemini 1.5 Pro integration to generate MCQ quizzes from PDF/Image uploads.
- **Advanced Grading**: Canvas-based annotation tool for marking student scripts with real-time feedback.
- **Student Access Control**: Manual whitelisting and bulk enrollment via CSV (mock).

### 3. Immersive Classroom (Student Side)
- **Progressive Learning**: Linear curriculum player with support for video, text, and docs.
- **Live Classroom**: Low-latency WebRTC streams with integrated real-time chat.
- **Gamified Mastery**: XP-based leaderboard and achievement system.

### 4. Advanced Monetization & Reach
- **Purchasing Power Parity (PPP)**: Automatic price adjustment based on location (e.g., automated discounts for developing markets).
- **Public Profiles**: Highly optimized "Digital Storefronts" for tutors to showcase products and ratings.
- **Service Booking**: Automated 1:1 mentorship scheduling based on tutor availability.

### 5. Certification & Verification
- **Branded Engine**: Customizable certificate templates with brand colors and multiple signatures.
- **W3C Standards**: Credentials issued as verifiable JSON-LD objects.
- **Public Verification**: A secure portal for employers to verify student credentials via ID.

---

## 🛠 Technical Architecture

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **State** | React Context API + Firebase Auth |
| **Database** | Google Firestore (Real-time NoSQL) |
| **AI** | Google Gemini SDK (@google/genai) |
| **Streaming** | LiveKit (Self-hosted/Cloud WebRTC) |
| **Icons** | Lucide React |

---

## 🛣 Future Roadmap

### 🔴 Phase 1: Persistence & Stability (In Progress)
- [ ] Complete replacement of `localStorage` fallbacks with Firestore.
- [ ] Optimize Firebase Security Rules for multi-tenant access.
- [ ] Refine the "Join Live" flow with robust token generation.

### 🟡 Phase 2: Engagement & Interaction
- [ ] Implement Peer-to-Peer (P2P) video for student collaboration.
- [ ] Add real-time "Polls" and "Hand-raise" features to the LiveRoom.
- [ ] Integrate a "Course Forum" for asynchronous community discussion.

### 🟢 Phase 3: The Talent Layer
- [ ] Zero-Knowledge Proof (ZKP) verification for privacy-first achievement sharing.
- [ ] Launch the "Digital Goods" store for selling templates, assets, and guides.
- [ ] Integration with LinkedIn for "One-Click Achievement Add".

---

## 📝 Change Log (Recent)
- **[Fix]** Canvas initialization error in `ZoneManagement` grading view.
- **[Update]** Added hex code support for certificate brand colors.
- **[Feature]** Initial implementation of Gemini MCQ generator.
- **[Feature]** Added smart PPP pricing detection.
