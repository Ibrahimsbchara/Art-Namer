
import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type NameStyle = 'Artistic' | 'Descriptive' | 'Modern & Edgy';

const getPromptForStyle = (style: NameStyle): string => {
    switch (style) {
        case 'Artistic':
            return "You are a poetic and insightful art curator. Your task is to give a single, compelling title for the provided artwork. Do not provide any commentary, explanation, or quotation marks. Return only the title itself.";
        case 'Descriptive':
            return "You are a literal and precise cataloger. Your task is to give a single, simple, and descriptive title for the image provided. Do not provide any commentary, explanation, or quotation marks. Return only the title itself.";
        case 'Modern & Edgy':
             return "You are a modern branding expert. Your task is to give a single, short, edgy, and memorable name for the item in the image. Think of a cool product name. Do not provide commentary, explanation, or quotation marks. Return only the title itself.";
        default:
            return "Give a single, interesting name for this image.";
    }
}


/**
 * Generates a name for a piece of art based on an image and a chosen style.
 * @param base64Data The base64 encoded image data.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param style The desired naming style.
 * @returns A promise that resolves to the suggested art name as a string.
 */
export const generateArtName = async (base64Data: string, mimeType: string, style: NameStyle): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType,
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { 
                parts: [
                    imagePart, 
                    { text: getPromptForStyle(style) }
                ] 
            },
        });

        const text = response.text.trim();
        
        // Sometimes the model might still add quotes, so we remove them.
        return text.replace(/^["']|["']$/g, '');

    } catch (error) {
        console.error("Error generating art name:", error);
        // Re-throw a more user-friendly error message.
        throw new Error("Failed to generate a name. The AI may be experiencing high traffic or the image could not be processed.");
    }
};
