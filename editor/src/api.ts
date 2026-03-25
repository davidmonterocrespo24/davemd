import type { EditorConfig } from "./types";

const BASE = "http://localhost:8000";

export async function listFiles(): Promise<string[]> {
  const res = await fetch(`${BASE}/list`);
  const data = await res.json();
  return data.files;
}

export async function readFile(filename: string): Promise<string> {
  const res = await fetch(`${BASE}/read?filename=${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error("Archivo no encontrado");
  const data = await res.json();
  return data.content;
}

export async function saveFile(filename: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Error al guardar");
  }
}

export async function renameFile(oldPath: string, newPath: string): Promise<string[]> {
  const res = await fetch(`${BASE}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Error al renombrar");
  }
  const data = await res.json();
  return data.files;
}

export async function deleteFile(path: string): Promise<string[]> {
  const res = await fetch(`${BASE}/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Error al eliminar");
  }
  const data = await res.json();
  return data.files;
}

export async function getConfig(): Promise<EditorConfig> {
  const res = await fetch(`${BASE}/config`);
  if (!res.ok) throw new Error("No se pudo cargar la configuración");
  return res.json();
}

export async function saveConfig(config: EditorConfig): Promise<void> {
  const res = await fetch(`${BASE}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Error al guardar configuración");
  }
}
