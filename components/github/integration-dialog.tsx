"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Github,
  ExternalLink,
  Loader2,
  Check,
  Search,
  Lock,
  Globe,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { useChannelGitHubIntegration } from "./use-github-data";
import { cn } from "@/lib/utils";

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
}

interface GitHubIntegrationDialogProps {
  channelId: string;
  channelName: string;
  jwt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Check URL params once on module load to avoid race conditions
function getInitialGitHubParams() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const githubSetup = params.get("github_setup");
  const token = params.get("github_token");
  if (githubSetup === "pending" && token) {
    return { token };
  }
  return null;
}

export function GitHubIntegrationDialog({
  channelId,
  channelName,
  jwt,
  open,
  onOpenChange,
}: GitHubIntegrationDialogProps) {
  const { integration, mutate } = useChannelGitHubIntegration(channelId, jwt);
  const initialParams = useRef(getInitialGitHubParams());
  const hasProcessedParams = useRef(false);

  const [githubToken, setGithubToken] = useState<string | null>(
    initialParams.current?.token || null
  );
  const [step, setStep] = useState<"connect" | "select" | "connected">(() => {
    if (initialParams.current?.token) return "select";
    if (integration) return "connected";
    return "connect";
  });
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Handle URL params and auto-open dialog
  useEffect(() => {
    if (hasProcessedParams.current) return;
    if (!initialParams.current?.token) return;

    hasProcessedParams.current = true;

    // Auto-open the dialog
    onOpenChange(true);

    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete("github_setup");
    url.searchParams.delete("github_token");
    window.history.replaceState({}, "", url.toString());
  }, [onOpenChange]);

  // Update step when integration changes (but not if we're in select mode with a token)
  useEffect(() => {
    if (integration) {
      setStep("connected");
    } else if (!githubToken && step !== "select") {
      setStep("connect");
    }
  }, [integration, githubToken, step]);

  // Load repos when we have a token
  useEffect(() => {
    if (githubToken && step === "select") {
      loadRepos();
    }
  }, [githubToken, step]);

  const loadRepos = async () => {
    if (!githubToken) return;

    setIsLoadingRepos(true);
    try {
      const response = await fetch(
        `/api/github/repos?token=${encodeURIComponent(githubToken)}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to load repos:", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleStartOAuth = () => {
    // Open GitHub OAuth in the same window
    window.location.href = `/api/github/auth?channelId=${channelId}`;
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo || !githubToken) return;

    setIsConnecting(true);
    try {
      const response = await fetch("/api/github/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          channelId,
          accessToken: githubToken,
          repoOwner: selectedRepo.owner,
          repoName: selectedRepo.name,
        }),
      });

      if (response.ok) {
        mutate();
        setStep("connected");
        setGithubToken(null);
        setSelectedRepo(null);
      }
    } catch (err) {
      console.error("Failed to connect repo:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(
        `/api/github/integrations?channelId=${channelId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (response.ok) {
        mutate();
        setStep("connect");
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </DialogTitle>
          <DialogDescription>
            Connect a GitHub repository to #{channelName} for rich issue, PR,
            and commit mentions.
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm">What you can do:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Mention issues and PRs with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    #123
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Reference commits with SHA hashes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Link to files with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    src/file.ts:42
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Hover over mentions for rich previews
                </li>
              </ul>
            </div>

            <Button onClick={handleStartOAuth} className="w-full gap-2">
              <Github className="h-4 w-4" />
              Connect with GitHub
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select a repository</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoadingRepos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-1">
                  {filteredRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No repositories found
                    </p>
                  ) : (
                    filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={cn(
                          "w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors",
                          selectedRepo?.id === repo.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        )}
                      >
                        <img
                          src={repo.ownerAvatar}
                          alt={repo.owner}
                          className="h-8 w-8 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {repo.fullName}
                            </span>
                            {repo.private ? (
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            {selectedRepo?.id === repo.id && (
                              <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("connect");
                  setGithubToken(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnectRepo}
                disabled={!selectedRepo || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Repository"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "connected" && integration && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Github className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {integration.repo_owner}/{integration.repo_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected repository
                  </p>
                </div>
                <a
                  href={`https://github.com/${integration.repo_owner}/${integration.repo_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Try these in your messages:</p>
              <div className="flex flex-wrap gap-2">
                <code className="text-xs bg-background px-2 py-1 rounded border">
                  #123
                </code>
                <code className="text-xs bg-background px-2 py-1 rounded border">
                  abc1234
                </code>
                <code className="text-xs bg-background px-2 py-1 rounded border">
                  src/index.ts
                </code>
                <code className="text-xs bg-background px-2 py-1 rounded border">
                  branch:main
                </code>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-destructive hover:text-destructive"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("select");
                  handleStartOAuth();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Repository
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
