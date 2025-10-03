import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Source, SourceCredibility } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SourceCardProps {
  source: Source;
  onEdit: (source: Source) => void;
  onDelete: (source: Source) => void;
}

const getCredibilityBadgeVariant = (credibility?: SourceCredibility) => {
  switch (credibility) {
    case 0: return 'destructive';
    case 1: return 'outline';
    case 2: return 'secondary';
    case 3: return 'default';
    default: return 'outline';
  }
};

const SourceCard: React.FC<SourceCardProps> = ({ source, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate" title={source.name}>
            {source.name || `Fuente ${source.id.substring(0, 8)}`}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(source)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(source)} className="text-red-600">Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="truncate" title={source.ref}>
          {source.ref || 'Sin referencia'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {source.type.charAt(0).toUpperCase() + source.type.slice(1)}
            </Badge>
            {source.credibility !== undefined && (
              <Badge variant={getCredibilityBadgeVariant(source.credibility)}>
                Cred: {source.credibility}
              </Badge>
            )}
          </div>
          {source.enabled ? (
            <div className="flex items-center text-green-600 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Habilitada
            </div>
          ) : (
            <div className="flex items-center text-red-600 text-xs">
              <XCircle className="h-3 w-3 mr-1" /> Deshabilitada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceCard;