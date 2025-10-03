import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Case, CaseStatus } from '@/types';
import EncryptedNote from './EncryptedNote';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '@/services/caseService';
import { MultiSelect, Option } from './ui/multi-select';

const caseSchema = z.object({
  title: z.string().min(1, { message: 'El título es obligatorio.' }),
  status: z.enum(['open', 'in_progress', 'closed', 'sealed'], { message: 'Estado de caso inválido.' }),
  tags: z.string().optional(),
  summaryEnc: z.string().optional(),
  notesEnc: z.string().optional(),
});

interface CaseFormProps {
  initialData?: Case;
  onSubmit: (data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
}

const CaseForm: React.FC<CaseFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [selectedRelatedCaseIds, setSelectedRelatedCaseIds] = useState<string[]>(initialData?.relatedCaseIds || []);

  const { data: allCases = [] } = useQuery<Case[]>({
    queryKey: ['allCases'],
    queryFn: () => caseService.getAllCases(),
  });

  const caseOptions: Option[] = allCases
    .filter(c => c.id !== initialData?.id) // Exclude self
    .map(c => ({ value: c.id, label: c.title }));

  const form = useForm<z.infer<typeof caseSchema>>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: initialData?.title || '',
      status: initialData?.status || 'open',
      tags: initialData?.tags?.join(', ') || '',
      summaryEnc: initialData?.summaryEnc || '',
      notesEnc: initialData?.notesEnc || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      setSelectedRelatedCaseIds(initialData.relatedCaseIds || []);
    }
  }, [initialData]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const currentTags = watch('tags');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      const existingTags = currentTags ? currentTags.split(', ').filter(Boolean) : [];
      if (!existingTags.includes(newTag)) {
        setValue('tags', [...existingTags, newTag].join(', '));
      }
      e.currentTarget.value = '';
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const existingTags = currentTags ? currentTags.split(', ').filter(Boolean) : [];
    setValue('tags', existingTags.filter(tag => tag !== tagToRemove).join(', '));
  };

  const onSubmitHandler = (data: z.infer<typeof caseSchema>) => {
    onSubmit({
      title: data.title,
      status: data.status,
      tags: data.tags ? data.tags.split(', ').filter(Boolean) : [],
      summaryEnc: data.summaryEnc,
      notesEnc: data.notesEnc,
      relatedCaseIds: selectedRelatedCaseIds,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <Label htmlFor="title">Título del Caso</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="status">Estado</Label>
        <Select onValueChange={(value: CaseStatus) => setValue('status', value)} defaultValue={initialData?.status || 'open'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            {['open', 'in_progress', 'closed', 'sealed'].map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
      </div>

      <div>
        <Label htmlFor="tags-input">Etiquetas</Label>
        <Input
          id="tags-input"
          placeholder="Añade etiquetas (pulsa Enter)"
          onKeyDown={handleAddTag}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {currentTags?.split(', ').filter(Boolean).map((tag) => (
            <Badge key={tag} className="flex items-center gap-1">
              {tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
            </Badge>
          ))}
        </div>
      </div>

      <EncryptedNote
        value={watch('summaryEnc')}
        onChange={(val) => setValue('summaryEnc', val)}
        label="Resumen (cifrado opcional)"
        id="case-summary"
      />

      <EncryptedNote
        value={watch('notesEnc')}
        onChange={(val) => setValue('notesEnc', val)}
        label="Notas Adicionales (cifrado opcional)"
        id="case-notes"
      />

      <div>
        <Label>Casos Relacionados</Label>
        <MultiSelect
          options={caseOptions}
          selected={selectedRelatedCaseIds}
          onChange={setSelectedRelatedCaseIds}
          placeholder="Seleccionar casos relacionados..."
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit">{initialData ? 'Actualizar Caso' : 'Crear Caso'}</Button>
      </div>
    </form>
  );
};

export default CaseForm;