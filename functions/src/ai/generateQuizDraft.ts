import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const quizSchema = {
    type: "object",
    properties: {
        type: { 
            type: "string",
            description: "Must be 'multiple_choice'"
        },
        maxMark: { 
            type: "integer",
            description: "Total score of all questions in the quiz"
        },
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    questionText: { type: "string" },
                    options: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Array of exactly 4 strings representing the options."
                    },
                    correctOptionIndex: { 
                        type: "integer",
                        description: "Integer from 0 to 3 indicating the index of the correct option."
                    },
                    allocatedMarks: { type: "integer" },
                    explanation: { 
                        type: "string",
                        description: "Brief rationale for the correct answer to act as the scoringRubric."
                    }
                },
                required: [
                    "questionText", 
                    "options", 
                    "correctOptionIndex", 
                    "allocatedMarks", 
                    "explanation"
                ]
            }
        }
    },
    required: ["type", "maxMark", "questions"]
};

export const generateQuizDraft = onCall(
    {
        secrets: ["GEMINI_API_KEY"],
        timeoutSeconds: 120,
        cors: true
    },
    async (request) => {
        // Internal Scope Initialization
        const db = admin.firestore();

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Login required to generate quizzes.");
        }

        const { topic, difficulty, numberOfQuestions } = request.data;
        
        if (!topic || !difficulty) {
            throw new HttpsError("invalid-argument", "Missing required parameters (topic, difficulty).");
        }
        
        const numQ = numberOfQuestions || 5;

        // Verify the user is a tutor or thala
        const userDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }
        
        const role = userDoc.data()?.role;
        if (role !== "TUTOR" && role !== "THALA") {
            throw new HttpsError("permission-denied", "Only instructors can generate quizzes.");
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

            const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nNumber of Questions: ${numQ}`;
            
            const result = await ai.models.generateContent({
                model: "gemini-1.5-pro",
                config: {
                    systemInstruction: "You are an expert curriculum designer for the NUNMA platform. Your task is to generate a multiple-choice quiz based on the provided topic and difficulty.",
                    responseMimeType: "application/json",
                    responseSchema: quizSchema
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            });

            const generatedQuiz = JSON.parse(result.text || "{}");
            
            // Hardcode type as instructed just in case Gemini gets creative
            generatedQuiz.type = "multiple_choice";

            return {
                message: "Quiz generated successfully",
                quizDraft: generatedQuiz
            };
        } catch (error: any) {
            console.error("Gemini Quiz Generation Error:", error);
            throw new HttpsError("internal", "The AI encountered an error generating the quiz.");
        }
    }
);
