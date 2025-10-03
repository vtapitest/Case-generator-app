import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Observable } from '@/types';
import { format } from 'date-fns';

interface ObservableCategoryProps {
  title: string;
  observables: Observable[];
}

const ObservableCategory: React.FC<ObservableCategoryProps> = ({ title, observables }) => {
  if (observables.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title} ({observables.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {observables.map((obs) => (
            <div key={obs.obs_value} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded-md hover:bg-muted">
              <p className="font-mono text-sm break-all flex-1 mb-2 sm:mb-0">{obs.obs_value}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Casos: <Badge variant="secondary">{obs.casesCount}</Badge></span>
                <span>Evidencias: <Badge variant="secondary">{obs.evidencesCount}</Badge></span>
                <span className="hidden md:inline">Visto por última vez: {format(obs.lastSeen, 'dd/MM/yy')}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ObservableCategory;