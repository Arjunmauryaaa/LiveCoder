import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";

function simpleJavaIndent(code) {
  // Ensure code is a string
  if (typeof code !== "string") code = String(code ?? "");
  // Very basic indentation: 2 spaces per block
  const lines = code.split("\n");
  let indent = 0;
  return lines
    .map((line) => {
      let trimmed = line.trim();
      if (trimmed.endsWith("}")) indent--;
      const result = "  ".repeat(Math.max(indent, 0)) + trimmed;
      if (trimmed.endsWith("{")) indent++;
      return result;
    })
    .join("\n");
}

function formatCode(code, mode) {
  // Ensure code is a string
  if (typeof code !== "string") code = String(code ?? "");
  try {
    if (mode === "java") {
      return simpleJavaIndent(code);
    }
    // For other languages, return as-is
    return code;
  } catch (e) {
    // If formatting fails, return unformatted code
    return code;
  }
}

const Editor = ({ onCodeChange, initialCode }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    async function init() {
      editorRef.current = Codemirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript" },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );

      // Ensure initialCode is a string before setting it
      const safeInitialCode = typeof initialCode === "string" ? initialCode : String(initialCode ?? "");
      editorRef.current.setValue(safeInitialCode);

      editorRef.current.on("change", (instance, changes) => {
        let code = instance.getValue();
        // Ensure code is a string
        if (typeof code !== "string") {
          console.warn("Non-string code detected in editor change event", code);
          code = String(code ?? "");
        }
        // Detect language mode
        const mode = instance.getOption("mode");
        let lang = "javascript";
        if (typeof mode === "string") lang = mode;
        else if (mode && mode.name) lang = mode.name;
        let formatted = formatCode(code, lang);
        if (typeof formatted !== "string") formatted = String(formatted ?? "");
        onCodeChange(formatted);
      });
    }
    init();
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const safeInitialCode = typeof initialCode === "string" ? initialCode : String(initialCode ?? "");
      editorRef.current.setValue(safeInitialCode);
    }
  }, [initialCode]);

  return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
