import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Trash2, ScanLine } from 'lucide-react';
import { Evidence, EvidenceType, EvidenceVerdict, Finding, EvidenceFile, Observable, ObservableThreatLevel, ObservableThreatType, Source } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import EncryptedNote from './EncryptedNote';
import { findingService } from '@/services/findingService';
import { sourceService } from '@/services/sourceService';
import FileUpload from './ui/FileUpload';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { extractIocs } from '@/lib/iocExtractor';
import { toast } from 'sonner';

const evidenceSchema = z.object({
  title: z.string().min(1, { message: 'El título es obligatorio.' }),
  type: z.enum(['log', 'url', 'ip', 'domain', 'email', 'file', 'script', 'text', 'otro'], { message: 'El tipo es obligatorio.' }),
  content: z.string().min(1, { message: 'El contenido de la evidencia es obligatorio.' }),
  observationTs: z.number(),
  source: z.string().min(1, { message: 'La fuente es obligatoria.' }),
  descriptionEnc: z.string().optional(),
  tags: z.string().optional(),
  verdict: z.enum(['pendiente', 'relevante', 'descartada']),
  findingId: z.string().optional(),
});

type ObservableFormData = {
  threatValue: string;
  threatType: ObservableThreatType;
  threatLevel: ObservableThreatLevel;
  source: string;
  firstSeen: number;
  lastSeen: number;
};

interface EvidenceFormProps {
  initialData?: Evidence;
  caseId: string;
  onSubmit: (data: Omit<Evidence, 'id' | 'importedBy' | 'importedAt'> & { observables: ObservableFormData[] }) => void;
  onCancel?: () => void;
}

