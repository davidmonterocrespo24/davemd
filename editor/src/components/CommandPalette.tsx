import { useState, useEffect, useRef, useCallback } from "react";

interface FileResult { path: string }
interface ContentResult { path: string; excerpt: string }

interface Props {
  files: string[];
  onSelect: (path: string) => void;
  onClose: () => void;
  searchContent: (q: string) => Promise<ContentResult[]>;
}

type Tab = "files" | "content";

function fuzzyMatch(query: string, str: string): boolean {
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  let qi = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function highlightMatch(query: string, str: string): React.ReactNode {
  if (!query) return str;
  const q = query.toLowerCase();
  const result: React.ReactNode[] = [];
  let si = 0;
  let qi = 0;
  const matchIndices: boolean[] = new Array(str.length).fill(false);
  while (si < str.length && qi < q.length) {
    if (str[si].toLowerCase() === q[qi]) { matchIndices[si] = true; qi++; }
    si++;
  }
  let buf = "";
  for (let i = 0; i < str.length; i++) {
    if (matchIndices[i]) {
      if (buf) { result.push(buf); buf = ""; }
      result.push(<mark key={i} style={{ background: "#e8a020", color: "#000", borderRadius: 2, padding: "0 1px" }}>{str[i]}</mark>);
    } else {
      buf += str[i];
    }
  }
  if (buf) result.push(buf);
  return result;
}

export default function CommandPalette({ files, onSelect, onClose, searchContent }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("files");
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Filter files on query change
  useEffect(() => {
    if (tab !== "files") return;
    if (!query) {
      setFileResults(files.map((p) => ({ path: p })));
    } else {
      setFileResults(files.filter((p) => fuzzyMatch(query, p)).map((p) => ({ path: p })));
    }
    setCursor(0);
  }, [query, files, tab]);

  // Debounced content search
  useEffect(() => {
    if (tab !== "content") return;
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setContentResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchContent(query.trim());
        setContentResults(res);
      } catch {
        setContentResults([]);
      } finally {
        setLoading(false);
        setCursor(0);
      }
    }, 300);
  }, [query, tab, searchContent]);

  // Reset on tab switch
  useEffect(() => {
    setCursor(0);
    setContentResults([]);
    if (tab === "files") setFileResults(files.map((p) => ({ path: p })));
  }, [tab, files]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = tab === "files" ? fileResults : contentResults;

  const confirm = useCallback((path: string) => {
    onSelect(path);
    onClose();
  }, [onSelect, onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      if (results[cursor]) confirm(results[cursor].path);
    } else if (e.key === "Tab") {
      e.preventDefault();
      setTab((t) => t === "files" ? "content" : "files");
      setQuery("");
    }
  }

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function displayPath(path: string) {
    return path.replace(/\.md$/, "").replace(/\//g, " › ");
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Palette box */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        zIndex: 301, width: 560, maxWidth: "90vw",
        background: "#1e1e1e", border: "1px solid #3c3c3c",
        borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #2d2d2d" }}>
          {(["files", "content"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery(""); inputRef.current?.focus(); }}
              style={{
                flex: 1, background: "none", border: "none",
                borderBottom: tab === t ? "2px solid #4ec9b0" : "2px solid transparent",
                color: tab === t ? "#d4d4d4" : "#666",
                padding: "8px 0", cursor: "pointer", fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                letterSpacing: 0.5,
              }}
            >
              {t === "files" ? "Archivos" : "Contenido"}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid #2d2d2d" }}>
          <span style={{ color: "#555", marginRight: 8, fontSize: 14 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tab === "files" ? "Buscar archivo..." : "Buscar en contenido..."}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#d4d4d4", fontSize: 14, padding: "12px 0",
            }}
          />
          {loading && <span style={{ color: "#555", fontSize: 12 }}>Buscando...</span>}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: 320, overflowY: "auto" }}
        >
          {results.length === 0 && query && !loading && (
            <div style={{ color: "#555", fontSize: 13, padding: "16px 16px", textAlign: "center" }}>
              Sin resultados
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.path + i}
              onClick={() => confirm(r.path)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                background: i === cursor ? "#2a2d2e" : "transparent",
                borderLeft: i === cursor ? "2px solid #4ec9b0" : "2px solid transparent",
              }}
              onMouseEnter={() => setCursor(i)}
            >
              <div style={{ color: "#d4d4d4", fontSize: 13 }}>
                {tab === "files"
                  ? highlightMatch(query, displayPath(r.path))
                  : displayPath(r.path)}
              </div>
              {tab === "content" && "excerpt" in r && (
                <div style={{ color: "#666", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(r as ContentResult).excerpt}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          borderTop: "1px solid #2d2d2d", padding: "6px 16px",
          display: "flex", gap: 16, color: "#555", fontSize: 11,
        }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Tab cambiar modo</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </>
  );
}
