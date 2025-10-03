import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Search } from 'lucide-react';
import { Source } from '@/types';
import { sourceService } from '@/services/sourceService';
import SourceCard from '@/components/SourceCard';
import SourceForm from '@/components/SourceForm';
import { toast } from 'sonner';

const Sources: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);

  const fetchSources = async () => {
    try {
      const fetchedSources = await sourceService.getAllSources();
      setSources(fetchedSources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      toast.error("Error al cargar las fuentes.");
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleFormSubmit = async (data: Omit<Source, 'id'>) => {
    try {
      if (editingSource) {
        await sourceService.updateSource(editingSource.id, data);
        toast.success("Fuente actualizada exitosamente.");
      } else {
        await sourceService.createSource(data);
        toast.success("Fuente creada exitosamente.");
      }
    } catch (error) {
      console.error("Error submitting source:", error);
      toast.error(`Error al ${editingSource ? 'actualizar' : 'crear'} la fuente.`);
    } finally {
      setIsFormOpen(false);
      setEditingSource(null);
      fetchSources();
    }
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (source: Source) => {
    setSourceToDelete(source);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (sourceToDelete) {
      try {
        await sourceService.deleteSource(sourceToDelete.id);
        toast.success("Fuente eliminada exitosamente.");
        fetchSources();
      } catch (error) {
        console.error("Error deleting source:", error);
        toast.error("Error al eliminar la fuente.");
      } finally {
        setIsDeleteDialogOpen(false);
        setSourceToDelete(null);
      }
    }
  };

  const filteredSources = sources.filter(source =>
    source.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fuentes</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingSource(null); // Clear editing state when dialog closes
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Nueva Fuente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingSource ? 'Editar Fuente' : 'Crear Nueva Fuente'}</DialogTitle>
            </DialogHeader>
            <SourceForm 
              initialData={editingSource || undefined} 
              onSubmit={handleFormSubmit} 
              onCancel={() => setIsFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar fuentes por nombre, referencia o tipo..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredSources.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p className="text-lg mb-4">No se encontraron fuentes.</p>
          <p>Crea tu primera fuente para empezar a rastrear el origen de tu información.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => (
            <SourceCard key={source.id} source={source} onEdit={handleEdit} onDelete={handleDeleteClick} />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres eliminar esta fuente?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer. La fuente "{sourceToDelete?.name || sourceToDelete?.id}" será eliminada.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sources;