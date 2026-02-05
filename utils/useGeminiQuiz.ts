import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export const useGeminiQuiz = (zoneId: string, sessionId: string) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startCapture = useCallback((stream: MediaStream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.start();
    }, []);

    const stopAndGenerate = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        setIsGenerating(true);
        mediaRecorderRef.current.stop();

        // Wait a bit for the last chunk
        await new Promise(resolve => setTimeout(resolve, 500));

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        const base64Audio = await new Promise<string>((resolve) => {
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(audioBlob);
        });

        try {
            const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

            const prompt = "Analyze this audio segment from a class. Generate 3 multiple-choice questions in JSON format to test student understanding. Return ONLY a JSON array of objects with 'question', 'options' (array of 4 strings), and 'correctIndex' (number 0-3).";

            const result = await genAI.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "audio/webm",
                                data: base64Audio
                            }
                        }
                    ]
                }]
            });

            const responseText = result.text || "";
            const jsonMatch = responseText.match(/\[.*\]/s);

            if (jsonMatch) {
                const quizzes = JSON.parse(jsonMatch[0]);

                // Save to Firestore
                const sessionRef = doc(db, `zones/${zoneId}/sessions/${sessionId}`);
                await updateDoc(sessionRef, {
                    quizzes: arrayUnion(...quizzes)
                });
            }
        } catch (error) {
            console.error("Gemini Quiz Generation Error:", error);
        } finally {
            setIsGenerating(false);
            // Restart capture for the next segment if needed
            if (mediaRecorderRef.current.stream) {
                startCapture(mediaRecorderRef.current.stream);
            }
        }
    }, [zoneId, sessionId, startCapture]);

    return { isGenerating, startCapture, stopAndGenerate };
};
