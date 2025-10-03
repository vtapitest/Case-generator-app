import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Source, SourceType, SourceCredibility } from '@/types';
import { Switch } from '@/components/ui/switch';

const sourceSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio.' }),
  type: z.enum(['manual', 'web', 'file', 'edr', 'dlp', 'proxy', 'siem', 'app', 'osint', 'other'], { message: 'Tipo de fuente inválido.' }),
  ref: z.string().optional(),
  credibility: z.enum(['0', '1', '2', '3']).optional(),
  enabled: z.boolean().optional(),
});

interface SourceFormProps {
  initialData?: Source;
  onSubmit: (data: Omit<Source, 'id'>) => void;
  onCancel?: () => void;
}

const SourceForm: React.FC<SourceFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const form = useForm<z.infer<typeof sourceSchema>>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'manual',
      ref: initialData?.ref || '',
      credibility: initialData?.credibility?.toString() as '0' | '1' | '2' | '3' | undefined,
      enabled: initialData?.enabled ?? true,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const onSubmitHandler = (data: z.infer<typeof sourceSchema>) => {
    onSubmit({
      name: data.name,
      type: data.type,
      ref: data.ref || undefined,
      credibility: data.credibility ? parseInt(data.credibility, 10) as SourceCredibility : undefined,
      enabled: data.enabled,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre de la Fuente</Label>
        <Input id="name" {...register('name')} placeholder="Ej: Twitter Feed @usuarioX" />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="type">Tipo de Fuente</Label>
        <Select onValueChange={(value: SourceType) => setValue('type', value)} defaultValue={watch('type')}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            {['manual', 'web', 'file', 'edr', 'dlp', 'proxy', 'siem', 'app', 'osint', 'other'].map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <Label htmlFor="ref">Referencia (URL, nombre de archivo, etc.)</Label>
        <Input id="ref" {...register('ref')} placeholder="Ej: https://example.com/leak.pdf" />
        {errors.ref && <p className="text-red-500 text-sm mt-1">{errors.ref.message}</p>}
      </div>

      <div>
        <Label htmlFor="credibility">Credibilidad</Label>
        <Select onValueChange={(value: string) => setValue('credibility', value as '0' | '1' | '2' | '3')} defaultValue={watch('credibility')}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un nivel de credibilidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0 - Muy Baja</SelectItem>
            <SelectItem value="1">1 - Baja</SelectItem>
            <SelectItem value="2">2 - Media</SelectItem>
            <SelectItem value="3">3 - Alta</SelectItem>
          </SelectContent>
        </Select>
        {errors.credibility && <p className="text-red-500 text-sm mt-1">{errors.credibility.message}</p>}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label>Habilitada</Label>
          <p className="text-[0.8rem] text-muted-foreground">
            Permitir que esta fuente sea utilizada para la ingesta de datos.
          </p>
        </div>
        <Switch
          checked={watch('enabled')}
          onCheckedChange={(checked) => setValue('enabled', checked)}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit">{initialData ? 'Actualizar Fuente' : 'Crear Fuente'}</Button>
      </div>
    </form>
  );
};

export default SourceForm;