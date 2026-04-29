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

            const prompt = `You are a subject matter expert who has deeply studied the following material. Your job is to write exam questions that test whether students truly understood the subject — NOT questions about the document itself.

CRITICAL RULES:
1. NEVER reference the document, PDF, sections, chapters, or source material in any question. Questions must stand alone as if they came from a teacher's mind.
2. Extract the real facts, statistics, names, and concepts from the content and ask about THOSE directly.
3. BAD example: "According to section 2, what percentage of startups fail?"
4. GOOD example: "What percentage of Indian startups fail within their first five years according to Startup India data?"
5. Wrong answer options must be specific and plausible — real numbers, real concepts, real names that are close but incorrect. Never use vague phrases.
6. BAD distractor: "To evaluate historical context"
7. GOOD distractor: "42%" or "Government of India" or "NASSCOM" — believable wrong answers.
8. Vary difficulty: mix straightforward recall with questions that require connecting two ideas from the material.
9. Never repeat answer options across questions.

MATERIAL TO STUDY:
${topic}

Generate exactly ${numQ} questions in this JSON format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Return ONLY valid JSON. Nothing else.`;
            
            const result = await ai.models.generateContent({
                model: "gemini-1.5-pro",
                config: {
                    systemInstruction: "You are an expert curriculum designer for the NUNMA platform. Your task is to generate a multiple-choice quiz based on the provided topic and difficulty.",
                    responseMimeType: "application/json",
                    responseSchema: quizSchema,
                    maxOutputTokens: 4000
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
