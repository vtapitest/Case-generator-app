import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Cases from "./pages/Cases";
import CaseDetailView from "./pages/CaseDetailView";
import Settings from "./pages/Settings";
import Findings from "./pages/Findings";
import Sources from "./pages/Sources";
import EvidencePage from "./pages/EvidencePage";
import Observables from "./pages/Observables";
import { Home, Briefcase, Settings as SettingsIcon, ClipboardList, BookOpen, FileText, Eye } from "lucide-react";
import { Button } from "./components/ui/button";
import { MadeWithDyad } from "./components/made-with-dyad";
import { useAppStore } from "./store";
import { ThemeToggle } from "./components/ThemeToggle";

const queryClient = new QueryClient();

const App = () => {
  const { logo } = useAppStore();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col">
              <div className="mb-6 h-12 flex items-center">
                {logo ? (
                  <img src={logo} alt="Logo" className="max-h-12 w-auto" />
                ) : (
                  <h2 className="text-2xl font-bold text-sidebar-primary-foreground">Case Generator</h2>
                )}
              </div>
              <nav className="flex-grow">
                <ul className="space-y-2">
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/"><Home className="mr-2 h-4 w-4" /> Dashboard</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/cases"><Briefcase className="mr-2 h-4 w-4" /> Casos</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/evidence"><FileText className="mr-2 h-4 w-4" /> Evidencia</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/observables"><Eye className="mr-2 h-4 w-4" /> Observables</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/findings"><ClipboardList className="mr-2 h-4 w-4" /> Hallazgos</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/sources"><BookOpen className="mr-2 h-4 w-4" /> Fuentes</Link></Button></li>
                  <li><Button variant="ghost" className="w-full justify-start" asChild><Link to="/settings"><SettingsIcon className="mr-2 h-4 w-4" /> Ajustes</Link></Button></li>
                </ul>
              </nav>
              <div className="mb-4">
                <ThemeToggle />
              </div>
              <MadeWithDyad />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/cases/:id" element={<CaseDetailView />} />
                <Route path="/findings" element={<Findings />} />
                <Route path="/sources" element={<Sources />} />
                <Route path="/evidence" element={<EvidencePage />} />
                <Route path="/observables" element={<Observables />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;