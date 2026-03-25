import type { editor } from "monaco-editor";
import type { EditorConfig } from "./types";

export function mapConfigToMonaco(
  cfg: EditorConfig
): editor.IStandaloneEditorConstructionOptions {
  const fontSizeRaw = parseInt(cfg.fontSize, 10);
  const fontSize = Number.isNaN(fontSizeRaw) ? 14 : fontSizeRaw;

  return {
    fontSize,
    wordWrap: cfg.lineWrapping ? "on" : "off",
    lineNumbers: cfg.lineNumbers ? "on" : "off",
    tabSize: cfg.tabSize,
    indentSize: cfg.indentUnit,
    insertSpaces: !cfg.indentWithTabs,
    readOnly: cfg.readOnly,
    autoClosingBrackets: cfg.autoCloseBrackets ? "always" : "never",
    matchBrackets: cfg.matchBrackets ? "always" : "never",
    renderLineHighlight: cfg.styleActiveLine ? "all" : "none",
    folding: cfg.codeFold,
    renderWhitespace: cfg.showTrailingSpace ? "trailing" : "none",
    occurrencesHighlight: cfg.matchWordHighlight ? "singleFile" : "off",
    // Opciones fijas
    minimap: { enabled: false },
    padding: { top: 16 },
    scrollBeyondLastLine: false,
  };
}

export function resolveTheme(cfg: EditorConfig): string {
  return cfg.theme || "vs-dark";
}
