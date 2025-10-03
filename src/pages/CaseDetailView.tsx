import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Case, Finding, AuditLog, Evidence, EvidenceFile } from '@/types';
import { caseService } from '@/services/caseService';
import { findingService } from '@/services/findingService';
import { evidenceService } from '@/services/evidenceService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash, PlusCircle, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CaseForm from '@/components/CaseForm';
import FindingForm from '@/components/FindingForm';
import FindingCard from '@/components/FindingCard';
import EvidenceForm from '@/components/EvidenceForm';
import EvidenceCard from '@/components/EvidenceCard';
import { toast } from 'sonner';
import EncryptedNote from '@/components/EncryptedNote';
import { format } from 'date-fns';
import { auditLogService } from '@/services/auditLogService';
import { exportCaseToDocx, exportCaseToPdf, ExportOptions } from '@/lib/exportService';
import ExportOptionsDialog from '@/components/ExportOptionsDialog';
import { useAppStore } from '@/store';

const CaseDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [previewFile, setPreviewFile] = useState<EvidenceFile | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  
  const [isFindingFormOpen, setIsFindingFormOpen] = useState<boolean>(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [isFindingDeleteDialogOpen, setIsFindingDeleteDialogOpen] = useState<boolean>(false);
  const [findingToDelete, setFindingToDelete] = useState<Finding | null>(null);

  const [isEvidenceFormOpen, setIsEvidenceFormOpen] = useState<boolean>(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [isEvidenceDeleteDialogOpen, setIsEvidenceDeleteDialogOpen] = useState<boolean>(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<Evidence | null>(null);

  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf' | null>(null);

  const fetchCaseData = useCallback(async () => {
    if (!id) return;
    try {
      const fetchedCase = await caseService.getCaseById(id);
      if (fetchedCase) {
        setCaseItem(fetchedCase);
        const [fetchedLogs, fetchedFindings, fetchedEvidence] = await Promise.all([
          auditLogService.getLogsByCase(id),
          findingService.getFindingsByCaseId(id),
          evidenceService.getEvidenceByCaseId(id)
        ]);
        setAuditLogs(fetchedLogs);
        setFindings(fetchedFindings);
        setEvidenceItems(fetchedEvidence);
      } else {
        toast.error("Caso no encontrado.");
        navigate('/cases');
      }
    } catch (error) {
      console.error("Error fetching case data:", error);
      toast.error("Error al cargar los datos del caso.");
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCaseData();
  }, [fetchCaseData]);

  const handleUpdateCase = async (data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!id) return;
    try {
      await caseService.updateCase(id, data);
      toast.success("Caso actualizado exitosamente.");
      setIsEditDialogOpen(false);
      fetchCaseData();
    } catch (error) {
      console.error("Error updating case:", error);
      toast.error("Error al actualizar el caso.");
    }
  };

  const handleDeleteCase = async () => {
    if (!id) return;
    try {
      await caseService.deleteCase(id);
      toast.success("Caso eliminado exitosamente.");
      navigate('/cases');
    } catch (error) {
      console.error("Error deleting case:", error);
      toast.error("Error al eliminar el caso.");
    }
  };

  const executeExport = async (format: 'docx' | 'pdf', options: ExportOptions) => {
    if (!caseItem) return;

    const currentPassphrase = useAppStore.getState().passphrase;
    const needsDecryption = caseItem.summaryEnc || findings.some(f => f.descriptionEnc) || evidenceItems.some(e => e.descriptionEnc);
    
    if (needsDecryption && !currentPassphrase) {
      toast.error("Se requiere una passphrase para exportar este caso. Por favor, configúrala en Ajustes.", {
        description: "La exportación ha sido cancelada.",
      });
      return;
    }

    try {
      toast.info(`Generando reporte en formato ${format.toUpperCase()}...`);
      if (format === 'docx') {
        await exportCaseToDocx(caseItem, findings, evidenceItems, options, currentPassphrase);
      } else {
        exportCaseToPdf(caseItem, findings, evidenceItems, options, currentPassphrase);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Error al descifrar datos durante la exportación. ¿Es correcta la passphrase en Ajustes?", {
        description: "La exportación ha sido cancelada.",
      });
    }
  };

  const handleExportRequest = (format: 'docx' | 'pdf') => {
    setExportFormat(format);
    setIsExportOptionsOpen(true);
  };

  const handleContinueExport = (options: ExportOptions) => {
    setIsExportOptionsOpen(false);
    if (exportFormat) {
      executeExport(exportFormat, options);
    } else {
      toast.error("Error en la configuración de exportación.");
    }
  };

  const handleFindingFormSubmit = async (data: Omit<Finding, 'id' | 'createdAt' | 'updatedAt' | 'tags'>) => {
    if (!id) return;
    try {
      if (editingFinding) {
        await findingService.updateFinding(editingFinding.id, data);
        toast.success("Hallazgo actualizado exitosamente.");
      } else {
        await findingService.createFinding({ ...data, caseId: id, tags: [] });
        toast.success("Hallazgo creado exitosamente.");
      }
      setIsFindingFormOpen(false);
      setEditingFinding(null);
      fetchCaseData();
    } catch (error) { toast.error(`Error al ${editingFinding ? 'actualizar' : 'crear'} el hallazgo.`); }
  };
  const handleEditFinding = (finding: Finding) => { setEditingFinding(finding); setIsFindingFormOpen(true); };
  const handleDeleteFindingClick = (finding: Finding) => { setFindingToDelete(finding); setIsFindingDeleteDialogOpen(true); };
  const handleDeleteFindingConfirm = async () => {
    if (!findingToDelete) return;
    try {
      await findingService.deleteFinding(findingToDelete.id);
      toast.success("Hallazgo eliminado exitosamente.");
      fetchCaseData();
    } catch (error) { toast.error("Error al eliminar el hallazgo."); }
    finally { setIsFindingDeleteDialogOpen(false); setFindingToDelete(null); }
  };

  const handleEvidenceFormSubmit = async (data: Omit<Evidence, 'id' | 'importedBy' | 'importedAt'>) => {
    if (!id) return;
    try {
      if (editingEvidence) {
        await evidenceService.updateEvidence(editingEvidence.id, { ...data, caseId: id });
        toast.success("Evidencia actualizada exitosamente.");
      } else {
        await evidenceService.createEvidence({ ...data, caseId: id });
        toast.success("Evidencia creada exitosamente.");
      }
      setIsEvidenceFormOpen(false);
      setEditingEvidence(null);
      fetchCaseData();
    } catch (error) { toast.error(`Error al ${editingEvidence ? 'actualizar' : 'crear'} la evidencia.`); }
  };
  const handleEditEvidence = (event: Evidence) => { setEditingEvidence(event); setIsEvidenceFormOpen(true); };
  const handleDeleteEvidenceClick = (event: Evidence) => { setEvidenceToDelete(event); setIsEvidenceDeleteDialogOpen(true); };
  const handleDeleteEvidenceConfirm = async () => {
    if (!evidenceToDelete) return;
    try {
      await evidenceService.deleteEvidence(evidenceToDelete.id);
      toast.success("Evidencia eliminada exitosamente.");
      fetchCaseData();
    } catch (error) { toast.error("Error al eliminar la evidencia."); }
    finally { setIsEvidenceDeleteDialogOpen(false); setEvidenceToDelete(null); }
  };

  if (!caseItem) return <div className="container mx-auto p-4 text-center">Cargando caso...</div>;

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
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-3xl font-bold">{caseItem.title}</h1>
        <Badge variant={getStatusBadgeVariant(caseItem.status)} className="ml-2 text-base px-3 py-1">{caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}</Badge>
        <div className="ml-auto flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportRequest('docx')}>Exportar como DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportRequest('pdf')}>Exportar como PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Editar</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader><DialogTitle>Editar Caso</DialogTitle></DialogHeader>
              <CaseForm initialData={caseItem} onSubmit={handleUpdateCase} onCancel={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild><Button variant="destructive"><Trash className="mr-2 h-4 w-4" /> Eliminar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>¿Estás seguro de que quieres eliminar este caso?</DialogTitle></DialogHeader>
              <p>Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteCase}>Eliminar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="evidence">Evidencia</TabsTrigger>
          <TabsTrigger value="findings">Hallazgos</TabsTrigger>
          <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Información General del Caso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {caseItem.tags && caseItem.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Etiquetas</p>
                  <div className="flex flex-wrap gap-2 mt-1">{caseItem.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
                </div>
              )}
              <div><p className="text-sm font-medium text-muted-foreground">Creado</p><p>{format(caseItem.createdAt, 'dd/MM/yyyy HH:mm')}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Última Actualización</p><p>{format(caseItem.updatedAt, 'dd/MM/yyyy HH:mm')}</p></div>
              <EncryptedNote value={caseItem.summaryEnc} onChange={() => {}} label="Resumen" id="case-detail-summary" readOnly />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Evidencia ({evidenceItems.length})</CardTitle>
              <Dialog open={isEvidenceFormOpen} onOpenChange={(open) => { setIsEvidenceFormOpen(open); if (!open) setEditingEvidence(null); }}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Evidencia</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader><DialogTitle>{editingEvidence ? 'Editar Evidencia' : 'Añadir Nueva Evidencia'}</DialogTitle></DialogHeader>
                  <EvidenceForm initialData={editingEvidence || undefined} caseId={id!} onSubmit={handleEvidenceFormSubmit} onCancel={() => setIsEvidenceFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {evidenceItems.length === 0 ? <p className="text-muted-foreground">No hay evidencia asociada a este caso.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evidenceItems.map((event) => {
                    const imageFile = event.files.find(f => f.mime.startsWith('image/'));
                    return (
                      <div key={event.id}>
                        <EvidenceCard evidence={event} onEdit={handleEditEvidence} onDelete={handleDeleteEvidenceClick} />
                        {imageFile && (
                          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setPreviewFile(imageFile)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver Imagen
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog open={isEvidenceDeleteDialogOpen} onOpenChange={setIsEvidenceDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>¿Eliminar esta evidencia?</DialogTitle></DialogHeader>
              <p>La evidencia "{evidenceToDelete?.title}" será eliminada.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEvidenceDeleteDialogOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteEvidenceConfirm}>Eliminar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Hallazgos ({findings.length})</CardTitle>
              <Dialog open={isFindingFormOpen} onOpenChange={(open) => { setIsFindingFormOpen(open); if (!open) setEditingFinding(null); }}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Hallazgo</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader><DialogTitle>{editingFinding ? 'Editar Hallazgo' : 'Añadir Nuevo Hallazgo'}</DialogTitle></DialogHeader>
                  <FindingForm initialData={editingFinding || undefined} caseId={id} onSubmit={handleFindingFormSubmit} onCancel={() => setIsFindingFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? <p className="text-muted-foreground">No hay hallazgos asociados a este caso.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {findings.map((finding) => <FindingCard key={finding.id} finding={finding} onEdit={handleEditFinding} onDelete={handleDeleteFindingClick} />)}
                </div>
              )}
            </CardContent>
          </Card>
           <Dialog open={isFindingDeleteDialogOpen} onOpenChange={setIsFindingDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>¿Eliminar este hallazgo?</DialogTitle></DialogHeader>
              <p>El hallazgo "{findingToDelete?.title}" será eliminado.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFindingDeleteDialogOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteFindingConfirm}>Eliminar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Línea de Tiempo de Auditoría</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? <p className="text-muted-foreground">No hay registros de auditoría para este caso.</p> : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border-l-2 pl-4">
                      <p className="text-sm text-muted-foreground">{format(log.ts, 'dd/MM/yyyy HH:mm:ss')}</p>
                      <p className="font-medium">{log.action}</p>
                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-1 overflow-auto">{JSON.stringify(log.payload, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExportOptionsDialog
        open={isExportOptionsOpen}
        onOpenChange={setIsExportOptionsOpen}
        onConfirm={handleContinueExport}
      />

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <img src={previewFile?.content} alt={previewFile?.name} className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseDetailView;