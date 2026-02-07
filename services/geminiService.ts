import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { RecoveryLevel, ScanResult, Case } from "../types";

// Utilisation de la variable définie dans ton vite.config.ts
// Vite injecte 'process.env.GEMINI_API_KEY' au moment du build
const API_KEY = process.env.GEMINI_API_KEY || "";

if (!API_KEY) {
    console.error("Clé API manquante. Configurez GEMINI_API_KEY sur Vercel.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * 1. Génération de rapport comptable
 */
export const generateAccountingReport = async (data: { 
    month: string, totalPaid: number, unpaidCount: number, unpaidTotal: number, practitionerName: string 
}): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Génère un rapport de synthèse comptable officiel pour le mois de ${data.month}.
    PRATICIEN: Dr. ${data.practitionerName}
    HONORAIRES: ${data.totalPaid}€
    IMPAYÉS: ${data.unpaidCount} dossiers (${data.unpaidTotal}€).
    Structure: Titre, Tableau, Analyse santé, Recommandations. Ton pro.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Erreur Rapport:", error);
        return "Erreur lors de la génération du rapport.";
    }
};

/**
 * 2. OCR Planning (Extraction de rendez-vous)
 */
export const extractAppointmentsFromImage = async (base64Image: string): Promise<ScanResult[]> => {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    // Prompt plus précis et permissif
    const prompt = `Analyse cette image d'agenda ou de planning. 
    Extrais TOUS les rendez-vous visibles. 
    Pour chaque rendez-vous, fournis : patientName, day (si visible, sinon met "2026-02-08"), time, et amount (si visible).
    Si tu n'es pas sûr du nom, écris ce que tu lis.
    Format JSON attendu: [{"patientName": "...", "day": "...", "time": "...", "amount": 0}]
    Ne réponds RIEN d'autre que le JSON.`;

    try {
        const imageData = base64Image.includes('base64,') 
            ? base64Image.split(',')[1] 
            : base64Image;

        const result = await model.generateContent([
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
            { text: prompt }
        ]);

        const textResponse = result.response.text();
        console.log("Réponse brute de l'IA:", textResponse); // Pour déboguer dans la console Vercel

        const parsed = JSON.parse(textResponse.replace(/```json|```/g, "").trim());
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Erreur OCR détaillée:", error);
        return [];
    }
};

    const prompt = `Extrais les rendez-vous de cette image. 
    Format attendu (ARRAY JSON): [{"patientName": "Nom", "day": "YYYY-MM-DD", "time": "HH:mm", "amount": 50}]`;

    try {
        const result = await model.generateContent([
            { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } },
            { text: prompt }
        ]);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Erreur OCR Planning:", error);
        return [];
    }
};

/**
 * 3. Script de relance personnalisé (SMS/WhatsApp)
 */
export const generateRecoveryScript = async (patientName: string, amount: number, level: RecoveryLevel): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Rédige un message de relance court pour ${patientName} (Impayé: ${amount}€).
    Intensité: ${level} (1=Amical, 2=Ferme, 3=Mise en demeure, 4=Juridique).`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "Erreur de génération du script.";
    }
};

/**
 * 4. Rappels quotidiens automatisés
 */
export const generateDailyReminders = async (appointments: any[]): Promise<{patientName: string, message: string, phone: string}[]> => {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Génère des SMS de rappel pour ces RDV de demain : ${JSON.stringify(appointments)}. 
    Réponds en JSON: [{"patientName": "...", "message": "...", "phone": "..."}]`;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Erreur Rappels:", error);
        return [];
    }
};

/**
 * 5. Analyse stratégique de dossier
 */
export const getLegalAdvice = async (recoveryCase: Case): Promise<{ advices: { title: string; advice: string }[] }> => {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Analyse ce dossier de recouvrement et donne 3 conseils stratégiques : ${JSON.stringify(recoveryCase)}`;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        return { advices: [] };
    }
};
