import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Search, LayoutGrid, List, MoreHorizontal } from 'lucide-react';
import { Evidence, Case, Observable, EvidenceVerdict, ObservableThreatType, ObservableThreatLevel } from '@/types';
import { evidenceService } from '@/services/evidenceService';
import { caseService } from '@/services/caseService';
import EvidenceCard from '@/components/EvidenceCard';
import EvidenceForm from '@/components/EvidenceForm';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

type ObservableFormData = {
  threatValue: string;
  threatType: ObservableThreatType;
  threatLevel: ObservableThreatLevel;
  source: string;
  firstSeen: number;
  lastSeen: number;
};

const EvidencePage: React.FC = () => {
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<Evidence | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');
  const queryClient = useQueryClient();

  const fetchData = async () => {
    try {
      const fetchedEvents = await evidenceService.getAllEvidence();
      setEvidenceItems(fetchedEvents);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar eventos de evidencia.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSubmit = async (data: Omit<Evidence, 'id' | 'importedBy' | 'importedAt'> & { observables: ObservableFormData[] }) => {
    if (!editingEvidence) return;
    try {
      await evidenceService.updateEvidence(editingEvidence.id, { ...data, caseId: editingEvidence.caseId });
      toast.success("Evidencia actualizada exitosamente.");
      queryClient.invalidateQueries({ queryKey: ['observables'] });
    } catch (error) {
      console.error("Error submitting event:", error);
      toast.error(`Error al actualizar la evidencia.`);
    } finally {
      setIsFormOpen(false);
      setEditingEvidence(null);
      fetchData();
    }
  };

  const handleEdit = (event: Evidence) => {
    setEditingEvidence(event);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (event: Evidence) => {
    setEvidenceToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (evidenceToDelete) {
      try {
        await evidenceService.deleteEvidence(evidenceToDelete.id);
        toast.success("Evidencia eliminada exitosamente.");
        queryClient.invalidateQueries({ queryKey: ['observables'] });
        fetchData();
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Error al eliminar la evidencia.");
      } finally {
        setIsDeleteDialogOpen(false);
        setEvidenceToDelete(null);
      }
    }
  };

  const filteredEvents = evidenceItems.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getVerdictBadgeVariant = (verdict: EvidenceVerdict) => {
    switch (verdict) {
      case 'relevante': return 'default';
      case 'descartada': return 'destructive';
      case 'pendiente': return 'secondary';
      default: return 'outline';
    }
  };

  const CaseTitle = ({ caseId }: { caseId: string }) => {
    const { data: caseItem } = useQuery({
      queryKey: ['case', caseId],
      queryFn: () => caseService.getCaseById(caseId),
      staleTime: Infinity,
    });
    return caseItem ? <Link to={`/cases/${caseItem.id}`} className="hover:underline">{caseItem.title}</Link> : <span>{caseId.substring(0, 8)}...</span>;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Evidencias</h1>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'card' | 'table')}>
            <ToggleGroupItem value="card" aria-label="Vista de tarjetas"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla"><List className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar evidencias por título, tipo, etiqueta..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p className="text-lg mb-4">No se encontraron evidencias.</p>
          <p>Las evidencias deben crearse desde la vista de un caso.</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EvidenceCard key={event.id} evidence={event} onEdit={handleEdit} onDelete={handleDeleteClick} />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Caso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Veredicto</TableHead>
                <TableHead>Fecha Observación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((evidence) => (
                <TableRow key={evidence.id}>
                  <TableCell className="font-medium">{evidence.title}</TableCell>
                  <TableCell><CaseTitle caseId={evidence.caseId} /></TableCell>
                  <TableCell><Badge variant="outline">{evidence.type}</Badge></TableCell>
                  <TableCell><Badge variant={getVerdictBadgeVariant(evidence.verdict)}>{evidence.verdict}</Badge></TableCell>
                  <TableCell>{format(evidence.observationTs, 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(evidence)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(evidence)} className="text-red-600">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingEvidence(null);
      }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Editar Evidencia</DialogTitle>
          </DialogHeader>
          <EvidenceForm 
            initialData={editingEvidence || undefined} 
            caseId={editingEvidence?.caseId || ''}
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres eliminar esta evidencia?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer. La evidencia "{evidenceToDelete?.title}" será eliminada.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EvidencePage;