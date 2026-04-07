import React, { useState, useRef } from 'react';
import { TemplateField, UserContent } from '../types';
import { Sparkles, Image as ImageIcon, Type, List, Upload, FileText, AlertCircle, Info, MessageSquarePlus } from 'lucide-react';
import { extractContentFromDocs } from '../services/geminiService';

interface ContentInputProps {
  placeholders: TemplateField[];
  onSubmit: (content: UserContent, instructions: string, originalContext?: File | string) => void;
  isGenerating: boolean;
}

const ContentInput: React.FC<ContentInputProps> = ({ placeholders, onSubmit, isGenerating }) => {
  const [formData, setFormData] = useState<UserContent>({});
  const [generationInstructions, setGenerationInstructions] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file); // Store file for context passing
      setIsExtracting(true);
      setExtractError(null);
      
      try {
        const extractedData = await extractContentFromDocs(file, placeholders, additionalInfo);
        
        // Merge extracted data, preserving existing user edits if extraction was partial, 
        // or overwriting if found.
        setFormData(prev => ({
          ...prev,
          ...extractedData
        }));
      } catch (error: any) {
        setExtractError(error.message || "Failed to extract content.");
      } finally {
        setIsExtracting(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, generationInstructions, uploadedFile || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="mb-8 pb-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Customize Content</h2>
              <p className="text-slate-500 text-sm">
                Fill in the fields below manually, or upload a document (PDF, Word, Text) to auto-fill. 
                When uploading a PDF, we will attempt to preserve fonts, colors, and styling as HTML.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Auto-Fill Options
                </h3>
                
                <div className="space-y-2">
                    <label className="text-xs text-slate-600 font-medium block">
                        Extraction Hints (Optional):
                    </label>
                    <textarea 
                        className="w-full md:w-64 p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-16"
                        placeholder="E.g. Focus on the second page..."
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                    />
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden" 
                />
                
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting || isGenerating}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm shadow-sm w-full"
                >
                    {isExtracting ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    {isExtracting ? 'Analyzing...' : uploadedFile ? 'Document Uploaded' : 'Upload Document'}
                </button>
                
                {extractError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{extractError}</span>
                    </div>
                )}
                {uploadedFile && !extractError && (
                   <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{uploadedFile.name}</span>
                   </div>
                )}
            </div>
          </div>
        </div>

        {/* AI Instructions Section */}
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                Additional AI Design Instructions (Optional)
            </label>
            <p className="text-xs text-indigo-600/80 mb-3">
                Tell the AI how to style the email during generation.
            </p>
            <textarea
                className="w-full p-3 rounded-md border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 bg-white"
                rows={2}
                placeholder="E.g., 'Make the tone very professional', 'Change the background to light blue', 'Ensure the CTA button is large and red'..."
                value={generationInstructions}
                onChange={(e) => setGenerationInstructions(e.target.value)}
            />
        </div>

        <div className="grid gap-6">
          {placeholders.map((field) => (
            <div key={field.key} className="space-y-2 group">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                {field.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-500" />}
                {field.type === 'text' && <Type className="w-4 h-4 text-blue-500" />}
                {field.type === 'list' && <List className="w-4 h-4 text-orange-500" />}
                {field.label}
              </label>
              
              {field.type === 'textarea' || field.type === 'list' ? (
                <div className="relative">
                    <textarea
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-700 min-h-[100px] font-mono text-sm"
                    placeholder={field.type === 'list' ? "Enter items separated by commas or new lines..." : `Enter content for ${field.label}...`}
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                    {/* Helper hint for HTML content */}
                    {typeof formData[field.key] === 'string' && (formData[field.key] as string).includes('<') && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase tracking-wider border border-yellow-200 pointer-events-none">
                            HTML Detected
                        </div>
                    )}
                </div>
              ) : (
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-700"
                  placeholder={field.type === 'image' ? "https://example.com/image.jpg" : `Enter ${field.label}...`}
                  value={(formData[field.key] as string) || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
              {field.description && (
                <p className="text-xs text-slate-400">{field.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || isExtracting}
            className={`flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all ${
              isGenerating || isExtracting ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Generating Email...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Final Email
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ContentInput;