# NUNMA Platform Architecture State

**Last Updated**: 2026-04-06
**Status**: Comprehensive Codebase Analysis (Truth Level: Absolute)

---

## 1. The Tech Stack & Environment

The NUNMA platform is built on a modern, serverless architecture optimized for high-performance video delivery and AI-driven pedagogical tools.

### Core Frameworks
- **Frontend**: React 19, Vite, Vanilla CSS ("Anti-Gravity" Design System).
- **Backend**: Firebase Cloud Functions (v2), Node.js 20.
- **AI/LLM**: Google Gemini 1.5 Pro via `@google/genai` (v1.x).
- **Communication**: `resend` (Transactional OTP/System emails).
- **Video/Storage**: Bunny Stream (TUS upload, Secure Pull Zones), Bunny Storage (Exam scripts).
- **Messaging/Interactive**: LiveKit (Real-time classroom), Tldraw (Digital Whiteboard).
- **Utilities**: `xlsx` (Excel processing), `tus-js-client` (Resumable video uploads), `recharts` (Analytics), `pdf-lib` (Watermarking & merging).

### Environment Variables (.env / Secrets)
The platform requires the following keys for full functionality:

| Key | Scope | Purpose |
| :--- | :--- | :--- |
| `VITE_FIREBASE_*` | Frontend | Firebase project configuration (API Key, Auth Domain, etc.). |
| `GEMINI_API_KEY` | Backend (Secret) | AI processing for automated PDF grading. |
| `RESEND_API_KEY` | Backend (Secret) | Resend API key for OTP and notification emails. |
| `RAZORPAY_KEY_ID/SECRET` | Backend (Secret) | Aggregator Partner OAuth keys for Sub-Merchant management. |
| `RAZORPAY_WEBHOOK_SECRET` | Backend (Secret) | Verifies signatures for payment and account events. |
| `BUNNY_API_KEY/TOKEN_KEY` | Backend (Secret) | Managing video libraries and generating secure playback tokens. |
| `BUNNY_WEBHOOK_SECRET` | Backend (Secret) | Signature verification for Bunny transcoding events. |
| `LIVEKIT_API_KEY/SECRET` | Backend (Secret) | Generating JWT access tokens for live classrooms. |
| `ZOHO_ORG_ID` | Backend (Secret) | Organization ID for Zoho Books invoicing. |
| `ZOHO_REFRESH_TOKEN` | Backend (Secret) | OAuth2 refresh token for Zoho API access. |

---

## 2. The Database Schema (Firestore)

### Core Collections

| Collection | Key Fields | Purpose |
| :--- | :--- | :--- |
| `users` | `name`, `email`, `role`, `kycStatus`, `taxDetails[]`, `subscriptionPlan`, `storage_used_bytes` | User profiles and roles (THALA/LEARNER). Includes `kycStatus` (PENDING/VERIFIED). |
| `zones` | `title`, `zoneType`, `price`, `currency`, `createdBy`, `segments[]` | Containers for courses or workshops. **Pricing fields are read-only for clients.** |
| `products` | `title`, `priceINR`, `tutorId`, `availability` | Mentorship services and standalone digital materials. |
| `otps` | `otp`, `expiresAt`, `createdAt` | Temporary storage for 6-digit verification codes keyed by email. |
| `certificates` | `payload` (JSON-LD), `studentId`, `zoneId` | Root collection for verifiable credentials (URN:UUID). |

### Operational Sub-collections (Inside `users/{uid}`)

- **`invoices`**: Records of Zoho-generated platform fee invoices (`zohoInvoiceId`, `amount`, `paymentId`).

### Operational Sub-collections (Inside `zones/{zoneId}`)

- **`students`**: Tracks enrolled users (`status`, `joinedAt`, `source: 'payment' | 'whitelist'`).
- **`invites`**: Stores invitation tokens (`token`, `expiresAt`, `isActive`). Restricted to Thala-only read access.
- **`exams`**: Metadata for scheduled gates (`questions[]`, `maxMark`, `type`).
- **`exam_results`**: (Within `exams/{id}/submissions`) Stores student attempts, `cheatViolations`, and `answerSheetUrl`.

---

## 3. External API Integrations

### Gemini AI: Automated Grading
- **Integration**: Uses `@google/genai` SDK v1.x with Gemini 1.5 Pro.
- **Capabilities**: Analyzes student-uploaded PDF answer scripts against a provided scoring rubric and returns structured JSON marks/feedback.

### Razorpay Route: Escrow & KYC
- **Currency**: Strictly **INR/₹**. PPP (Purchasing Power Parity) has been deprecated and removed.
- **Onboarding**: Thalas complete financial KYC via `createTutorLinkedAccount`.
- **Split Payments**: `createRazorpayOrder` calculates platform commission (10/5/2% based on plan).
- **Invoicing**: `razorpayRouteWebhook` triggers `generatePlatformFeeInvoice` (Zoho) upon successful payment capture.

### Bunny Stream & Storage: Content Security
- **Video**: Uses TUS protocol for resumable uploads.
- **Protected Storage**: Exam scripts are stored in Bunny Storage, served via Pull Zones with PDF watermarking.

---

## 4. Core Platform Workflows

### Enrollment Flow
1. **Direct Purchase**: Student pays via Razorpay -> `payment.captured` webhook triggers enrollment.
2. **Whitelist/Invite**: Thala generates a UUID invite token -> Student joins via token bypass -> enrolled with `source: 'whitelist'`.

### Assessment Workflow
1. **PDF Upload**: Student uploads exam script to Bunny Storage via Cloud Function.
2. **AI Grading**: `gradePdfSubmission` is triggered -> AI analyzes script -> Results written to `exam_results`.
3. **Certification**: Upon completion, `registerIssuance` generates a verifiable JSON-LD certificate.

---

## 5. Current State & Known Bottlenecks

### Just Finished
- **Fixed-Price INR Transition**: Removed all PPP logic from frontend and backend.
- **Zone Invitation System**: Fully functional link-based enrollment with 48h expiry.
- **Gemini SDK Upgrade**: Migrated to `@google/genai` v1.x with strict schema enforcement.
- **Infrastructure Hardening**: Standardized `admin.initializeApp()` at the top of entry points and moved Firestore references inside function scopes for deployment stability.

### Immediate Constraints & Next Steps
- **Tailwind Migration**: Moving from external CDN to local build in `index.html`.
- **Mobile Experience**: Optimizing classroom UI for mobile latency.

---

## 6. Security & Access Control

- **Price Integrity**: Firestore rules block any client-side modification of `price`, `priceINR`, or `currency`.
- **Permissions**: Sub-collections like `invites` are restricted to parent document owners only.
- **Data Safety**: Cloud Functions use the "Internal Scope Initialization" pattern to prevent cross-contamination and deployment crashes.

