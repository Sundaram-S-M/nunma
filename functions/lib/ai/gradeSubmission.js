"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradePdfSubmission = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const genai_1 = require("@google/genai");
// Step 1: Request Schema Enforcement
const responseSchema = {
    type: "object",
    properties: {
        totalMarks: { type: "number" },
        maxMark: { type: "number" },
        percentageScore: { type: "number" },
        feedback: { type: "string" },
        questionBreakdown: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    marksAwarded: { type: "number" },
                    maxMarks: { type: "number" },
                    comment: { type: "string" }
                },
                required: ["question", "marksAwarded", "maxMarks", "comment"]
            }
        }
    },
    required: ["totalMarks", "maxMark", "percentageScore", "feedback", "questionBreakdown"]
};
/**
 * Cloud Function to grade a PDF submission using Gemini AI.
 * Explicitly configured for heavy PDF processing with 300s timeout and 1GiB memory.
 */
exports.gradePdfSubmission = (0, https_1.onCall)({
    secrets: ["GEMINI_API_KEY", "BUNNY_API_KEY", "BUNNY_PULL_ZONE_URL"],
    timeoutSeconds: 300,
    memory: "1GiB",
    cors: true
}, async (request) => {
    const db = admin.firestore();
    // 1. Authenticate and Validate Inputs
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    }
    const { zoneId, examId, studentUid } = request.data;
    if (!zoneId || !examId || !studentUid) {
        throw new https_1.HttpsError("invalid-argument", "Missing required parameters (zoneId, examId, studentUid).");
    }
    const callerUid = request.auth.uid;
    // 2. Fetch Exam & Zone Details for Authorization
    const zoneRef = db.collection("zones").doc(zoneId);
    const examRef = zoneRef.collection("exams").doc(examId);
    const [zoneSnap, examSnap] = await Promise.all([
        zoneRef.get(),
        examRef.get()
    ]);
    if (!zoneSnap.exists || !examSnap.exists) {
        throw new https_1.HttpsError("not-found", "Zone or Exam not found.");
    }
    const zoneData = zoneSnap.data();
    const examData = examSnap.data();
    // 3. Permission Check
    const isThala = zoneData.createdBy === callerUid;
    const isStudent = studentUid === callerUid;
    const allowSelfGrading = examData.allowSelfGrading === true;
    if (!isThala && !(isStudent && allowSelfGrading)) {
        throw new https_1.HttpsError("permission-denied", "You are not authorized to trigger grading for this submission.");
    }
    // 4. Fetch Submission Details
    const submissionRef = examRef.collection("submissions").doc(studentUid);
    const submissionSnap = await submissionRef.get();
    if (!submissionSnap.exists) {
        throw new https_1.HttpsError("not-found", "Submission not found.");
    }
    const submissionData = submissionSnap.data();
    if (submissionData.status !== "PENDING_GRADING") {
        throw new https_1.HttpsError("failed-precondition", "Submission is not in PENDING_GRADING status.");
    }
    const answerSheetUrl = submissionData.answerSheetUrl;
    if (!answerSheetUrl) {
        throw new https_1.HttpsError("failed-precondition", "Submission missing answer sheet URL.");
    }
    // 5. Download and Prepare PDF
    let base64Pdf;
    try {
        const response = await axios_1.default.get(answerSheetUrl, {
            responseType: 'arraybuffer',
            headers: {
                AccessKey: process.env.BUNNY_API_KEY
            }
        });
        base64Pdf = Buffer.from(response.data).toString('base64');
    }
    catch (error) {
        console.error("Failed to download PDF from Bunny:", error);
        throw new https_1.HttpsError("internal", "Failed to retrieve the answer script from storage.");
    }
    // 6. Gemini Integration
    const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Construct Rubric Prompt with marksPerQuestion
    const questions = examData.questions || [];
    const maxMark = examData.maxMark || 0;
    const rubricText = questions.map((q, index) => {
        return `Question ${index + 1}: ${q.questionText || q.question} (Max Marks: ${q.marksPerQuestion || q.marks})`;
    }).join("\n");
    const prompt = `
            Please grade this student script strictly based on the following rubric:
            Max Total Marks for Exam: ${maxMark}
            
            Rubric Breakdown:
            ${rubricText}
            
            Return the results precisely in JSON format.
        `;
    try {
        const result = await ai.models.generateContent({
            model: "gemini-1.5-pro",
            config: {
                systemInstruction: "You are an exam grader. Grade strictly against the rubric. Provide constructive feedback for the student.",
                responseMimeType: "application/json",
                responseSchema: responseSchema
            },
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: base64Pdf,
                                mimeType: "application/pdf"
                            }
                        }
                    ]
                }
            ]
        });
        const gradingResult = JSON.parse(result.text || "{}");
        // 7. Persist Results & Check Exam Completion
        await submissionRef.update(Object.assign(Object.assign({}, gradingResult), { status: "GRADED", gradedAt: admin.firestore.FieldValue.serverTimestamp() }));
        // Check if all submissions are now GRADED
        const allSubmissions = await examRef.collection("submissions").get();
        const allGraded = allSubmissions.docs.every(doc => doc.data().status === "GRADED");
        if (allGraded) {
            await examRef.update({
                status: "COMPLETED",
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return {
            message: "Grading successful",
            result: gradingResult,
            examCompleted: allGraded
        };
    }
    catch (error) {
        console.error("Gemini Grading Error:", error);
        throw new https_1.HttpsError("internal", "The AI grader encountered an error analyzing the script.");
    }
});
//# sourceMappingURL=gradeSubmission.js.map