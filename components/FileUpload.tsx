import React, { useCallback, useState } from 'react';
import { Upload, FileCode, X } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'));
      const combined = [...selectedFiles, ...newFiles].slice(0, 5); // Limit to 5
      setSelectedFiles(combined);
      onFilesSelected(combined);
    }
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`border-2 border-dashed border-slate-300 rounded-xl p-8 text-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500 hover:bg-slate-50'}`}>
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".html,.htm"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center justify-center ${disabled ? 'pointer-events-none' : ''}`}>
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <Upload className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Email Templates</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            Select up to 5 HTML files to analyze. We'll identify common patterns and generate a master template.
          </p>
          <span className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-colors">
            Select Files
          </span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-6 grid gap-3">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Selected Files ({selectedFiles.length})</h4>
          {selectedFiles.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileCode className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700 font-medium truncate">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
