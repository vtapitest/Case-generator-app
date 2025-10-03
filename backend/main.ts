import { Application, Router, helpers, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

const app = new Application();
const router = new Router();
const PORT = 3001;

// --- Middleware principal para CORS y manejo de errores ---
app.use(async (ctx, next) => {
  try {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (ctx.request.method === "OPTIONS") {
      ctx.response.status = 204;
      return;
    }
    await next();
  } catch (err) {
    console.error(`[uncaught application error]: ${err.message}`);
    console.error(err.stack);
    ctx.response.status = err.status || 500;
    ctx.response.body = { message: err.message || "Internal Server Error" };
  }
});

// --- Configuración de la Base de Datos ---
const db = new DB("osint_database.db");
db.execute("PRAGMA journal_mode = WAL;");
db.execute("PRAGMA foreign_keys = ON;");

// --- Auto-migración de Schema ---
const checkAndMigrateSchema = () => {
  try {
    const columns = db.queryEntries("PRAGMA table_info(observables);");
    const hasNewObsValueColumn = columns.some(col => col.name === 'obs_value');

    if (columns.length > 0 && !hasNewObsValueColumn) {
      console.log("Old database schema detected. Automatically resetting all tables...");
      const tables = ["cases", "evidence", "findings", "sources", "audit_logs", "observables", "evidence_observables"];
      tables.forEach(table => {
        try {
          db.execute(`DROP TABLE IF EXISTS ${table}`);
          console.log(`Dropped table: ${table}`);
        } catch (e) {
          console.error(`Failed to drop table ${table}:`, e);
        }
      });
      console.log("Automatic schema reset complete. Tables will be recreated now.");
    }
  } catch (e) {
    console.log("Schema check failed (likely first run), proceeding with table creation.");
  }
};

checkAndMigrateSchema();

// --- Creación de Tablas ---
db.execute(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, tags TEXT,
    createdAt INTEGER, updatedAt INTEGER, closedAt INTEGER,
    summaryEnc TEXT, notesEnc TEXT, relatedCaseIds TEXT
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY, caseId TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL,
    content TEXT NOT NULL, descriptionEnc TEXT, observationTs INTEGER NOT NULL,
    source TEXT NOT NULL, tags TEXT, verdict TEXT NOT NULL, files TEXT NOT NULL,
    findingId TEXT, importedBy TEXT NOT NULL, importedAt INTEGER NOT NULL,
    FOREIGN KEY (caseId) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (findingId) REFERENCES findings(id) ON DELETE SET NULL
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY, caseId TEXT NOT NULL, title TEXT NOT NULL,
    descriptionEnc TEXT, status TEXT NOT NULL, severity TEXT NOT NULL,
    evidenceIds TEXT, tags TEXT, createdAt INTEGER, updatedAt INTEGER,
    FOREIGN KEY (caseId) REFERENCES cases(id) ON DELETE CASCADE
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, ref TEXT, credibility INTEGER, name TEXT, enabled INTEGER
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, ts INTEGER, action TEXT, actor TEXT, payload TEXT, caseId TEXT
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS observables (
    id TEXT PRIMARY KEY,
    obs_value TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    threatLevel TEXT NOT NULL,
    source TEXT,
    firstSeen INTEGER,
    lastSeen INTEGER,
    createdAt INTEGER,
    casesCount INTEGER DEFAULT 0,
    evidencesCount INTEGER DEFAULT 0
  );
`);
db.execute(`
  CREATE TABLE IF NOT EXISTS evidence_observables (
    evidenceId TEXT NOT NULL,
    observableId TEXT NOT NULL,
    PRIMARY KEY (evidenceId, observableId),
    FOREIGN KEY (evidenceId) REFERENCES evidence(id) ON DELETE CASCADE,
    FOREIGN KEY (observableId) REFERENCES observables(id) ON DELETE CASCADE
  );
`);

// --- Helpers ---
const parseArray = (text: any) => text ? (text as string).split(',').filter(Boolean) : [];
const joinArray = (arr: any) => Array.isArray(arr) ? arr.join(',') : '';
const parseJSON = (json: any) => json ? JSON.parse(json as string) : undefined;
const stringifyJSON = (obj: any) => obj ? JSON.stringify(obj) : undefined;
const toBool = (val: any) => val === 1 || val === true;
const fromBool = (val: any) => (val === true || val === 1) ? 1 : 0;

function createAuditLog(action: string, payload: any) {
  try {
    db.query(
      "INSERT INTO audit_logs (id, ts, action, actor, payload, caseId) VALUES (?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), Date.now(), action, 'local', JSON.stringify(payload), payload.caseId || null]
    );
  } catch (e) { console.error("Failed to create audit log:", e); }
}

const caseToClient = (row: any) => ({ ...row, tags: parseArray(row.tags), relatedCaseIds: parseArray(row.relatedCaseIds) });
const caseToDB = (body: any) => ({ ...body, tags: joinArray(body.tags), relatedCaseIds: joinArray(body.relatedCaseIds) });
const evidenceToClient = (row: any) => ({ ...row, files: parseJSON(row.files), tags: parseArray(row.tags) });
const evidenceToDB = (body: any) => ({ ...body, files: stringifyJSON(body.files), tags: joinArray(body.tags) });
const findingToClient = (row: any) => ({ ...row, evidenceIds: parseArray(row.evidenceIds), tags: parseArray(row.tags) });
const findingToDB = (body: any) => ({ ...body, evidenceIds: joinArray(body.evidenceIds), tags: joinArray(body.tags) });
const sourceToClient = (row: any) => ({ ...row, enabled: toBool(row.enabled) });
const sourceToDB = (body: any) => ({ ...body, enabled: fromBool(body.enabled) });

// --- Lógica de Observables ---
function updateObservableCounts(observableId: string) {
  const [[evidencesCount]] = db.query<[number]>("SELECT COUNT(*) FROM evidence_observables WHERE observableId = ?", [observableId]);
  const [[casesCount]] = db.query<[number]>(`
    SELECT COUNT(DISTINCT e.caseId) 
    FROM evidence_observables eo 
    JOIN evidence e ON eo.evidenceId = e.id 
    WHERE eo.observableId = ?
  `, [observableId]);
  
  db.query("UPDATE observables SET evidencesCount = ?, casesCount = ? WHERE id = ?", [evidencesCount, casesCount, observableId]);
}

function processObservables(evidenceId: string, caseId: string, observables: any[]) {
  if (!observables || !Array.isArray(observables)) return;

  for (const obs of observables) {
    const obsValue = obs.threatValue;
    const obsType = obs.threatType;
    const obsLevel = obs.threatLevel;

    if (!obsValue) continue;

    let [existingObs] = db.queryEntries("SELECT * FROM observables WHERE obs_value = ?", [obsValue]);
    let observableId;

    if (existingObs) {
      observableId = existingObs.id;
      db.query("UPDATE observables SET lastSeen = ?, threatLevel = ? WHERE id = ?", [Date.now(), obsLevel, observableId]);
    } else {
      observableId = crypto.randomUUID();
      const now = Date.now();
      db.query(
        "INSERT INTO observables (id, obs_value, type, threatLevel, source, firstSeen, lastSeen, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [observableId, obsValue, obsType, obsLevel, obs.source, now, now, now]
      );
      createAuditLog('create:observable', { id: observableId, obs_value: obsValue });
    }

    db.query("INSERT OR IGNORE INTO evidence_observables (evidenceId, observableId) VALUES (?, ?)", [evidenceId, observableId]);
    updateObservableCounts(observableId);
  }
}

// --- API Routes ---
router
  // Cases
  .get("/api/cases", (ctx) => {
    const rows = db.queryEntries("SELECT * FROM cases ORDER BY updatedAt DESC");
    ctx.response.body = rows.map(caseToClient);
  })
  .get("/api/cases/:id", (ctx) => {
    const [row] = db.queryEntries("SELECT * FROM cases WHERE id = ?", [ctx.params.id]);
    if (row) ctx.response.body = caseToClient(row);
    else { ctx.response.status = 404; ctx.response.body = { message: "Case not found" }; }
  })
  .post("/api/cases", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const dbReady = caseToDB(body);
    const newCase = { id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(), ...dbReady };
    db.query("INSERT INTO cases (id, title, status, tags, createdAt, updatedAt, closedAt, summaryEnc, notesEnc, relatedCaseIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newCase.id, newCase.title, newCase.status, newCase.tags, newCase.createdAt, newCase.updatedAt, newCase.closedAt, newCase.summaryEnc, newCase.notesEnc, newCase.relatedCaseIds]);
    createAuditLog('create:case', newCase);
    ctx.response.status = 201; ctx.response.body = caseToClient(newCase);
  })
  .put("/api/cases/:id", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const dbReady = caseToDB(body);
    const updatedAt = Date.now();
    db.query("UPDATE cases SET title=?, status=?, tags=?, closedAt=?, summaryEnc=?, notesEnc=?, relatedCaseIds=?, updatedAt=? WHERE id=?", [dbReady.title, dbReady.status, dbReady.tags, dbReady.closedAt, dbReady.summaryEnc, dbReady.notesEnc, dbReady.relatedCaseIds, updatedAt, ctx.params.id]);
    createAuditLog('update:case', { id: ctx.params.id, ...dbReady });
    ctx.response.status = 200; ctx.response.body = { id: ctx.params.id, ...body, updatedAt };
  })
  .delete("/api/cases/:id", (ctx) => {
    db.query("DELETE FROM cases WHERE id = ?", [ctx.params.id]);
    createAuditLog('delete:case', { id: ctx.params.id });
    ctx.response.status = 204;
  })

  // Evidence
  .get("/api/evidence", (ctx) => {
    const { caseId } = helpers.getQuery(ctx);
    const query = caseId ? "SELECT * FROM evidence WHERE caseId = ? ORDER BY observationTs DESC" : "SELECT * FROM evidence ORDER BY observationTs DESC";
    const rows = db.queryEntries(query, caseId ? [caseId] : []);
    ctx.response.body = rows.map(evidenceToClient);
  })
  .post("/api/evidence", async (ctx) => {
    const { observables, ...evidenceData } = await ctx.request.body({ type: 'json' }).value;
    const dbReady = evidenceToDB(evidenceData);
    const newEvidence = { id: crypto.randomUUID(), importedBy: 'local_user', importedAt: Date.now(), ...dbReady };
    db.query(`INSERT INTO evidence (id, caseId, type, title, content, descriptionEnc, observationTs, source, tags, verdict, files, findingId, importedBy, importedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [newEvidence.id, newEvidence.caseId, newEvidence.type, newEvidence.title, newEvidence.content, newEvidence.descriptionEnc, newEvidence.observationTs, newEvidence.source, newEvidence.tags, newEvidence.verdict, newEvidence.files, newEvidence.findingId, newEvidence.importedBy, newEvidence.importedAt]);
    createAuditLog('create:evidence', newEvidence);
    processObservables(newEvidence.id, newEvidence.caseId, observables);
    ctx.response.status = 201; ctx.response.body = evidenceToClient(newEvidence);
  })
  .put("/api/evidence/:id", async (ctx) => {
    const { observables, ...evidenceData } = await ctx.request.body({ type: 'json' }).value;
    const dbReady = evidenceToDB(evidenceData);
    const findingId = dbReady.findingId === undefined ? null : dbReady.findingId;
    db.query(`UPDATE evidence SET caseId=?, type=?, title=?, content=?, descriptionEnc=?, observationTs=?, source=?, tags=?, verdict=?, files=?, findingId=? WHERE id=?`, [dbReady.caseId, dbReady.type, dbReady.title, dbReady.content, dbReady.descriptionEnc, dbReady.observationTs, dbReady.source, dbReady.tags, dbReady.verdict, dbReady.files, findingId, ctx.params.id]);
    createAuditLog('update:evidence', { id: ctx.params.id, ...dbReady });
    processObservables(ctx.params.id, dbReady.caseId, observables);
    ctx.response.status = 200; ctx.response.body = { id: ctx.params.id, ...evidenceData };
  })
  .delete("/api/evidence/:id", (ctx) => {
    const observablesToUpdate = db.queryEntries<{ observableId: string }>("SELECT observableId FROM evidence_observables WHERE evidenceId = ?", [ctx.params.id]);
    db.query("DELETE FROM evidence WHERE id = ?", [ctx.params.id]);
    createAuditLog('delete:evidence', { id: ctx.params.id });
    observablesToUpdate.forEach(obs => {
        updateObservableCounts(obs.observableId);
    });
    ctx.response.status = 204;
  })

  // Observables
  .get("/api/observables", (ctx) => {
    const rows = db.queryEntries("SELECT * FROM observables ORDER BY lastSeen DESC");
    const enrichedRows = rows.map(obs => {
      const relatedCases = db.queryEntries(`
        SELECT DISTINCT c.id, c.title 
        FROM evidence_observables eo
        JOIN evidence e ON eo.evidenceId = e.id
        JOIN cases c ON e.caseId = c.id
        WHERE eo.observableId = ?
      `, [obs.id]);
      return { ...obs, relatedCases };
    });
    ctx.response.body = enrichedRows;
  })
  .delete("/api/observables/:id", (ctx) => {
    db.query("DELETE FROM observables WHERE id = ?", [ctx.params.id]);
    createAuditLog('delete:observable', { id: ctx.params.id });
    ctx.response.status = 204;
  })

  // Findings, Sources, Audit Logs...
  .get("/api/findings", (ctx) => {
    const { caseId } = helpers.getQuery(ctx);
    const query = caseId ? "SELECT * FROM findings WHERE caseId = ?" : "SELECT * FROM findings";
    const rows = db.queryEntries(query, caseId ? [caseId] : []);
    ctx.response.body = rows.map(findingToClient);
  })
  .post("/api/findings", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const dbReady = findingToDB(body);
    const now = Date.now();
    const newFinding = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...dbReady };
    db.query("INSERT INTO findings (id, caseId, title, descriptionEnc, status, severity, evidenceIds, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newFinding.id, newFinding.caseId, newFinding.title, newFinding.descriptionEnc, newFinding.status, newFinding.severity, newFinding.evidenceIds, newFinding.tags, newFinding.createdAt, newFinding.updatedAt]);
    createAuditLog('create:finding', newFinding);
    ctx.response.status = 201; ctx.response.body = findingToClient(newFinding);
  })
  .put("/api/findings/:id", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const dbReady = findingToDB(body);
    const updatedAt = Date.now();
    db.query("UPDATE findings SET title=?, descriptionEnc=?, status=?, severity=?, evidenceIds=?, tags=?, updatedAt=? WHERE id=?", [dbReady.title, dbReady.descriptionEnc, dbReady.status, dbReady.severity, dbReady.evidenceIds, dbReady.tags, updatedAt, ctx.params.id]);
    createAuditLog('update:finding', { id: ctx.params.id, ...dbReady });
    ctx.response.status = 200; ctx.response.body = { id: ctx.params.id, ...body, updatedAt };
  })
  .delete("/api/findings/:id", (ctx) => {
    db.query("DELETE FROM findings WHERE id = ?", [ctx.params.id]);
    createAuditLog('delete:finding', { id: ctx.params.id });
    ctx.response.status = 204;
  })
  .get("/api/sources", (ctx) => {
    const rows = db.queryEntries("SELECT * FROM sources");
    ctx.response.body = rows.map(sourceToClient);
  })
  .post("/api/sources", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const newSource = { id: crypto.randomUUID(), ...sourceToDB(body) };
    db.query("INSERT INTO sources (id, name, type, ref, credibility, enabled) VALUES (?, ?, ?, ?, ?, ?)", [newSource.id, newSource.name, newSource.type, newSource.ref, newSource.credibility, newSource.enabled]);
    createAuditLog('create:source', newSource);
    ctx.response.status = 201; ctx.response.body = sourceToClient(newSource);
  })
  .put("/api/sources/:id", async (ctx) => {
    const body = await ctx.request.body({ type: 'json' }).value;
    const dbReady = sourceToDB(body);
    db.query("UPDATE sources SET name=?, type=?, ref=?, credibility=?, enabled=? WHERE id=?", [dbReady.name, dbReady.type, dbReady.ref, dbReady.credibility, dbReady.enabled, ctx.params.id]);
    createAuditLog('update:source', { id: ctx.params.id, ...dbReady });
    ctx.response.status = 200; ctx.response.body = { id: ctx.params.id, ...body };
  })
  .delete("/api/sources/:id", (ctx) => {
    db.query("DELETE FROM sources WHERE id = ?", [ctx.params.id]);
    createAuditLog('delete:source', { id: ctx.params.id });
    ctx.response.status = 204;
  })
  .get("/api/audit-logs", (ctx) => {
    const { caseId } = helpers.getQuery(ctx);
    let query = "SELECT * FROM audit_logs ORDER BY ts DESC LIMIT 50";
    let params: any[] = [];
    if (caseId) {
      query = "SELECT * FROM audit_logs WHERE caseId = ? ORDER BY ts DESC LIMIT 50";
      params = [caseId];
    }
    const rows = db.queryEntries(query, params);
    ctx.response.body = rows.map(row => ({ ...row, payload: parseJSON(row.payload) }));
  })
  .post("/api/reset-database", (ctx) => {
    const tables = ["cases", "evidence", "findings", "sources", "audit_logs", "observables", "evidence_observables"];
    tables.forEach(table => {
      try {
        db.execute(`DROP TABLE IF EXISTS ${table}`);
      } catch (e) {
        console.error(`Failed to drop table ${table}:`, e);
      }
    });
    ctx.response.status = 200; ctx.response.body = { message: "Database has been reset. Please restart the server to apply the new schema." };
  });

// --- Configuración del Servidor ---
app.use(router.routes());
app.use(router.allowedMethods());

// --- Middleware para servir el frontend ---
app.use(async (ctx) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}/dist`,
      index: "index.html",
    });
  } catch {
    // Si el archivo no se encuentra, sirve index.html para el enrutamiento del lado del cliente (SPA)
    await send(ctx, "index.html", {
      root: `${Deno.cwd()}/dist`,
    });
  }
});

console.log(`Backend de Deno corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });

window.addEventListener("unload", () => {
  db.close();
});