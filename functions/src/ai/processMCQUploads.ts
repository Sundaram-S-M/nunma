import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const questionPaperSchema = {
    type: "object",
    properties: {
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    questionNumber: { type: "integer" },
                    questionText: { type: "string" },
                    options: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Array of the options."
                    }
                },
                required: ["questionNumber", "questionText", "options"]
            }
        }
    },
    required: ["questions"]
};

const answerKeySchema = {
    type: "object",
    properties: {
        answers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    questionNumber: { type: "integer" },
                    correctAnswerValue: { type: "string", description: "The literal text or letter (A/B/C/D) of the correct answer" }
                },
                required: ["questionNumber", "correctAnswerValue"]
            }
        }
    },
    required: ["answers"]
};

export const processMCQUploads = onCall(
    {
        secrets: ["GEMINI_API_KEY"],
        timeoutSeconds: 180,
        cors: true
    },
    async (request) => {
        const db = admin.firestore();

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Login required.");
        }

        const { questionPaperData, answerKeyData } = request.data;
        
        if (!questionPaperData) {
            throw new HttpsError("invalid-argument", "Missing required parameters (questionPaperData).");
        }

        // Verify the user is a tutor or thala
        const userDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }
        
        const role = userDoc.data()?.role;
        if (role !== "TUTOR" && role !== "THALA") {
            throw new HttpsError("permission-denied", "Only instructors can use this feature.");
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            
            // 1. Process Question Paper
            const qpResult = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    systemInstruction: "You are an expert OCR and data extraction system. Extract the multiple choice questions, their numbers, and options exactly as they appear in the document.",
                    responseMimeType: "application/json",
                    responseSchema: questionPaperSchema,
                    maxOutputTokens: 8192
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            { 
                                inlineData: {
                                    mimeType: questionPaperData.mimeType,
                                    data: questionPaperData.data
                                }
                            },
                            { text: "Extract all the multiple choice questions from this document into the required JSON format. Preserve the exact text and numbers." }
                        ]
                    }
                ]
            });

            const qpParsed = JSON.parse(qpResult.text || "{}");
            const questions = qpParsed.questions || [];
            
            // Sanity Check for Swapped Uploads
            let totalOptions = 0;
            questions.forEach((q: any) => { totalOptions += (q.options || []).length; });
            const avgOptions = questions.length > 0 ? totalOptions / questions.length : 0;

            if (questions.length === 0 || avgOptions < 2) {
                return {
                    success: false,
                    error: "SWAPPED_OR_INVALID_QP",
                    message: "The uploaded Question Paper doesn't look like a valid test (could not find enough questions with options). Did you accidentally swap the Answer Key and Question Paper?"
                };
            }

            let answers: any[] = [];
            if (answerKeyData) {
                // 2. Process Answer Key
                const akResult = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    config: {
                        systemInstruction: "You are an expert OCR and data extraction system. Extract the mapping of question numbers to correct answers from the provided document.",
                        responseMimeType: "application/json",
                        responseSchema: answerKeySchema,
                        maxOutputTokens: 2048
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { 
                                    inlineData: {
                                        mimeType: answerKeyData.mimeType,
                                        data: answerKeyData.data
                                    }
                                },
                                { text: "Extract the answer key from this document. Provide the question number and the correct answer value (either the letter like 'A'/'B', or the text itself)." }
                            ]
                        }
                    ]
                });

                const akParsed = JSON.parse(akResult.text || "{}");
                answers = akParsed.answers || [];

                if (answers.length === 0) {
                     return {
                        success: false,
                        error: "INVALID_AK",
                        message: "Could not extract any answers from the Answer Key. Please ensure it is legible."
                    };
                }
            }

            // 3. Match them up
            const matchedQuestions = questions.map((q: any) => {
                const ansObj = answers.find((a: any) => a.questionNumber === q.questionNumber);
                let correctAnswerIndex = -1;
                let needsReview = true;

                if (ansObj) {
                    const ansVal = String(ansObj.correctAnswerValue).trim().toLowerCase();
                    const letterMatch = ansVal.match(/^([a-z]|[1-9])$/i);
                    if (letterMatch) {
                        const letter = letterMatch[1].toLowerCase();
                        if (letter === 'a' || letter === '1') correctAnswerIndex = 0;
                        else if (letter === 'b' || letter === '2') correctAnswerIndex = 1;
                        else if (letter === 'c' || letter === '3') correctAnswerIndex = 2;
                        else if (letter === 'd' || letter === '4') correctAnswerIndex = 3;
                        else if (letter === 'e' || letter === '5') correctAnswerIndex = 4;
                    }
                    
                    if (correctAnswerIndex === -1) {
                         const idx = q.options.findIndex((opt: string) => String(opt).toLowerCase().includes(ansVal) || ansVal.includes(String(opt).toLowerCase()));
                         if (idx !== -1) correctAnswerIndex = idx;
                    }
                    
                    if (correctAnswerIndex >= 0 && correctAnswerIndex < q.options.length) {
                        needsReview = false;
                    } else {
                        correctAnswerIndex = -1;
                    }
                }

                return {
                    id: `${Date.now()}_${q.questionNumber}`,
                    question: q.questionText || '',
                    options: q.options || [],
                    correctAnswer: correctAnswerIndex,
                    needsReview: needsReview,
                    timerSeconds: 60,
                    marks: 5
                };
            });

            return {
                success: true,
                message: "Processed successfully",
                questions: matchedQuestions
            };
        } catch (error: any) {
            console.error("Gemini Upload Process Error:", error);
            throw new HttpsError("internal", "The AI encountered an error processing the documents.");
        }
    }
);
