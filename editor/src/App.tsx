import { useEffect, useState, useCallback } from "react";
import FileTree from "./components/FileTree";
import Editor from "./components/Editor";
import { listFiles, readFile, saveFile } from "./api";

type Status = { msg: string; ok: boolean };

export default function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listFiles().then(setFiles).catch(() => setStatus({ msg: "No se pudo conectar al backend", ok: false }));
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

  async function handleNew() {
    const name = prompt("Nombre del archivo (ej: guia.md o carpeta/tema.md):");
    if (!name) return;
    const filename = name.endsWith(".md") ? name : `${name}.md`;
    try {
      await saveFile(filename, `# ${filename.replace(/.*\//, "").replace(".md", "")}\n\nEscribe aquí...\n`);
      const updated = await listFiles();
      setFiles(updated);
      handleSelect(filename);
    } catch (e: unknown) {
      setStatus({ msg: e instanceof Error ? e.message : "Error al crear", ok: false });
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1e1e1e" }}>
      <FileTree files={files} active={activeFile} onSelect={handleSelect} onNew={handleNew} />
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
        {activeFile && !loading ? (
          <Editor content={content} onChange={setContent} onSave={handleSave} />
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
