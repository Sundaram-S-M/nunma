import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';

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

export type GradingStatus = 'idle' | 'pending' | 'processing' | 'graded' | 'flagged' | 'error';

export const useAIGrading = (zoneId: string, examId: string, learnerId: string) => {
    const [status, setStatus] = useState<GradingStatus>('idle');
    const [gradingPayload, setGradingPayload] = useState<GradingPayload | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!zoneId || !examId || !learnerId) return;

        const submissionDocRef = doc(db, `zones/${zoneId}/exams/${examId}/submissions/${learnerId}`);
        
        const unsubscribe = onSnapshot(submissionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status) setStatus(data.status as GradingStatus);
                if (data.gradingPayload) setGradingPayload(data.gradingPayload as GradingPayload);
                if (data.score !== undefined) setScore(data.score as number);
            }
        });

        return () => unsubscribe();
    }, [zoneId, examId, learnerId]);

    const triggerGrading = async (filePath: string) => {
        if (!filePath) {
            setError("Answer script path is missing.");
            return;
        }

        try {
            setError(null);
            // Optimistically set to pending
            setStatus('pending');

            const gradePdfSubmission = httpsCallable(functions, 'gradePdfSubmission');
            
            await gradePdfSubmission({
                zoneId,
                examId,
                learnerId,
                filePath
            });

        } catch (err: any) {
            console.error("AI Grading Trigger Failed:", err);
            setStatus('error');
            setError(err.message || "Failed to initiate AI valuation.");
        }
    };

    return {
        status,
        gradingPayload,
        score,
        error,
        triggerGrading
    };
};
