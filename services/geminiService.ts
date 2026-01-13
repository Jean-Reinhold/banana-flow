import { GoogleGenAI, Modality } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = <T extends (...args: any[]) => Promise<any>>(apiCall: T): T => {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        let lastError: any;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                return await apiCall(...args);
            } catch (error: any) {
                lastError = error;
                let isRateLimitError = false;
                if (error instanceof Error && error.message) {
                    try {
                        const errorDetails = JSON.parse(error.message);
                        if (errorDetails?.error?.code === 429 || errorDetails?.error?.status === 'RESOURCE_EXHAUSTED') {
                            isRateLimitError = true;
                        }
                    } catch (e) {
                        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
                           isRateLimitError = true;
                        }
                    }
                }
                if (isRateLimitError && i < MAX_RETRIES - 1) {
                    const waitTime = INITIAL_DELAY_MS * Math.pow(2, i) + Math.random() * 1000;
                    await delay(waitTime);
                    continue;
                }
                throw lastError;
            }
        }
        throw lastError;
    }) as T;
};

const formatError = (error: any, context: string): string => {
    console.error(`Error in ${context}:`, error);
    let errorMessage = error instanceof Error ? error.message : String(error);
    try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError?.error?.message) errorMessage = parsedError.error.message;
    } catch (e) {}
    return `Error: ${errorMessage}`;
};

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
};

const base64ToGenerativePart = (base64: string, mimeType: string) => ({
    inlineData: { data: base64, mimeType },
});

// Helper to extract aspect ratio and config from prompt
const getImageConfig = (prompt: string) => {
    const p = prompt.toLowerCase();
    let aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1";
    
    if (p.includes('16:9') || p.includes('16/9') || p.includes('landscape') || p.includes('widescreen')) aspectRatio = '16:9';
    else if (p.includes('9:16') || p.includes('9/16') || p.includes('portrait')) aspectRatio = '9:16';
    else if (p.includes('4:3') || p.includes('4/3')) aspectRatio = '4:3';
    else if (p.includes('3:4') || p.includes('3/4')) aspectRatio = '3:4';
    
    return {
        aspectRatio,
        imageSize: '2K' // Enforce high quality
    } as const;
};

// Helper to parse response
const parseResponse = (response: GenerateContentResponse) => {
    let newBase64Image: string | null = null;
    let text: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.text) text = part.text;
        else if (part.inlineData) newBase64Image = part.inlineData.data;
    }
    return { newBase64Image, text };
};

// Helper to describe an image for recreation
const describeImageForRecreation = async (inputs: { data: string; mimeType: string }[]): Promise<string> => {
    const ai = getAI();
    // Explicitly using 'user' role
    const parts = [
        ...inputs.map(i => base64ToGenerativePart(i.data, i.mimeType)),
        { text: "Analyze this image in detail. Describe the subject, composition, layout, colors, lighting, and artistic style to help recreate it." }
    ];
    
    // Use Flash for vision analysis
    const response = await withRetry(ai.models.generateContent)({
        model: 'gemini-3-flash-preview', 
        contents: { role: 'user', parts }
    });
    
    return response.text || "";
};

