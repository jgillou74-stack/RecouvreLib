import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecoveryLevel, ScanResult, Case } from "../types";

// Utilisation de la variable définie dans ton vite.config.ts
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * 1. Extraction de rendez-vous (OCR Planning)
 * C'est cette fonction qui doit être ultra-robuste
 */
export const extractAppointmentsFromImage = async (base64Image: string): Promise<ScanResult[]> => {
    // Utilisation de 1.5-flash qui est le plus performant pour l'OCR
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyse cette photo de planning. 
    Extrais les rendez-vous sous forme de tableau JSON.
    Chaque objet doit avoir : patientName, day (YYYY-MM-DD), time (HH:mm).
    RETOURNE UNIQUEMENT LE JSON. Ne dis pas "Voici le résultat".`;

    try {
        // On s'assure que le base64 est propre
        const imageData = base64Image.split(',')[1] || base64Image;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageData
                }
            },
            { text: prompt }
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Nettoyage radical des balises Markdown
        const jsonContent = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        console.log("Contenu extrait :", jsonContent);
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error("Erreur OCR détaillée :", error);
        return [];
    }
};

    const prompt = `Analyse cette image d'agenda médical. 
    Extrais TOUS les rendez-vous. 
    Format JSON strictement attendu : 
    Array of {"patientName": string, "day": "YYYY-MM-DD", "time": "HH:mm", "amount": number}
    Si tu ne vois pas de date, utilise "2026-02-08".
    Réponds uniquement par le JSON, sans texte avant ou après.`;

    try {
        // Nettoyage du base64 pour être sûr que l'IA reçoive des données pures
        const imageData = base64Image.includes('base64,') 
            ? base64Image.split(',')[1] 
            : base64Image;

        const result = await model.generateContent([
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
            { text: prompt }
        ]);

        const textResponse = result.response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Erreur Gemini Scan:", error);
        return [];
    }
};

/**
 * 2. Génération de messages de rappel (Rappels du lendemain)
 */
export const generateDailyReminders = async (appointments: any[]): Promise<{patientName: string, message: string, phone: string}[]> => {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Génère des SMS de rappel polis pour ces patients : ${JSON.stringify(appointments)}. 
    Réponds en JSON: [{"patientName": "...", "message": "...", "phone": "..."}]`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Erreur Rappels:", error);
        return [];
    }
};

/**
 * 3. Script de relance (Impayés)
 */
export const generateRecoveryScript = async (patientName: string, amount: number, level: RecoveryLevel): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Rédige un message de relance court pour ${patientName} (Impayé: ${amount}€, Niveau: ${level}).`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "Erreur de génération du script.";
    }
};
