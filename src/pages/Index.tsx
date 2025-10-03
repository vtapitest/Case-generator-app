import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { caseService } from "@/services/caseService";
import { findingService } from "@/services/findingService";
import { AuditLog } from "@/types";
import { auditLogService } from "@/services/auditLogService";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { sourceService } from "@/services/sourceService";
import { evidenceService } from "@/services/evidenceService";

const Index = () => {
  const [caseCount, setCaseCount] = useState(0);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [findingCount, setFindingCount] = useState(0);
  const [openFindingCount, setOpenFindingCount] = useState(0);
  const [sourceCount, setSourceCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const cases = await caseService.getAllCases();
      setCaseCount(cases.length);

      const evidence = await evidenceService.getAllEvidence();
      setEvidenceCount(evidence.length);

      const findings = await findingService.getAllFindings();
      setFindingCount(findings.length);
      setOpenFindingCount(findings.filter(f => f.status === 'open').length);

      const sources = await sourceService.getAllSources();
      setSourceCount(sources.length);

      const logs = await auditLogService.getLogs(20); // Aumentado para mostrar más actividad
      setRecentLogs(logs);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto p-4 flex-grow">
        <h1 className="text-4xl font-bold mb-8 text-center">Case Manager</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Casos</CardTitle>
              <Link to="/cases" className="text-blue-500 hover:underline text-xs">Ver todos</Link>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{caseCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Evidencias</CardTitle>
              <Link to="/evidence" className="text-blue-500 hover:underline text-xs">Ver todas</Link>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{evidenceCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hallazgos</CardTitle>
              <Link to="/findings" className="text-blue-500 hover:underline text-xs">Ver todos</Link>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{findingCount}</div>
              <p className="text-xs text-muted-foreground">{openFindingCount} abiertos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground">No hay actividad reciente.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center space-x-3">
                    <div className="text-sm text-muted-foreground">{format(log.ts, 'HH:mm')}</div>
                    <div className="font-medium">{log.action}</div>
                    <div className="text-sm text-muted-foreground truncate">{JSON.stringify(log.payload)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Empieza a recopilar y organizar tus hallazgos.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/cases">
              <Button size="lg">Ver Casos</Button>
            </Link>
            <Link to="/settings">
              <Button size="lg" variant="outline">Ajustes</Button>
            </Link>
          </div>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;