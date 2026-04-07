import React, { useState, useEffect, useRef } from 'react';
import { MasterTemplateResponse } from '../types';
import { CheckCircle2, Code, FileText, Download, ArrowRight, Eye, Edit3 } from 'lucide-react';

interface AnalysisViewProps {
  data: MasterTemplateResponse;
  onContinue: () => void;
  onTemplateUpdate: (newHtml: string) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onContinue, onTemplateUpdate }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([data.masterTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master_template.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
            doc.open();
            // Enhancing preview: Replace handlebar image sources with actual placeholder images
            // so the preview doesn't just show broken image icons.
            const enhancedHtml = data.masterTemplate.replace(
                /src=["']\{\{\s*([a-zA-Z0-9_]+)\s*\}\}["']/g, 
                'src="https://placehold.co/600x200/e2e8f0/64748b?text=$1"'
            ).replace(
                /src=["']\{\{([^}]+)\}\}["']/g, // Fallback for complex keys
                'src="https://placehold.co/600x200/e2e8f0/64748b?text=Image"'
            );
            
            doc.write(enhancedHtml);
            doc.close();
        }
    }
  }, [viewMode, data.masterTemplate]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Analysis Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-emerald-900">Analysis Complete</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{data.analysisSummary}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Detected Placeholders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Detected Dynamic Fields</h3>
            </div>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
              {data.placeholders.length} fields
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-3">
              {data.placeholders.map((field, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    field.type === 'image' ? 'bg-purple-500' :
                    field.type === 'list' ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-800">{`{${field.key}}`}</span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 border border-slate-200 px-1.5 rounded">{field.type}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{field.label}</p>
                    {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Master Template Preview & Code */}
        <div className="bg-slate-900 rounded-xl shadow-lg flex flex-col overflow-hidden text-slate-300 h-[600px]">
          <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
             <div className="flex bg-slate-800 rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Eye className="w-3 h-3" />
                    Visual Preview
                </button>
                <button 
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Code className="w-3 h-3" />
                    Edit Source
                </button>
             </div>
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative bg-white w-full">
             {viewMode === 'preview' ? (
                 <iframe 
                    ref={iframeRef}
                    className="w-full h-full border-none bg-white"
                    title="Master Template Preview"
                    sandbox="allow-same-origin allow-scripts"
                 />
            ) : (
                <textarea 
                    className="w-full h-full bg-slate-900 text-blue-300 font-mono text-xs p-4 outline-none resize-none border-none leading-relaxed"
                    value={data.masterTemplate}
                    onChange={(e) => onTemplateUpdate(e.target.value)}
                    spellCheck={false}
                />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onContinue}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all hover:scale-[1.02]"
        >
          Proceed to Content Generation
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;