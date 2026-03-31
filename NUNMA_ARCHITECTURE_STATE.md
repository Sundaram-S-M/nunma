# NUNMA Platform Architecture State

**Last Updated**: 2026-03-31
**Status**: Comprehensive Codebase Analysis (Truth Level: Absolute)

---

## 1. The Tech Stack & Environment

The NUNMA platform is built on a modern, serverless architecture optimized for high-performance video delivery and AI-driven pedagogical tools.

### Core Frameworks
- **Frontend**: React 19, Vite, Vanilla CSS ("Anti-Gravity" Design System).
- **Backend**: Firebase Cloud Functions (v2), Node.js.
- **Communication**: `resend` (Transactional OTP/System emails).
- **Video/Storage**: Bunny Stream (TUS upload, Secure Pull Zones), Bunny Storage (Exam scripts).
- **Messaging/Interactive**: LiveKit (Real-time classroom), Tldraw (Digital Whiteboard).
- **Utilities**: `xlsx` (Excel processing), `tus-js-client` (Resumable video uploads), `recharts` (Analytics), `pdf-lib` (Watermarking & merging).

### Environment Variables (.env / Secrets)
The platform requires the following keys for full functionality:

| Key | Scope | Purpose |
| :--- | :--- | :--- |
| `VITE_FIREBASE_*` | Frontend | Firebase project configuration (API Key, Auth Domain, etc.). |
| `RESEND_API_KEY` | Backend (Secret) | Resend API key for OTP and notification emails. |
| `RAZORPAY_KEY_ID/SECRET` | Backend (Secret) | Aggregator Partner OAuth keys for Sub-Merchant management. |
| `RAZORPAY_WEBHOOK_SECRET` | Backend (Secret) | Verifies signatures for payment and account events. |
| `BUNNY_API_KEY/TOKEN_KEY` | Backend (Secret) | Managing video libraries and generating secure playback tokens. |
| `BUNNY_WEBHOOK_SECRET` | Backend (Secret) | Signature verification for Bunny transcoding events. |
| `LIVEKIT_API_KEY/SECRET` | Backend (Secret) | Generating JWT access tokens for live classrooms. |
| `ZOHO_ORG_ID / REFRESH_TOKEN`| Backend (Secret) | Integration with Zoho Books for autonomous invoicing. |

---

## 2. The Database Schema (Firestore)

The system operates on a highly decentralized schema within Firestore, designed for rapid scaling and distinct role-based access.

### Core Collections

| Collection | Key Fields | Purpose |
| :--- | :--- | :--- |
| `users` | `name`, `email`, `role`, `kycStatus`, `taxDetails[]`, `subscriptionPlan`, `storage_used_bytes` | User profiles and roles (THALA/LEARNER). Includes `kycStatus` (PENDING/VERIFIED) and financial data for Thalas. |
| `zones` | `title`, `zoneType`, `price`, `currency`, `createdBy`, `segments[]` | High-level containers for courses or workshops. |
| `products` | `title`, `priceINR`, `tutorId`, `availability` | Mentorship services and standalone digital materials. |
| `otps` | `otp`, `expiresAt`, `createdAt` | Temporary storage for 6-digit verification codes keyed by email. |
| `certificates` | `payload` (JSON-LD), `studentId`, `zoneId` | Root collection for decentralised verifiable credentials (URN:UUID). |
| `transactions` | `processedAt`, `eventId` | Idempotency layer for tracking processed Razorpay webhooks. |

### Operational Sub-collections (Inside `users/{uid}`)

- **`invoices`**: Records of Zoho-generated platform fee invoices.

### Operational Sub-collections (Inside `zones/{zoneId}`)

- **`students`**: Tracks enrolled users (`status`, `joinedAt`, `completedSegments[]`).
- **`exams`**: Metadata for scheduled gates (`questions[]`, `maxMark`, `type`).
- **`exam_results`**: (Within `exams/{id}/submissions`) Stores student attempts, `cheatViolations`, and `answerSheetUrl`.

---

## 3. External API Integrations

### Resend: OTP-First Authentication
- **Flow**: The system uses a passwordless OTP (One-Time Password) flow. 
- **Delivery**: `requestOTP` generates a 6-digit code and sends it via `notification@nunma.in` using Resend.
- **Verification**: `verifyOTPAndSignIn` validates the code, creates/fetches the user, and issues a Firebase Custom Token for client-side authentication.

### Razorpay Route: Escrow & KYC
- **Onboarding**: Thalas (Experts) complete financial KYC (PAN, Bank Account, IFSC, GSTIN) via `createTutorLinkedAccount`.
- **Linked Accounts**: Creates a Razorpay Sub-Merchant account and generates a login link for the expert to manage their dashboard.
- **Split Payments**: `createRazorpayOrder` calculates platform commission (10/5/2% based on plan) and handles statutory deductions (0.1% TDS, 0.5% TCS).
- **Webhooks**: `razorpayRouteWebhook` monitors `account.activated` and `payment.captured` for real-time status updates.

### Bunny Stream & Storage: Content Security
- **Video**: Uses TUS protocol for resumable uploads. Webhooks with signature verification update video status to `ready`.
- **Protected Storage**: Exam scripts are stored in Bunny Storage. The platform uses a Pull Zone for serving PDFs while applying user-specific watermarks via `pdf-lib`.

---

## 4. Core Platform Workflows

### Thala (Expert) Journey
1. **Onboarding**: Expert signs up via OTP, selects their role, and completes financial KYC. 
2. **Zone Creation**: Defines a Zone, sets pricing (INR), and adds curriculum segments.
3. **Live Instruction**: Launches immersive classrooms via LiveKit + Tldraw. Hands-on management of student audio/video.
4. **Grading**: Reviews PDF uploads from students, uses AI-assisted or manual grading, and bulk imports results via Excel.

### Learner (Student) Journey
1. **Discovery**: Browses the landing page (Anti-Gravity UI), views pricing, and enrolls via Razorpay.
2. **Consumption**: Accesses video segments and PDFs. Progress is tracked automatically.
3. **Assessment**: Completes MCQs or PDF-based "Online Tests" within strict time-locks and anti-cheat (tab-switch tracking) proctoring.
4. **Certification**: Upon 100% completion, triggers `registerIssuance` to receive a verifiable JSON-LD certificate.

---

## 5. Current State & Known Bottlenecks

### Just Finished
- **Anti-Gravity UI Redesign**: Global theme shift to Deep Navy, Deep Green, White, and Vibrant Lime with premium micro-animations.
- **OTP Auth Integration**: Fully functional Resend-based passwordless entry.
- **Razorpay KYC Flow**: Mandatory collection of PAN/Bank/IFSC for expert onboarding.
- **Webhook Security**: Implemented HMAC SHA256 signature verification for both Bunny and Razorpay webhooks.

### Immediate Constraints & Next Steps
- **AI Grading R&D**: Moving from manual entry to automated PDF script analysis using the Gemini API.
- **Mobile Experience**: Optimizing the classroom UI for lower-latency mobile devices and PWA-specific interactions.
- **Advanced Proctoring**: Adding browser-lock options for high-stakes examinations.

---

## 6. Security & Access Control

- **Identity**: Firebase Auth via Custom Tokens (OTP-verified).
- **Permissions**: Firestore Security Rules enforce role-based access for Thalas and Learners.
- **Content**: Hashed Bunny tokens for video; unique watermarks for PDF content.
- **Integrity**: Tab-switching proctoring (3-strike system) for exams.

---

## 7. Certificate Engine (URN:UUID)

The certification system utilizes **W3C Verifiable Credentials** and **OpenBadges 3.0** standards.
- **Issuer**: `did:web:nunma.in`
- **Format**: JSON-LD with mock cryptographic proof.
- **Verification**: Publicly verifiable via unique certificate IDs stored in a root-level `certificates` collection.

