import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

export const useLinkedInParser = () => {
    const [isParsing, setIsParsing] = useState(false);

    const parsePDF = async (pdfFile: File) => {
        setIsParsing(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                console.error("Missing VITE_GEMINI_API_KEY in environment variables");
                alert("Configuration Error: Gemini API Key is missing. Please check your .env file.");
                throw new Error("Missing API Key");
            }

            console.log("Starting PDF parsing...");
            const reader = new FileReader();
            const base64PDF = await new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(pdfFile);
            });
            console.log("PDF converted to base64");

            const genAI = new GoogleGenAI(apiKey); // Use the variable we checked

            const prompt = `Analyze this LinkedIn profile PDF. 
            Extract ONLY the following information and return it in EXACTLY this JSON format:
            {
                "bio": "A professional summary (About section) - max 200 chars",
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
                ]
            }
            Do NOT extract contact info, email, phone, or website.
            Return ONLY the valid JSON object. Do not include markdown formatting or explanations.`;

            console.log("Calling Gemini API...");
            const result = await genAI.models.generateContent({
                model: 'gemini-1.5-flash', // check model availability
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "application/pdf", // Verify mime type is supported
                                data: base64PDF
                            }
                        }
                    ]
                }]
            });

            console.log("Gemini response received");
            const responseText = result.text || "";
            console.log("Raw response (first 200 chars):", responseText.substring(0, 200));

            // Clean up markdown code blocks if present
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log("JSON parsed successfully", parsed);
                return parsed;
            }
            console.error("JSON regex failed. Clean text:", cleanText);
            throw new Error("Could not parse JSON from Gemini response");

        } catch (error: any) {
            console.error("LinkedIn PDF Parsing Error:", error);
            // Log specific API errors
            if (error.response) {
                console.error("API Error Response:", error.response);
            }
            if (error.message && error.message.includes("403")) {
                alert("API Error: Access Denied (403). Check if your API Key has access to Gemini 1.5 Flash.");
            } else if (error.message && error.message.includes("404")) {
                alert("API Error: Model not found (404). Gemini 1.5 Flash might not be available for this key.");
            }
            throw error;
        } finally {
            setIsParsing(false);
        }
    };

    return { parsePDF, isParsing };
};
