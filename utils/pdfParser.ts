import { pdfjs } from 'react-pdf';
import { MCQ } from '../components/MCQBuilder';

// Extract text from PDF ArrayBuffer
export async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let lastY: number | null = null;
        let pageText = '';
        for (const item of textContent.items as any[]) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
            }
            pageText += item.str + ' ';
            lastY = item.transform[5];
        }
        text += pageText + '\n\n';
    }
    return text;
}

function getMatches(regex: RegExp, line: string) {
    const matches: { letter: string; index: number; length: number }[] = [];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
        const letter = (match[1] || match[2]).toUpperCase();
        matches.push({
            letter,
            index: match.index,
            length: match[0].length
        });
    }
    return matches;
}

// Helper to split a single line containing multiple options (e.g., "(A) 1 (B) 3 (C) 2 (D) 4" or "a 110 b 115 c 125 d140")
function splitLineIntoOptions(line: string): { letter: string; text: string }[] {
    const strictRegex = /(?:^|\s)\(?([A-D])\)[.)\]\s-]*|(?:^|\s)\b([A-D])[.)\]-]+/gi;
    let matches = getMatches(strictRegex, line);

    if (matches.length === 0) {
        const relaxedRegex = /(?:^|\s)([A-D])\s+(?=\S)|(?:^|\s)([A-D])(?=\d+)/gi;
        matches = getMatches(relaxedRegex, line);
        if (matches.length > 0) {
            const letters = matches.map(m => m.letter);
            const isSequential = 'ABCD'.includes(letters.join(''));
            if (!isSequential || letters.length < 2) {
                matches = [];
            }
        }
    }

    if (matches.length === 0) {
        return [];
    }

    const results: { letter: string; text: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i].length;
        const end = (i + 1 < matches.length) ? matches[i + 1].index : line.length;
        results.push({
            letter: matches[i].letter,
            text: line.substring(start, end).trim()
        });
    }
    return results;
}

// Parse MCQ questions and options from raw text
export function parseMCQFromText(text: string, answerKeyText?: string): MCQ[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions: MCQ[] = [];
    let currentQuestion: Partial<MCQ> | null = null;

    // Match question indicators like: "1. Question", "Q2) Text", "[3] Question", "4 Question"
    const questionRegex = /^(?:Q(?:uestion)?\s*)?(\d+)[.)\]\s-]+\s*(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const qMatch = line.match(questionRegex);
        if (qMatch) {
            if (currentQuestion && currentQuestion.question) {
                questions.push(finalizeQuestion(currentQuestion));
            }
            currentQuestion = {
                id: `${Date.now()}_${questions.length}_${qMatch[1]}`,
                question: qMatch[2],
                options: [],
                correctAnswer: 0,
                timerSeconds: 60,
                marks: 5
            };
            continue;
        }

        const lineOptions = splitLineIntoOptions(line);
        if (lineOptions.length > 0 && currentQuestion) {
            currentQuestion.options = currentQuestion.options || [];
            for (const opt of lineOptions) {
                currentQuestion.options.push(opt.text);
            }
            continue;
        }

        // Handle multi-line questions or options
        if (currentQuestion && qMatch === null) {
            if (currentQuestion.options && currentQuestion.options.length > 0) {
                const lastIdx = currentQuestion.options.length - 1;
                currentQuestion.options[lastIdx] += ' ' + line;
            } else {
                currentQuestion.question += ' ' + line;
            }
        }
    }

    if (currentQuestion && currentQuestion.question) {
        questions.push(finalizeQuestion(currentQuestion));
    }

    // Parse correct answers from the answer key text if provided
    if (answerKeyText) {
        const answerLines = answerKeyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        // Match: "1. A", "2) B", "Q3: C", etc.
        const answerRegex = /^(?:Q(?:uestion)?\s*)?(\d+)[.)\]\s-:]+\s*([A-D])\b/i;
        const answerMap: Record<number, number> = {};

        for (const line of answerLines) {
            const match = line.match(answerRegex);
            if (match) {
                const qNum = parseInt(match[1]);
                const ansLetter = match[2].toUpperCase();
                const optIndex = ansLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                answerMap[qNum] = optIndex;
            }
        }

        // Apply correct answer indexes
        questions.forEach((q, idx) => {
            const parts = q.id.split('_');
            const qNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(qNum) && answerMap[qNum] !== undefined) {
                q.correctAnswer = answerMap[qNum];
            } else if (answerMap[idx + 1] !== undefined) {
                q.correctAnswer = answerMap[idx + 1];
            }
        });
    }

    return questions;
}

function finalizeQuestion(q: Partial<MCQ>): MCQ {
    const options = q.options || [];
    while (options.length < 4) {
        options.push('');
    }
    return {
        id: q.id || `${Date.now()}_${Math.random()}`,
        question: q.question?.trim() || '',
        options: options.map(o => o.trim()),
        correctAnswer: q.correctAnswer ?? 0,
        timerSeconds: q.timerSeconds ?? 60,
        marks: q.marks ?? 5
    };
}
