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
                    questionTextTranslated: { type: "string", nullable: true },
                    options: { 
                        type: "array", 
                        items: { 
                            type: "object",
                            properties: {
                                text: { type: "string" },
                                textTranslated: { type: "string", nullable: true }
                            },
                            required: ["text"]
                        },
                        description: "Array of options objects with optional translated text."
                    },
                    sharedPassage: { type: "string", nullable: true },
                    passageId: { type: "string", nullable: true },
                    hasFigure: { type: "boolean" },
                    figurePageNumber: { type: "integer", nullable: true },
                    figureDescription: { type: "string", nullable: true },
                    correctOption: { type: "string", nullable: true },
                    needsReview: { type: "boolean" },
                    reviewReason: { type: "string", nullable: true }
                },
                required: ["questionNumber", "questionText", "options", "needsReview"]
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
                        systemInstruction: `You are an expert OCR and educational data extraction system. Your task is to extract multiple-choice questions (MCQs) from the provided document into a structured JSON format. 

Follow these critical rules exactly:
1. Identify each question by its number marker (e.g., "Q1.", "1.", etc.). The questionText MUST include ALL text from the question number up to the very first option marker. Do not truncate the question.
2. BILINGUAL QUESTIONS: If a question or its options appear in two languages (e.g. English followed by Tamil), treat BOTH as belonging to the same single question entry.
   - Store the primary language (e.g. English) in questionText.
   - Store the secondary language (e.g. Tamil) in questionTextTranslated. If unilingual, set questionTextTranslated to null.
   - For each option in the options array, store primary text in option.text and secondary text in option.textTranslated. Map by logical position (Option A/1 in English corresponds to Option A/1/அ in Tamil).
   - If the two language versions disagree in meaning, option count, or alignment, set needsReview: true and reviewReason: "Bilingual mismatch — English and Tamil versions do not align".
3. SHARED PASSAGES & LOGIC PUZZLES: If consecutive questions share a common passage, setup, or seating arrangement (e.g. "Directions for Q101-105: ..."), extract that shared context into sharedPassage, and assign a common passageId (e.g. "passage_101_105") to every dependent question.
4. DIAGRAMS & FIGURES: If a question relies on a visual figure/diagram puzzle (e.g. visual number pattern, geometrical figure), set hasFigure: true, specify figurePageNumber (1-indexed page number in document), and provide a brief figureDescription.
5. MATCH-THE-FOLLOWING: For pairing/matching questions (e.g. "1. Item A - Item B"), capture the entire pairing list inside questionText. The answer choices (e.g. "A) 1-2-3-4") are standard option entries.
6. CRITICAL: Preserve mathematical notation exactly. Visually read actual rendered characters—including superscripts, subscripts, square roots, and fractions.
7. Do not invent or infer a correct answer if no answer key is present. Set correctOption to null and needsReview to true.
8. Output structure per question must have: questionNumber, questionText, questionTextTranslated, options (array of {text, textTranslated}), sharedPassage, passageId, hasFigure, figurePageNumber, figureDescription, correctOption, needsReview, reviewReason.`,
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
                let needsReview = q.needsReview !== undefined ? q.needsReview : true;

                // Normalize options array to strict MCQOption[] format ({ text, textTranslated })
                const normalizedOptions = (q.options || []).map((opt: any) => {
                    if (typeof opt === 'string') {
                        return { text: opt, textTranslated: undefined };
                    }
                    return {
                        text: opt.text || '',
                        textTranslated: opt.textTranslated || undefined
                    };
                });

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
                         const idx = normalizedOptions.findIndex((opt: any) => 
                             String(opt.text).toLowerCase().includes(ansVal) || 
                             ansVal.includes(String(opt.text).toLowerCase()) ||
                             (opt.textTranslated && (String(opt.textTranslated).toLowerCase().includes(ansVal) || ansVal.includes(String(opt.textTranslated).toLowerCase())))
                         );
                         if (idx !== -1) correctAnswerIndex = idx;
                    }
                    
                    if (correctAnswerIndex >= 0 && correctAnswerIndex < normalizedOptions.length) {
                        needsReview = false;
                    } else {
                        correctAnswerIndex = -1;
                    }
                }

                return {
                    id: `${Date.now()}_${q.questionNumber}`,
                    question: q.questionText || '',
                    questionTranslated: q.questionTextTranslated || undefined,
                    options: normalizedOptions,
                    correctAnswer: correctAnswerIndex,
                    needsReview: needsReview,
                    reviewReason: q.reviewReason || undefined,
                    sharedPassage: q.sharedPassage || undefined,
                    passageId: q.passageId || undefined,
                    hasFigure: !!q.hasFigure,
                    figurePageNumber: q.figurePageNumber || undefined,
                    figureDescription: q.figureDescription || undefined,
                    timerSeconds: 60,
                    marks: 1
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
