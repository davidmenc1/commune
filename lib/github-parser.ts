export type GitHubReferenceType =
  | "issue"
  | "pr"
  | "commit"
  | "file"
  | "branch"
  | "build";

export interface GitHubReference {
  type: GitHubReferenceType;
  raw: string;
  start: number;
  end: number;
  // For issues/PRs
  number?: number;
  // For commits
  sha?: string;
  // For files
  path?: string;
  line?: number;
  // For branches
  branch?: string;
  // Optional explicit repo (owner/repo#123 format)
  owner?: string;
  repo?: string;
}

export interface ParsedContent {
  references: GitHubReference[];
  segments: Array<
    | { type: "text"; content: string }
    | { type: "reference"; reference: GitHubReference }
  >;
}

// Patterns for different GitHub reference types

// Issue/PR: #123 or owner/repo#123
const ISSUE_PR_PATTERN =
  /(?:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+))?#(\d+)(?![a-zA-Z0-9])/g;

// Commit SHA: 7-40 hex characters (must be standalone, not part of a word)
const COMMIT_PATTERN = /(?<![a-fA-F0-9])([a-fA-F0-9]{7,40})(?![a-fA-F0-9])/g;

// File path: paths with common extensions, optionally with line number
const FILE_PATTERN =
  /(?<![a-zA-Z0-9_/.-])([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]+)(?::(\d+))?(?![a-zA-Z0-9_/.-])/g;

// Branch: branch:name syntax
const BRANCH_PATTERN = /(?<![a-zA-Z0-9])branch:([a-zA-Z0-9_/.-]+)(?![a-zA-Z0-9_/.-])/g;

// Build: :build shorthand for latest workflow run
const BUILD_PATTERN = /(?<![a-zA-Z0-9]):build\b/g;

// GitHub URL patterns for unfurling
const GITHUB_URL_PATTERNS = {
  issue:
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/g,
  pr: /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/g,
  commit:
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-fA-F0-9]+)/g,
  file: /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+))?(?:\s|$)/g,
  branch:
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/tree\/([a-zA-Z0-9_/.-]+)/g,
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

export function parseGitHubReferences(content: string): ParsedContent {
  const references: GitHubReference[] = [];

  // Parse issues/PRs (including GitHub URLs)
  let match: RegExpExecArray | null;

  // Standard #123 or owner/repo#123 format
  const issuePattern = new RegExp(ISSUE_PR_PATTERN.source, "g");
  while ((match = issuePattern.exec(content)) !== null) {
    const [raw, owner, repo, number] = match;
    references.push({
      type: "issue", // Will be determined as issue or PR when fetching
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      owner: owner || undefined,
      repo: repo || undefined,
    });
  }

  // GitHub issue URLs
  const issueUrlPattern = new RegExp(GITHUB_URL_PATTERNS.issue.source, "g");
  while ((match = issueUrlPattern.exec(content)) !== null) {
    const [raw, owner, repo, number] = match;
    references.push({
      type: "issue",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      owner,
      repo,
    });
  }

  // GitHub PR URLs
  const prUrlPattern = new RegExp(GITHUB_URL_PATTERNS.pr.source, "g");
  while ((match = prUrlPattern.exec(content)) !== null) {
    const [raw, owner, repo, number] = match;
    references.push({
      type: "pr",
      raw,
      start: match.index,
      end: match.index + raw.length,
      number: parseInt(number, 10),
      owner,
      repo,
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

  // GitHub commit URLs
  const commitUrlPattern = new RegExp(GITHUB_URL_PATTERNS.commit.source, "g");
  while ((match = commitUrlPattern.exec(content)) !== null) {
    const [raw, owner, repo, sha] = match;
    references.push({
      type: "commit",
      raw,
      start: match.index,
      end: match.index + raw.length,
      sha,
      owner,
      repo,
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

  // GitHub file URLs
  const fileUrlPattern = new RegExp(GITHUB_URL_PATTERNS.file.source, "g");
  while ((match = fileUrlPattern.exec(content)) !== null) {
    const [raw, owner, repo, , path, line] = match;
    references.push({
      type: "file",
      raw: raw.trim(),
      start: match.index,
      end: match.index + raw.trim().length,
      path,
      line: line ? parseInt(line, 10) : undefined,
      owner,
      repo,
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

  // GitHub branch URLs
  const branchUrlPattern = new RegExp(GITHUB_URL_PATTERNS.branch.source, "g");
  while ((match = branchUrlPattern.exec(content)) !== null) {
    const [raw, owner, repo, branch] = match;
    // Only match if it's not a file URL (no file extension at end)
    if (!/\.[a-zA-Z0-9]+$/.test(branch)) {
      references.push({
        type: "branch",
        raw,
        start: match.index,
        end: match.index + raw.length,
        branch,
        owner,
        repo,
      });
    }
  }

  // Build shorthand for latest workflow run
  const buildPattern = new RegExp(BUILD_PATTERN.source, "g");
  while ((match = buildPattern.exec(content)) !== null) {
    const [raw] = match;
    references.push({
      type: "build",
      raw,
      start: match.index,
      end: match.index + raw.length,
    });
  }

  // Sort references by start position and remove duplicates/overlaps
  references.sort((a, b) => a.start - b.start);
  const uniqueRefs: GitHubReference[] = [];
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

// Check if a message contains any GitHub references
export function hasGitHubReferences(content: string): boolean {
  const parsed = parseGitHubReferences(content);
  return parsed.references.length > 0;
}

// Get a formatted display string for a reference
export function formatReferenceDisplay(ref: GitHubReference): string {
  switch (ref.type) {
    case "issue":
    case "pr":
      if (ref.owner && ref.repo) {
        return `${ref.owner}/${ref.repo}#${ref.number}`;
      }
      return `#${ref.number}`;
    case "commit":
      return ref.sha?.slice(0, 7) || ref.raw;
    case "file":
      return ref.line ? `${ref.path}:${ref.line}` : ref.path || ref.raw;
    case "branch":
      return `branch:${ref.branch}`;
    case "build":
      return ":build";
    default:
      return ref.raw;
  }
}

