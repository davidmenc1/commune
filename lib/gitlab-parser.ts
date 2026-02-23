export type GitLabReferenceType =
  | "issue"
  | "mr"
  | "commit"
  | "file"
  | "branch"
  | "pipeline";

export interface GitLabReference {
  type: GitLabReferenceType;
  raw: string;
  start: number;
  end: number;
  // For issues/MRs
  number?: number;
  // For commits
  sha?: string;
  // For files
  path?: string;
  line?: number;
  // For branches
  branch?: string;
  // Optional explicit project (group/project#123 format)
  group?: string;
  project?: string;
}

export interface ParsedContent {
  references: GitLabReference[];
  segments: Array<
    | { type: "text"; content: string }
    | { type: "reference"; reference: GitLabReference }
  >;
}

// Patterns for different GitLab reference types

// Issue: #123 or group/project#123
const ISSUE_PATTERN =
  /(?:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+))?#(\d+)(?![a-zA-Z0-9])/g;

// Merge Request: !123 or group/project!123
const MR_PATTERN =
  /(?:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+))?!(\d+)(?![a-zA-Z0-9])/g;

// Commit SHA: 7-40 hex characters (must be standalone, not part of a word)
const COMMIT_PATTERN = /(?<![a-fA-F0-9])([a-fA-F0-9]{7,40})(?![a-fA-F0-9])/g;

// File path: paths with common extensions, optionally with line number
const FILE_PATTERN =
  /(?<![a-zA-Z0-9_/.-])([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]+)(?::(\d+))?(?![a-zA-Z0-9_/.-])/g;

// Branch: branch:name syntax
const BRANCH_PATTERN = /(?<![a-zA-Z0-9])branch:([a-zA-Z0-9_/.-]+)(?![a-zA-Z0-9_/.-])/g;

// Pipeline: :pipeline shorthand for latest pipeline run
const PIPELINE_PATTERN = /(?<![a-zA-Z0-9]):pipeline\b/g;

