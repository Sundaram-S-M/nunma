# 📚 Nunma — Feature Documentation

> **Nunma** is a next-generation Verifiable Mastery Ecosystem that combines live streaming, AI-driven assessment, and W3C Verifiable Credentials. This document explains every feature in the app and the real-world use cases it addresses.

---

## 🗂️ Table of Contents

1. [User Roles](#-user-roles)
2. [Authentication & Onboarding](#-authentication--onboarding)
3. [Dashboard](#-dashboard)
4. [Explore](#-explore)
5. [Learning Zones (Zone Management)](#-learning-zones-zone-management)
6. [Student Zone View](#-student-zone-view)
7. [Classroom (My Courses)](#-classroom-my-courses)
8. [Live Classroom (LiveRoom Plus)](#-live-classroom-liveroom-plus)
9. [Workplace (Tutor Hub)](#-workplace-tutor-hub)
10. [Inbox & Messaging](#-inbox--messaging)
11. [Profile & Digital Storefront](#-profile--digital-storefront)
12. [Certificate Engine](#-certificate-engine)
13. [Verification Portal](#-verification-portal)
14. [Analytics Dashboard](#-analytics-dashboard)
15. [AI Analytics Chat](#-ai-analytics-chat)
16. [Notifications](#-notifications)
17. [Availability Setup](#-availability-setup)
18. [Booking Page](#-booking-page)
19. [Payment & Checkout](#-payment--checkout)
20. [Pricing Page](#-pricing-page)
21. [Settings](#-settings)
22. [Product Listing Flow](#-product-listing-flow)
23. [Zone Launch Wizard](#-zone-launch-wizard)

---

## 👤 User Roles

Nunma operates on a dual-role system. Every account can switch between roles.

| Role | Internal Name | Description |
|:---|:---|:---|
| **Tutor** | `THALA` | Educators, coaches, mentors who create and sell learning content. |
| **Student** | `STUDENT` | Learners who discover, enroll, and consume educational content. |

**Use Case:** A professional might be a Tutor in one zone (teaching project management) and a Student in another (learning data science), making the dual-role model essential for lifelong learners.

---

## 🔐 Authentication & Onboarding

**Pages:** `Auth.tsx`, `OnboardingSystem.tsx`

### Authentication
Handles all entry points into the platform:
- **Email / Password Sign-up & Login** — Standard credential-based authentication via Firebase Auth.
- **Google OAuth** — One-click sign-in using a Google account.
- **OTP Verification** — Email-based one-time password sent via Resend for verifying identity.
- **Forgot Password** — Secure password reset flow via email.

**Use Cases:**
- A first-time user signs up with their Google account and lands directly on the onboarding screen.
- A returning tutor logs in with email/password and is taken to their dashboard.

### Onboarding
A multi-step guided setup wizard that collects role-specific information after registration.

**For Students:**
1. Phone number collection.
2. Education level selection (School, Undergraduate, Postgraduate, Professional).
3. Primary interest tags — used to personalize zone recommendations.

**For Tutors:**
1. Business type (Individual vs. Registered).
2. Legal identity — Legal name, PAN, Bank account + IFSC, GSTIN (optional).
3. Full address (Street, City, State, PIN code).
4. Up to 3 expertise tags shown on their public profile.

**Use Cases:**
- A freelance tutor completes onboarding by providing their PAN and bank account to enable Razorpay payouts.
- A student selects "Cybersecurity" as an interest, which surfaces relevant zones on the Explore page.
- Confetti animation fires on completion to celebrate joining the platform.

---

## 🏠 Dashboard

**Page:** `Dashboard.tsx`

The central hub for both tutors and students, personalized per role.

### Stats Panel
Displays real-time key performance metrics:
- **Tutors:** Total Students, Active Zones, Hours Streamed (current month), Total Revenue (₹).
- **Students:** Enrolled Zones, Certificates Earned, Lessons Completed.

**Use Case:** A tutor checks the dashboard each morning to see overnight enrollments and total streaming hours for the month.

### Interactive Calendar
A full monthly calendar with event tracking:
- Click any date to see scheduled live sessions and personal events.
- Add personal events with a title, time, and importance flag (marks as "meeting" or "task").
- An analog-style clock picker (hour/minute mode) for precise time setting.
- Edit or delete saved events directly from the modal.
- Live sessions linked to a zone appear on calendar dates automatically.

**Use Cases:**
- A tutor adds a reminder for their upcoming exam grading session.
- A student sees a live session on an upcoming date with a direct "Join" button.

### Live Session Feed
- Shows **currently live** sessions with a pulsing LIVE badge.
- Shows **upcoming scheduled** sessions with date and time.
- Single-click navigation into the live classroom.

### My Zones Panel
Displays zones created by a tutor or enrolled in by a student, with student count, module count, and zone type.

### Profile Completion Widget
Shows a percentage completion bar for name, email, location, bio, and avatar — encouraging users to fill out their profile fully.

---

## 🔍 Explore

**Page:** `Explore.tsx`

The public marketplace where students discover learning zones.

- **Real-time Zone Listing:** All published zones ordered by newest first.
- **Live Search:** Instantly filter by title, domain, or tutor name.
- **Zone Cards:** Each card shows title, description, domain, difficulty, price, tutor avatar, and enrolled student count with avatar stack.

**Use Cases:**
- A student searches "UI/UX" and finds a workshop by a popular tutor, then clicks through to enroll.
- A student browses the feed without searching and discovers a new "Digital Marketing" zone.

---

## 🗂️ Learning Zones (Zone Management)

**Page:** `ZoneManagement.tsx`

The tutor's control center for a single zone. Organized into tabs:

### Curriculum Tab
Build and organize course content in a chapter → segment hierarchy:
- **Chapters:** Named modules (e.g., "Week 1: Python Basics").
- **Segment Types:**
  - 🎬 **Video** — Upload via Bunny Stream CDN with progress tracking.
  - 📄 **PDF / Document** — Reference materials and slides.
  - 🧩 **Quiz** — Inline quizzes linked to a chapter.
  - 📝 **Reading** — Rich-text lesson articles.
- Drag-and-drop reordering of chapters and segments.
- **AI Content Generation:** Click the Wand button and Gemini auto-generates a full reading article based on the segment topic.

**Use Cases:**
- A tutor creates a "Python Fundamentals" course with chapters per week, including video lectures, PDFs, and a closing quiz.
- A tutor uses AI generation on a "Recursion" segment to instantly produce a high-quality article, saving hours of writing.

### Live Sessions Tab
- Schedule sessions with date, time, duration, and title.
- Go live instantly to create a LiveKit-powered room.
- View session history with status (live / scheduled / ended).
- Generate a session QR code for students to scan and join.

**Use Cases:**
- A workshop tutor schedules a 90-minute live session every Saturday at 10 AM.
- A tutor shares a QR code in a WhatsApp group for quick join access.

### Exams Tab
Create three types of assessments:

1. **Online MCQ Exam** — Digital multiple-choice with per-question timer and marks. AI MCQ generation: upload any document and Gemini generates questions automatically.
2. **Online Test (File Upload)** — Students submit handwritten answer sheets; tutors grade them using a canvas annotation tool.
3. **Offline Exam** — Import/export student scores via Excel for tests conducted in-person.

**Use Cases:**
- A tutor uploads chapter notes and gets 20 MCQ questions generated in seconds, then schedules the exam immediately.
- A tutor running an offline test imports scores from Excel instead of entering them manually.

### Students Tab
- Full roster of enrolled students with name, avatar, join date, and progress percentage.
- Manual enrollment (add students without requiring payment).
- Export student list to a formatted Excel spreadsheet.
- Remove students from the zone.

**Use Cases:**
- A corporate trainer manually adds 30 employees, bypassing the payment flow.
- A tutor exports the roster to Excel for institutional reporting.

### Attendance Tab
- Mark attendance per live session.
- View per-student attendance history across all sessions.

**Use Case:** A class management tutor marks attendance after each Saturday workshop and provides the report to students at term end.

### Grading Hub Tab
Grade student submissions for open-ended exams:
- **Canvas Annotation:** Draw on student-uploaded answer images with pen, color, and line-width controls. Undo / Clear tools available.
- **Score Entry:** Enter marks and submit the grade.
- **AI Grading Assist:** Gemini analyzes the submission and suggests a score and feedback.
- Students earn **10 XP per mark scored**.

**Use Case:** A tutor grades 50 physics answer sheets digitally, annotating mistakes and entering scores — results are instantly visible to students.

### Zone Settings Tab
- Edit zone title, description, domain, difficulty, and cover image.
- Set pricing (Free / Paid) and currency (USD, INR, EUR).
- Toggle zone visibility (public / private).
- Generate a shareable QR code and link.
- **Zone Capacity Meter:** Visual gauge showing enrolled vs. maximum capacity.
- **Addon Manager:** Enable/disable optional zone features.
- Delete the zone.

**Use Cases:**
- A tutor launches a free zone to grow an audience, then switches to paid once traction builds.
- A tutor embeds a QR code in their course syllabus PDF for direct enrollment.

---

## 🎓 Student Zone View

**Page:** `StudentZoneView.tsx`

The student-facing interface for consuming zone content.

### Content Player
- **Video:** Bunny Stream embedded player.
- **PDF:** In-browser PDF viewer.
- **Reading:** Rendered Markdown articles.
- **Progress Tracking:** Completion saved per segment; overall zone progress percentage calculated.
- **Chapter Accordion:** Collapsible sidebar for navigation.

### Exams Tab

**MCQ Exam Flow:**
1. Student sees the exam card with date, time, and duration.
2. Clicks "Start Exam" → Consent Modal requests camera permission.
3. Webcam activates (with explicit consent), showing "Face Detected" status.
4. **Anti-Cheat Proctoring:** 3-strike system — tab switching, losing browser focus, or copy-paste attempts trigger a warning. Three violations = automatic termination.
5. Questions appear one-by-one with a countdown timer.
6. Scores are calculated and stored on submission.

**Open-Answer Exam Flow:**
1. Student downloads the question PDF.
2. Uploads a photo of their handwritten answers (multi-file supported).
3. Tutor grades via the Grading Hub.

**Use Cases:**
- A student gets 2 tab-switch warnings before the third triggers automatic termination, ensuring exam integrity.
- A student uploads a phone photo of their handwritten physics answers for the tutor to grade.

### Attendance & Marks Tabs
Students view their own attendance records and exam scores with pass/fail status and warning count.

### Certificate Tab
- W3C Verifiable Credential (JSON-LD, Ed25519-signed) generated on completion.
- Download as JSON, share via public link, or print.

**Use Case:** After completing a Data Science course, a student downloads their W3C VC and adds it to LinkedIn — employers verify it cryptographically via the link.

---

## 📖 Classroom (My Courses)

**Page:** `Classroom.tsx`

The student's personal learning hub showing all enrolled zones.

- **Enrolled Zones Grid:** Cards with cover image, progress bar, and tutor info.
- **Live Session Alert:** Banner with "Join Now" button when any enrolled zone goes live.
- **Upcoming Sessions:** Next scheduled session per zone.
- **Certificates Panel:** Earned certificates with download and share buttons.
- **Leaderboard:** XP rankings among zone students.
- **Post-Session Survey:** Star rating, NPS score (1–10), and written feedback — appears automatically after a live session ends.

**Use Cases:**
- A student sees they're 60% done with their Python course and continues from where they left off.
- A student rates a live class 5 stars after it ends — the tutor sees this aggregated data in analytics.

---

## 📡 Live Classroom (LiveRoom Plus)

**Page:** `ClassroomPage.tsx`

The interactive live video session room powered by **LiveKit WebRTC**.

- **Multi-participant Video Grid:** All participant feeds visible simultaneously.
- **PiP (Picture-in-Picture):** Local camera shown in a separate overlay tile.
- **Media Controls:** Mute/Unmute, Camera On/Off, Screen Share, AI Co-host toggle.
- **Network Quality Indicator:** Real-time signal bars (Excellent / Good / Poor / Very Poor).
- **Connection Status Bar:** Shows "Uplink Active" or "Connecting…".
- **In-Room Chat:** Real-time chat panel.
- **Raise-Hand Queue:** Students can raise their hands to join the stage. Tutors manage the ordered queue via an Engagement Sidebar.
  - **Audio-Only Default:** Students are granted microphone access by default when called to stage.
  - **Video Promotion:** Tutors can escalate a student to the video stage (camera access) with a click.
  - **Privacy Guard:** Students' microphones and cameras are automatically unpublished if the tutor disconnects or the session ends.
  - **Browser Permissions:** Students must manually approve browser microphone/camera prompts (tutors see a built-in UI notice reminding them of this constraint).
- **AI Co-host:** When toggled on, Gemini Multimodal Live API monitors the session and answers student questions in real time.
- **Leave / End Session:** Tutors end for all; students leave individually. Session status updates in Firestore.

**Use Cases:**
- A tutor shares their screen during a code walkthrough while the AI co-host handles student chat questions.
- A student with poor connection sees a yellow signal icon and moves closer to their router.

---

## 🏢 Workplace (Tutor Hub)

**Page:** `Workplace.tsx`

The tutor's operational dashboard with KYC gating and tier-based limits.

### KYC Gating
High-value actions (creating zones, going live, listing products) are locked until KYC is verified:
- **Status Banners:** Visual alerts for PENDING / VERIFIED / FAILED.
- **Start KYC:** Triggers Razorpay linked account onboarding via Cloud Function.

### Zones Tab
View all created zones; navigate to Zone Management; create new zones.

### Products Tab
Two sub-tabs:
- **Material:** Downloadable digital products at a fixed price.
- **Mentorship:** 1-on-1 coaching sessions bookable by the hour.

### Students Tab
Consolidated list of all students across all zones with XP scores.

### Payments Tab
Color-coded transaction history — green for inbound, red for outbound (fees/subscriptions).

### Tier-Based Limits
Storage, streams, and student caps enforced by the tutor's current subscription tier.

**Use Cases:**
- A new tutor cannot accept payments until KYC is complete — the banner guides them step-by-step.
- A tutor approaching their Starter storage limit sees the meter turn red and is prompted to upgrade.

---

## 💬 Inbox & Messaging

**Page:** `Inbox.tsx`

A WhatsApp-style messaging system with three conversation types:

### Chat (Direct Messages)
- One-on-one real-time messaging via Firestore.
- Message status: Sent → Delivered → Read (double checkmark).
- Online/offline indicator per conversation.
- Image sharing and emoji picker.

### Community Groups
- Group conversations for zone cohorts.
- Supports multi-participant announcements and discussions.

### Collaboration Spaces
- Project-focused chat rooms for teams.
- Members invited from mutual followers.

### Create Group (Multi-step)
1. Search and select mutual followers as members.
2. Name the group and add a description.
3. Confirm creation.

**Use Cases:**
- A tutor follows up with a student privately after their live session question.
- Students in the same zone create a Collaboration space for a group project.
- A tutor broadcasts weekly updates to all zone students via a Community group.

---

## 👤 Profile & Digital Storefront

**Page:** `ProfileView.tsx`

Public-facing profile that doubles as a digital storefront for tutors.

### Profile Header
- Avatar upload with crop/position adjustment.
- Full-width banner image.
- In-line editing of name, headline, and location.
- Verification badge for KYC-verified tutors.

### Follow System
- Follow/Unfollow with follower and following counts.
- Mutual follows unlock direct messaging.

### Tutor Storefront
- **Active Zones:** Publicly listed zones with prices and enroll button.
- **Products / Mentorship:** Digital products and coaching packages with a "Buy" button.
- **Reviews & Ratings:** Star-rated student reviews.
- **Experience & Education:** Professional background.
- **Expertise Tags:** Skill domains.

### Student Profile
- **XP & Level:** Gamification score from exam performance.
- **Certificates:** Public portfolio of W3C Verifiable Credentials.
- **Enrolled Zones:** Current courses and workshops.

### Social Actions
Message, Share Profile, Book Session (if tutor has mentorship products listed).

**Use Cases:**
- A student reviews a tutor's profile — credentials, experience, and student reviews — before enrolling.
- An employer scans a student's profile and verifies their W3C certificates via embedded links.
- A tutor adds work experience to build credibility and attract premium students.

---

## 🏆 Certificate Engine

**Page:** `CertificateEngine.tsx`

A standalone tool for tutors to design and mass-issue digital certificates.

### Template Selection
Four built-in templates: Minimal Professional, Modern Academic, Elegant Signature, Corporate Bold.

### Customization
- **HSV Color Picker:** Drag saturation/value canvas + hue slider to set primary and accent colors.
- **Logo Upload:** Add organization or personal logo.
- **Live Preview:** See changes in real time.

### Bulk Issuance
- Import student list from Excel (`.xlsx` / `.csv`).
- Certificates generated as **W3C OpenBadge Verifiable Credentials** (Ed25519-signed).
- Stored in Firestore with a unique verifiable ID.

### Print & Download
Print from browser or download the VC JSON payload.

**Use Cases:**
- A 12-week boot camp tutor imports 45 student names and issues all W3C certificates in one click.
- A corporate trainer creates branded certificates with their company logo.

---

## ✅ Verification Portal

**Page:** `VerificationPortal.tsx`

A public, no-login-required page to verify any Nunma certificate.

- **Access via QR or URL:** Each certificate has a unique public URL (`nunma.in/verify/<id>`).
- **Animated Verification:** 1.5-second animation while Firestore is queried.
- **Verified State:** Shows student name, course name, issuance date, tutor, and a green shield badge.
- **Invalid State:** Red alert if the certificate doesn't exist or is revoked.
- **Print Certificate** and **Download VC JSON** options.

**Use Cases:**
- A recruiter scans the QR on a certificate PDF and the portal instantly confirms authenticity cryptographically.
- A university admission office verifies an online course completion certificate before granting credit.

---

## 📊 Analytics Dashboard

**Page:** `AnalyticsDashboard.tsx`

Deep per-zone analytics for tutors, visualized with Recharts.

- **Revenue:** Total revenue, monthly trend bar chart, average order value.
- **Students:** Total enrolled, enrollment growth line chart, dropout rate.
- **Exam Performance:** Completion rate pie chart, score distribution bar chart, average score, pass/fail breakdown.
- **Dispute Management:** List of flagged submissions with options to review and resolve.

**Use Cases:**
- A tutor notices 40% drop-off after Module 3 and adds a live Q&A to improve completion.
- A tutor sees an average exam score of 52% and simplifies the exam to better calibrate difficulty.

---

## 🤖 AI Analytics Chat

**Page:** `AnalyticsChat.tsx`

Conversational AI (Gemini via Cloud Functions) for querying zone data in plain English.

- **Natural Language Queries:** Ask "Who are my top 5 students?" or "Which exam had the highest fail rate?"
- **Markdown Rendering:** Responses include formatted tables, lists, and code blocks.
- **Excel Export:** Any AI-returned table can be downloaded as a formatted `.xlsx` file.
- **Persistent Context:** Follow-up questions work naturally within the session.

**Use Cases:**
- A tutor asks "Students who failed more than one exam" and exports the resulting table to share with a coordinator.
- A tutor asks "Average revenue per student" and gets an instant answer without manual calculation.

---

## 🔔 Notifications

**Page:** `Notifications.tsx`

Centralized notification center with four types:

1. **Live Session Alerts:** Real-time alerts when an enrolled zone goes live — includes a "Join Now" button.
2. **Calendar Reminders:** Tomorrow's scheduled events surfaced as priority alerts.
3. **Recent Messages:** Preview of unread direct messages with quick-navigate links.
4. **General Notifications:** System announcements — enrollment confirmations, certificate issuance, etc.

**Use Cases:**
- A student gets a notification 2 minutes before their Saturday workshop goes live and joins directly from the notification.
- A student is reminded the night before their scheduled exam.

---

## 🕐 Availability Setup

**Page:** `AvailabilitySetup.tsx`

Tutors configure their weekly availability for mentorship bookings.

- Toggle each day of the week on/off.
- Add multiple time slot windows per day (e.g., 9 AM–12 PM and 3 PM–6 PM).
- Saved to Firestore and used by the Booking Page.

**Use Case:** A part-time tutor sets availability for Tuesday/Thursday evenings and Saturday mornings — students can only book within these windows.

---

## 📅 Booking Page

**Page:** `BookingPage.tsx`

Students book one-on-one mentorship sessions with a tutor.

- **Calendar Date Picker:** Browse dates and select a booking date.
- **Real-time Slot Availability:** Open slots shown based on tutor's Availability Setup; booked slots are grayed out.
- **Slot Selection:** Pick an open time slot; proceeds to Payment with date/slot pre-filled.
- **Timezone Context:** Tutor's timezone displayed to avoid scheduling confusion.

**Use Case:** A student wants a 1-on-1 code review, visits the tutor's profile, browses available slots for next week, picks Thursday at 4 PM, and proceeds to checkout.

---

## 💳 Payment & Checkout

**Page:** `Payment.tsx`

Checkout page for zone access or mentorship products.

- **Dynamic Item Loading:** Fetches zone or product details (title, price, description) from Firestore.
- **Razorpay Integration:** Opens the native Razorpay modal for UPI, card, and net banking payments.
- **Terms Acceptance:** Checkbox required before payment.
- **Refund Policy Display:** Calculates and shows the refund deadline (24 hours before start date).
- **Post-Payment Enrollment:** On webhook confirmation (HMAC-validated), the student is auto-enrolled and receives a confirmation email.

**Use Cases:**
- A student pays ₹1,999 via UPI and is immediately redirected to the Student Zone View with full access.
- A student booking a ₹3,000 mentorship session sees the exact refund deadline before confirming.

---

## 💎 Pricing Page

**Page:** `PricingPage.tsx`

Platform subscription tiers for tutors to unlock higher limits.

| Feature | Starter | Growth | Pro |
|:---|:---:|:---:|:---:|
| Storage | Limited | More | Maximum |
| Concurrent Streams | 1 | 3 | Unlimited |
| Max Students | Limited | Higher | Unlimited |
| AI Analytics Chat | ❌ | ❌ | ✅ |
| Certificate Engine | ❌ | ✅ | ✅ |

- Razorpay Checkout creates an order via Cloud Function and opens the payment modal.
- Current plan highlighted on the page.

**Use Case:** A tutor hitting their Starter student limit upgrades to Growth and their limits update immediately.

---

## ⚙️ Settings

**Page:** `Settings.tsx`

Account management and configuration:

### Preferences
Select interest/expertise tags (Web Development, AI, Cybersecurity, etc.) — personalize recommendations and profile display.

### Security
Change password, manage trusted devices, two-factor authentication settings.

### Billing & Payouts
- Current subscription plan and next billing date.
- Bank account details for payouts (7 supported countries: UK, US, India, Canada, Germany, Australia, Singapore).
- Billing history and invoice downloads.

### Wallet
- View pending payout balance from student enrollments.
- Initiate payout transfers.
- Transaction history.

### Tax Settings
Legal name and tax information required before KYC onboarding and receiving payouts.

**Use Cases:**
- A UK-based tutor adds their Barclays account to receive converted GBP payouts.
- A student updates interests from "Web Development" to "Data Science" for better zone recommendations.

---

## 📦 Product Listing Flow

**Page:** `ListProductFlow.tsx`

Multi-step wizard for tutors to list expertise and products.

### Step 1: Profile & Expertise
- Select expertise categories.
- Write a detailed bio.
- Add professional experience (company, role, years) and education history.
- Set a custom profile URL slug.

### Step 2: Availability
Configure weekly schedule with multiple time slot windows per day.

### Step 3: Create Product

**Mentorship Product:** Title, description, session duration, price, currency, and FAQs.

**Material Product (Digital Download):** Title, description, price, currency, and file upload (PDF, templates, etc.) to Firebase Storage with a progress bar.

On completion, the product is live on the tutor's public profile.

**Use Cases:**
- A UX designer lists a 60-minute "Portfolio Review" session at ₹2,500 with weekend availability.
- A developer lists a "System Design Checklist" PDF for ₹499 for instant download.

---

## 🚀 Zone Launch Wizard

**Page:** `LaunchZone.tsx`

Guided 3-step wizard for creating a new zone.

### Step 1: Zone Type
- **Class Management** — Full system: exams, attendance, grading.
- **Course** — Content-first: video, PDF, quiz modules.
- **Workshop** — Live-first: scheduled sessions.

### Step 2: Zone Details
Title, description, cover image, domain (14 options), difficulty level, learning objectives (tags), and prerequisites (tags).

### Step 3: Pricing
Free or Paid. If Paid: price and currency (INR, USD, EUR). On submit, zone is created in Firestore.

**Use Cases:**
- A coding instructor creates a "React for Beginners" Course zone, tags "JavaScript" as a prerequisite, and prices it at ₹1,499.
- A fitness coach creates a Workshop zone focused on weekly live group training.

---

## 🧩 Key Supporting Components

| Component | Purpose |
|:---|:---|
| `VideoUploadModal` | TUS-based chunked video upload to Bunny Stream CDN with real-time progress. |
| `PhotoAdjustModal` | Drag-to-position and zoom avatar/banner image editor. |
| `ShareModal` | Generate and share a zone/profile link via QR code or copy-to-clipboard. |
| `MCQBuilder` | Interactive MCQ editor with AI-generation support. |
| `GradingHub` | Canvas-based answer sheet annotation and scoring tool. |
| `ExamAnalytics` | Per-exam analytics with score stats. |
| `ZoneCapacityMeter` | Visual gauge of enrolled vs. maximum students. |
| `AddonManagerModal` | Enable/disable optional zone add-on features. |
| `BunnyVideoPlayer` | Embedded player connected to Bunny Stream CDN. |
| `RefundRequestModal` | Structured refund request submission for students. |
| `CertificateOverlay` | Real-time certificate preview renderer. |
| `LiveNotification` | Floating toast-style notification for live session alerts. |
| `LiveSessionStatus` | Badge showing live/scheduled status of a session. |

---

## 🔑 Key Technical Concepts

| Concept | Implementation |
|:---|:---|
| **W3C Verifiable Credentials** | JSON-LD signed with Ed25519 — stored in Firestore, publicly verifiable via URL. |
| **Anti-Cheat Proctoring** | Tab-switch/blur detection with a 3-strike enforcement system; webcam consent-gated. |
| **Razorpay Webhooks** | HMAC-validated server-side fulfillment via Firebase Cloud Functions. |
| **Bunny Stream CDN** | TUS-based chunked video uploads for high-performance streaming delivery. |
| **LiveKit WebRTC** | Sub-100ms latency video/audio for live classroom sessions. |
| **Gemini 1.5 Pro** | Powers MCQ generation, content authoring, grading assist, and AI chat analytics. |
| **XP & Leaderboard** | 10 XP per mark scored in exams, feeding zone and global leaderboard rankings. |

---

*Last updated: July 2026 | Nunma v1.0*
