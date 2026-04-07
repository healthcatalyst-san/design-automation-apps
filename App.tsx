import React, { useState } from 'react';
import { Layers, CheckCircle, Wand2, Mail, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import ContentInput from './components/ContentInput';
import FinalPreview from './components/FinalPreview';
import { generateMasterTemplate, generateFinalEmail, refineEmail } from './services/geminiService';
import { MasterTemplateResponse, ProcessingStatus, UserContent } from './types';

type ViewState = 'upload' | 'analysis' | 'result';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
  const [masterData, setMasterData] = useState<MasterTemplateResponse | null>(null);
  const [finalHtml, setFinalHtml] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [sourceContext, setSourceContext] = useState<File | string | undefined>(undefined);
  
  // New state to track the active view
  const [currentView, setCurrentView] = useState<ViewState>('upload');

  const getReadableError = (error: any): string => {
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
      return "API Rate Limit Exceeded. The system is currently busy. Please wait a moment and try again.";
    }
    return "Failed to process request. Please check your internet connection or try again.";
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    
    setStatus({ step: 'analyzing', message: 'Analyzing templates and searching for best practices...' });
    
    try {
      const response = await generateMasterTemplate(files);
      setMasterData(response);
      setStatus({ step: 'complete' }); 
      setCurrentView('analysis');
    } catch (error: any) {
      console.error(error);
      setStatus({ step: 'error', message: getReadableError(error) });
    }
  };

  const handleMasterTemplateUpdate = (newHtml: string) => {
    setMasterData(prev => prev ? { ...prev, masterTemplate: newHtml } : null);
  };

  const handleContentSubmit = async (content: UserContent, instructions: string, originalContext?: File | string) => {
    if (!masterData) return;
    
    // Save context for future refinements
    setSourceContext(originalContext);
    
    setStatus({ step: 'generating_final', message: 'Constructing final responsive email...' });
    
    try {
      const html = await generateFinalEmail(masterData.masterTemplate, content, instructions);
      setFinalHtml(html);
      setStatus({ step: 'complete' });
      setCurrentView('result');
    } catch (error: any) {
      setStatus({ step: 'error', message: getReadableError(error) });
    }
  };

  const handleRefine = async (instructions: string) => {
      if (!finalHtml) return;
      setIsRefining(true);
      try {
          // Pass the source context (if any) to the refinement service
          const newHtml = await refineEmail(finalHtml, instructions, sourceContext);
          setFinalHtml(newHtml);
      } catch (error: any) {
          console.error(error);
          alert(getReadableError(error));
      } finally {
          setIsRefining(false);
      }
  };

  const handleFinalHtmlUpdate = (newHtml: string) => {
    setFinalHtml(newHtml);
  };

  const resetFlow = () => {
    if (window.confirm("Are you sure you want to start over? All progress will be lost.")) {
      setStatus({ step: 'idle' });
      setMasterData(null);
      setFinalHtml(null);
      setIsRefining(false);
      setSourceContext(undefined);
      setCurrentView('upload');
    }
  };

  const handleNavigation = (direction: 'back' | 'forward') => {
    if (direction === 'back') {
      if (currentView === 'result') {
        setCurrentView('analysis');
      } else if (currentView === 'analysis') {
        resetFlow();
      }
    } else {
      if (currentView === 'analysis' && finalHtml) {
        setCurrentView('result');
      }
    }
  };

  // Stepper UI helper
  const steps = [
    { id: 'upload', label: 'Upload', icon: Layers },
    { id: 'analyze', label: 'Analysis', icon: Wand2 },
    { id: 'content', label: 'Content', icon: Mail },
    { id: 'done', label: 'Result', icon: CheckCircle },
  ];

  const currentStepIndex = 
    currentView === 'result' ? 3 :
    currentView === 'analysis' && status.step === 'generating_final' ? 2 :
    currentView === 'analysis' ? 2 :
    status.step === 'analyzing' ? 1 :
    0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* Navigation Controls */}
             <div className="flex items-center gap-1 mr-2 border-r border-slate-200 pr-4">
                <button 
                  onClick={() => handleNavigation('back')}
                  disabled={currentView === 'upload'}
                  className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleNavigation('forward')}
                  disabled={currentView !== 'analysis' || !finalHtml}
                  className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                  title="Go Forward"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>

            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hidden md:block">
                MasterMail AI
              </h1>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' :
                    isCompleted ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <Icon className={`w-4 h-4 ${isCompleted ? 'text-emerald-500' : ''}`} />
                    {step.label}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-8 h-px bg-slate-200 mx-1" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Error State */}
        {status.step === 'error' && (
           <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between max-w-4xl mx-auto animate-in fade-in slide-in-from-top-2">
             <div className="flex items-center gap-3">
               <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
               <span className="text-red-700 font-medium">{status.message || "An unknown error occurred."}</span>
             </div>
             <button onClick={() => setStatus({step: 'idle'})} className="text-sm font-bold text-red-700 hover:text-red-800 hover:underline px-2">Dismiss</button>
           </div>
        )}

        {/* Loading State Overlay */}
        {(status.step === 'analyzing' || status.step === 'generating_master') && (
           <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-4">
             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
             <h2 className="text-xl font-semibold text-slate-800 animate-pulse">{status.message}</h2>
             <p className="text-slate-500 mt-2 max-w-md text-center">
               Using Gemini 3 Pro to process your request. This may take a few moments.
             </p>
           </div>
        )}

        {/* Step 1: Upload (Only show if no master data, or if explicitly in upload view) */}
        {currentView === 'upload' && !status.step.includes('analyzing') && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Create Your Master Template</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload up to 5 existing HTML emails. We'll analyze them, unify their design systems, and give you a powerful master template.
              </p>
            </div>
            <FileUpload onFilesSelected={handleFilesSelected} />
            
            <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
               <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-blue-600">
                   <Layers className="w-6 h-6" />
                 </div>
                 <h3 className="font-semibold text-lg mb-2">Pattern Recognition</h3>
                 <p className="text-slate-500 text-sm">Identifies common headers, footers, and layout structures across multiple files.</p>
               </div>
               <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                 <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-purple-600">
                   <Wand2 className="w-6 h-6" />
                 </div>
                 <h3 className="font-semibold text-lg mb-2">Smart Unification</h3>
                 <p className="text-slate-500 text-sm">Merges variations into a single, robust codebase compatible with all major clients.</p>
               </div>
               <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                 <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-emerald-600">
                   <CheckCircle className="w-6 h-6" />
                 </div>
                 <h3 className="font-semibold text-lg mb-2">Dynamic Content</h3>
                 <p className="text-slate-500 text-sm">Automatically detects placeholders and generates forms for easy content entry.</p>
               </div>
            </div>
          </div>
        )}

        {/* Step 2: Analysis Result & Input (Preserve state by using hidden class) */}
        {masterData && (
          <div className={`space-y-8 ${currentView === 'analysis' ? 'block' : 'hidden'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Analysis & Master Template</h2>
            </div>
            
            {/* Split View: Analysis vs Input Form */}
            <div className="space-y-12">
               <AnalysisView 
                 data={masterData} 
                 onContinue={() => {
                   document.getElementById('content-form-section')?.scrollIntoView({ behavior: 'smooth' });
                 }} 
                 onTemplateUpdate={handleMasterTemplateUpdate}
               />
               
               <div id="content-form-section" className="border-t border-slate-200 pt-12">
                 <ContentInput 
                    placeholders={masterData.placeholders} 
                    onSubmit={handleContentSubmit} 
                    isGenerating={status.step === 'generating_final'}
                 />
               </div>
            </div>
          </div>
        )}

        {/* Step 3: Final Result (Preserve state by using hidden class) */}
        {finalHtml && (
          <div className={`h-[calc(100vh-140px)] ${currentView === 'result' ? 'block' : 'hidden'}`}>
             {status.step === 'generating_final' && (
                <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-indigo-900">Generating Email...</h3>
                    </div>
                </div>
             )}
            <FinalPreview 
                html={finalHtml} 
                onReset={resetFlow} 
                onRefine={handleRefine}
                isRefining={isRefining}
                onHtmlUpdate={handleFinalHtmlUpdate}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;