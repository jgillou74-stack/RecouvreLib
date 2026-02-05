
import { GoogleGenAI, Type } from "@google/genai";
import { Case, RecoveryStep } from "../types";

// Initialize the Google GenAI client with API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRecoveryLetter = async (recoveryCase: Case) => {
  const { debtor, invoice, status } = recoveryCase;
  
  const prompt = `
    Génère une lettre de relance professionnelle pour un client en défaut de paiement.
    Contexte :
    - Praticien (Emetteur) : ${debtor.profession}
    - Client (Débiteur) : ${debtor.name}
    - Montant dû : ${invoice.amount}€
    - Étape actuelle de recouvrement : ${status}
    - Facture n° : ${invoice.id} du ${invoice.date}
    
    Si l'étape est "Mise en demeure", le ton doit être ferme et mentionner les risques juridiques.
    Si l'étape est "Escalade Juridique", prépare une lettre annonçant le transfert au service contentieux/huissier.
    Format : Texte clair, prêt à être copié.
  `;

  try {
    // Call generateContent using the correct model name and direct text extraction from response
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erreur lors de la génération de la lettre:", error);
    return "Désolé, une erreur est survenue lors de la génération automatique.";
  }
};

export const getLegalAdvice = async (recoveryCase: Case) => {
  const prompt = `
    En tant qu'expert en recouvrement pour les professions libérales en France, quels sont les 3 prochains conseils stratégiques pour le dossier suivant :
    Client: ${recoveryCase.debtor.name}, Montant: ${recoveryCase.invoice.amount}€, Statut: ${recoveryCase.status}.
    Réponds au format JSON avec une clé "advices" contenant une liste d'objets { "title": string, "advice": string }.
  `;

  try {
    // Configure JSON output with responseSchema for structured advice
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  advice: { type: Type.STRING }
                },
                required: ["title", "advice"]
              }
            }
          },
          required: ["advices"]
        }
      }
    });
    return JSON.parse(response.text || '{"advices": []}');
  } catch (error) {
    console.error("Erreur conseil juridique:", error);
    return { advices: [] };
  }
};

export const extractCaseFromImage = async (base64Image: string) => {
  const prompt = `
    Analyse cette image de facture ou de contrat. 
    Extrais les informations suivantes :
    - name: Nom complet du client
    - email: Email du client (si présent)
    - amount: Montant total (nombre)
    - profession: Type de client (ex: Patient)
    - invoiceId: N° facture
    - description: Détails prestation
  `;

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1] || base64Image,
      },
    };

    // Use gemini-3-flash-preview for multi-modal analysis and JSON text output
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            profession: { type: Type.STRING },
            invoiceId: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "amount", "invoiceId"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Erreur extraction IA:", error);
    throw error;
  }
};
