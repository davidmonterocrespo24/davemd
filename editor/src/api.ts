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
