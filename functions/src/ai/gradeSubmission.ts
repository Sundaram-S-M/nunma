import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

// Step 1: Type Definitions
export interface GradingPayload {
    totalScore: number;
    maxScore: number;
    aiConfidenceScore: number;
    rubricBreakdown: Array<{
        criteria: string;
        awarded: number;
        max: number;
        feedback: string;
    }>;
    overallFeedback: string;
    suggestedRemediation: string[];
}

// Gemini Schema Enforcement
const responseSchema = {
    type: "object",
    properties: {
        totalScore: { type: "number" },
        maxScore: { type: "number" },
        aiConfidenceScore: { type: "number" },
        rubricBreakdown: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    criteria: { type: "string" },
                    awarded: { type: "number" },
                    max: { type: "number" },
                    feedback: { type: "string" }
                },
                required: ["criteria", "awarded", "max", "feedback"]
            }
        },
        overallFeedback: { type: "string" },
        suggestedRemediation: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["totalScore", "maxScore", "aiConfidenceScore", "rubricBreakdown", "overallFeedback", "suggestedRemediation"]
};

/**
 * Cloud Function to grade a PDF submission using Gemini AI.
 * Explicitly configured for heavy PDF processing with 300s timeout and 1GiB memory.
 */
export const gradePdfSubmission = onCall(
    {
        secrets: ["GEMINI_API_KEY", "BUNNY_STORAGE_KEY"],
        timeoutSeconds: 300,
        memory: "1GiB",
        cors: true
    },
    async (request) => {
        const db = admin.firestore();

        // Step 1: Auth Check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Thala or student authentication required.");
        }

        const { zoneId, examId, learnerId, filePath } = request.data;
        if (!zoneId || !examId || !learnerId || !filePath) {
            throw new HttpsError("invalid-argument", "Missing required parameters (zoneId, examId, learnerId, filePath).");
        }

        // Step 2: Storage Fetch Pipeline
        const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
        const region = "storage"; // Default region
        const bunnyPdfUrl = `https://${region}.bunnycdn.com/${storageZone}/${filePath}`;

        let base64Pdf: string;
        try {
            const response = await axios.get(bunnyPdfUrl, {
                responseType: 'arraybuffer',
                headers: {
                    AccessKey: process.env.BUNNY_STORAGE_KEY
                }
            });
            // Convert to Base64 for Gemini multimodal ingestion
            base64Pdf = Buffer.from(response.data).toString('base64');
        } catch (error) {
            console.error("Failed to fetch script from Bunny Storage:", error);
            throw new HttpsError("internal", "Could not retrieve the answer script from storage.");
        }

        // Step 3: Fetch Exam Rubric from Firestore
        const examSnap = await db.doc(`zones/${zoneId}/exams/${examId}`).get();
        if (!examSnap.exists) {
            throw new HttpsError("not-found", "The specified exam does not exist.");
        }
        const examData = examSnap.data();
        const rubric = examData?.rubric; // Fetched from the exams doc

        if (!rubric) {
            throw new HttpsError("failed-precondition", "No grading rubric found for this exam.");
        }

        // Step 4: Gemini Instantiation & Execution
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        try {
            const prompt = `Please grade this student script based on the following rubric:\n\n${JSON.stringify(rubric, null, 2)}`;
            const result = await ai.models.generateContent({
                model: "gemini-1.5-pro",
                config: {
                    systemInstruction: "You are an elite, impartial academic evaluator for NUNMA. Grade the provided PDF script against the provided JSON rubric. Output valid JSON adhering to the specified schema.",
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

            // In the new SDK, result.text is a property
            const responseText = result.text || "";
            let gradingPayload: GradingPayload;
            
            if (typeof responseText === 'string') {
                gradingPayload = JSON.parse(responseText);
            } else {
                gradingPayload = responseText as unknown as GradingPayload;
            }

            // Step 5: Persistence Logic (Firestore Sync)
            // If confidence < 0.8, status is 'flagged'. Otherwise 'graded'.
            const status = gradingPayload.aiConfidenceScore < 0.8 ? 'flagged' : 'graded';

            const submissionRef = db.doc(`zones/${zoneId}/exams/${examId}/submissions/${learnerId}`);
            
            await submissionRef.update({
                status: status,
                gradingPayload: gradingPayload,
                score: gradingPayload.totalScore, // Pulled up for UI leaderboards/sorting
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                message: "Valuation cycle complete.",
                status,
                score: gradingPayload.totalScore
            };

        } catch (error) {
            console.error("Gemini AI Processing Error:", error);
            throw new HttpsError("internal", "The AI evaluator encountered an error during script analysis.");
        }
    }
);
