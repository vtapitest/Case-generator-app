import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Search, LayoutGrid, List, MoreHorizontal } from 'lucide-react';
import { Case } from '@/types';
import { caseService } from '@/services/caseService';
import CaseCard from '@/components/CaseCard';
import CaseForm from '@/components/CaseForm';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');

  const fetchCases = async () => {
    try {
      const fetchedCases = await caseService.getAllCases();
      setCases(fetchedCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast.error("Error al cargar los casos.");
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleFormSubmit = async (data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingCase) {
        await caseService.updateCase(editingCase.id, data);
        toast.success("Caso actualizado exitosamente.");
      } else {
        await caseService.createCase(data);
        toast.success("Caso creado exitosamente.");
      }
    } catch (error) {
      console.error("Error submitting case:", error);
      toast.error(`Error al ${editingCase ? 'actualizar' : 'crear'} el caso.`);
    } finally {
      setIsFormOpen(false);
      setEditingCase(null);
      fetchCases();
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (caseItem: Case) => {
    setCaseToDelete(caseItem);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (caseToDelete) {
      try {
        await caseService.deleteCase(caseToDelete.id);
        toast.success("Caso eliminado exitosamente.");
        fetchCases();
      } catch (error) {
        console.error("Error deleting case:", error);
        toast.error("Error al eliminar el caso.");
      } finally {
        setIsDeleteDialogOpen(false);
        setCaseToDelete(null);
      }
    }
  };

  const filteredCases = cases.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeVariant = (status: Case['status']) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'closed': return 'secondary';
      case 'sealed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Casos</h1>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'card' | 'table')}>
            <ToggleGroupItem value="card" aria-label="Vista de tarjetas"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla"><List className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingCase(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Caso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingCase ? 'Editar Caso' : 'Crear Nuevo Caso'}</DialogTitle>
              </DialogHeader>
              <CaseForm initialData={editingCase || undefined} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar casos por título o etiqueta..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCases.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p className="text-lg mb-4">No se encontraron casos.</p>
          <p>Crea tu primer caso para empezar a gestionar la evidencia.</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="font-medium">
                    <Link to={`/cases/${caseItem.id}`} className="hover:underline">{caseItem.title}</Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(caseItem.status)}>{caseItem.status.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <div className="flex flex-wrap gap-1">
                      {caseItem.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>{format(caseItem.updatedAt, 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(caseItem)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(caseItem)} className="text-red-600">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres eliminar este caso?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer. El caso "{caseToDelete?.title}" y todos sus datos asociados serán eliminados.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cases;