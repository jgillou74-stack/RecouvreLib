
import { GoogleGenAI, Type } from "@google/genai";
import { RecoveryLevel, ScanResult, Case, RecoveryStep } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Génère un rapport de synthèse comptable mensuel.
 */
export const generateAccountingReport = async (data: { month: string, totalPaid: number, unpaidCount: number, unpaidTotal: number, practitionerName: string }): Promise<string> => {
  const prompt = `Agis en tant qu'assistant comptable pour un praticien libéral.
  Génère un rapport de synthèse comptable officiel pour le mois de ${data.month}.
  
  DONNÉES :
  - Praticien : Dr. ${data.practitionerName}
  - Honoraires perçus : ${data.totalPaid} €
  - Dossiers en impayés : ${data.unpaidCount}
  - Montant total des impayés : ${data.unpaidTotal} €
  
  Présente cela de manière structurée avec :
  1. Un titre officiel "RAPPORT DE SYNTHÈSE COMPTABLE"
  2. Un tableau récapitulatif
  3. Une brève analyse de la santé financière du cabinet (taux de recouvrement)
  4. Des recommandations pour le mois suivant.
  Utilise un ton formel et professionnel.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return "Erreur lors de la génération du rapport comptable.";
  }
};

/**
 * Analyse une photo de planning pour extraire les RDV.
 */
export const extractAppointmentsFromImage = async (base64Image: string): Promise<ScanResult[]> => {
  const prompt = `Analyse cette photo de planning médical. Extrais les rendez-vous.
  Pour chaque ligne, trouve : patientName, day (format YYYY-MM-DD), time (HH:mm), amount (nombre optionnel).
  Réponds uniquement en JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              patientName: { type: Type.STRING },
              day: { type: Type.STRING },
              time: { type: Type.STRING },
              amount: { type: Type.NUMBER }
            },
            required: ["patientName", "day", "time"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return [];
  }
};

/**
 * Analyse une facture pour extraire les données d'un nouveau dossier.
 */
export const extractCaseFromImage = async (base64Image: string): Promise<any> => {
  const prompt = `Analyse cette facture et extrais les informations suivantes pour le formulaire de création de dossier:
  - name (nom du débiteur)
  - email (si disponible)
  - amount (montant total, nombre)
  - profession (secteur d'activité)
  - description (détails de la facture)
  - invoiceId (numéro de facture)
  Réponds uniquement en JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            profession: { type: Type.STRING },
            description: { type: Type.STRING },
            invoiceId: { type: Type.STRING }
          },
          required: ["name", "amount", "invoiceId"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Case OCR Error:", error);
    return {};
  }
};

/**
 * Génère une lettre de relance officielle complète.
 */
export const generateRecoveryLetter = async (recoveryCase: Case): Promise<string> => {
  const prompt = `Rédige une lettre de relance officielle et formelle pour le dossier de recouvrement suivant :
  Débiteur : ${recoveryCase.debtor.name}
  Montant : ${recoveryCase.invoice.amount}€
  Facture N° : ${recoveryCase.invoice.id} du ${recoveryCase.invoice.date}
  Étape actuelle : ${recoveryCase.status}
  
  Le ton doit être approprié à l'étape du processus (allant de la courtoisie ferme à la mise en demeure). Sois professionnel.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error("Gemini Letter Generation Error:", error);
    return "Une erreur est survenue lors de la rédaction automatique du courrier.";
  }
};

/**
 * Fournit des conseils stratégiques et juridiques sur un dossier.
 */
export const getLegalAdvice = async (recoveryCase: Case): Promise<{ advices: { title: string; advice: string }[] }> => {
  const prompt = `Agis comme un expert en recouvrement de créances. Analyse ce dossier et donne 3 conseils stratégiques.
  Dossier : ${JSON.stringify(recoveryCase)}
  Réponds uniquement au format JSON.`;

  try {
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
    console.error("Gemini Advice Error:", error);
    return { advices: [] };
  }
};

/**
 * Génère un script de relance personnalisé selon le niveau d'intensité (SMS/WhatsApp).
 */
export const generateRecoveryScript = async (patientName: string, amount: number, level: RecoveryLevel): Promise<string> => {
  const prompt = `Rédige un message de relance pour un impayé de ${amount}€ pour le patient ${patientName}.
  Niveau d'intensité : ${level}.
  - Niveau 1 : Très amical, SMS/WhatsApp.
  - Niveau 2 : Ferme, SMS/Email.
  - Niveau 3 : Mise en demeure formelle.
  - Niveau 4 : Préparation dossier juridique / Avocat.
  Sois concis et professionnel.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    return "Erreur de génération du script.";
  }
};

/**
 * Génère les messages de rappel pour le lendemain.
 */
export const generateDailyReminders = async (appointments: any[]): Promise<{patientName: string, message: string, phone: string}[]> => {
  const prompt = `Pour ces rendez-vous de demain, génère un court message de rappel SMS poli.
  Données : ${JSON.stringify(appointments)}
  Réponds en JSON : array de {patientName, message, phone}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};
