export type TreeNode =
  | { kind: "folder"; name: string; path: string; children: TreeNode[]; contentPath?: string }
  | { kind: "file"; name: string; path: string };

export interface EditorConfig {
  theme: "vs-dark" | "vs" | "hc-black" | "";
  fontSize: string;
  lineNumbers: boolean;
  lineWrapping: boolean;
  tabSize: number;
  indentUnit: number;
  readOnly: boolean;
  autoCloseBrackets: boolean;
  matchBrackets: boolean;
  styleActiveLine: boolean;
  autoFocus: boolean;
  placeholder: string;
  // Reservados para futuro
  watch: boolean;
  toolbar: boolean;
  syncScrolling: boolean;
  codeFold: boolean;
  showTrailingSpace: boolean;
  matchWordHighlight: boolean;
  indentWithTabs: boolean;
  searchReplace: boolean;
  autoHeight: boolean;
  saveHTMLToTextarea: boolean;
}
