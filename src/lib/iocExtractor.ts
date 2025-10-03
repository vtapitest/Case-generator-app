import { ObservableThreatType } from '@/types';

interface FoundIoc {
  value: string;
  type: ObservableThreatType;
}

// Expresiones regulares para detectar diferentes tipos de IOCs
const iocPatterns: { type: ObservableThreatType; regex: RegExp }[] = [
  { type: 'ip', regex: /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g },
  { type: 'domain', regex: /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g },
  { type: 'url', regex: /\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g },
  { type: 'md5', regex: /\b[a-fA-F0-9]{32}\b/g },
  { type: 'sha256', regex: /\b[a-fA-F0-9]{64}\b/g },
  { type: 'sender', regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g }, // Reutilizamos para emails
];

// IPs privadas que queremos ignorar
const privateIpPatterns = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
];

export const extractIocs = (text: string): FoundIoc[] => {
  const found = new Map<string, ObservableThreatType>();

  for (const { type, regex } of iocPatterns) {
    const matches = text.match(regex) || [];
    for (let value of matches) {
      value = value.toLowerCase();
      
      // Ignorar IPs privadas
      if (type === 'ip' && privateIpPatterns.some(p => p.test(value))) {
        continue;
      }

      // Evitar que un hash sea detectado como dominio, etc.
      if (!found.has(value)) {
        found.set(value, type);
      }
    }
  }

  // Post-procesamiento para refinar tipos (ej: una URL contiene un dominio)
  const results: FoundIoc[] = [];
  found.forEach((type, value) => {
    if (type === 'domain') {
      // Si ya existe como parte de una URL, no lo añadimos como dominio suelto
      let partOfUrl = false;
      found.forEach((otherType, otherValue) => {
        if (otherType === 'url' && otherValue.includes(value)) {
          partOfUrl = true;
        }
      });
      if (!partOfUrl) {
        results.push({ value, type });
      }
    } else {
      results.push({ value, type });
    }
  });

  return results;
};