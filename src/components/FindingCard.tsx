import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Finding, FindingSeverity, FindingStatus } from '@/types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { caseService } from '@/services/caseService';
import { useQuery } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  onEdit?: (finding: Finding) => void;
  onDelete?: (finding: Finding) => void;
}

const getSeverityBadgeVariant = (severity: FindingSeverity) => {
  switch (severity) {
    case 'info': return 'outline';
    case 'low': return 'secondary';
    case 'medium': return 'default';
    case 'high': return 'destructive';
    default: return 'outline';
  }
};

const getStatusBadgeVariant = (status: FindingStatus) => {
  switch (status) {
    case 'open': return 'destructive';
    case 'in_progress': return 'secondary';
    case 'closed': return 'default';
    default: return 'outline';
  }
};

const FindingCard: React.FC<FindingCardProps> = ({ finding, onEdit, onDelete }) => {
  const { data: caseItem } = useQuery({
    queryKey: ['case', finding.caseId],
    queryFn: () => caseService.getCaseById(finding.caseId),
    staleTime: Infinity,
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{finding.title}</CardTitle>
            <CardDescription>
              Caso: <Link to={`/cases/${finding.caseId}`} className="text-blue-500 hover:underline">{caseItem?.title || 'Cargando...'}</Link>
            </CardDescription>
          </div>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && <DropdownMenuItem onClick={() => onEdit(finding)}>Editar</DropdownMenuItem>}
                {onDelete && <DropdownMenuItem onClick={() => onDelete(finding)} className="text-red-600">Eliminar</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant={getSeverityBadgeVariant(finding.severity)}>
            {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
          </Badge>
          <Badge variant={getStatusBadgeVariant(finding.status)}>
            {finding.status.replace('_', ' ').charAt(0).toUpperCase() + finding.status.replace('_', ' ').slice(1)}
          </Badge>
        </div>
        {finding.evidenceIds && finding.evidenceIds.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">Evidencias asociadas:</p>
            <div className="flex flex-wrap gap-1">
              {finding.evidenceIds.map((id) => (
                <Badge key={id} variant="outline" className="text-xs">{id.substring(0,8)}...</Badge>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Última actualización: {format(finding.updatedAt, 'dd/MM/yyyy HH:mm')}
        </p>
      </CardContent>
    </Card>
  );
};

export default FindingCard;