"use client";

import { useMemo, type ReactNode } from "react";
import { parseGitHubReferences, hasGitHubReferences } from "@/lib/github-parser";
import { GitHubMention } from "./mention";

interface GitHubRichTextProps {
  content: string;
  channelId: string;
  jwt: string;
  hasIntegration?: boolean;
}

export function GitHubRichText({
  content,
  channelId,
  jwt,
  hasIntegration = false,
}: GitHubRichTextProps) {
  const parsed = useMemo(() => {
    if (!hasIntegration) return null;
    return parseGitHubReferences(content);
  }, [content, hasIntegration]);

  // If no integration or no references, render plain text
  if (!parsed || parsed.references.length === 0) {
    return <span>{content}</span>;
  }

  // Render segments with GitHub mentions
  return (
    <>
      {parsed.segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }
        return (
          <GitHubMention
            key={index}
            reference={segment.reference}
            channelId={channelId}
            jwt={jwt}
          />
        );
      })}
    </>
  );
}

// Simple wrapper that checks for references before rendering
export function MessageContent({
  content,
  channelId,
  jwt,
  hasIntegration,
}: GitHubRichTextProps) {
  // Quick check if content has any GitHub references
  const mightHaveReferences = useMemo(() => {
    if (!hasIntegration) return false;
    return hasGitHubReferences(content);
  }, [content, hasIntegration]);

  if (!mightHaveReferences) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      <GitHubRichText
        content={content}
        channelId={channelId}
        jwt={jwt}
        hasIntegration={hasIntegration}
      />
    </span>
  );
}

