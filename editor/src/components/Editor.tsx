import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { EditorConfig } from "../types";
import { mapConfigToMonaco, resolveTheme } from "../config";

interface Props {
  content: string;
  onChange: (val: string) => void;
  onSave: () => void;
  config: EditorConfig;
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
}

export default function Editor({ content, onChange, onSave, config, editorRef }: Props) {
  function handleMount(editorInstance: editor.IStandaloneCodeEditor) {
    if (editorRef) editorRef.current = editorInstance;
    editorInstance.addCommand(
      2048 | 49, // KeyMod.CtrlCmd | KeyCode.KeyS
      onSave
    );
    if (config.autoFocus) {
      editorInstance.focus();
    }
  }

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="markdown"
      value={content}
      theme={resolveTheme(config)}
      options={mapConfigToMonaco(config)}
      onChange={(val) => onChange(val ?? "")}
      onMount={handleMount}
    />
  );
}
