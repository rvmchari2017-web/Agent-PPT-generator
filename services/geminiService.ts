import { GoogleGenAI, Type } from "@google/genai";
import { Slide, TextStyle, Background } from '../types';

// A service to interact with the Gemini API for content and image generation.
class GeminiService {
  private ai: GoogleGenAI | null = null;
  
  constructor() {
    // Safely initialize GoogleGenAI client only if the API key is available in the environment.
    // This check prevents a ReferenceError in browser environments where `process` is not defined.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  // Generates presentation slides based on a topic and slide count
  async generatePresentationSlides(topic: string, slideCount: number): Promise<Partial<Slide>[]> {
    // Return mock data if API key is not available (for development)
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for presentation generation.");
      return this.getMockSlides(topic, slideCount);
    }

    // Define the expected JSON schema for the API response
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "content"],
      },
    };

    // Prompt for the Gemini model
    //const prompt = `Create a presentation about "${topic}". Generate content for ${slideCount} slides. Provide a title and a few bullet points for each slide. The first slide should be a title slide.`;
    
      const prompt = `
      You are an expert presentation content creator. Based on the following description, create a professional-level presentation with ${slideCount} slides. Each slide must include:

      1. A clear, concise title.
      2. 3–5 key bullet points summarizing the main ideas.
      3. Logical flow across slides (Introduction → Problem → Solution → Use Cases → Benefits → Conclusion).

      Analyze the description and:
      - Understand the core topic, purpose, and audience.
      - Identify usage, use cases, and benefits.
      - Organize content into a structured presentation format.
      - Suggest where visuals (charts, diagrams, infographics) could enhance clarity.

      DESCRIPTION: """${topic}"""
      `;

    try {
      // Call the Gemini API to generate content
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      // Parse the JSON response
      const jsonResponse = JSON.parse(response.text);
      if (Array.isArray(jsonResponse)) {
        return jsonResponse;
      }
      return [];
    } catch (error) {
      console.error("Error generating presentation content:", error);
      // Fallback to mock data on API error
      return this.getMockSlides(topic, slideCount);
    }
  }

  // Generates presentation slides based on provided text
  async generateSlidesFromText(text: string, slideCount: number): Promise<Partial<Slide>[]> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for presentation generation from text.");
      return this.getMockSlidesFromText(text, slideCount);
    }
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "content"],
      },
    };
    //const prompt = `Based on the following text, create a presentation with ${slideCount} slides. Each slide needs a concise title and a few key bullet points summarizing the information. Structure the content logically across the slides.  TEXT: """${text}"""`;
    
    const prompt = `
      You are an expert presentation content creator. Based on the following text, create a presentation with ${slideCount} slides. Each slide must have:

      1. A concise, professional title.
      2. 3–5 key bullet points summarizing the information clearly.
      3. Logical flow across slides (Introduction → Problem → Solution → Use Cases → Benefits → Conclusion).

      Analyze the text and:
      - Identify its core topic and purpose.
      - Extract usage, use cases, and benefits.
      - Organize content into a structured presentation format.
      - Suggest where visuals (charts, diagrams, infographics) could enhance clarity.

      TEXT: """${text}"""
      `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      const jsonResponse = JSON.parse(response.text);
      if (Array.isArray(jsonResponse)) {
        return jsonResponse;
      }
      return [];
    } catch (error) {
      console.error("Error generating presentation from text:", error);
      return this.getMockSlidesFromText(text, slideCount);
    }
  }


  // Generates an image based on a text prompt
  async generateImage(prompt: string): Promise<string> {
    // Use a placeholder image if API key is not available
    if (!this.ai) {
        console.warn("API_KEY not found. Using mock data for image generation.");
        return `https://picsum.photos/seed/${prompt.replace(/\s/g, '')}/1280/720`;
    }

    try {
        // Call the Gemini image generation model
        const response = await this.ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A professional, minimalist, and visually appealing presentation background image for a slide about: "${prompt}"`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });

        // Return the base64 encoded image string
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        // Fallback to a placeholder on error
        return `https://picsum.photos/seed/${prompt.replace(/\s/g, '')}/1280/720`;
    }
  }

  // Provides mock slide data for development and testing
  private getMockSlides(topic: string, slideCount: number): Partial<Slide>[] {
    const slides: Partial<Slide>[] = [
      { title: `Introduction to ${topic}`, content: ['By SlideForge AI', 'An AI-powered presentation'] }
    ];
    for (let i = 2; i <= slideCount; i++) {
      slides.push({
        title: `Topic ${i-1} of ${topic}`,
        content: [
          `This is bullet point 1 for slide ${i}.`,
          `This is bullet point 2 discussing a key aspect.`,
          `And a final concluding point for this slide.`,
        ],
      });
    }
    return slides;
  }
  
  // Provides mock slide data from text for development and testing
  private getMockSlidesFromText(text: string, slideCount: number): Partial<Slide>[] {
    const slides: Partial<Slide>[] = [
      { title: 'Summary of Your Text', content: ['Based on the content you provided.', `First few words: "${text.substring(0, 30)}..."`] }
    ];
    for (let i = 2; i <= slideCount; i++) {
      slides.push({
        title: `Key Point ${i - 1}`,
        content: [
          `This slide discusses a key point from the text.`,
          `Further details and analysis would go here.`,
        ],
      });
    }
    return slides;
  }
}

export const geminiService = new GeminiService();