import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecoveryLevel, ScanResult } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// 1. Fonction de Scan (OCR)
export const extractAppointmentsFromImage = async (base64Image: string): Promise<ScanResult[]> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyse ce planning. Retourne UNIQUEMENT un tableau JSON : [{"patientName": "...", "day": "2026-02-08", "time": "HH:mm"}]`;

    try {
        const imageData = base64Image.split(',')[1] || base64Image;
        const result = await model.generateContent([
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
            { text: prompt }
        ]);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Erreur Scan:", error);
        return [];
    }
};

// 2. Fonction de Rappels (Celle qui manquait !)
export const generateDailyReminders = async (appointments: any[]): Promise<any[]> => {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    const prompt = `Génère des SMS de rappel pour : ${JSON.stringify(appointments)}`;
    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
    } catch (error) {
        return [];
    }
};

// 3. Fonction de Relance
export const generateRecoveryScript = async (name: string, amount: number, level: RecoveryLevel): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Rédige un message de relance pour ${name} (${amount}€).`;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "Erreur script.";
    }
};
