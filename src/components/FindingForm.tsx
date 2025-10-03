import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Finding, FindingSeverity, FindingStatus, Case, Evidence } from '@/types';
import EncryptedNote from './EncryptedNote';
import { caseService } from '@/services/caseService';
import { useQuery } from '@tanstack/react-query';
import { MultiSelect, Option } from './ui/multi-select';
import { evidenceService } from '@/services/evidenceService';
import { format } from 'date-fns';

const findingSchema = z.object({
  caseId: z.string().min(1, { message: 'El caso es obligatorio.' }),
  title: z.string().min(1, { message: 'El título es obligatorio.' }),
  descriptionEnc: z.string().optional(),
  severity: z.enum(['info', 'low', 'medium', 'high'], { message: 'Severidad inválida.' }),
  status: z.enum(['open', 'in_progress', 'closed'], { message: 'Estado inválido.' }),
});

interface FindingFormProps {
  initialData?: Finding;
  caseId?: string;
  onSubmit: (data: Omit<Finding, 'id' | 'createdAt' | 'updatedAt' | 'tags'>) => void;
  onCancel?: () => void;
}

const FindingForm: React.FC<FindingFormProps> = ({ initialData, caseId: propCaseId, onSubmit, onCancel }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(initialData?.evidenceIds || []);

  const form = useForm<z.infer<typeof findingSchema>>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      caseId: initialData?.caseId || propCaseId || '',
      title: initialData?.title || '',
      descriptionEnc: initialData?.descriptionEnc || '',
      severity: initialData?.severity || 'info',
      status: initialData?.status || 'open',
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const caseId = watch('caseId');

  const { data: caseEvidence = [] } = useQuery<Evidence[]>({
    queryKey: ['evidence', caseId],
    queryFn: () => evidenceService.getEvidenceByCaseId(caseId),
    enabled: !!caseId,
  });

  const evidenceOptions: Option[] = caseEvidence.map(e => ({ value: e.id, label: `${e.title} (${format(e.observationTs, 'P p')})` }));

  useEffect(() => {
    const fetchCases = async () => {
      const allCases = await caseService.getAllCases();
      setCases(allCases);
    };
    fetchCases();
  }, []);

  useEffect(() => {
    if (propCaseId) {
      setValue('caseId', propCaseId);
    }
  }, [propCaseId, setValue]);

  useEffect(() => {
    if (initialData) {
      setSelectedEvidenceIds(initialData.evidenceIds || []);
    }
  }, [initialData]);

  const onSubmitHandler = (data: z.infer<typeof findingSchema>) => {
    onSubmit({
      caseId: data.caseId,
      title: data.title,
      descriptionEnc: data.descriptionEnc,
      severity: data.severity,
      status: data.status,
      evidenceIds: selectedEvidenceIds,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <Label htmlFor="caseId">Caso</Label>
        <Select 
          onValueChange={(value: string) => setValue('caseId', value)} 
          defaultValue={initialData?.caseId || propCaseId || ''}
          disabled={!!propCaseId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un caso" />
          </SelectTrigger>
          <SelectContent>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} (ID: {c.id.substring(0, 8)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.caseId && <p className="text-red-500 text-sm mt-1">{errors.caseId.message}</p>}
      </div>

      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" {...register('title')} placeholder="Ej: Credenciales expuestas en Dark Web" />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <EncryptedNote
        value={watch('descriptionEnc')}
        onChange={(val) => setValue('descriptionEnc', val)}
        label="Descripción (opcionalmente cifrada)"
        id="finding-description"
      />

      <div>
        <Label htmlFor="severity">Severidad</Label>
        <Select onValueChange={(value: FindingSeverity) => setValue('severity', value)} defaultValue={initialData?.severity || 'info'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona la severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
        {errors.severity && <p className="text-red-500 text-sm mt-1">{errors.severity.message}</p>}
      </div>

      <div>
        <Label htmlFor="status">Estado</Label>
        <Select onValueChange={(value: FindingStatus) => setValue('status', value)} defaultValue={initialData?.status || 'open'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
      </div>

      <div>
        <Label>Evidencias Asociadas</Label>
        <MultiSelect
          options={evidenceOptions}
          selected={selectedEvidenceIds}
          onChange={setSelectedEvidenceIds}
          placeholder="Seleccionar evidencias..."
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit">{initialData ? 'Actualizar Hallazgo' : 'Crear Hallazgo'}</Button>
      </div>
    </form>
  );
};

export default FindingForm;