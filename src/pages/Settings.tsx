import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings: React.FC = () => {
  const { encryptionEnabled, setEncryptionEnabled, setPassphrase, logo, setLogo } = useAppStore();
  const [currentPassphrase, setCurrentPassphrase] = useState<string>('');
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassphrase(e.target.value);
  };

  const handleSavePassphrase = () => {
    if (!currentPassphrase) {
      toast.error("La passphrase no puede estar vacía.");
      return;
    }
    setPassphrase(currentPassphrase);
    toast.success("Passphrase actualizada.");
    setCurrentPassphrase('');
  };

  const handleToggleEncryption = (checked: boolean) => {
    const currentGlobalPassphrase = useAppStore.getState().passphrase;
    if (checked && !currentGlobalPassphrase) {
      toast.error("Por favor, establece una passphrase antes de activar el cifrado.");
      return;
    }
    setEncryptionEnabled(checked);
    toast.success(`Cifrado ${checked ? 'activado' : 'desactivado'}.`);
  };

  const handleResetDatabase = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/reset-database', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reset database.');
      toast.success("Base de datos reseteada. Por favor, reinicia el servidor.", {
        description: "Haz clic en el botón 'Restart' sobre el chat.",
        duration: 10000,
      });
      setIsResetAlertOpen(false);
    } catch (error) {
      console.error("Error resetting database:", error);
      toast.error("Error al resetear la base de datos.");
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        toast.success("Logo actualizado.");
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error("Por favor, selecciona un archivo de imagen válido.");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personalización</CardTitle>
          <CardDescription>Añade un logo para personalizar la aplicación y los informes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label>Logo Corporativo</Label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
              {logo ? (
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Sin logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()}>Subir Logo</Button>
              {logo && <Button variant="outline" onClick={() => setLogo(null)}>Eliminar Logo</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cifrado Local</CardTitle>
          <CardDescription>Protege tus notas sensibles con una passphrase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="encryption-toggle">Activar cifrado de notas</Label>
            <Switch id="encryption-toggle" checked={encryptionEnabled} onCheckedChange={handleToggleEncryption} />
          </div>
          <div>
            <Label htmlFor="passphrase">Nueva Passphrase</Label>
            <div className="flex gap-2">
              <Input id="passphrase" type="password" value={currentPassphrase} onChange={handlePassphraseChange} placeholder="Introduce tu nueva passphrase" />
              <Button onClick={handleSavePassphrase}>Guardar</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">La passphrase no se almacena. Se usa solo en sesión para cifrar/descifrar.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de la Base de Datos</CardTitle>
          <CardDescription>Acciones destructivas para el mantenimiento de la base de datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
            <AlertDialogTrigger asChild><Button variant="destructive">Resetear Base de Datos</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción es irreversible. Se borrarán todas las tablas de la base de datos. Es útil si hay un problema con la estructura de la base de datos (schema). Después de resetear, deberás reiniciar el servidor.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDatabase}>Sí, resetear base de datos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground mt-2">Esto borrará TODOS los datos y la estructura de la base de datos. Úsalo si la aplicación no funciona correctamente después de una actualización.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;