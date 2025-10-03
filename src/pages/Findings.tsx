import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Search, LayoutGrid, List, MoreHorizontal } from 'lucide-react';
import { Finding } from '@/types';
import { findingService } from '@/services/findingService';
import FindingCard from '@/components/FindingCard';
import FindingForm from '@/components/FindingForm';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '@/services/caseService';

const Findings: React.FC = () => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [findingToDelete, setFindingToDelete] = useState<Finding | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');

  const fetchFindings = async () => {
    try {
      const fetchedFindings = await findingService.getAllFindings();
      setFindings(fetchedFindings);
    } catch (error) {
      console.error("Error fetching findings:", error);
      toast.error("Error al cargar los hallazgos.");
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const handleFormSubmit = async (data: Omit<Finding, 'id' | 'createdAt' | 'updatedAt' | 'tags'>) => {
    try {
      if (editingFinding) {
        await findingService.updateFinding(editingFinding.id, data);
        toast.success("Hallazgo actualizado exitosamente.");
      }
    } catch (error) {
      console.error("Error submitting finding:", error);
      toast.error(`Error al actualizar el hallazgo.`);
    } finally {
      setIsFormOpen(false);
      setEditingFinding(null);
      fetchFindings();
    }
  };

  const handleEdit = (finding: Finding) => {
    setEditingFinding(finding);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (finding: Finding) => {
    setFindingToDelete(finding);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (findingToDelete) {
      try {
        await findingService.deleteFinding(findingToDelete.id);
        toast.success("Hallazgo eliminado exitosamente.");
        fetchFindings();
      } catch (error) {
        console.error("Error deleting finding:", error);
        toast.error("Error al eliminar el hallazgo.");
      } finally {
        setIsDeleteDialogOpen(false);
        setFindingToDelete(null);
      }
    }
  };

  const filteredFindings = findings.filter(finding =>
    finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (finding.descriptionEnc && finding.descriptionEnc.toLowerCase().includes(searchTerm.toLowerCase())) ||
    finding.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    finding.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    finding.evidenceIds.some(id => id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSeverityBadgeVariant = (severity: Finding['severity']) => {
    switch (severity) {
      case 'info': return 'outline';
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: Finding['status']) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'closed': return 'default';
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
        <h1 className="text-3xl font-bold">Hallazgos</h1>
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
          placeholder="Buscar hallazgos por título, descripción, severidad o estado..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredFindings.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p className="text-lg mb-4">No se encontraron hallazgos.</p>
          <p>Los hallazgos deben crearse desde la vista de un caso.</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFindings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} onEdit={handleEdit} onDelete={handleDeleteClick} />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Caso</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell className="font-medium">{finding.title}</TableCell>
                  <TableCell><CaseTitle caseId={finding.caseId} /></TableCell>
                  <TableCell><Badge variant={getSeverityBadgeVariant(finding.severity)}>{finding.severity}</Badge></TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(finding.status)}>{finding.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>{format(finding.updatedAt, 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(finding)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(finding)} className="text-red-600">Eliminar</DropdownMenuItem>
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
        if (!open) setEditingFinding(null);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Hallazgo</DialogTitle>
          </DialogHeader>
          <FindingForm
            initialData={editingFinding || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres eliminar este hallazgo?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer. El hallazgo "{findingToDelete?.title}" será eliminado.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Findings;