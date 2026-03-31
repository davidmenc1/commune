"use client";

import { useMemo } from "react";
import { parseGitLabReferences, hasGitLabReferences } from "@/lib/gitlab-parser";
import { GitLabMention } from "./mention";

interface GitLabRichTextProps {
  content: string;
  channelId: string;
  jwt: string;
  hasIntegration?: boolean;
}

export function GitLabRichText({
  content,
  channelId,
  jwt,
  hasIntegration = false,
}: GitLabRichTextProps) {
  const parsed = useMemo(() => {
    if (!hasIntegration) return null;
    return parseGitLabReferences(content);
  }, [content, hasIntegration]);

  // If no integration or no references, render plain text
  if (!parsed || parsed.references.length === 0) {
    return <span>{content}</span>;
  }

  // Render segments with GitLab mentions
  return (
    <>
      {parsed.segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }
        return (
          <GitLabMention
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
export function GitLabMessageContent({
  content,
  channelId,
  jwt,
  hasIntegration,
}: GitLabRichTextProps) {
  // Quick check if content has any GitLab references
  const mightHaveReferences = useMemo(() => {
    if (!hasIntegration) return false;
    return hasGitLabReferences(content);
  }, [content, hasIntegration]);

  if (!mightHaveReferences) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      <GitLabRichText
        content={content}
        channelId={channelId}
        jwt={jwt}
        hasIntegration={hasIntegration}
      />
    </span>
  );
}

