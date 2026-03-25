import { useEffect, useState, useCallback } from "react";
import FileTree from "./components/FileTree";
import Editor from "./components/Editor";
import { listFiles, readFile, saveFile, getConfig, renameFile, deleteFile } from "./api";
import type { EditorConfig } from "./types";

type Status = { msg: string; ok: boolean };

export default function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EditorConfig | null>(null);

  useEffect(() => {
    listFiles().then(setFiles).catch(() => setStatus({ msg: "No se pudo conectar al backend", ok: false }));
    getConfig().then(setConfig).catch(() => setStatus({ msg: "No se pudo cargar la configuración", ok: false }));
  }, []);

  async function handleSelect(filename: string) {
    setLoading(true);
    try {
      const text = await readFile(filename);
      setActiveFile(filename);
      setContent(text);
    } catch {
      setStatus({ msg: "Error al leer el archivo", ok: false });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    try {
      await saveFile(activeFile, content);
      setStatus({ msg: `Guardado: ${activeFile}`, ok: true });
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al guardar", ok: false });
    } finally {
      setTimeout(() => setStatus(null), 2500);
    }
  }, [activeFile, content]);

  async function handleNewFile(parentPath: string | null, name: string) {
    const filename = name.endsWith(".md") ? name : `${name}.md`;
    const fullPath = parentPath ? `${parentPath}/${filename}` : filename;
    const title = filename.replace(/\.md$/, "");
    try {
      await saveFile(fullPath, `# ${title}\n\nEscribe aquí...\n`);
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
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al eliminar", ok: false });
      setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1e1e1e" }}>
      <FileTree
          files={files}
          active={activeFile}
          onSelect={handleSelect}
          onNewFile={handleNewFile}
          onRename={handleRename}
          onDelete={handleDelete}
        />
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
          <span style={{ flex: 1 }}>
            {loading ? "Cargando..." : (activeFile ?? "Selecciona un archivo")}
          </span>
          {status && (
            <span style={{ color: status.ok ? "#4ec9b0" : "#f48771" }}>{status.msg}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!activeFile || loading}
            style={{
              background: activeFile ? "#0e639c" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              cursor: activeFile ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            Guardar (Ctrl+S)
          </button>
        </div>

        {/* Editor */}
        {activeFile && !loading && config ? (
          <Editor content={content} onChange={setContent} onSave={handleSave} config={config} />
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
    </div>
  );
}
