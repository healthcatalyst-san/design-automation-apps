const path = require('path');
const fs = require('fs');
const keyPath = path.resolve(__dirname, '..', 'gen-lang-client-0524106554-aea935c988aa.json');
if (fs.existsSync(keyPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
}
const { GoogleGenAI, Type } = require('@google/genai');

const MASTER_TEMPLATE_MODEL = "gemini-3.1-pro-preview";
const FINAL_GENERATION_MODEL = "gemini-3.1-pro-preview";
const EXTRACTION_MODEL = "gemini-3.1-pro-preview";

const ai = new GoogleGenAI({
  project: 'gen-lang-client-0524106554',
  location: 'global',
  vertexai: true
});

const retryOperation = async (operation, maxRetries = 3, baseDelay = 2000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.toLowerCase().includes('quota') ||
        error?.message?.toLowerCase().includes('resource_exhausted');

      if (isRateLimit && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

module.exports = function(app) {

  app.post('/api/gemini/generateMasterTemplate', async (req, res) => {
    try {
      const { fileContents } = req.body;
      const fieldSchema = {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["text", "textarea", "image", "list", "color"] },
          description: { type: Type.STRING },
        },
        required: ["key", "label", "type"],
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          masterTemplate: { type: Type.STRING, description: "The full HTML of the master template." },
          placeholders: {
            type: Type.ARRAY,
            items: fieldSchema,
            description: "List of dynamic fields found in the templates."
          },
          analysisSummary: { type: Type.STRING, description: "A summary of the analysis, commonalities, and style differences found." },
        },
        required: ["masterTemplate", "placeholders", "analysisSummary"],
      };

      const prompt = `
      I have ${fileContents.length} HTML email templates.
      
      Your goal is to create a single "Master Email Template" that unifies these files into one reusable HTML structure.
      
      Tasks:
      1. Analyze the provided HTML contents to identify static headers, footers, and layout structures.
      2. Create the Master Template HTML using **LEGACY HTML EMAIL STANDARDS**.
         
      **CRITICAL LAYOUT RULES (STRICT FIXED WIDTH):**
      1. **FIXED WIDTH ENFORCEMENT**: 
         - The main container table must be exactly **600px** wide using the HTML attribute \`width="600"\`.
         - **PROHIBITED**: Do NOT use \`min-width\` or \`max-width\` CSS properties on any table or container. These cause issues in Outlook mobile.
         - Use a **Wrapper Table** with \`width="100%"\` and \`align="center"\` surrounding the main 600px table.
      
      2. **IMAGES**:
         - All images (\`<img>\`) MUST have \`style="width: 100%; display: block;"\`.
         - All images MUST have the HTML attribute \`width="100%"\` (relative to their parent cell) or the specific pixel width if exact sizing is needed, but CSS width must be 100%.
         - **PROHIBITED**: Do NOT use \`max-width\` on images. This causes them to shrink prematurely on mobile.
         
      3. **NO VIEWPORT META**: 
         - Do NOT include \`<meta name="viewport">\`. By omitting this, mobile devices will default to "desktop view" and shrink the 600px email to fit the screen.
      
      4. **BODY SETTINGS**: 
         - The body tag must have \`style="margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #ffffff;"\`.
         - Remove \`min-width\` from body styles.
      
      5. **INLINE CSS ONLY**: 
         - Do NOT use \`<style>\` blocks in the head. 
         - Do NOT use classes.
         - ALL styling must be in \`style="..."\` attributes on the HTML elements.
      
      6. **TABLES ONLY**: 
         - Use \`<table>\`, \`<tr>\`, \`<td>\` for ALL layout. 
         - Do NOT use \`<div>\` for layout.
         - Do NOT use semantic tags (\`<section>\`, \`<header>\`, \`<footer>\`).
         - Use legacy attributes like \`cellpadding\`, \`cellspacing\`, \`border="0"\`, \`align="center"\`, \`valign="top"\`.
      
      7. **NO MODERN CSS**: 
         - Do NOT use Flexbox (\`display: flex\`).
         - Do NOT use Grid (\`display: grid\`).

      8. **OUTLOOK VISUAL FIXES (NO WHITE LINES)**:
         - **TABLE BORDERS**: ALL \`<table>\` tags MUST include \`style="border-collapse: collapse; border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;"\`. This prevents horizontal white lines between stacked tables/rows.
         - **IMAGE GAPS**: Any \`<td>\` containing ONLY an image MUST have \`style="font-size: 0px; line-height: 0px; padding: 0;"\` to remove bottom whitespace gaps.
         - **BORDERS**: Images must have \`border="0"\` attribute and \`style="... border: 0;"\`.
         
      3. Replace dynamic content with Handlebars-style placeholders like {{headline}}, {{product_list}}, etc.
      4. Generate a list of fields (placeholders) that a user would need to fill to generate a new email from this master template.

      CONSISTENCY INSTRUCTION:
      - If you are run multiple times on the same files, you must produce the EXACT SAME structure.
    `;

      const parts = [{ text: prompt }];
      fileContents.forEach((content, idx) => {
        parts.push({ text: `--- Template ${idx + 1} Content ---\n${content}\n----------------` });
      });

      const response = await retryOperation(() => ai.models.generateContent({
        model: MASTER_TEMPLATE_MODEL,
        contents: { role: 'user', parts },
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0,
          seed: 42,
        },
      }));

      if (response.text) {
        res.json(JSON.parse(response.text));
      } else {
        res.status(500).json({ error: "No response text received from Gemini." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });


  app.post('/api/gemini/generateFinalEmail', async (req, res) => {
    try {
      const { masterTemplate, userContent, instructions } = req.body;
      const prompt = `
      You are a Legacy Email Rendering Engine.
      
      Input:
      1. A Master HTML Template with placeholders.
      2. User Content JSON object mapping keys to values.
      3. Special Design Instructions (Optional).
      
      Task:
      - Merge the User Content into the Master Template.
      - If a placeholder corresponds to a list (e.g., a product list) and the user provided an array, intelligently repeat the HTML structure for that item.
      
      **STRICT LAYOUT ENFORCEMENT:**
      - **FIXED WIDTH**: Maintain the 600px fixed width using \`width="600"\` attribute.
      - **NO MIN/MAX WIDTH**: Do NOT use \`min-width\` or \`max-width\` CSS.
      - **IMAGES**: Ensure images have \`style="width: 100%; display: block;"\`.
      - **NO TEXT INFLATION**: Keep \`-webkit-text-size-adjust: 100%\` in body styles.
      - **INLINE CSS ONLY**: Ensure ALL styles are inline.
      - **TABLES ONLY**: Use \`<table>\`, \`<tr>\`, \`<td>\` for any new structure (like lists).
      - **NO MODERN CSS**: Do NOT use \`display: flex\` or \`display: grid\`. Use table attributes for alignment.
      
      **OUTLOOK VISUAL FIXES (NO WHITE LINES):**
      - **BORDER COLLAPSE**: Use \`style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;"\` on ALL tables.
      - **IMAGE CONTAINERS**: Use \`style="font-size: 0px; line-height: 0px;"\` on \`<td>\` cells that only contain images.
      
      - If the user content contains HTML tags, insert them as-is (assuming they follow the rules), ensuring they render correctly.
      - **APPLY INSTRUCTIONS**: If special instructions are provided, modify the HTML **inline styles** to satisfy them.
      - Clean up any unused placeholders.
      - Return ONLY the raw final HTML string. Do not wrap in markdown code blocks.
    `;

      const response = await retryOperation(() => ai.models.generateContent({
        model: FINAL_GENERATION_MODEL,
        contents: {
          role: 'user',
          parts: [
            { text: prompt },
            { text: `MASTER TEMPLATE:\n${masterTemplate}` },
            { text: `USER CONTENT JSON:\n${JSON.stringify(userContent, null, 2)}` },
            { text: `SPECIAL INSTRUCTIONS:\n${instructions || "None"}` }
          ]
        },
        config: {
          responseMimeType: "text/plain", 
          temperature: 0, 
        }
      }));

      let html = response.text || "";
      html = html.replace(/^```html/, '').replace(/```$/, '').trim();
      res.send(html);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });


  app.post('/api/gemini/refineEmail', async (req, res) => {
    try {
      const { currentHtml, instructions, contextPart } = req.body;
      
      const prompt = `
        You are an expert Legacy Email Developer.
        
        Task:
        - Update the provided HTML email based on the user's instructions.
        
        **STRICT LAYOUT ENFORCEMENT:**
        - **FIXED WIDTH**: Maintain 600px width using attributes.
        - **NO MIN/MAX WIDTH**: Remove any \`min-width\` or \`max-width\` properties.
        - **IMAGES**: \`style="width: 100%; display: block;"\`.
        - **INLINE CSS ONLY**: No \`<style>\` blocks. No classes.
        - **NO MODERN CSS**: No Flexbox, No Grid.
        - **TABLES ONLY**: No \`<div>\` layouts.
        
        **OUTLOOK VISUAL FIXES (NO WHITE LINES):**
        - **BORDER COLLAPSE**: Ensure \`style="border-collapse: collapse;"\` is present on tables.
        - **IMAGE CONTAINERS**: Ensure \`style="font-size: 0px; line-height: 0px;"\` on image \`<td>\` cells.
        
        - **Refer to Context**: If original context is provided, ensure any restored text or style matches the source material accurately.
        - Return ONLY the updated HTML.
        
        User Instructions: "${instructions}"
      `;

      const parts = [
        { text: prompt },
        { text: `CURRENT HTML:\n${currentHtml}` }
      ];

      if (contextPart) {
        parts.push({ text: "SOURCE CONTEXT FOR REFERENCE:" });
        parts.push(contextPart);
      }

      const response = await retryOperation(() => ai.models.generateContent({
        model: FINAL_GENERATION_MODEL,
        contents: { role: 'user', parts },
        config: {
          responseMimeType: "text/plain", 
          temperature: 0,
        }
      }));

      let html = response.text || "";
      html = html.replace(/^```html/, '').replace(/```$/, '').trim();
      res.send(html);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });


  app.post('/api/gemini/extractContent', async (req, res) => {
    try {
      const { filePart, placeholders, additionalInstructions } = req.body;
      
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          extractedFields: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                value: { type: Type.STRING, description: "The extracted content as an HTML string with inline styles. IMPORTANT: All double quotes inside the HTML must be properly escaped for JSON." }
              },
              required: ["key", "value"]
            }
          }
        },
        required: ["extractedFields"]
      };

      const prompt = `
      Analyze the attached document to extract content for an email template.
      
      Target Fields to Extract:
      ${JSON.stringify(placeholders.map(p => ({ key: p.key, label: p.label, description: p.description })))}

      User's Additional Instructions:
      "${additionalInstructions || "None"}"

      CRITICAL INSTRUCTIONS FOR FORMATTING & LAYOUT:
      1. **SINGLE COLUMN LAYOUT ONLY**: 
         - Convert content into a single-column, vertically stacked structure.
         - NEVER align text or elements side-by-side.

      2. **STRICT TAG RULES**:
         - **Text**: Extract text into <p> tags with **inline styles**.
         - **PROHIBITED**: Do NOT use <div>, <h1>, <h2>, <h3>, etc. Do NOT use semantic tags.
         - **Tables**: Use <table> only if absolutely necessary for data, otherwise stack <p> tags.

      3. **EXACT STYLE EXTRACTION**:
         - You MUST extract the text exactly as it appears with the same background, preserving its visual styling using **inline CSS** on the <p> tags.
         - **Font Size**: Estimate in pixels (px).
         - **Font Color**: Extract hex color code.
         - **Font Weight**: Detect bold text.
         - **Font Style**: Detect italics.
         - **Text Decoration**: Detect underlines.
         - **Alignment**: Maintain text alignment.

      4. **JSON SAFETY**:
         - The values you return are HTML strings. These strings contain double quotes (e.g., style="color:red").
         - You MUST ensure these internal quotes are properly escaped so the final JSON is valid.
         - Failure to escape internal quotes will break the parser.
    `;

      const response = await retryOperation(() => ai.models.generateContent({
        model: EXTRACTION_MODEL,
        contents: {
          role: 'user',
          parts: [
            { text: prompt },
            filePart
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0,
        }
      }));

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const result = {};
        if (parsed.extractedFields && Array.isArray(parsed.extractedFields)) {
          parsed.extractedFields.forEach((field) => {
            result[field.key] = field.value;
          });
        }
        res.json(result);
      } else {
        res.json({});
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

};
