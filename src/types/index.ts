// --- Casos ---
export type CaseStatus = 'open' | 'in_progress' | 'closed' | 'sealed';

export interface Case {
  id: string; // uuid
  title: string;
  status: CaseStatus;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  summaryEnc?: string;
  notesEnc?: string;
  relatedCaseIds?: string[];
}

// --- Evidencia ---
export type EvidenceType = 'log' | 'url' | 'ip' | 'domain' | 'email' | 'file' | 'script' | 'text' | 'otro';
export type EvidenceVerdict = 'pendiente' | 'relevante' | 'descartada';

export interface EvidenceFile {
  name: string;
  size: number;
  mime: string;
  sha256: string;
  content: string; // Base64 Data URL
}

export interface Evidence {
  id: string; // uuid
  caseId: string; // FK -> Case
  
  // Metadatos principales
  type: EvidenceType;
  title: string;
  content: string; // Contenido principal de la evidencia (texto, URL, etc.)
  descriptionEnc?: string;
  observationTs: number; // timestamp del evento
  source: string; // 'manual', 'EDR', etc.
  tags: string[];
  verdict: EvidenceVerdict;

  // Archivos adjuntos (opcional)
  files: EvidenceFile[];

  // Relaciones
  findingId?: string | null; // FK -> Finding

  // Auditoría (auto-capturado en backend)
  importedBy: string;
  importedAt: number;
}

// --- Hallazgos ---
export type FindingStatus = 'open' | 'in_progress' | 'closed';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high';

export interface Finding {
  id: string;
  caseId: string; // FK -> Case
  title: string;
  descriptionEnc?: string;
  status: FindingStatus;
  severity: FindingSeverity;
  
  // Relaciones
  evidenceIds: string[]; // FKs -> Evidence
  
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Fuentes ---
export type SourceType = 'manual' | 'web' | 'file' | 'edr' | 'dlp' | 'proxy' | 'siem' | 'app' | 'osint' | 'other';
export type SourceCredibility = 0 | 1 | 2 | 3;

export interface Source {
  id: string;
  type: SourceType;
  ref?: string; // URL, nombre de archivo, etc.
  credibility?: SourceCredibility;
  name?: string;
  enabled?: boolean;
}

// --- Observables (NUEVA ESTRUCTURA ÚNICA) ---
export type ObservableThreatLevel = 'benign' | 'suspicious' | 'malicious';
export type ObservableThreatType = 'hostname' | 'url' | 'md5' | 'sha256' | 'header' | 'subject' | 'sender' | 'ip' | 'domain';

export interface Observable {
  id: string; // uuid
  obs_value: string; // El IOC en sí (e.g., "8.8.8.8")
  type: ObservableThreatType;
  threatLevel: ObservableThreatLevel;
  source: string; // Primera fuente que lo vio
  firstSeen: number;
  lastSeen: number;
  createdAt: number;
  
  // Contadores para saber la relevancia
  casesCount: number;
  evidencesCount: number;
  relatedCases?: { id: string; title: string; }[];
}

// --- Auditoría ---
export type AuditAction = string;

export interface AuditLog {
  id: string;
  ts: number;
  action: AuditAction;
  actor: 'local';
  payload: any;
  caseId?: string;
}