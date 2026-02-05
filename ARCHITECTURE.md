
# Nunma Architecture & Design

## Project Structure

The project follows a standard React application structure, organized by feature capability.

```
/
├── components/         # Reusable UI components
│   ├── Header.tsx      # Global navigation header
│   ├── Sidebar.tsx     # Collapsible side navigation
│   ├── LiveRoom.tsx    # LiveKit streaming interface
│   └── ...
├── context/
│   └── AuthContext.tsx # Global authentication state management
├── pages/              # Main route views
│   ├── Auth.tsx        # Login/Signup logic
│   ├── Dashboard.tsx   # Main landing for authenticated users
│   ├── ZoneManagement.tsx # Course/Exam/Certificate administration
│   ├── Classroom.tsx   # Student learning hub
│   ├── CertificateEngine.tsx # Branding & issuance (NEW)
│   ├── VerificationPortal.tsx # ZK Proof generation (NEW)
│   └── ...
├── types.ts            # TypeScript definitions
├── App.tsx             # Main routing configuration
└── index.tsx           # Entry point
```

## Core Concepts

### 1. "Zones" (Learning Streams)
A **Zone** is the central unit of the Nunma ecosystem. It represents a course, a workshop, or a mentorship program.
- **Tutor View:** Tutors manage content, schedule exams, and track attendance.
- **Student View:** Students consume content, take quizzes, and join live sessions.

### 2. User Roles
The application strictly separates **Student** and **Tutor** capabilities via the `UserRole` enum.
- **Tutors:** Access to `Workplace`, `ZoneManagement`, `CertificateEngine`, and `AvailabilitySetup`.
- **Students:** Access to `Classroom`, `StudentZoneView`, and `PublicProfile`.

### 3. Data Persistence
Transitioning from `localStorage` mock to **Firebase** for persistence.
- **Auth:** Firebase Authentication.
- **Database:** Firestore (planned) for Zones, Exams, and Results.
- **Keys:** `nunma_user`, `nunma_zones_data`, `nunma_exams`, etc.

### 4. AI Integration (Gemini)
Leveraging the `@google/genai` SDK:
- **MCQ Generation:** `ZoneManagement` uses Gemini 1.5 Pro to generate structured JSON quizzes from document context.
- **Live Co-host:** `LiveRoom` utilizes Gemini Multimodal Live API for real-time AI interaction (audio/video).

## Design System
- **Visual Style:** "Deep Professional" (Glassmorphism & High Contrast).
- **Core Colors:** 
  - **Navy:** `#1A1A4E` (Primary background & headers)
  - **Lime Green:** `#c1e60d` (Action items, highlights, rewards)
  - **White:** `#FFFFFF` (Card backgrounds)
  - **Soft Gray:** `#fbfbfb` (App background)
- **Typography:** `Plus Jakarta Sans` (Headings), `Inter` (Body).

## Certification & Verifiable Credentials

### 1. Branding System
Implemented in `CertificateEngine`, allowing tutors to customize achievement assets:
- **Brand Colors:** Full hex control for certificate highlights.
- **Signatures:** Support for dual-signature uploads (SVG/PNG).

### 2. Verifiable Credentials (W3C)
- **Standard:** Compliant with OpenBadges 3.0 / JSON-LD LD-Proof.
- **Issuance:** Digital signatures generated using Ed25519 signatures (mocked).

### 3. Zero-Knowledge Verification
Implemented in `VerificationPortal`:
- **Privacy:** Selective disclosure allows students to prove they passed/mastered a course without revealing their exact score.
- **Proof Check:** The verification landing computes the ZK proof validity before displaying the achievement details.

## Assessment & Proctoring Architecture

### 1. Unified Exam Gateway
Supports **Online** (automated) and **Offline** (manual) assessments.

### 2. Digital Proctoring Engine
Active in `StudentZoneView`:
- **Tab Tracking:** Focus/Blur detection.
- **3-Strike Policy:** Automatic termination upon the 3rd violation.

### 3. Grading Loops
- **Automated MCQ:** Real-time grading and XP commitment.
- **Manual Annotation:** Tutors use a `<canvas>` marking interface in `ZoneManagement` for handwritten scripts, saving vector coordinates for feedback.

### 4. Reward Services
- **XP Ecosystem:** 10 XP per mark awarded upon successful verification of results.
- **Badges:** Earned upon zone completion, represented as Verifiable Credentials.

