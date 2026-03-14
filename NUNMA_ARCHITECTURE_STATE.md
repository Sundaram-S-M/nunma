# NUNMA Platform Architecture State

**Last Updated**: 2026-03-09
**Status**: Comprehensive Codebase Analysis (Truth Level: Absolute)

---

## 1. The Tech Stack & Environment

The NUNMA platform is built on a modern, serverless architecture optimized for high-performance video delivery and AI-driven pedagogical tools.

### Core Frameworks
- **Utilities**: `xlsx` (Excel processing), `tus-js-client` (Resumable video uploads), `recharts` (Analytics).

### Environment Variables (.env)
The platform requires the following keys for full functionality:

| Key | Scope | Purpose |
| :--- | :--- | :--- |
| `VITE_FIREBASE_*` | Frontend | Firebase project configuration (API Key, Auth Domain, etc.). |
| `VITE_GEMINI_API_KEY` | Frontend | Client-side Gemini AI access for quiz/parser utilities. |
| `VITE_RAZORPAY_KEY` | Frontend | Public key for triggering the checkout script. |
| `RAZORPAY_KEY_ID/SECRET` | Backend | Aggregator Partner OAuth keys for Sub-Merchant management. |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | Verifies signatures for `payment.captured` events. |
| `BUNNY_API_KEY/TOKEN_KEY` | Backend | Managing video libraries and generating secure playback tokens. |
| `ZOHO_ORG_ID / REFRESH_TOKEN`| Backend | Integration with Zoho Books for autonomous invoicing. |
| `SMTP_HOST/USER/PASS` | Backend | Nodemailer configuration for OTP and system emails. |

---

## 2. The Database Schema (Firestore)

The system operates on a highly decentralized schema within Firestore, designed for rapid scaling and distinct role-based access.

### Core Collections

| Collection | Key Fields | Purpose |
| :--- | :--- | :--- |
| `users` | `name`, `email`, `role`, `razorpay_account_id`, `subscriptionPlan`, `taxDetails` | User profiles and role-based permissions (TUTOR/STUDENT). Includes `taxDetails` (`gstin`, `legalName`, `billingAddress`) for TUTORs. |
| `zones` | `title`, `zoneType`, `price`, `currency`, `createdBy`, `landingPageConfig` | High-level containers for courses, workshops, or classes. |
| `products` | `title`, `priceUSD`, `priceINR`, `tutorId`, `availability` | Mentorship services and standalone digital materials. |
| `conversations` | `participants[]`, `lastMessage` | Messaging threads between tutors and students. |

### Operational Sub-collections (Inside `users/{uid}`)

- **`invoices`**: Stores references to generated Zoho invoice IDs.

### Operational Sub-collections (Inside `zones/{zoneId}`)

- **`chapters`**: Maps the course curriculum (`title`, `order`, `segments[]`).
    - *Segments*: Atomic units of content (Video, PDF, Reading, Quiz).
- **`students`**: Tracks enrolled users per zone (`status`, `joinedAt`, `engagementScore`, `completedSegments[]`).
- **`exams`**: Metadata for scheduled gates (`type`, `maxMark`, `questions[]`, `date`, `time`).
- **`exam_results`**: (Within `exams/{examId}/submissions`) Stores student attempts, marks, feedback, and `cheatViolations`.
- **`sessions`**: Records for live sessions including attendance logs and generated AI quizzes.

### Aggregation Logic
- **Student Counting**: Real-time listeners on `zones/{zoneId}/students` populate local UI states; backend counters (if any) are typically handled via `FieldValue.increment` on the parent zone document.
- **Earnings**: Aggregated by querying the `user_notifications` or `bookings` history, formatted in INR using locale strings.

---

## 3. External API Integrations

### Razorpay Route: Escrow & Split-Payment Architecture
- **Onboarding**: Tutors are onboarded as "Sub-Merchants" via `createTutorLinkedAccount`. This process uses **Aggregator Partner OAuth keys** (RAZORPAY_KEY_ID/SECRET) to create and manage accounts under the Nunma Master Merchant.
- **Payment Flow**: 
    1. Student initiates payment via `Payment.tsx`.
    2. Backend `createRazorpayOrder` creates an order with a `transfers` array.
    3. **The Split**: Platform commission is calculated based on the tutor's plan (10%, 5%, or 2%).
    4. **Tax Compliance Math**: The system is designed to account for statutory deductions during the transfer:
        - **0.1% TDS** (Tax Deducted at Source) under Section 194O.
        - **0.5% TCS** (Tax Collected at Source) for e-commerce transactions.
