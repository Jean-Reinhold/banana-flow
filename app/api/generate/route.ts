/**
 * Gemini API Route Handler
 * 
 * This Next.js API route acts as a proxy to the Google Gemini API.
 * It handles:
 * - API key authentication (passed from client, not stored on server)
 * - CORS (handled automatically by Next.js)
 * - Error formatting
 * 
 * @route POST /api/generate
 * 
 * @example
 * ```ts
 * // Request body:
 * {
 *   model: 'gemini-3-pro-image-preview',
 *   contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
 *   apiKey: 'your-api-key'
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Builds the Vertex AI API URL for the given model.
 * 
 * @param model - The Gemini model name
 * @param apiKey - The API key for authentication
 * @returns The full API URL
 */
const buildVertexUrl = (model: string, apiKey: string) =>
  `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

/**
 * Handles POST requests to generate content using Gemini.
 * 
 * @param request - The incoming Next.js request
 * @returns JSON response with generated content or error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, contents, apiKey } = body;

    // Validate required fields
    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'API key is required' } },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: { message: 'Model name is required' } },
        { status: 400 }
      );
    }

    if (!contents) {
      return NextResponse.json(
        { error: { message: 'Contents are required' } },
        { status: 400 }
      );
    }

    const url = buildVertexUrl(model, apiKey);

    // Make request to Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          // Enable both text and image output modalities
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    const data = await response.json();

    // Forward error responses from Gemini
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { message: `HTTP ${response.status}` } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    // Handle unexpected errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
