import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { observableService } from '@/services/observableService';
import { Observable } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';

const getThreatLevelVariant = (level: Observable['threatLevel']) => {
  switch (level) {
    case 'malicious': return 'destructive';
    case 'suspicious': return 'default';
    case 'benign': return 'secondary';
    default: return 'outline';
  }
};

const Observables: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: observables, isLoading, error } = useQuery<Observable[]>({
    queryKey: ['observables'],
    queryFn: observableService.getAllObservables,
  });

  const deleteMutation = useMutation({
    mutationFn: observableService.deleteObservable,
    onSuccess: () => {
      toast.success("Observable eliminado.");
      queryClient.invalidateQueries({ queryKey: ['observables'] });
    },
    onError: (err) => {
      toast.error(`Error al eliminar el observable: ${err.message}`);
    },
  });

  const filteredObservables = observables?.filter(obs =>
    (obs.obs_value && obs.obs_value.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (obs.type && obs.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Cargando observables...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error al cargar observables: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Observables (IOCs)</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por valor o tipo..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nivel Amenaza</TableHead>
              <TableHead>Casos</TableHead>
              <TableHead>Evidencias</TableHead>
              <TableHead>Última vez visto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredObservables && filteredObservables.length > 0 ? (
              filteredObservables.map((obs: any) => (
                <TableRow key={obs.id}>
                  <TableCell className="font-mono break-all max-w-xs">{obs.obs_value}</TableCell>
                  <TableCell><Badge variant="outline">{obs.type}</Badge></TableCell>
                  <TableCell><Badge variant={getThreatLevelVariant(obs.threatLevel)}>{obs.threatLevel}</Badge></TableCell>
                  <TableCell className="text-center">
                    {obs.relatedCases && obs.relatedCases.length > 0 ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto">
                            <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                              {obs.casesCount}
                            </Badge>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="break-all">Casos relacionados con "{obs.obs_value}"</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 py-4">
                            {obs.relatedCases.map((c: {id: string, title: string}) => (
                              <Link
                                key={c.id}
                                to={`/cases/${c.id}`}
                                className="block p-2 rounded-md hover:bg-accent"
                              >
                                {c.title}
                              </Link>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Badge variant="secondary">{obs.casesCount}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{obs.evidencesCount}</TableCell>
                  <TableCell>{format(obs.lastSeen, 'dd/MM/yy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(obs.id)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">No se encontraron observables.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Observables;