const EvidenceForm: React.FC<EvidenceFormProps> = ({ initialData, caseId, onSubmit, onCancel }) => {
  const [files, setFiles] = useState<EvidenceFile[]>(initialData?.files || []);
  const [observables, setObservables] = useState<ObservableFormData[]>([]);

  const { data: caseFindings = [] } = useQuery<Finding[]>({
    queryKey: ['findings', caseId],
    queryFn: () => findingService.getFindingsByCaseId(caseId),
    enabled: !!caseId,
  });

  const { data: sources = [] } = useQuery<Source[]>({
    queryKey: ['sources'],
    queryFn: () => sourceService.getAllSources(),
  });

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      title: initialData?.title || '',
      type: initialData?.type || 'text',
      content: initialData?.content || '',
      observationTs: initialData?.observationTs || Date.now(),
      source: initialData?.source || 'manual',
      descriptionEnc: initialData?.descriptionEnc || '',
      tags: initialData?.tags?.join(', ') || '',
      verdict: initialData?.verdict || 'pendiente',
      findingId: initialData?.findingId || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      setFiles(initialData.files || []);
      // Nota: La edición de observables existentes no está implementada en este formulario.
      // Al editar una evidencia, se pueden añadir nuevos observables, pero no modificar los antiguos.
    }
  }, [initialData]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const selectedDate = watch('observationTs') ? new Date(watch('observationTs')) : new Date();

  useEffect(() => {
    const newHashObservables: ObservableFormData[] = [];
    const existingObservableValues = new Set(observables.map(obs => obs.threatValue));

    files.forEach(file => {
      if (!file.mime.startsWith('image/') && !existingObservableValues.has(file.sha256)) {
        newHashObservables.push({
          threatValue: file.sha256,
          threatType: 'sha256',
          threatLevel: 'suspicious',
          source: watch('source'),
          firstSeen: watch('observationTs'),
          lastSeen: watch('observationTs'),
        });
      }
    });

    if (newHashObservables.length > 0) {
      setObservables(prev => [...prev, ...newHashObservables]);
      toast.info(`${newHashObservables.length} hash(es) de archivo añadidos como observables.`);
    }
  }, [files, watch]);

  const handleAnalyzeContent = () => {
    const content = watch('content');
    if (!content) {
      toast.warning("El campo de contenido está vacío.");
      return;
    }

    const foundIocs = extractIocs(content);
    const existingValues = new Set(observables.map(obs => obs.threatValue));
    
    const newObservables: ObservableFormData[] = foundIocs
      .filter(ioc => !existingValues.has(ioc.value))
      .map(ioc => ({
        threatValue: ioc.value,
        threatType: ioc.type,
        threatLevel: 'suspicious' as ObservableThreatLevel,
        source: watch('source'),
        firstSeen: watch('observationTs'),
        lastSeen: watch('observationTs'),
      }));

    if (newObservables.length > 0) {
      setObservables(prev => [...prev, ...newObservables]);
      toast.success(`${newObservables.length} nuevo(s) observable(s) sugerido(s).`);
    } else {
      toast.info("No se encontraron nuevos observables en el contenido.");
    }
  };

  const handleAddObservable = () => {
    setObservables([...observables, {
      threatLevel: 'suspicious',
      threatType: 'hostname',
      threatValue: '',
      source: watch('source'),
      firstSeen: watch('observationTs'),
      lastSeen: watch('observationTs'),
    }]);
  };

  const handleObservableChange = (index: number, field: keyof ObservableFormData, value: any) => {
    const newObservables = [...observables];
    (newObservables[index] as any)[field] = value;
    setObservables(newObservables);
  };

  const handleRemoveObservable = (index: number) => {
    setObservables(observables.filter((_, i) => i !== index));
  };

  const onSubmitHandler = (data: z.infer<typeof evidenceSchema>) => {
    const submissionData = {
      caseId,
      title: data.title,
      type: data.type,
      content: data.content,
      observationTs: data.observationTs,
      source: data.source,
      descriptionEnc: data.descriptionEnc,
      tags: data.tags ? data.tags.split(', ').filter(Boolean) : [],
      verdict: data.verdict,
      files: files,
      findingId: !data.findingId || data.findingId === 'none' ? null : data.findingId,
      observables: observables.filter(obs => obs.threatValue.trim() !== ''), // Enviar solo observables con valor
    };
    onSubmit(submissionData as any);
  };

  const enabledSources = sources.filter(s => s.enabled);

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-4">
      
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" {...register('title')} placeholder="Ej: Logs de acceso del servidor web" />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label htmlFor="content">Contenido de la Evidencia</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAnalyzeContent}>
            <ScanLine className="mr-2 h-4 w-4" /> Analizar Contenido
          </Button>
        </div>
        <Textarea id="content" {...register('content')} placeholder="Pega aquí el contenido: logs, URL, IP, texto..." className="min-h-[100px] font-mono" />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipo de Evidencia</Label>
          <Select onValueChange={(value: EvidenceType) => setValue('type', value)} defaultValue={watch('type')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['log', 'url', 'ip', 'domain', 'email', 'file', 'script', 'text', 'otro'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fecha/Hora de Observación</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !watch('observationTs') && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('observationTs') ? format(selectedDate, "PPP HH:mm:ss") : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setValue('observationTs', date.getTime())} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <EncryptedNote value={watch('descriptionEnc')} onChange={(val) => setValue('descriptionEnc', val)} label="Descripción / Notas Adicionales" id="evidence-description" />
      <FileUpload onFilesChange={setFiles} initialFiles={files} />

      {/* SECCIÓN DE OBSERVABLES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Observables (IOCs)</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={handleAddObservable}><PlusCircle className="mr-2 h-4 w-4" /> Añadir IOC</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {observables.length === 0 && <p className="text-sm text-muted-foreground text-center">No se han añadido observables para esta evidencia.</p>}
          {observables.map((obs, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end border p-3 rounded-md relative">
              <div className="md:col-span-2">
                <Label>Threat Value</Label>
                <Input value={obs.threatValue} onChange={(e) => handleObservableChange(index, 'threatValue', e.target.value)} placeholder="ej: 1.2.3.4, evil.com..." />
              </div>
              <div>
                <Label>Threat Type</Label>
                <Select value={obs.threatType} onValueChange={(val: ObservableThreatType) => handleObservableChange(index, 'threatType', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['hostname', 'url', 'md5', 'sha256', 'header', 'subject', 'sender', 'ip', 'domain'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Threat Level</Label>
                <Select value={obs.threatLevel} onValueChange={(val: ObservableThreatLevel) => handleObservableChange(index, 'threatLevel', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['benign', 'suspicious', 'malicious'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" size="icon" variant="ghost" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => handleRemoveObservable(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="source">Fuente de Evidencia</Label>
          <Select
            onValueChange={(value) => setValue('source', value)}
            defaultValue={watch('source')}
          >
            <SelectTrigger id="source">
              <SelectValue placeholder="Selecciona una fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              {enabledSources.map((s) => (
                <SelectItem key={s.id} value={s.name!}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.source && <p className="text-red-500 text-sm mt-1">{errors.source.message}</p>}
        </div>
        <div>
          <Label htmlFor="verdict">Veredicto</Label>
          <Select onValueChange={(value: EvidenceVerdict) => setValue('verdict', value)} defaultValue={watch('verdict')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="relevante">Relevante</SelectItem>
              <SelectItem value="descartada">Descartada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="findingId">Hallazgo Asociado (Opcional)</Label>
          <Select
            onValueChange={(value) => setValue('findingId', value === 'none' ? '' : value)}
            defaultValue={watch('findingId') || 'none'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Asociar a un hallazgo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguno</SelectItem>
              {caseFindings.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit">{initialData ? 'Actualizar Evidencia' : 'Crear Evidencia'}</Button>
      </div>
    </form>
  );
};

export default EvidenceForm;