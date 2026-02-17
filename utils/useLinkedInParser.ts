import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

export const useLinkedInParser = () => {
    const [isParsing, setIsParsing] = useState(false);

    const parsePDF = async (pdfFile: File) => {
        setIsParsing(true);
        try {
            const reader = new FileReader();
            const base64PDF = await new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(pdfFile);
            });

            const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

            const prompt = `Analyze this LinkedIn profile PDF. 
            Extract and return the information in EXACTLY this JSON format:
            {
                "bio": "A professional summary (max 200 chars)",
                "headline": "Current job title and company",
                "experience": [
                    {
                        "title": "Job Title",
                        "company": "Company Name",
                        "location": "Location",
                        "startDate": "YYYY-MM",
                        "endDate": "YYYY-MM or Present",
                        "description": "Short description"
                    }
                ],
                "education": [
                    {
                        "school": "University Name",
                        "degree": "Degree Name",
                        "startDate": "YYYY",
                        "endDate": "YYYY",
                        "description": "Short description"
                    }
                ],
                "skills": ["Skill 1", "Skill 2"]
            }
            Return ONLY the JSON.`;

            const result = await genAI.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "application/pdf",
                                data: base64PDF
                            }
                        }
                    ]
                }]
            });

            const responseText = result.text || "";
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Could not parse JSON from Gemini response");

        } catch (error) {
            console.error("LinkedIn PDF Parsing Error:", error);
            throw error;
        } finally {
            setIsParsing(false);
        }
    };

    return { parsePDF, isParsing };
};
