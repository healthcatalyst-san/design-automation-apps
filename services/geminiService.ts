import { MasterTemplateResponse, TemplateField, UserContent } from "../types";

// Helper to convert File to Base64 Part for the backend
const fileToPart = async (file: File) => {
  if (file.type === 'text/plain' || file.type === 'text/html') {
    return { text: await file.text() };
  } else {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    };
  }
};

export const generateMasterTemplate = async (files: File[]): Promise<MasterTemplateResponse> => {
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const fileContents: string[] = [];

  for (const file of sortedFiles) {
    const text = await file.text();
    fileContents.push(text);
  }

  try {
    const res = await fetch('/api/gemini/generateMasterTemplate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileContents })
    });

    if (!res.ok) {
      throw new Error(`Failed to generate master template: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error generating master template:", error);
    throw error;
  }
};

export const generateFinalEmail = async (masterTemplate: string, userContent: any, instructions?: string): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/generateFinalEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterTemplate, userContent, instructions })
    });

    if (!res.ok) {
      throw new Error(`Failed to generate final email: ${res.statusText}`);
    }

    const html = await res.text();
    return html;
  } catch (error) {
    console.error("Error generating final email:", error);
    throw error;
  }
};

export const refineEmail = async (currentHtml: string, instructions: string, context?: File | string): Promise<string> => {
  let contextPart = null;
  if (context) {
    if (context instanceof File) {
      contextPart = await fileToPart(context);
    } else {
      contextPart = { text: `ORIGINAL CONTEXT:\n${context}` };
    }
  }

  try {
    const res = await fetch('/api/gemini/refineEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentHtml, instructions, contextPart })
    });

    if (!res.ok) {
      throw new Error(`Failed to refine email: ${res.statusText}`);
    }

    const html = await res.text();
    return html;
  } catch (error) {
    console.error("Error refining email:", error);
    throw error;
  }
};

export const extractContentFromDocs = async (file: File, placeholders: TemplateField[], additionalInstructions?: string): Promise<UserContent> => {
  try {
    const filePart = await fileToPart(file);

    const res = await fetch('/api/gemini/extractContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePart, placeholders, additionalInstructions })
    });

    if (!res.ok) {
      throw new Error(`Failed to extract content: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error extracting content:", error);
    throw new Error("Failed to extract content from file. Ensure the file type is supported and try again.");
  }
};