// GitLab URL patterns for unfurling
const GITLAB_URL_PATTERNS = {
  issue:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/issues\/(\d+)/g,
  mr: /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/merge_requests\/(\d+)/g,
  commit:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/commit\/([a-fA-F0-9]+)/g,
  file: /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/blob\/([^/]+)\/(.+?)(?:#L(\d+))?(?:\s|$)/g,
  branch:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/tree\/([a-zA-Z0-9_/.-]+)/g,
  pipeline:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/pipelines\/(\d+)/g,
};

// Words that look like commit SHAs but aren't
const SHA_BLACKLIST = new Set([
  "abcdef",
  "ffffff",
  "000000",
  "aaaaaa",
  "bbbbbb",
  "cccccc",
  "dddddd",
  "eeeeee",
  "deadbeef",
  "cafebabe",
  "baddcafe",
]);

function isLikelyCommitSha(str: string): boolean {
  // Must be lowercase or uppercase (not mixed with other chars)
  if (!/^[a-fA-F0-9]+$/.test(str)) return false;

  // Check if it's a blacklisted word
  if (SHA_BLACKLIST.has(str.toLowerCase())) return false;

  // Should have a mix of letters and numbers to be a likely SHA
  const hasLetters = /[a-fA-F]/.test(str);
  const hasNumbers = /[0-9]/.test(str);

  // 7-char SHAs need both letters and numbers to avoid false positives
  if (str.length < 10) {
    return hasLetters && hasNumbers;
  }

  return true;
}

function parseProjectPath(path: string): { group?: string; project?: string } {
  const parts = path.split("/");
  if (parts.length >= 2) {
    // The last part is the project, everything before is the group/namespace
    const project = parts.pop()!;
    const group = parts.join("/");
    return { group, project };
  }
  return {};
}

export function parseGitLabReferences(content: string): ParsedContent {
  const references: GitLabReference[] = [];

  // Parse issues
  let match: RegExpExecArray | null;

  // Standard #123 or group/project#123 format
  const issuePattern = new RegExp(ISSUE_PATTERN.source, "g");
  while ((match = issuePattern.exec(content)) !== null) {
    const [raw, group, project, number] = match;
    references.push({
      type: "issue",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      group: group || undefined,
      project: project || undefined,
    });
  }

  // GitLab issue URLs
  const issueUrlPattern = new RegExp(GITLAB_URL_PATTERNS.issue.source, "g");
  while ((match = issueUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, number] = match;
    const { group, project } = parseProjectPath(projectPath);
    references.push({
      type: "issue",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      group,
      project,
    });
  }

  // Merge requests: !123 or group/project!123
  const mrPattern = new RegExp(MR_PATTERN.source, "g");
  while ((match = mrPattern.exec(content)) !== null) {
    const [raw, group, project, number] = match;
    references.push({
      type: "mr",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      group: group || undefined,
      project: project || undefined,
    });
  }

  // GitLab MR URLs
  const mrUrlPattern = new RegExp(GITLAB_URL_PATTERNS.mr.source, "g");
  while ((match = mrUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, number] = match;
    const { group, project } = parseProjectPath(projectPath);
    references.push({
      type: "mr",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      group,
      project,
    });
  }

  // Commit SHAs
  const commitPattern = new RegExp(COMMIT_PATTERN.source, "g");
  while ((match = commitPattern.exec(content)) !== null) {
    const [raw, sha] = match;
    // Skip if this position is already covered by another reference
    const isOverlapping = references.some(
      (ref) => match!.index >= ref.start && match!.index < ref.end
    );
    if (!isOverlapping && isLikelyCommitSha(sha)) {
      references.push({
        type: "commit",
        raw,
        start: match.index,
        end: match.index + raw.length,
        sha,
      });
    }
  }

  // GitLab commit URLs
  const commitUrlPattern = new RegExp(GITLAB_URL_PATTERNS.commit.source, "g");
  while ((match = commitUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, sha] = match;
    const { group, project } = parseProjectPath(projectPath);
    references.push({
      type: "commit",
      raw,
      start: match.index,
      end: match.index + raw.length,
      sha,
      group,
      project,
    });
  }

  // File paths
  const filePattern = new RegExp(FILE_PATTERN.source, "g");
  while ((match = filePattern.exec(content)) !== null) {
    const [raw, path, line] = match;
    // Skip if this position is already covered by another reference
    const isOverlapping = references.some(
      (ref) => match!.index >= ref.start && match!.index < ref.end
    );
    if (!isOverlapping) {
      references.push({
        type: "file",
        raw,
        start: match.index,
        end: match.index + raw.length,
        path,
        line: line ? parseInt(line, 10) : undefined,
      });
    }
  }

  // GitLab file URLs
  const fileUrlPattern = new RegExp(GITLAB_URL_PATTERNS.file.source, "g");
  while ((match = fileUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, , path, line] = match;
    const { group, project } = parseProjectPath(projectPath);
    references.push({
      type: "file",
      raw: raw.trim(),
      start: match.index,
      end: match.index + raw.trim().length,
      path,
      line: line ? parseInt(line, 10) : undefined,
      group,
      project,
    });
  }

  // Branches
  const branchPattern = new RegExp(BRANCH_PATTERN.source, "g");
  while ((match = branchPattern.exec(content)) !== null) {
    const [raw, branch] = match;
    references.push({
      type: "branch",
      raw,
      start: match.index,
      end: match.index + raw.length,
      branch,
    });
  }

  // GitLab branch URLs
  const branchUrlPattern = new RegExp(GITLAB_URL_PATTERNS.branch.source, "g");
  while ((match = branchUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, branch] = match;
    const { group, project } = parseProjectPath(projectPath);
    // Only match if it's not a file URL (no file extension at end)
    if (!/\.[a-zA-Z0-9]+$/.test(branch)) {
      references.push({
        type: "branch",
        raw,
        start: match.index,
        end: match.index + raw.length,
        branch,
        group,
        project,
      });
    }
  }

  // Pipeline shorthand for latest pipeline run
  const pipelinePattern = new RegExp(PIPELINE_PATTERN.source, "g");
  while ((match = pipelinePattern.exec(content)) !== null) {
    const [raw] = match;
    references.push({
      type: "pipeline",
      raw,
      start: match.index,
      end: match.index + raw.length,
    });
  }

  // GitLab pipeline URLs
  const pipelineUrlPattern = new RegExp(GITLAB_URL_PATTERNS.pipeline.source, "g");
  while ((match = pipelineUrlPattern.exec(content)) !== null) {
    const [raw, projectPath, pipelineId] = match;
    const { group, project } = parseProjectPath(projectPath);
    references.push({
      type: "pipeline",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(pipelineId, 10),
      group,
      project,
    });
  }

  // Sort references by start position and remove duplicates/overlaps
  references.sort((a, b) => a.start - b.start);
  const uniqueRefs: GitLabReference[] = [];
  for (const ref of references) {
    const lastRef = uniqueRefs[uniqueRefs.length - 1];
    if (!lastRef || ref.start >= lastRef.end) {
      uniqueRefs.push(ref);
    }
  }

  // Build segments
  const segments: ParsedContent["segments"] = [];
  let lastEnd = 0;

  for (const ref of uniqueRefs) {
    // Add text before this reference
    if (ref.start > lastEnd) {
      segments.push({
        type: "text",
        content: content.slice(lastEnd, ref.start),
      });
    }

    // Add the reference
    segments.push({
      type: "reference",
      reference: ref,
    });

    lastEnd = ref.end;
  }

  // Add remaining text
  if (lastEnd < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastEnd),
    });
  }

  return {
    references: uniqueRefs,
    segments,
  };
}

// Check if a message contains any GitLab references
export function hasGitLabReferences(content: string): boolean {
  const parsed = parseGitLabReferences(content);
  return parsed.references.length > 0;
}

// Get a formatted display string for a reference
export function formatReferenceDisplay(ref: GitLabReference): string {
  switch (ref.type) {
    case "issue":
      if (ref.group && ref.project) {
        return `${ref.group}/${ref.project}#${ref.number}`;
      }
      return `#${ref.number}`;
    case "mr":
      if (ref.group && ref.project) {
        return `${ref.group}/${ref.project}!${ref.number}`;
      }
      return `!${ref.number}`;
    case "commit":
      return ref.sha?.slice(0, 7) || ref.raw;
    case "file":
      return ref.line ? `${ref.path}:${ref.line}` : ref.path || ref.raw;
    case "branch":
      return `branch:${ref.branch}`;
    case "pipeline":
      return ":pipeline";
    default:
      return ref.raw;
  }
}

