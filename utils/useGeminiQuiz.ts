import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, functions } from './firebase';

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
        if (!mediaRecorderRef.current || !functions) return;

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
            const generateQuiz = httpsCallable(functions, 'generateQuizDraft');
            const result = await generateQuiz({
                audioData: base64Audio,
                mimeType: 'audio/webm',
                topic: 'Audio segment from live class',
                difficulty: 'medium',
                numberOfQuestions: 3
            });

            const data = result.data as any;
            const quizDraft = data?.quizDraft;

            if (quizDraft?.questions && db) {
                const quizzes = quizDraft.questions.map((q: any) => ({
                    question: q.questionText || q.question,
                    options: q.options,
                    correctIndex: q.correctOptionIndex ?? q.correctAnswer ?? 0,
                }));

                // Save to Firestore
                const sessionRef = doc(db, `zones/${zoneId}/sessions/${sessionId}`);
                await updateDoc(sessionRef, {
                    quizzes: arrayUnion(...quizzes)
                });
            }
        } catch (error) {
            console.error("Quiz Generation Error:", error);
        } finally {
            setIsGenerating(false);
            // Restart capture for the next segment if needed
            if (mediaRecorderRef.current?.stream) {
                startCapture(mediaRecorderRef.current.stream);
            }
        }
    }, [zoneId, sessionId, startCapture]);

    return { isGenerating, startCapture, stopAndGenerate };
};
