import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface Props {
  content: string;
  onChange: (val: string) => void;
  onSave: () => void;
}

export default function Editor({ content, onChange, onSave }: Props) {
  function handleMount(editorInstance: editor.IStandaloneCodeEditor) {
    // Ctrl+S para guardar
    editorInstance.addCommand(
      2048 | 49, // KeyMod.CtrlCmd | KeyCode.KeyS
      onSave
    );
    editorInstance.focus();
  }

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="markdown"
      value={content}
      theme="vs-dark"
      options={{
        wordWrap: "on",
        lineNumbers: "on",
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 16 },
        scrollBeyondLastLine: false,
      }}
      onChange={(val) => onChange(val ?? "")}
      onMount={handleMount}
    />
  );
}
