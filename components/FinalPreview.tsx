import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCcw, Wand2, Send, Loader2, Code, Eye } from 'lucide-react';

interface FinalPreviewProps {
  html: string;
  onReset: () => void;
  onRefine: (instructions: string) => Promise<void>;
  isRefining: boolean;
  onHtmlUpdate: (newHtml: string) => void;
}

const FinalPreview: React.FC<FinalPreviewProps> = ({ html, onReset, onRefine, isRefining, onHtmlUpdate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refineText, setRefineText] = useState('');
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  useEffect(() => {
    // Only update iframe if we are in preview mode
    if (viewMode === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html, viewMode]);

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'final_email.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefineSubmit = async () => {
      if (!refineText.trim() || !onRefine) return;
      await onRefine(refineText);
      setRefineText('');
      // Switch back to preview to see changes
      setViewMode('preview');
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Final Email Preview</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
             <button
               onClick={() => setViewMode('preview')}
               className={`p-2 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               title="Visual Preview"
             >
               <Eye className="w-4 h-4" />
             </button>
             <button
               onClick={() => setViewMode('code')}
               className={`p-2 rounded-md transition-colors ${viewMode === 'code' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               title="Edit Code"
             >
               <Code className="w-4 h-4" />
             </button>
          </div>

          <button
              onClick={() => setShowRefineInput(!showRefineInput)}
              className={`flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors font-medium ${showRefineInput ? 'ring-2 ring-purple-400' : ''}`}
          >
              <Wand2 className="w-4 h-4" />
              Refine with AI
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <RefreshCcw className="w-4 h-4" />
            Start Over
          </button>
          <button
            onClick={downloadHtml}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download HTML
          </button>
        </div>
      </div>

      {showRefineInput && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl shadow-sm animate-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-purple-900 mb-2">How should the AI improve this email?</label>
              <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <textarea 
                        className="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[80px] text-sm"
                        placeholder="E.g., 'Make the logo larger', 'Change the headline color to red', 'Add more padding to the footer'..."
                        rows={3}
                        value={refineText}
                        onChange={(e) => setRefineText(e.target.value)}
                        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && handleRefineSubmit()}
                    />
                    <p className="text-[10px] text-purple-400 mt-1 text-right">Press Ctrl + Enter to submit</p>
                  </div>
                  <button 
                    onClick={handleRefineSubmit}
                    disabled={isRefining || !refineText.trim()}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 h-fit mt-0.5"
                  >
                      {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Refine
                  </button>
              </div>
          </div>
      )}

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto bg-white border border-slate-200 px-3 py-1 rounded text-xs text-slate-500 w-64 text-center font-mono">
            {viewMode === 'preview' ? 'preview.html' : 'source-code.html'}
          </div>
        </div>
        <div className={`flex-1 overflow-hidden relative ${viewMode === 'preview' ? 'bg-slate-100 p-4 md:p-8' : 'bg-slate-900'}`}>
             {isRefining && (
                 <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                     <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200 flex flex-col items-center">
                         <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
                         <span className="font-semibold text-slate-700">Refining Template...</span>
                     </div>
                 </div>
             )}
             
             {viewMode === 'preview' ? (
                 <div className="w-full h-full max-w-[800px] mx-auto bg-white shadow-xl rounded-sm overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        title="Email Preview"
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin allow-scripts" 
                    />
                 </div>
             ) : (
                 <textarea 
                     className="w-full h-full bg-slate-900 text-blue-300 font-mono text-xs p-4 outline-none resize-none border-none leading-relaxed"
                     value={html}
                     onChange={(e) => onHtmlUpdate(e.target.value)}
                     spellCheck={false}
                 />
             )}
        </div>
      </div>
    </div>
  );
};

export default FinalPreview;