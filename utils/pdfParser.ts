import { pdfjs } from 'react-pdf';
import { MCQ, MCQOption } from '../components/MCQBuilder';

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

// Render a specific page from PDF ArrayBuffer onto a Canvas and return PNG Data URL
export async function renderPdfPageToImage(pdfBuffer: ArrayBuffer, pageNumber: number): Promise<string> {
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    const targetPageNum = Math.min(Math.max(1, pageNumber), pdf.numPages);
    const page = await pdf.getPage(targetPageNum);

    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
        throw new Error('Failed to create canvas context for PDF page rendering');
    }

    const renderContext: any = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL('image/png');
}

// Helper to split a single line containing multiple options (e.g., "(A) 1 (B) 3 (C) 2 (D) 4" or "a 110 b 115 c 125 d140")
function splitLineIntoOptions(line: string): { letter: string; text: string }[] {
    const strictRegex = /(?:^|\s)\(?([A-D])\)[.)\]\s-]*|(?:^|\s)\b([A-D])[.)\]-]+/gi;
    let matches = getMatches(strictRegex, line);

    // Filter out weak single matches (like "c." at the end of "a + b + c.")
    if (matches.length === 1 && matches[0].index > 0) {
        const m = matches[0];
        const matchText = line.substr(m.index, m.length).trim();
        if (/^[a-d][.)\]]+$/.test(matchText)) {
            // If it's a lowercase letter with just a dot/bracket in the middle of a line, it's likely part of the question text.
            matches = [];
        }
    }

    if (matches.length === 0) {
        // relaxedRegex should be case-sensitive to avoid matching "a + b + c" as options A, B, C
        const relaxedRegex = /(?:^|\s)([A-D])\s+(?=\S)|(?:^|\s)([A-D])(?=\d+)/g;
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
        
        // Ignore common footers like "Page 1 of 3" or standalone page numbers
        if (/^page\s*\d+\s*of\s*\d+$/i.test(line) || (/^\d+$/.test(line) && i > 0 && i === lines.length - 1)) {
            continue;
        }
        
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
                marks: 1
            };
            continue;
        }

        const lineOptions = splitLineIntoOptions(line);
        if (lineOptions.length > 0 && currentQuestion) {
            currentQuestion.options = currentQuestion.options || [];
            for (const opt of lineOptions) {
                (currentQuestion.options as any[]).push({ text: opt.text, textTranslated: undefined });
            }
            continue;
        }

        // Handle multi-line questions or options
        if (currentQuestion && qMatch === null) {
            if (currentQuestion.options && currentQuestion.options.length > 0) {
                const lastIdx = currentQuestion.options.length - 1;
                const currentOpt = (currentQuestion.options as any[])[lastIdx];
                if (typeof currentOpt === 'string') {
                    (currentQuestion.options as any[])[lastIdx] = { text: currentOpt + ' ' + line, textTranslated: undefined };
                } else if (currentOpt && typeof currentOpt === 'object') {
                    currentOpt.text = (currentOpt.text || '') + ' ' + line;
                }
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

function finalizeQuestion(q: any): MCQ {
    const rawOptions = q.options || [];
    const options: any[] = rawOptions.map((o: any) => {
        if (typeof o === 'string') {
            return { text: o.trim(), textTranslated: undefined };
        }
        return {
            text: (o.text || '').trim(),
            textTranslated: o.textTranslated ? o.textTranslated.trim() : undefined
        };
    });

    while (options.length < 4) {
        options.push({ text: '', textTranslated: undefined });
    }

    return {
        id: q.id || `${Date.now()}_${Math.random()}`,
        question: q.question?.trim() || '',
        questionTranslated: q.questionTranslated?.trim() || undefined,
        options: options,
        correctAnswer: q.correctAnswer ?? 0,
        timerSeconds: q.timerSeconds ?? 60,
        marks: q.marks ?? 1,
        needsReview: q.needsReview,
        reviewReason: q.reviewReason,
        sharedPassage: q.sharedPassage,
        passageId: q.passageId,
        hasFigure: q.hasFigure,
        figurePageNumber: q.figurePageNumber,
        figureImageUrl: q.figureImageUrl,
        figureDescription: q.figureDescription
    };
}
