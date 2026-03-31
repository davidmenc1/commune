/**
 * Parser for user and channel mentions in messages
 * Supports @username and #channel syntax
 */

export type MentionType = "user" | "channel";

export interface Mention {
  type: MentionType;
  name: string;
  raw: string;
  start: number;
  end: number;
}

// Match @username (letters, numbers, underscores, hyphens, dots, spaces in quotes)
// Examples: @john, @john.doe, @"John Doe"
const USER_MENTION_PATTERN = /@(?:"([^"]+)"|([a-zA-Z0-9_.\-]+))/g;

// Match #channel (letters, numbers, underscores, hyphens)
// Examples: #general, #dev-team, #project_alpha
const CHANNEL_MENTION_PATTERN = /#([a-zA-Z0-9_\-]+)/g;

/**
 * Quick check if content might have mentions
 */
export function hasMentions(content: string): boolean {
  return content.includes("@") || content.includes("#");
}

/**
 * Parse all mentions from content
 */
export function parseMentions(content: string): Mention[] {
  const mentions: Mention[] = [];

  // Parse user mentions
  let match;
  const userPattern = new RegExp(USER_MENTION_PATTERN.source, "g");
  while ((match = userPattern.exec(content)) !== null) {
    const name = match[1] || match[2]; // match[1] is quoted, match[2] is unquoted
    mentions.push({
      type: "user",
      name,
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Parse channel mentions
  const channelPattern = new RegExp(CHANNEL_MENTION_PATTERN.source, "g");
  while ((match = channelPattern.exec(content)) !== null) {
    mentions.push({
      type: "channel",
      name: match[1],
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Sort by position
  mentions.sort((a, b) => a.start - b.start);

  // Remove overlapping mentions (keep the first one)
  const uniqueMentions: Mention[] = [];
  for (const mention of mentions) {
    const lastMention = uniqueMentions[uniqueMentions.length - 1];
    if (!lastMention || mention.start >= lastMention.end) {
      uniqueMentions.push(mention);
    }
  }

  return uniqueMentions;
}

export interface MentionSegment {
  type: "text" | "mention";
  content?: string;
  mention?: Mention;
  start: number;
  end: number;
}

/**
 * Parse content into segments (text and mentions)
 */
export function parseContentWithMentions(content: string): MentionSegment[] {
  const mentions = parseMentions(content);
  
  if (mentions.length === 0) {
    return [{
      type: "text",
      content,
      start: 0,
      end: content.length,
    }];
  }

  const segments: MentionSegment[] = [];
  let lastEnd = 0;

  for (const mention of mentions) {
    // Add text before this mention
    if (mention.start > lastEnd) {
      segments.push({
        type: "text",
        content: content.slice(lastEnd, mention.start),
        start: lastEnd,
        end: mention.start,
      });
    }

    // Add the mention
    segments.push({
      type: "mention",
      mention,
      start: mention.start,
      end: mention.end,
    });

    lastEnd = mention.end;
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
