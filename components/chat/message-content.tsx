"use client";

import { useMemo, type ReactNode } from "react";
import { parseGitHubReferences, hasGitHubReferences, type GitHubReference } from "@/lib/github-parser";
import { parseGitLabReferences, hasGitLabReferences, type GitLabReference } from "@/lib/gitlab-parser";
import { hasMentions, parseContentWithMentions, type MentionSegment, type Mention } from "@/lib/mention-parser";
import { GitHubMention } from "@/components/github/mention";
import { GitLabMention } from "@/components/gitlab/mention";
import { UserMention, ChannelMention } from "@/components/chat/mentions";
import type { UsersTable, ChannelsTable } from "@/zero-schema.gen";

interface UnifiedMessageContentProps {
  content: string;
  channelId: string;
  jwt: string;
  hasGitHubIntegration?: boolean;
  hasGitLabIntegration?: boolean;
  users?: readonly UsersTable[];
  channels?: readonly ChannelsTable[];
  currentUserId?: string;
}

type UnifiedReference = 
  | { source: "github"; ref: GitHubReference }
  | { source: "gitlab"; ref: GitLabReference }
  | { source: "mention"; ref: Mention };

interface UnifiedSegment {
  type: "text" | "reference";
  content?: string;
  reference?: UnifiedReference;
  start: number;
  end: number;
}

function mergeReferences(
  content: string,
  githubRefs: GitHubReference[],
  gitlabRefs: GitLabReference[],
  mentionSegments: MentionSegment[]
): UnifiedSegment[] {
  // Combine all references with their source
  const allRefs: UnifiedReference[] = [
    ...githubRefs.map((ref) => ({ source: "github" as const, ref })),
    ...gitlabRefs.map((ref) => ({ source: "gitlab" as const, ref })),
    ...mentionSegments
      .filter((seg): seg is MentionSegment & { mention: Mention } => seg.type === "mention" && !!seg.mention)
      .map((seg) => ({ source: "mention" as const, ref: seg.mention })),
  ];

  // Sort by start position
  allRefs.sort((a, b) => a.ref.start - b.ref.start);

  // Remove overlapping references (keep the first one)
  const uniqueRefs: UnifiedReference[] = [];
  for (const ref of allRefs) {
    const lastRef = uniqueRefs[uniqueRefs.length - 1];
    if (!lastRef || ref.ref.start >= lastRef.ref.end) {
      uniqueRefs.push(ref);
    }
  }

  // Build segments
  const segments: UnifiedSegment[] = [];
  let lastEnd = 0;

  for (const ref of uniqueRefs) {
    // Add text before this reference
    if (ref.ref.start > lastEnd) {
      segments.push({
        type: "text",
        content: content.slice(lastEnd, ref.ref.start),
        start: lastEnd,
        end: ref.ref.start,
      });
    }

    // Add the reference
    segments.push({
      type: "reference",
      reference: ref,
      start: ref.ref.start,
      end: ref.ref.end,
    });

    lastEnd = ref.ref.end;
  }

  // Add remaining text
  if (lastEnd < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastEnd),
      start: lastEnd,
      end: content.length,
    });
  }

  return segments;
}

export function UnifiedMessageContent({
  content,
  channelId,
  jwt,
  hasGitHubIntegration = false,
  hasGitLabIntegration = false,
  users = [],
  channels = [],
  currentUserId,
}: UnifiedMessageContentProps) {
  const segments = useMemo(() => {
    // Check for any references
    const mightHaveGitHub = hasGitHubIntegration && hasGitHubReferences(content);
    const mightHaveGitLab = hasGitLabIntegration && hasGitLabReferences(content);
    const mightHaveMentions = hasMentions(content);

    if (!mightHaveGitHub && !mightHaveGitLab && !mightHaveMentions) {
      return null;
    }

    // Parse references
    const githubRefs = mightHaveGitHub 
      ? parseGitHubReferences(content).references 
      : [];
    const gitlabRefs = mightHaveGitLab 
      ? parseGitLabReferences(content).references 
      : [];
    const mentionSegments = mightHaveMentions
      ? parseContentWithMentions(content)
      : [];

    // Merge and dedupe
    return mergeReferences(content, githubRefs, gitlabRefs, mentionSegments);
  }, [content, hasGitHubIntegration, hasGitLabIntegration]);

  // If no references, render plain text
  if (!segments || segments.length === 0) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  // Render segments with appropriate mentions
  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        const ref = segment.reference!;
        if (ref.source === "github") {
          return (
            <GitHubMention
              key={index}
              reference={ref.ref as GitHubReference}
              channelId={channelId}
              jwt={jwt}
            />
          );
        } else if (ref.source === "gitlab") {
          return (
            <GitLabMention
              key={index}
              reference={ref.ref as GitLabReference}
              channelId={channelId}
              jwt={jwt}
            />
          );
        } else if (ref.source === "mention") {
          const mention = ref.ref as Mention;
          if (mention.type === "user") {
            return (
              <UserMention
                key={index}
                mention={mention}
                users={users}
                currentUserId={currentUserId}
              />
            );
          } else {
            return (
              <ChannelMention
                key={index}
                mention={mention}
                channels={channels}
              />
            );
          }
        }
        
        return null;
      })}
    </span>
  );
}
