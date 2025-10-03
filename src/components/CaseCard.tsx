import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Case, CaseStatus } from '@/types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface CaseCardProps {
  caseItem: Case;
}

const getStatusBadgeVariant = (status: CaseStatus) => {
  switch (status) {
    case 'open': return 'default';
    case 'closed': return 'secondary';
    case 'sealed': return 'destructive';
    default: return 'outline';
  }
};

const CaseCard: React.FC<CaseCardProps> = ({ caseItem }) => {
  return (
    <Link to={`/cases/${caseItem.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {caseItem.title}
            <Badge variant={getStatusBadgeVariant(caseItem.status)} className="ml-2">
              {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
            </Badge>
          </CardTitle>
          <CardDescription>
            ID: {caseItem.id.substring(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {caseItem.tags && caseItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {caseItem.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Última actualización: {format(caseItem.updatedAt, 'dd/MM/yyyy HH:mm')}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CaseCard;