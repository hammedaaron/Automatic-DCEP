
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with API_KEY from process.env as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function suggestFolders(currentFolders: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these existing folders: ${currentFolders.join(', ')}, suggest 3 new relevant social platforms or communities for a "follow-for-follow" app. Return only comma-separated values.`,
    });
    // Safely accessing .text property of GenerateContentResponse
    return response.text?.split(',')?.map(s => s.trim()) || [];
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
}

export async function optimizeIdentity(inputName: string, link: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transform this username "${inputName}" and link "${link}" into a professional social identity for a community hub. 
      If it's an X/Twitter profile, make it sound like an influencer. If it's LinkedIn, make it professional. 
      Return ONLY the optimized name (max 20 characters).`,
    });
    // Safely accessing .text property of GenerateContentResponse
    return response.text?.trim() || inputName;
  } catch (error) {
    console.error("Gemini Identity Optimization Error:", error);
    return inputName;
  }
}
