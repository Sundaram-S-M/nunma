import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

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
export const gradePdfSubmission = onCall(
    {
        secrets: ["GEMINI_API_KEY", "BUNNY_API_KEY", "BUNNY_PULL_ZONE_URL"],
        timeoutSeconds: 300,
        memory: "1GiB",
        cors: true
    },
    async (request) => {
        const db = admin.firestore();

        // 1. Authenticate and Validate Inputs
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Login required.");
        }

        const { zoneId, examId, studentUid } = request.data;
        if (!zoneId || !examId || !studentUid) {
            throw new HttpsError("invalid-argument", "Missing required parameters (zoneId, examId, studentUid).");
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
            throw new HttpsError("not-found", "Zone or Exam not found.");
        }

        const zoneData = zoneSnap.data()!;
        const examData = examSnap.data()!;

        // 3. Permission Check
        const isThala = zoneData.createdBy === callerUid;
        const isStudent = studentUid === callerUid;
        const allowSelfGrading = examData.allowSelfGrading === true;

        if (!isThala && !(isStudent && allowSelfGrading)) {
            throw new HttpsError("permission-denied", "You are not authorized to trigger grading for this submission.");
        }

        // 4. Fetch Submission Details
        const submissionRef = examRef.collection("submissions").doc(studentUid);
        const submissionSnap = await submissionRef.get();

        if (!submissionSnap.exists) {
            throw new HttpsError("not-found", "Submission not found.");
        }

        const submissionData = submissionSnap.data()!;
        if (submissionData.status !== "PENDING_GRADING") {
            throw new HttpsError("failed-precondition", "Submission is not in PENDING_GRADING status.");
        }

        const answerSheetUrl = submissionData.answerSheetUrl;
        if (!answerSheetUrl) {
            throw new HttpsError("failed-precondition", "Submission missing answer sheet URL.");
        }

        // 5. Download and Prepare PDF
        let base64Pdf: string;
        try {
            const response = await axios.get(answerSheetUrl, {
                responseType: 'arraybuffer',
                headers: {
                    AccessKey: process.env.BUNNY_API_KEY
                }
            });
            base64Pdf = Buffer.from(response.data).toString('base64');
        } catch (error) {
            console.error("Failed to download PDF from Bunny:", error);
            throw new HttpsError("internal", "Failed to retrieve the answer script from storage.");
        }

        // 6. Gemini Integration
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        // Construct Rubric Prompt with marksPerQuestion
        const questions = examData.questions || [];
        const maxMark = examData.maxMark || 0;

        const rubricText = questions.map((q: any, index: number) => {
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
            await submissionRef.update({
                ...gradingResult,
                status: "GRADED",
                gradedAt: admin.firestore.FieldValue.serverTimestamp()
            });

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

        } catch (error) {
            console.error("Gemini Grading Error:", error);
            throw new HttpsError("internal", "The AI grader encountered an error analyzing the script.");
        }
    }
);
