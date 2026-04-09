
# Nunma Architecture & Vision

## 🚀 The Vision: Beyond Traditional LMS
Nunma is not just a platform for sharing videos; it's a **Verifiable Mastery Ecosystem**. Our goal is to bridge the gap between learning and professional proof-of-work. By combining real-time AI assistance, high-performance streaming, and cryptographic certification, Nunma creates a "Trust Layer" for education.

---

## 🛠 Project Structure & Technology Stack

Nunma is built on a modern, high-performance stack designed for scale and real-time interaction.

### Frontend Architecture
Organized by feature capability for high maintainability:
- **`components/`**: Atomic UI components and feature-specific modules (e.g., `LiveRoom.tsx`, `ChatSidebar.tsx`).
- **`pages/`**: Route-level views implementing core business logic.
- **`context/`**: Global state management (Auth, Theme, User Preferences).
- **`hooks/`**: Specialized logic for authentication, real-time state, and UI interactions.

### Technology Stack
| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS (Custom "Deep Professional" Design System) |
| **Backend** | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| **Real-time** | LiveKit (Video/Audio WebRTC), Firestore (Chat/State) |
| **Email/Billing** | Resend (OTP), Nodemailer (Zoho SMTP Invoicing) |
| **AI Engine** | Google Gemini 1.5 Pro & Multimodal Live API |
| **Security** | W3C Verifiable Credentials + Ed25519 Signatures |

---

## 💎 Core Feature Pillars

### 1. Adaptive Learning Zones
A **Zone** is a self-contained learning environment that can be a single course, a recurring workshop, or a proctored exam center.
- **Dynamic Content**: Support for Video, PDF, and Interactive Quizzes.
- **Hybrid Delivery**: Seamless transition between recorded material and live sessions.
- **Smart Scheduling**: Integration with tutor availability and global timezones.

### 2. AI-Driven Intelligence (Powered by Gemini)
We leverage Google's most advanced models to automate the tedious parts of teaching:
- **Instant Assessments**: Tutors can upload any document, and Gemini generates a structured, high-quality MCQ quiz in seconds.
- **Multimodal AI Co-host**: In the `LiveRoom`, a Gemini-powered co-host can "see" and "hear" participants, answering questions in real-time and providing sentiment analysis.
- **Automated Grading**: For handwritten or text-based answers, Gemini assists in evaluating student scripts against a rubric.

### 3. Trust & Certification (W3C Standards)
Nunma transitions from "certificates that are pictures" to "certificates that are data":
- **W3C Verifiable Credentials**: Every certificate is a signed JSON-LD object compatible with global standards.
- **Zero-Knowledge Proofs**: Students can prove they passed a course or achieved a certain grade without revealing their identity or private data.
- **Selective Disclosure**: share only what is necessary (e.g., "I passed Level 3" without showing the score).

### 4. Global Accessibility & Localization
Education should be accessible regardless of geography:
- **Direct Monetization**: Our secure Razorpay webhook architecture handles global transactions in INR, ensuring transactional integrity with strict HMAC validation and atomic fulfillment.
- **Regional Edge Nodes**: Leveraging Firebase and LiveKit's global infra for low-latency streaming everywhere.

---

## 🛡 Proctoring & Assessment Architecture

### Digital Proctoring Engine
Active during assessments to ensure integrity:
- **Behavioral Analysis**: Tracks tab switching, browser focus, and copy-paste attempts.
- **Biometric Monitoring (AI Mock)**: Simulated webcam checks for "Face Detected" status to prevent impersonation.
- **3-Strike Enforcement**: Automated session termination for policy violations.

### Grading Loop
- **Vector Annotation**: Tutors use a `<canvas>` interface to mark student uploads, saving corrections as vector coordinates for lossless rendering across devices.
- **Reward Ecosystem**: 10 XP awarded per mark, feeding into a global and zone-specific leaderboard.

---

## 🛣 Future Roadmap

### Phase 1: Full Backend Integration (Current)
Moving remaining local session data to Firestore and optimizing Cloud Functions for LiveKit token generation.

### Phase 2: Collaborative Multi-Peer Video
Expanding `LiveRoom` to support interactive breakout rooms and P2P collaboration sessions.

### Phase 3: Digital Product Marketplace
A "Gumroad-style" store for educators to sell downloadable assets (Notion templates, code bundles, checklists) alongside their courses.

### Phase 4: Decentralized Identity (DID)
Full integration with decentralized identifiers to give students total ownership of their learning history across different platforms.   

---

