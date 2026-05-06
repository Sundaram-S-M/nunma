const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputFile = path.join(rootDir, 'full_code.md');

const files = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'firebase.json',
  '.firebaserc',
  'firestore.rules',
  'vercel.json',
  'vite-env.d.ts',
  'index.html',
  'index.tsx',
  'index.css',
  'types.ts',
  'App.tsx',
  'context/AuthContext.tsx',
  'context/SidebarContext.tsx',
  'hooks/useAIGrading.ts',
  'hooks/useDropdownBoundary.ts',
  'hooks/useFocusTrap.ts',
  'utils/firebase.ts',
  'utils/notifications.ts',
  'utils/useGeminiQuiz.ts',
  'utils/vcUtils.ts',
  'layouts/PublicLayout.tsx',
  'components/AddonManagerModal.tsx',
  'components/AdminDisputeRow.tsx',
  'components/BillingSummary.tsx',
  'components/BunnyVideoPlayer.tsx',
  'components/CertificateOverlay.tsx',
  'components/ChatSidebar.tsx',
  'components/ConfusionHeatmap.tsx',
  'components/DocumentModuleUploader.tsx',
  'components/EngagementSidebar.tsx',
  'components/ErrorBoundary.tsx',
  'components/ExamAnalytics.tsx',
  'components/GradingHub.tsx',
  'components/Header.tsx',
  'components/LiveNotification.tsx',
  'components/LiveSessionStatus.tsx',
  'components/MCQBuilder.tsx',
  'components/NunmaDashboard.tsx',
  'components/PDFViewer.tsx',
  'components/PdfAnnotator.tsx',
  'components/PhotoAdjustModal.tsx',
  'components/QuizModuleEditor.tsx',
  'components/RefundRequestModal.tsx',
  'components/ShareModal.tsx',
  'components/Sidebar.tsx',
  'components/SubscribeButton.tsx',
  'components/TextModuleEditor.tsx',
  'components/Toast.tsx',
  'components/TutorGradingHub.tsx',
  'components/VideoStage.tsx',
  'components/VideoUploadModal.tsx',
  'components/WhiteboardStage.tsx',
  'components/ZoneCapacityMeter.tsx',
  'components/landing/BlogSection.tsx',
  'components/landing/DemoBookingWidget.tsx',
  'components/landing/DiscoveryGrid.tsx',
  'components/landing/FeaturesShowcase.tsx',
  'components/landing/LandingHero.tsx',
  'pages/AnalyticsChat.tsx',
  'pages/AnalyticsDashboard.jsx',
  'pages/Auth.tsx',
  'pages/AvailabilitySetup.tsx',
  'pages/BookingPage.tsx',
  'pages/CertificateEngine.tsx',
  'pages/Classroom.tsx',
  'pages/ClassroomPage.jsx',
  'pages/Dashboard.tsx',
  'pages/Explore.tsx',
  'pages/Inbox.tsx',
  'pages/LandingPage.tsx',
  'pages/LaunchZone.tsx',
  'pages/LegalPolicy.tsx',
  'pages/ListProductFlow.tsx',
  'pages/Notifications.tsx',
  'pages/OnboardingSystem.tsx',
  'pages/Payment.tsx',
  'pages/PricingPage.tsx',
  'pages/ProductManagement.tsx',
  'pages/ProfileView.tsx',
  'pages/Search.tsx',
  'pages/Settings.tsx',
  'pages/StudentZoneView.tsx',
  'pages/VerificationPortal.tsx',
  'pages/WhiteboardPage.jsx',
  'pages/Workplace.tsx',
  'pages/ZoneDetailView.tsx',
  'pages/ZoneManagement.tsx',
  'functions/package.json',
  'functions/tsconfig.json',
  'functions/src/index.ts',
  'functions/src/zohoUtils.ts',
  'functions/src/ai/askZoneAnalytics.ts',
  'functions/src/ai/generateQuizDraft.ts',
  'functions/src/ai/gradeSubmission.ts',
  'functions/src/utils/vcUtils.ts',
  'scripts/audit_secrets.ps1',
  'scripts/fix_images.cjs',
  'scripts/migrateTaxDetails.cjs',
  'scripts/test_razorpay_webhook.js',
  'scripts/update_images.cjs',
  'scripts/verify_user.js',
];

const extToLang = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  html: 'html',
  rules: 'plaintext',
  ps1: 'powershell',
  cjs: 'javascript',
  py: 'python',
};

let output = `# NUNMA - Full Codebase

> This file contains the entire source code of the Nunma application.
> Each section is labeled with the file path for easy navigation.

---

`;

for (const f of files) {
  const fullPath = path.join(rootDir, f);
  if (!fs.existsSync(fullPath)) {
    output += `## File: \`${f}\`\n\n> FILE NOT FOUND\n\n---\n\n`;
    continue;
  }
  const ext = path.extname(f).slice(1);
  const lang = extToLang[ext] || 'plaintext';
  let content = fs.readFileSync(fullPath, 'utf8');
  if (!content.endsWith('\n')) content += '\n';
  output += `## File: \`${f}\`\n\n\`\`\`${lang}\n${content}\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputFile, output, 'utf8');
const stats = fs.statSync(outputFile);
console.log(`Done! Written ${(stats.size / 1024 / 1024).toFixed(2)} MB to full_code.md`);
