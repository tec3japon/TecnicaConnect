import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const sendMessageToGemini = async (message: string, context: string): Promise<string> => {
  if (!aiClient) {
    console.warn("API_KEY not found. Returning mock response.");
    return "La API Key de Gemini no está configurada. Por favor configura process.env.API_KEY para usar el asistente.";
  }

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: `Eres un asistente útil para una escuela técnica. 
        El contexto del usuario actual es: ${context}. 
        Responde de manera concisa, educada y útil. 
        Si es un alumno, ayúdalo con explicaciones técnicas. 
        Si es un docente, ayuda con planificaciones.`,
      }
    });

    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Hubo un error al contactar al asistente inteligente. Por favor intenta más tarde.";
  }
};