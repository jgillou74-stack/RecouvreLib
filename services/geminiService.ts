import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecoveryLevel, ScanResult } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const extractAppointmentsFromImage = async (base64Image: string): Promise<ScanResult[]> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyse cette photo de planning médical. 
    Extrais les rendez-vous sous forme de tableau JSON.
    Chaque objet doit avoir EXACTEMENT ces clés : patientName, day (format YYYY-MM-DD), time (format HH:mm).
    RETOURNE UNIQUEMENT LE TABLEAU JSON. PAS DE TEXTE AUTOUR.`;

    try {
        const imageData = base64Image.split(',')[1] || base64Image;

        const result = await model.generateContent([
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
            { text: prompt }
        ]);

        const text = result.response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Erreur Gemini:", error);
        return [];
    }
};

// Garde tes autres fonctions (generateDailyReminders, etc.) en dessous si tu en as besoin