export const generateText = async (prompt: string): Promise<string> => {
    if (!prompt) return "Error: Prompt is empty.";
    try {
        const ai = getAI();
        const response: GenerateContentResponse = await withRetry(ai.models.generateContent)({
            model: 'gemini-3-flash-preview',
            contents: { role: 'user', parts: [{ text: prompt }] },
        });
        return response.text || "No text generated.";
    } catch (error) {
        return formatError(error, "generateText");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    if (!prompt) return "Error: Prompt is empty.";
    try {
        const ai = getAI();
        const config = getImageConfig(prompt);
        // Text-to-Image: gemini-3-pro-image-preview is best
        // Ensure role is user
        const response = await withRetry(ai.models.generateContent)({
            model: 'gemini-3-pro-image-preview',
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { imageConfig: config }
        });
        
        const { newBase64Image } = parseResponse(response);
        if (newBase64Image) {
            // Find mimeType from response or default to png
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            const mime = part?.inlineData?.mimeType || 'image/png';
            return `data:${mime};base64,${newBase64Image}`;
        }
        return "Error: Image generation failed.";
    } catch (error) {
        return formatError(error, "generateImage");
    }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string) => {
    return executePreset([{ data: base64Image, mimeType }], prompt);
};

export const executePreset = async (inputs: { data: string; mimeType: string }[], prompt: string) => {
    try {
        const ai = getAI();
        let finalPrompt = prompt;

        // STRATEGY: 
        // 1. If images exist, use Vision model to describe them.
        // 2. Combine description + User Prompt.
        // 3. Try Gemini 3 Pro (2K) -> Gemini 3 Pro (1K) -> Gemini 2.5 Flash
        
        if (inputs.length > 0) {
             try {
                const description = await describeImageForRecreation(inputs);
                if (description) {
                    finalPrompt = `You are a high-end AI image generator. 
                    
CONTEXT (Based on input image): ${description}

USER REQUEST: ${prompt}

INSTRUCTIONS: Create a new high-quality image that incorporates the user's request while using the context for composition and style reference.`;
                }
             } catch (err) {
                 console.warn("Failed to describe image, proceeding with prompt only", err);
             }
        }

        const baseConfig = getImageConfig(prompt);
        
        // Attempt 1: Pro Model with High Quality (2K)
        try {
            const response: GenerateContentResponse = await withRetry(ai.models.generateContent)({
                model: 'gemini-3-pro-image-preview',
                contents: { role: 'user', parts: [{ text: finalPrompt }] },
                config: { imageConfig: { ...baseConfig, imageSize: '2K' } }
            });
            return parseResponse(response);
        } catch (error: any) {
             const msg = error.message || JSON.stringify(error);
             // If not a permission error, rethrow. If it IS a permission error (403), try fallback.
             if (!msg.includes('403') && !msg.includes('PERMISSION_DENIED')) {
                throw error;
             }
             console.warn("Gemini 3 Pro (2K) failed with 403, attempting fallback to 1K...");
        }

        // Attempt 2: Pro Model with Standard Quality (1K - default)
        try {
            const response: GenerateContentResponse = await withRetry(ai.models.generateContent)({
                model: 'gemini-3-pro-image-preview',
                contents: { role: 'user', parts: [{ text: finalPrompt }] },
                config: { imageConfig: { aspectRatio: baseConfig.aspectRatio } }
            });
            return parseResponse(response);
        } catch (error: any) {
             const msg = error.message || JSON.stringify(error);
             if (!msg.includes('403') && !msg.includes('PERMISSION_DENIED')) {
                throw error;
             }
             console.warn("Gemini 3 Pro (1K) failed with 403, attempting fallback to Flash...");
        }

        // Attempt 3: Flash Model (2.5) - Last resort for 403s
        // Note: 2.5 Flash Image uses 'aspectRatio' but not 'imageSize'
        const response: GenerateContentResponse = await withRetry(ai.models.generateContent)({
            model: 'gemini-2.5-flash-image',
            contents: { role: 'user', parts: [{ text: finalPrompt }] },
            config: { imageConfig: { aspectRatio: baseConfig.aspectRatio } }
        });
        return parseResponse(response);

    } catch (error) {
        return { newBase64Image: null, text: formatError(error, "executePreset") };
    }
};

export const generateVideo = async (base64Image: string | null, mimeType: string | null, prompt: string, onProgress: (m: string) => void) => {
    try {
        const ai = getAI();
        onProgress("Initializing Video...");
        let operation = await withRetry(ai.models.generateVideos)({
          model: 'veo-3.1-fast-generate-preview',
          prompt,
          image: base64Image && mimeType ? { imageBytes: base64Image, mimeType } : undefined,
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });
        while (!operation.done) {
            await new Promise(r => setTimeout(r, 10000));
            onProgress("Processing video...");
            operation = await withRetry(ai.operations.getVideosOperation)({ operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No video URI returned.");
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        return formatError(error, "generateVideo");
    }
};

export const utils = { fileToGenerativePart, base64ToGenerativePart };
