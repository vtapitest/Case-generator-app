import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Evidence, EvidenceVerdict } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { caseService } from '@/services/caseService';
import { Link } from 'react-router-dom';

interface EvidenceCardProps {
  evidence: Evidence;
  onEdit: (evidence: Evidence) => void;
  onDelete: (evidence: Evidence) => void;
}

const getVerdictBadgeVariant = (verdict: EvidenceVerdict) => {
  switch (verdict) {
    case 'relevante': return 'default';
    case 'descartada': return 'destructive';
    case 'pendiente': return 'secondary';
    default: return 'outline';
  }
};

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, onEdit, onDelete }) => {
  const { data: caseItem } = useQuery({
    queryKey: ['case', evidence.caseId],
    queryFn: () => caseService.getCaseById(evidence.caseId),
    staleTime: Infinity,
  });

  return (
    <Card className="hover:shadow-lg transition-shadow relative flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate" title={evidence.title}>
            {evidence.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(evidence)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(evidence)} className="text-red-600">Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          {format(evidence.observationTs, 'dd/MM/yyyy HH:mm:ss')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow flex flex-col">
        <p className="text-sm font-mono bg-muted p-2 rounded-md flex-grow break-all overflow-hidden">
          {evidence.content.substring(0, 150)}{evidence.content.length > 150 && '...'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1)}
          </Badge>
          <Badge variant={getVerdictBadgeVariant(evidence.verdict)}>
            {evidence.verdict.charAt(0).toUpperCase() + evidence.verdict.slice(1)}
          </Badge>
          {evidence.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
        </div>
        
        {evidence.files.length > 0 && (
          <div className="text-sm text-muted-foreground flex items-center">
            <FileText className="h-4 w-4 mr-2" /> {evidence.files.length} archivo(s) adjunto(s)
          </div>
        )}

        <div className="space-y-1 pt-2">
          {caseItem && (
            <p className="text-xs text-muted-foreground">
              Caso: <Link to={`/cases/${caseItem.id}`} className="text-blue-500 hover:underline">{caseItem.title}</Link>
            </p>
          )}
          <p className="text-xs text-muted-foreground">Fuente: {evidence.source}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvidenceCard;