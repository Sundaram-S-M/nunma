
# Nunma Development Log

## Overview
Nunma is a comprehensive Learning Management System (LMS) designed for professional educators and serious learners. It features distinct dashboards for students and tutors, advanced classroom management, AI-driven tools, and secure credentialing.

## Key Features Implemented

### 1. Authentication & Onboarding
- **Role-Based Access:** Secure login/signup flow separating 'Student' and 'Tutor' roles.
- **Personalized Onboarding:** Captures user details like birthdate and city with auto-suggest.
- **Visual Branding:** Distinct high-contrast UI with deep navy and lime green accents.

### 2. Core Dashboard
- **Dynamic Stats:** Real-time counters for earnings, students, and zone activity.
- **Calendar Integration:** Interactive monthly calendar with event creation (Meeting/Task).
- **Consultation Tracking:** Display of booked 1:1 mentorship sessions for tutors.

### 3. Zone Management (Tutor)
- **Course Creation:** 'Launch Zone' flow to create new learning streams with cover images, pricing, and domain selection.
- **Curriculum Builder:** Drag-and-drop style interface to manage chapters and segments (Video, PDF, Quiz).
- **AI MCQ Generator:** Integration with **Gemini 3 Pro** to generate quiz questions from uploaded PDF/Image context.
- **Exam Management:** Scheduling and publishing exams with support for online/offline modes.
- **Grading System:** Canvas-based interface for grading uploaded student scripts with 'tick' and 'cross' annotations.
- **Student Whitelisting:** Manual and bulk import options for adding students to private zones.
- **Manual Attendance:** Interface for tutors to log daily attendance.

### 4. Classroom Experience (Student)
- **Enrolled Zones:** Grid view of all active courses with progress tracking.
- **Live Session Integration:** 'Join Live Classroom' feature for real-time streams.
- **Curriculum Player:** Interactive video/content player for consuming course material.
- **Gamification:** XP Leaderboard ranking top students in the cohort.

### 5. Communication & Community
- **Inbox System:** Unified messaging for direct chats, community forums, and collaboration groups.
- **Live Room:** WebRTC-based live streaming interface (mock implementation with camera/mic controls).

### 6. Monetization & Profile
- **Public Profile:** A shareable page for tutors showcasing bio, ratings, and active zones.
- **Service Booking:** System for students to book 1:1 mentorship slots based on tutor availability.
- **Availability Setup:** specialized calendar for tutors to define working hours.
- **Billing & Payouts:** Settings page for managing subscription plans and payout bank details.

### 7. Certification Engine
- **Certificate Issuance:** Tool for tutors to issue cryptographically signed credentials.
- **Template Customization:** Ability to brand certificates with custom colors and signatures.
- **Verification Portal:** Public-facing page to verify certificate authenticity via ID.

## Technical Architecture
- **Frontend:** React 19 with TypeScript.
- **Styling:** Tailwind CSS with a custom design system (Rounded UI, Glassmorphism).
- **State Management:** React Context API (Auth) + LocalStorage for persistence.
- **AI Integration:** Google GenAI SDK (Gemini 2.5 Flash / 3 Pro) for content generation and live multimodal interaction.
- **Icons:** Lucide React.

## Recent Fixes
- **Canvas Context Error:** Fixed a critical bug in `ZoneManagement.tsx` where `getContext('2d')` was called on a null canvas reference during the grading view initialization.

## Next Steps
- Implement actual backend integration (Supabase/Firebase).
- enhance the Live Room with real WebRTC signaling.
- Expand the Digital Store for selling downloadable assets.