- **Tax/Invoicing**: A `payment.captured` webhook triggers the generation of a **Zoho Invoice** specifically for the platform commission, keeping it distinct from the tutor's gross earnings for audit transparency.

### Bunny Stream: Secure Video Lifecycle
- **Upload**: `VideoUploadModal.tsx` uses `tus-js-client` for resumable uploads. It requests a presigned signature from `createBunnyVideo` (Backend), authorizing the direct upload to Bunny's servers without hitting Firebase limits.
- **State Management**: A Bunny webhook (`bunnyStreamWebhook`) notifies the backend when transcoding is complete (Status 3), updating the Firestore `status` to `ready`.
- **Serving**: Videos are served via protected Pull Zones. The `generateBunnyToken` function creates a SHA256 hashed signature to prevent direct hotlinking.



---

## 4. Core Platform Workflows

### Tutor Journey
1. **Creation**: Tutor defines a "Zone" (Class Management, Course, or Workshop).
2. **Curriculum**: Chapters are added; segments (Videos/PDFs/Live) are mapped. Videos use the Bunny TUS flow.
3. **Live Management**: Tutors launch 100ms rooms via `LaunchZone.tsx`. Attendance is automatically tracked based on session heartbeat.
4. **Assessment**: Exams are scheduled. Once conducted, tutors use the **Grading Hub** to review PDF scripts or bulk import marks via **Excel (XLSX/CSV)**.

### Student Journey
1. **Enrollment**: Students browse `Explore.tsx`, view PPP-adjusted regional pricing, and checkout via Razorpay.
2. **Consumption**: The `StudentZoneView.tsx` provides a protected iframe/player. Progress is synced to Firestore per segment.
3. **Exam Experience**: 
    - **Anti-Cheat**: A `visibilitychange` listener tracks tab-switching. 3 violations trigger automatic exam termination and failure. 
    - **Proctoring**: Mentorship/Test modes enforce camera/mic access before start.
    - **Submission**: MCQs are auto-graded; "Online Test" scripts require PDF upload within a 20-minute post-exam window.

---

## 5. Current State & Known Bottlenecks

### Just Finished
- **Excel Bulk Grading**: Tutors can now upload spreadsheets to mass-notify students of their results.
- **Exam Time-Lock**: Edits are blocked 1 hour before commencement to ensure test integrity.
- **Regional Pricing (PPP)**: Dynamic conversion between USD/INR based on user geolocation.

### Immediate Constraints & Next Steps
- **KYC Bypass (Test Mode)**: Currently, the system uses "KYC-not-required" logic for testing, but production requires tutors to complete the Razorpay Route onboarding flow.
- **Webhook Reliability**: The Bunny webhook lacks a verification secret header; this should be added to prevent spoofing.
- **AI Marking**: The transformation from "AI-Assisted Marking" (manual entry) to "Fully Automated AI Grading" for PDF scripts is the next major R&D milestone.

---

## 6. Security & Access Control (Firebase Rules)

The platform enforces a strict "Least Privilege" security model through Firestore Rules.

- **User Protection**: Users can only read/write their own profiles (`users/{userId}`) and personal sub-collections like `enrollments`.
- **Content Governance**: 
    - `zones` are publicly readable by authenticated users to allow discovery.
    - Only the `createdBy` UID (Tutor) has write/update access to a zone's metadata and curriculum.
- **Exam Integrity**:
    - `exams` are read-only for students except during the active window.
    - `exam_results` are restricted: Students can only read their own results, while the Tutor can read all results within their zone.
- **Private Conversations**: Restricted to the UIDs listed in the `participants` array.

---

## 7. Certificate Engine (Verifiable Credentials)

The certification system utilizes **W3C Verifiable Credentials** and **OpenBadges 3.0** standards to ensure certificates are tamper-proof and verifiable globally.

### Data Model (JSON-LD)
Certificates are generated as `@context`-aware JSON-LD objects:
- **ID**: A unique `urn:uuid` for each issuance.
- **Issuer**: Nunma Academy (`did:web:nunma.in`).
- **CredentialSubject**: Contains the student's `did:nunma` and an `Achievement` object.
- **Achievement**: Details the Zone title, domain, level, and criteria met.
- **Proof**: A mock `Ed25519Signature2020` proof is currently generated; this prepares the system for future blockchain-anchored signing.

### Generation Logic
When a student completes all modules in a Zone, the `registerIssuance` function creates a record in the `issued_certificates` collection. The `vcUtils.ts` library then assembles the JSON-LD object, which can be downloaded or shared as a digital asset.
