import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface ExportOptions {
  summary: boolean;
  findings: boolean;
  evidence: boolean;
}

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: ExportOptions) => void;
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({ open, onOpenChange, onConfirm }) => {
  const [options, setOptions] = useState<ExportOptions>({
    summary: true,
    findings: true,
    evidence: true,
  });

  const handleOptionChange = (key: keyof ExportOptions, checked: boolean) => {
    setOptions(prev => ({ ...prev, [key]: checked }));
  };

  const handleConfirm = () => {
    onConfirm(options);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opciones de Exportación</DialogTitle>
          <DialogDescription>
            Selecciona las secciones que quieres incluir en el reporte.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="summary"
              checked={options.summary}
              onCheckedChange={(checked) => handleOptionChange('summary', !!checked)}
            />
            <Label htmlFor="summary">Resumen del Caso</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="findings"
              checked={options.findings}
              onCheckedChange={(checked) => handleOptionChange('findings', !!checked)}
            />
            <Label htmlFor="findings">Hallazgos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="evidence"
              checked={options.evidence}
              onCheckedChange={(checked) => handleOptionChange('evidence', !!checked)}
            />
            <Label htmlFor="evidence">Evidencias</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportOptionsDialog;