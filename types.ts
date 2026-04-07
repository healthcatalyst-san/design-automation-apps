export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list' | 'color';
  description?: string;
}

export interface MasterTemplateResponse {
  masterTemplate: string;
  placeholders: TemplateField[];
  analysisSummary: string;
}

export interface ProcessingStatus {
  step: 'idle' | 'analyzing' | 'generating_master' | 'generating_final' | 'complete' | 'error';
  message?: string;
}

export interface UserContent {
  [key: string]: string | any[];
}
