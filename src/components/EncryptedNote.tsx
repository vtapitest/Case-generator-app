import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { encrypt, decrypt } from '@/lib/encryption';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EncryptedNoteProps {
  value?: string; // Cifrado si encryptionEnabled es true
  onChange: (value: string) => void; // El valor devuelto siempre será cifrado si encryptionEnabled es true
  label?: string;
  placeholder?: string;
  id?: string;
  readOnly?: boolean;
}

type DecryptionStatus = 'ok' | 'failed' | 'unencrypted' | 'no-passphrase';

const EncryptedNote: React.FC<EncryptedNoteProps> = ({
  value,
  onChange,
  label = 'Notas',
  placeholder = 'Escribe tus notas aquí...',
  id = 'encrypted-note',
  readOnly = false,
}) => {
  const { encryptionEnabled, passphrase } = useAppStore();
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isEncryptedView, setIsEncryptedView] = useState<boolean>(true);
  const [decryptionStatus, setDecryptionStatus] = useState<DecryptionStatus>('unencrypted');

  useEffect(() => {
    setIsEncryptedView(encryptionEnabled);
  }, [encryptionEnabled]);

  useEffect(() => {
    if (!encryptionEnabled || !value) {
      setDisplayValue(value || '');
      setDecryptionStatus('unencrypted');
      return;
    }

    if (!passphrase) {
      setDisplayValue('Introduce una passphrase en Ajustes para ver el contenido.');
      setDecryptionStatus('no-passphrase');
      return;
    }

    const decrypted = decrypt(value, passphrase);
    if (decrypted.startsWith('[Decryption Failed')) {
      setDisplayValue('ERROR: No se pudo descifrar. La passphrase puede ser incorrecta. Puedes sobrescribir este campo con nueva información.');
      setDecryptionStatus('failed');
    } else {
      setDisplayValue(decrypted);
      setDecryptionStatus('ok');
    }
  }, [value, encryptionEnabled, passphrase, isEncryptedView]);

  const handleToggleView = () => {
    if (!passphrase && encryptionEnabled) {
      toast.error("Por favor, establece una passphrase en Ajustes para descifrar.");
      return;
    }
    setIsEncryptedView(!isEncryptedView);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const newValue = e.target.value;
    setDisplayValue(newValue);
    if (encryptionEnabled && passphrase) {
      onChange(encrypt(newValue, passphrase));
    } else {
      onChange(newValue);
    }
  };

  const getStatusIcon = () => {
    if (!encryptionEnabled || !value) return null;

    let icon: React.ReactNode;
    let tooltipText: string;
    let colorClass: string;

    switch (decryptionStatus) {
      case 'ok':
        icon = <Unlock className="h-4 w-4" />;
        tooltipText = 'Descifrado correctamente con la passphrase actual.';
        colorClass = 'text-green-500';
        break;
      case 'failed':
        icon = <Lock className="h-4 w-4" />;
        tooltipText = 'Error de descifrado. La passphrase actual es incorrecta.';
        colorClass = 'text-red-500';
        break;
      case 'no-passphrase':
        icon = <AlertTriangle className="h-4 w-4" />;
        tooltipText = 'Se necesita una passphrase para descifrar. Configúrala en Ajustes.';
        colorClass = 'text-yellow-500';
        break;
      default:
        return null;
    }

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`ml-2 ${colorClass}`}>{icon}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderContent = () => {
    if (encryptionEnabled && isEncryptedView) {
      return (
        <div className="relative">
          <Textarea
            id={id}
            value={value || ''}
            readOnly
            className="font-mono text-muted-foreground italic"
            placeholder="Notas cifradas. Haz clic en el ojo para descifrar."
          />
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground">
            Notas cifradas. Haz clic en el ojo para descifrar.
          </div>
        </div>
      );
    }

    const isEditable = !readOnly && decryptionStatus !== 'no-passphrase';
    const textAreaClassName = decryptionStatus === 'failed' ? 'text-red-500 italic' : '';

    if (readOnly) {
      return (
        <div
          id={id}
          className={`w-full rounded-md border border-input bg-muted px-3 py-2 text-sm min-h-[100px] whitespace-pre-wrap ${textAreaClassName}`}
        >
          {displayValue || <span className="text-muted-foreground italic">{placeholder}</span>}
        </div>
      );
    }

    return (
      <Textarea
        id={id}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={!isEditable}
        className={`min-h-[100px] ${textAreaClassName}`}
      />
    );
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Label htmlFor={id}>{label}</Label>
          {getStatusIcon()}
        </div>
        {encryptionEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleView}
            type="button"
            aria-label={isEncryptedView ? "Mostrar notas descifradas" : "Ocultar notas cifradas"}
          >
            {isEncryptedView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {renderContent()}
    </div>
  );
};

export default EncryptedNote;