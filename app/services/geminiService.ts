/**
 * Gemini Service for BananaFlow
 * 
 * Provides functions to interact with Google's Gemini 3 Pro API for:
 * - Text generation
 * - Image generation
 * - Image editing
 * - Multi-modal preset execution
 * 
 * All API calls are routed through the Next.js API route (/api/generate)
 * to handle authentication and CORS properly.
 * 
 * @module geminiService
 */

/** The Gemini model to use for all generation tasks */
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Formats an error into a user-friendly string.
 * Attempts to parse JSON error messages for more detailed information.
 * 
 * @param error - The error to format
 * @param context - The function name where the error occurred
 * @returns Formatted error string
 */
const formatError = (error: unknown, context: string): string => {
  console.error(`Error in ${context}:`, error);
  let errorMessage = error instanceof Error ? error.message : String(error);
  try {
    const parsedError = JSON.parse(errorMessage);
    if (parsedError?.error?.message) errorMessage = parsedError.error.message;
  } catch {
    // ignore parse errors
  }
  return `Error: ${errorMessage}`;
};

// ============================================================================
// Data Conversion Utilities
// ============================================================================

/**
 * Converts a File object to a Gemini-compatible inline data part.
 * 
 * @param file - The file to convert
 * @returns Promise resolving to inline data object with base64 data and mime type
 */
export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inline_data: { data: await base64EncodedDataPromise, mime_type: file.type } };
};

/**
 * Converts a base64 string to a Gemini-compatible inline data part.
 * 
 * @param base64 - The base64-encoded data
 * @param mimeType - The MIME type of the data (e.g., 'image/png')
 * @returns Inline data object for Gemini API
 */
const base64ToGenerativePart = (base64: string, mimeType: string) => ({
  inline_data: { data: base64, mime_type: mimeType },
});

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response structure from the Gemini API.
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
        inline_data?: { data: string; mime_type: string };
      }>;
    };
  }>;
  error?: { message: string; code: number };
}

/**
 * Parsed result from a Gemini API response.
 */
interface ParsedResponse {
  newBase64Image: string | null;
  text: string | null;
}

// ============================================================================
// API Communication
// ============================================================================

/**
 * Parses a Gemini API response to extract text and image data.
 * 
 * @param response - The raw API response
 * @returns Object containing extracted text and base64 image data
 */
const parseResponse = (response: GeminiResponse): ParsedResponse => {
  let newBase64Image: string | null = null;
  let text: string | null = null;

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) text = part.text;
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData?.data) {
        newBase64Image = inlineData.data;
      }
    }
  }
  return { newBase64Image, text };
};

/**
 * Makes a request to the Gemini API via the Next.js API route.
 * 
 * @param model - The Gemini model to use
 * @param contents - The conversation contents to send
 * @param apiKey - The user's Gemini API key
 * @returns Promise resolving to the API response
 * @throws Error if the API request fails
 */
const callGeminiAPI = async (
  model: string,
  contents: unknown,
  apiKey: string
): Promise<GeminiResponse> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, apiKey }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  return data;
};

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Generates text content using Gemini.
 * 
 * @param prompt - The text prompt to send to Gemini
 * @param apiKey - The user's Gemini API key
 * @returns Promise resolving to generated text or error message
 * 
 * @example
 * ```ts
 * const result = await generateText("Write a haiku about coding", apiKey);
 * console.log(result);
 * ```
 */
export const generateText = async (prompt: string, apiKey: string): Promise<string> => {
  if (!prompt) return 'Error: Prompt is empty.';
  if (!apiKey) return 'Error: API key is required.';

  try {
    const response = await callGeminiAPI(
      GEMINI_MODEL,
      [{ role: 'user', parts: [{ text: prompt }] }],
      apiKey
    );
    const { text } = parseResponse(response);
    return text || 'No text generated.';
  } catch (error) {
    return formatError(error, 'generateText');
  }
};

/**
 * Generates an image from a text prompt using Gemini.
 * 
 * @param prompt - The text description of the image to generate
 * @param apiKey - The user's Gemini API key
 * @returns Promise resolving to a data URL of the generated image or error message
 * 
 * @example
 * ```ts
 * const imageDataUrl = await generateImage("A sunset over mountains", apiKey);
 * // Returns: "data:image/png;base64,..."
 * ```
 */
export const generateImage = async (prompt: string, apiKey: string): Promise<string> => {
  if (!prompt) return 'Error: Prompt is empty.';
  if (!apiKey) return 'Error: API key is required.';

  try {
    const response = await callGeminiAPI(
      GEMINI_MODEL,
      [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
      apiKey
    );

    const { newBase64Image } = parseResponse(response);
    if (newBase64Image) {
      return `data:image/png;base64,${newBase64Image}`;
    }
    return 'Error: Image generation failed - no image in response.';
  } catch (error) {
    return formatError(error, 'generateImage');
  }
};

/**
 * Edits an existing image based on a text prompt.
 * 
 * @param base64Image - The base64-encoded image data (without data URL prefix)
 * @param mimeType - The MIME type of the image (e.g., 'image/png')
 * @param prompt - The editing instructions
 * @param apiKey - The user's Gemini API key
 * @returns Promise resolving to object with new image and/or text response
 * 
 * @example
 * ```ts
 * const result = await editImage(imageBase64, 'image/png', 'Add a rainbow', apiKey);
 * if (result.newBase64Image) {
 *   const newImage = `data:image/png;base64,${result.newBase64Image}`;
 * }
 * ```
 */
export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  apiKey: string
): Promise<ParsedResponse> => {
  return executePreset([{ data: base64Image, mimeType }], prompt, apiKey);
};

/**
 * Executes a preset with one or more images and a prompt.
 * Used for complex multi-image operations like brand application.
 * 
 * @param inputs - Array of image data objects with base64 data and MIME types
 * @param prompt - The instruction prompt to execute
 * @param apiKey - The user's Gemini API key
 * @returns Promise resolving to object with generated image and/or text
 * 
 * @example
 * ```ts
 * const result = await executePreset(
 *   [
 *     { data: logoBase64, mimeType: 'image/png' },
 *     { data: slideBase64, mimeType: 'image/png' }
 *   ],
 *   'Apply the logo branding to the slide',
 *   apiKey
 * );
 * ```
 */
export const executePreset = async (
  inputs: { data: string; mimeType: string }[],
  prompt: string,
  apiKey: string
): Promise<ParsedResponse> => {
  if (!apiKey) return { newBase64Image: null, text: 'Error: API key is required.' };

  try {
    // Build parts: images first, then text prompt
    const parts: unknown[] = [
      ...inputs.map((i) => base64ToGenerativePart(i.data, i.mimeType)),
      { text: prompt },
    ];

    const response = await callGeminiAPI(GEMINI_MODEL, [{ role: 'user', parts }], apiKey);

    return parseResponse(response);
  } catch (error) {
    return { newBase64Image: null, text: formatError(error, 'executePreset') };
  }
};

/**
 * Generates a video from an image and prompt.
 * 
 * **Note:** Video generation is currently not available with the REST API.
 * It requires the Google GenAI SDK with special configuration.
 * 
 * @param _base64Image - The source image (unused)
 * @param _mimeType - The image MIME type (unused)
 * @param _prompt - The video generation prompt (unused)
 * @param onProgress - Callback for progress updates
 * @returns Promise resolving to error message
 */
export const generateVideo = async (
  _base64Image: string | null,
  _mimeType: string | null,
  _prompt: string,
  onProgress: (m: string) => void
): Promise<string> => {
  // Video generation requires special SDK configuration
  onProgress('Video generation not available with current API configuration');
  return 'Error: Video generation requires Google GenAI SDK configuration. Please use image generation instead.';
};

// ============================================================================
// Exported Utilities
// ============================================================================

/**
 * Utility functions for data conversion.
 */
export const utils = { fileToGenerativePart, base64ToGenerativePart };
