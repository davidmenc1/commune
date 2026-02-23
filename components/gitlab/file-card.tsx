"use client";

import { FileCode, Folder, ExternalLink, Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
import type { FileData } from "./types";

interface GitLabFileCardProps {
  data: FileData;
  line?: number;
  projectPath?: string;
}

export function GitLabFileCard({
  data,
  line,
  projectPath,
}: GitLabFileCardProps) {
  const [copied, setCopied] = useState(false);

  // Decode and preview file content
  const content = useMemo(() => {
    if (!data.content || data.encoding !== "base64") return null;
    try {
      return atob(data.content);
    } catch {
      return null;
    }
  }, [data.content, data.encoding]);

  // Get lines around the target line
  const previewLines = useMemo(() => {
    if (!content) return null;
    const lines = content.split("\n");
    if (line) {
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 3);
      return {
        lines: lines.slice(start, end),
        startLine: start + 1,
        highlightLine: line,
      };
    }
    return {
      lines: lines.slice(0, 10),
      startLine: 1,
      highlightLine: null,
    };
  }, [content, line]);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(data.file_path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ext || "";
  };

  const getLanguageClass = (filename: string) => {
    const ext = getFileExtension(filename);
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rb: "ruby",
      go: "go",
      rs: "rust",
      java: "java",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
    };
    return langMap[ext] || "text";
  };

  // GitLab doesn't have a direct file URL in the API response, construct it
  const fileUrl = projectPath
    ? `https://gitlab.com/${projectPath}/-/blob/${data.ref}/${data.file_path}`
    : undefined;

  return (
    <div className="w-96 p-3 space-y-3">
      {/* Header with file icon and path */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">
          <FileCode className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="font-mono text-sm hover:text-primary transition-colors truncate max-w-[250px]"
              title={data.file_path}
            >
              {data.file_name}
            </button>
            {copied ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {projectPath && (
              <span className="text-muted-foreground/70">
                {projectPath}
              </span>
            )}
            <span className="font-mono text-muted-foreground/70 truncate">
              {data.file_path}
            </span>
          </div>
        </div>
      </div>

      {/* File info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatSize(data.size)}</span>
        {line && <span>Line {line}</span>}
        <span className="uppercase text-muted-foreground/60">
          {getFileExtension(data.file_name) || "file"}
        </span>
      </div>

      {/* Code preview */}
      {previewLines && previewLines.lines.length > 0 && (
        <div className="rounded-md border bg-muted/30 overflow-hidden">
          <pre className="text-[11px] overflow-x-auto">
            <code className={`language-${getLanguageClass(data.file_name)}`}>
              {previewLines.lines.map((lineContent, idx) => {
                const lineNum = previewLines.startLine + idx;
                const isHighlighted = lineNum === previewLines.highlightLine;
                return (
                  <div
                    key={idx}
                    className={`flex ${isHighlighted ? "bg-yellow-500/20" : ""}`}
                  >
                    <span className="select-none px-2 py-0.5 text-muted-foreground/50 border-r border-border/50 min-w-[2.5rem] text-right">
                      {lineNum}
                    </span>
                    <span className="px-2 py-0.5 whitespace-pre">
                      {lineContent}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
          {content && content.split("\n").length > 10 && (
            <div className="text-[10px] text-muted-foreground text-center py-1 border-t bg-muted/20">
              {content.split("\n").length - 10} more lines
            </div>
          )}
        </div>
      )}

      {/* Footer with link */}
      {fileUrl && (
        <div className="flex items-center justify-end pt-1 border-t">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View on GitLab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

