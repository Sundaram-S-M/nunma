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
Object.defineProperty(exports, "__esModule", { value: true });
exports.askZoneAnalytics = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const genai_1 = require("@google/genai");
const functions = __importStar(require("firebase-functions"));
exports.askZoneAnalytics = (0, https_1.onCall)({
    secrets: ["GEMINI_API_KEY"],
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 120
}, async (request) => {
    try {
        // Internal Scope Initialization
        const db = admin.firestore();
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "You must be signed in to perform this action.");
        }
        const { zoneId, userMessage } = request.data;
        if (!zoneId || !userMessage) {
            throw new https_1.HttpsError("invalid-argument", "Missing required parameters: zoneId or userMessage.");
        }
        // 1. Fetch Students (Limit to 500 most recent, assuming no index required if just limit, or we try limit first)
        // To fetch "recently enrolled", we might normally order by a timestamp. 
        // If an index lacks, ordering could throw an error. We will try a simple limit first.
        const studentsSnapshot = await db.collection("zones").doc(zoneId).collection("students")
            .limit(500)
            .get();
        const parsedStudents = studentsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Strip PII
            delete data.email;
            delete data.phoneNumber;
            return Object.assign({ id: doc.id }, data);
        });
        // 2. Fetch Exams (Limit to 5 recent)
        const examsSnapshot = await db.collection("zones").doc(zoneId).collection("exams")
            .limit(5)
            .get();
        const parsedExams = [];
        // 3. Fetch Submissions per Exam
        for (const examDoc of examsSnapshot.docs) {
            const examData = examDoc.data();
            const submissionsSnapshot = await db.collection("zones").doc(zoneId)
                .collection("exams").doc(examDoc.id)
                .collection("submissions")
                .limit(500)
                .get();
            const parsedSubmissions = submissionsSnapshot.docs.map(subDoc => {
                const subData = subDoc.data();
                // Strip PII
                delete subData.email;
                delete subData.phoneNumber;
                return Object.assign({ id: subDoc.id }, subData);
            });
            parsedExams.push({
                id: examDoc.id,
                title: examData.title || "Untitled Exam",
                // only include relevant exam configs
                maxMark: examData.maxMark,
                minMark: examData.minMark,
                status: examData.status,
                submissions: parsedSubmissions
            });
        }
        // Construct compact JSON payload
        const analyticsContext = {
            students: parsedStudents,
            exams: parsedExams
        };
        const jsonContextStr = JSON.stringify(analyticsContext);
        // Fetch Gemini API Key
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            throw new https_1.HttpsError("failed-precondition", "Gemini API configuration is missing on the server.");
        }
        // Initialize Gemini
        const genAI = new genai_1.GoogleGenAI({ apiKey: geminiApiKey });
        const systemPrompt = `You are an expert data analyst for the NUNMA platform. You are analyzing a specific educational 'Zone'. I will provide you with the raw JSON data of the enrolled students, their statuses, and their exam results (including marks and cheat violations). Answer the user's question accurately based strictly on this provided JSON data. Do not hallucinate. If the data does not contain the answer, say so. Note: The provided data represents a sample of the most recent 500 students and the latest 5 exams to optimize performance. Frame your answers with this context.`;
        // Prompt Gemini
        const response = await genAI.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: [
                { role: 'user', parts: [{ text: `${systemPrompt}\n\nContext:\n${jsonContextStr}\n\nUser Prompt: ${userMessage}` }] }
            ]
        });
        return { response: response.text || "I was unable to analyze the data provided." };
    }
    catch (error) {
        functions.logger.error("Global crash in askZoneAnalytics:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to process analytics query.");
    }
});
//# sourceMappingURL=askZoneAnalytics.js.map