import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import FileTree from "./components/FileTree";
import Editor from "./components/Editor";
import KanbanBoard from "./components/KanbanBoard";
import CommandPalette from "./components/CommandPalette";
import Outline from "./components/Outline";
import SettingsPanel from "./components/SettingsPanel";
import { listFiles, readFile, saveFile, getConfig, saveConfig, renameFile, deleteFile, searchDocs } from "./api";
import type { EditorConfig } from "./types";
import type { editor } from "monaco-editor";

type Status = { msg: string; ok: boolean };

function parseBreadcrumbs(path: string): Array<{ label: string; filePath: string; isCurrent: boolean }> {
  const parts = path.split("/");
  const result: Array<{ label: string; filePath: string; isCurrent: boolean }> = [];
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const part = parts[i];
    if (isLast) {
      const nameWithoutMd = part.replace(/\.md$/, "");
      if (i > 0 && nameWithoutMd === parts[i - 1]) {
        // Index file — the folder crumb is already in result; just mark it current
        if (result.length > 0) result[result.length - 1].isCurrent = true;
      } else {
        result.push({ label: nameWithoutMd, filePath: path, isCurrent: true });
      }
    } else {
      const contentPath = [...parts.slice(0, i + 1), parts[i] + ".md"].join("/");
      result.push({ label: part, filePath: contentPath, isCurrent: false });
    }
  }
  return result;
}

// ── Frontmatter helpers ───────────────────────────────────────────────────────

const DEFAULT_PROJECT_COLUMNS = ["Backlog", "En progreso", "En revisión", "Hecho"];
const PROJECT_FOLDERS_KEY = "davemd_project_folders";

function parseFrontmatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const result: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      result[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      result[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

function setFrontmatterField(content: string, key: string, value: unknown): string {
  const valStr = Array.isArray(value)
    ? `[${(value as string[]).map((s) => `"${s}"`).join(", ")}]`
    : String(value);
  const fmRegex = /^(---\s*\n)([\s\S]*?)(\n---)/;
  const m = content.match(fmRegex);
  if (!m) return `---\n${key}: ${valStr}\n---\n${content}`;
  const lineRegex = new RegExp(`^${key}:.*$`, "m");
  const newLine = `${key}: ${valStr}`;
  const newFm = lineRegex.test(m[2]) ? m[2].replace(lineRegex, newLine) : `${m[2]}\n${newLine}`;
  return content.replace(fmRegex, `$1${newFm}$3`);
}

function loadProjectFolders(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PROJECT_FOLDERS_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function persistProjectFolders(folders: Set<string>) {
  localStorage.setItem(PROJECT_FOLDERS_KEY, JSON.stringify([...folders]));
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectFolders, setProjectFolders] = useState<Set<string>>(loadProjectFolders);
  const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestContentRef = useRef(content);
  const latestActiveFileRef = useRef(activeFile);
  latestContentRef.current = content;
  latestActiveFileRef.current = activeFile;

  const projectInfo = useMemo(() => {
    if (!activeFile) return null;
    const fm = parseFrontmatter(content);
    if (fm.type !== "project") return null;
    const projectPath = activeFile.split("/").slice(0, -1).join("/");
    const columns = (Array.isArray(fm.columns) ? fm.columns : DEFAULT_PROJECT_COLUMNS) as string[];
    return { projectPath, columns };
  }, [activeFile, content]);

  function addProjectFolder(folderPath: string) {
    setProjectFolders((prev) => {
      const next = new Set([...prev, folderPath]);
      persistProjectFolders(next);
      return next;
    });
  }

  function removeProjectFolder(folderPath: string) {
    setProjectFolders((prev) => {
      const next = new Set([...prev]);
      next.delete(folderPath);
      persistProjectFolders(next);
      return next;
    });
  }

  useEffect(() => {
    listFiles().then(setFiles).catch(() => setStatus({ msg: "No se pudo conectar al backend", ok: false }));
    getConfig().then(setConfig).catch(() => setStatus({ msg: "No se pudo cargar la configuración", ok: false }));
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsaved) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "\\" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
      if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleSelect(filename: string) {
    clearTimeout(saveTimerRef.current);
    setUnsaved(false);
    setLoading(true);
    try {
      const text = await readFile(filename);
      setActiveFile(filename);
      setContent(text);
      // Detect project type on load and persist the folder
      const fm = parseFrontmatter(text);
      if (fm.type === "project") {
        const folderPath = filename.split("/").slice(0, -1).join("/");
        if (folderPath) addProjectFolder(folderPath);
      }
    } catch {
      setStatus({ msg: "Error al leer el archivo", ok: false });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    clearTimeout(saveTimerRef.current);
    try {
      await saveFile(activeFile, content);
      setUnsaved(false);
      setStatus({ msg: `Guardado`, ok: true });
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al guardar", ok: false });
    } finally {
      setTimeout(() => setStatus(null), 2000);
    }
  }, [activeFile, content]);

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setUnsaved(true);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const file = latestActiveFileRef.current;
      const text = latestContentRef.current;
      if (!file) return;
      saveFile(file, text)
        .then(() => setUnsaved(false))
        .catch(() => {/* silent — user can Ctrl+S to retry */});
    }, 1500);
  }, []);

  // ── Project handlers ──────────────────────────────────────────────────────

  async function handleNewProject(parentPath: string | null, name: string) {
    const safeName = name.replace(/\.md$/, "").trim();
    const folderPath = parentPath ? `${parentPath}/${safeName}` : safeName;
    const indexPath = `${folderPath}/${safeName}.md`;
    const cols = DEFAULT_PROJECT_COLUMNS;
    const projectContent = `---\ntype: project\ncolumns: [${cols.map((c) => `"${c}"`).join(", ")}]\n---\n# ${safeName}\n`;
    try {
      await saveFile(indexPath, projectContent);
      const updated = await listFiles();
      setFiles(updated);
      addProjectFolder(folderPath);
      handleSelect(indexPath);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al crear proyecto", ok: false });
    }
  }

  async function handleCreateTask(column: string, taskName: string) {
    if (!projectInfo) return;
    const safeName = taskName.replace(/\.md$/, "").trim();
    const path = `${projectInfo.projectPath}/${column}/${safeName}.md`;
    try {
      await saveFile(path, `# ${safeName}\n\n`);
      const updated = await listFiles();
      setFiles(updated);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al crear tarea", ok: false });
    }
  }

  async function handleMoveTask(taskPath: string, toColumn: string) {
    if (!projectInfo) return;
    const parts = taskPath.split("/");
    const taskName = parts[parts.length - 1];
    const newPath = `${projectInfo.projectPath}/${toColumn}/${taskName}`;
    if (taskPath === newPath) return;
    try {
      const updated = await renameFile(taskPath, newPath);
      setFiles(updated);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al mover tarea", ok: false });
    }
  }

  async function handleDeleteTask(path: string) {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    try {
      const updated = await deleteFile(path);
      setFiles(updated);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al eliminar tarea", ok: false });
      setTimeout(() => setStatus(null), 2500);
    }
  }

  async function handleAddColumn(name: string) {
    if (!activeFile || !projectInfo) return;
    const newColumns = [...projectInfo.columns, name];
    const newContent = setFrontmatterField(content, "columns", newColumns);
    setContent(newContent);
    try {
      await saveFile(activeFile, newContent);
    } catch { /* ignore */ }
  }

  async function handleDeleteColumn(colName: string) {
    if (!activeFile || !projectInfo) return;
    if (!window.confirm(`¿Eliminar columna "${colName}" y todas sus tareas?`)) return;
    const colPath = `${projectInfo.projectPath}/${colName}`;
    try {
      // Delete the folder (and all tasks inside it) — backend handles directories
      await deleteFile(colPath).catch(() => { /* column folder may not exist if empty */ });
    } catch { /* ignore */ }
    const newColumns = projectInfo.columns.filter((c) => c !== colName);
    const newContent = setFrontmatterField(content, "columns", newColumns);
    setContent(newContent);
    try {
      await saveFile(activeFile, newContent);
      const updated = await listFiles();
      setFiles(updated);
    } catch { /* ignore */ }
  }

  // ── Document handlers ─────────────────────────────────────────────────────

  async function handleNewFile(parentPath: string | null, name: string) {
    // Every document is created as name/name.md (folder + same-name file).
    // This lets any document become a container for sub-documents.
    const safeName = name.replace(/\.md$/, "").trim();
    const folderPath = parentPath ? `${parentPath}/${safeName}` : safeName;
    const fullPath = `${folderPath}/${safeName}.md`;
    try {
      await saveFile(fullPath, `# ${safeName}\n\nEscribe aquí...\n`);
      const updated = await listFiles();
      setFiles(updated);
      handleSelect(fullPath);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al crear", ok: false });
    }
  }

  async function handleRename(oldPath: string, newName: string) {
    const parts = oldPath.split("/");
    const isFile = parts[parts.length - 1].endsWith(".md");
    parts[parts.length - 1] = isFile
      ? (newName.endsWith(".md") ? newName : `${newName}.md`)
      : newName;
    const newPath = parts.join("/");
    try {
      const updated = await renameFile(oldPath, newPath);
      setFiles(updated);
      if (activeFile === oldPath) setActiveFile(newPath);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al renombrar", ok: false });
      setTimeout(() => setStatus(null), 2500);
    }
  }

  async function handleMove(fromPath: string, toFolderPath: string | null) {
    const name = fromPath.split("/").pop()!;
    const newPath = toFolderPath ? `${toFolderPath}/${name}` : name;
    if (fromPath === newPath) return;
    if (toFolderPath && (toFolderPath === fromPath || toFolderPath.startsWith(fromPath + "/"))) return;
    try {
      let currentFiles = files;
      let currentActive = activeFile;

      // toFolderPath may correspond to a leaf file (e.g. "ejemplo" for "ejemplo.md").
      // If so, convert it to a section (name/name.md) before moving the dragged item inside.
      if (toFolderPath) {
        const hasChildren = currentFiles.some(f => f.startsWith(toFolderPath + "/"));
        const leafFile = toFolderPath + ".md";
        const leafExists = currentFiles.includes(leafFile);
        if (!hasChildren && leafExists && leafFile !== fromPath) {
          const sectionName = toFolderPath.split("/").pop()!;
          const sectionIndex = `${toFolderPath}/${sectionName}.md`;
          const afterSection = await renameFile(leafFile, sectionIndex);
          currentFiles = afterSection;
          setFiles(afterSection);
          if (currentActive === leafFile) {
            currentActive = sectionIndex;
            setActiveFile(sectionIndex);
          }
        }
      }

      const updated = await renameFile(fromPath, newPath);
      setFiles(updated);
      if (currentActive) {
        if (currentActive === fromPath) setActiveFile(newPath);
        else if (currentActive.startsWith(fromPath + "/"))
          setActiveFile(newPath + currentActive.slice(fromPath.length));
      }
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al mover", ok: false });
      setTimeout(() => setStatus(null), 2500);
    }
  }

  async function handleDelete(path: string, kind: "file" | "folder") {
    const label = kind === "folder" ? "carpeta" : "archivo";
    if (!window.confirm(`¿Eliminar ${label} "${path}"?`)) return;
    try {
      const updated = await deleteFile(path);
      setFiles(updated);
      const prefix = path + "/";
      if (activeFile === path || (kind === "folder" && activeFile?.startsWith(prefix))) {
        setActiveFile(null);
        setContent("");
      }
      if (kind === "folder") removeProjectFolder(path);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al eliminar", ok: false });
      setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1e1e1e", overflow: "hidden" }}>
      <div style={{
        width: sidebarOpen ? 240 : 0,
        transition: "width 200ms ease",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <FileTree
          files={files}
          active={activeFile}
          onSelect={handleSelect}
          onNewFile={handleNewFile}
          onNewProject={handleNewProject}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
          projectFolders={projectFolders}
        />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          padding: "8px 16px",
          borderBottom: "1px solid #2d2d2d",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#252526",
          color: "#ccc",
          fontSize: 13,
        }}>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title="Toggle sidebar (Ctrl+\)"
            style={{
              background: "none", border: "none", color: "#666",
              cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1, flexShrink: 0,
            }}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            {loading ? "Cargando..." : !activeFile ? "Selecciona un archivo" : (
              parseBreadcrumbs(activeFile).map((crumb, i, arr) => (
                <span key={crumb.filePath + i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ color: "#555", userSelect: "none" }}>›</span>}
                  <span
                    onClick={() => !crumb.isCurrent && handleSelect(crumb.filePath)}
                    style={{
                      color: crumb.isCurrent ? "#ddd" : "#888",
                      cursor: crumb.isCurrent ? "default" : "pointer",
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={crumb.filePath}
                  >
                    {crumb.label}
                  </span>
                </span>
              ))
            )}
            {unsaved && (
              <span title="Cambios sin guardar" style={{ color: "#e8a020", fontSize: 18, lineHeight: 1, marginLeft: 4 }}>●</span>
            )}
          </span>
          {activeFile && !projectInfo && (() => {
            const words = content.split(/\s+/).filter(Boolean).length;
            const mins = Math.max(1, Math.ceil(words / 200));
            return (
              <span style={{ color: "#555", fontSize: 11, whiteSpace: "nowrap" }}>
                {words} pal · {mins} min
              </span>
            );
          })()}
          {activeFile && projectInfo && (
            <span style={{ color: "#555", fontSize: 11, whiteSpace: "nowrap" }}>
              📋 Proyecto
            </span>
          )}
          {status && (
            <span style={{ color: status.ok ? "#4ec9b0" : "#f48771", fontSize: 12 }}>{status.msg}</span>
          )}
          {activeFile && !projectInfo && (
            <button
              onClick={() => setPreviewMode((p) => !p)}
              title={previewMode ? "Editar" : "Vista previa"}
              style={{
                background: previewMode ? "#3d3d3d" : "none",
                border: "1px solid #3d3d3d", color: "#888",
                borderRadius: 4, cursor: "pointer",
                padding: "2px 8px", fontSize: 12, flexShrink: 0,
              }}
            >
              {previewMode ? "</>" : "👁"}
            </button>
          )}
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            title="Configuración"
            style={{
              background: settingsOpen ? "#3d3d3d" : "none",
              border: "1px solid #3d3d3d", color: "#888",
              borderRadius: 4, cursor: "pointer",
              padding: "2px 8px", fontSize: 14, flexShrink: 0, lineHeight: 1,
            }}
          >
            ⚙
          </button>
        </div>

        {/* Editor / Preview / Kanban */}
        {activeFile && !loading && config ? (
          projectInfo ? (
            <KanbanBoard
              projectPath={projectInfo.projectPath}
              columns={projectInfo.columns}
              files={files}
              onSelectTask={handleSelect}
              onCreateTask={handleCreateTask}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          ) : previewMode ? (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <div style={{
                flex: 1, overflow: "auto", padding: "32px 48px",
                color: "#d4d4d4", fontSize: 15, lineHeight: 1.7,
                background: "#1e1e1e",
              }}>
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <Editor content={content} onChange={handleContentChange} onSave={handleSave} config={config} editorRef={monacoEditorRef} />
              <Outline
                content={content}
                onGoToLine={(line) => {
                  monacoEditorRef.current?.revealLineInCenter(line);
                  monacoEditorRef.current?.setPosition({ lineNumber: line, column: 1 });
                  monacoEditorRef.current?.focus();
                }}
              />
            </div>
          )
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#555",
            fontSize: 14,
          }}>
            {loading ? "Cargando..." : "← Selecciona un archivo o crea uno nuevo"}
          </div>
        )}
      </div>
      {paletteOpen && (
        <CommandPalette
          files={files}
          onSelect={handleSelect}
          onClose={() => setPaletteOpen(false)}
          searchContent={searchDocs}
        />
      )}
      {settingsOpen && config && (
        <SettingsPanel
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSave={(newConfig) => {
            setConfig(newConfig);
            saveConfig(newConfig).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
