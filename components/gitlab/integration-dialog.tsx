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
  ExternalLink,
  Loader2,
  Check,
  Search,
  Lock,
  Globe,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { useChannelGitLabIntegration } from "./use-gitlab-data";
import { cn } from "@/lib/utils";

interface GitLabProject {
  id: number;
  name: string;
  path: string;
  fullPath: string;
  namespace: string;
  namespaceAvatar: string | null;
  visibility: "private" | "internal" | "public";
  description: string | null;
  webUrl: string;
  avatarUrl: string | null;
}

interface GitLabIntegrationDialogProps {
  channelId: string;
  channelName: string;
  jwt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Check URL params once on module load to avoid race conditions
function getInitialGitLabParams() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const gitlabSetup = params.get("gitlab_setup");
  const token = params.get("gitlab_token");
  if (gitlabSetup === "pending" && token) {
    return { token };
  }
  return null;
}

// Custom GitLab icon component since lucide doesn't have one
function GitLabLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M4.845.904c-.435 0-.82.28-.955.692C2.639 5.449 1.246 9.728.07 13.335a1.437 1.437 0 00.522 1.607l11.071 8.045c.2.145.472.144.67-.004l11.073-8.04a1.436 1.436 0 00.522-1.61c-1.285-3.942-2.683-8.256-3.817-11.746a1.004 1.004 0 00-.957-.684.987.987 0 00-.949.69l-2.405 7.408H8.203l-2.41-7.408a.987.987 0 00-.942-.69h-.006z" />
    </svg>
  );
}

export function GitLabIntegrationDialog({
  channelId,
  channelName,
  jwt,
  open,
  onOpenChange,
}: GitLabIntegrationDialogProps) {
  const { integration, mutate } = useChannelGitLabIntegration(channelId, jwt);
  const initialParams = useRef(getInitialGitLabParams());
  const hasProcessedParams = useRef(false);

  const [gitlabToken, setGitLabToken] = useState<string | null>(
    initialParams.current?.token || null
  );
  const [step, setStep] = useState<"connect" | "select" | "connected">(() => {
    if (initialParams.current?.token) return "select";
    if (integration) return "connected";
    return "connect";
  });
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<GitLabProject | null>(null);
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
    url.searchParams.delete("gitlab_setup");
    url.searchParams.delete("gitlab_token");
    window.history.replaceState({}, "", url.toString());
  }, [onOpenChange]);

  // Update step when integration changes (but not if we're in select mode with a token)
  useEffect(() => {
    if (integration) {
      setStep("connected");
    } else if (!gitlabToken && step !== "select") {
      setStep("connect");
    }
  }, [integration, gitlabToken, step]);

  // Load projects when we have a token
  useEffect(() => {
    if (gitlabToken && step === "select") {
      loadProjects();
    }
  }, [gitlabToken, step]);

  const loadProjects = async () => {
    if (!gitlabToken) return;

    setIsLoadingProjects(true);
    try {
      const response = await fetch(
        `/api/gitlab/repos?token=${encodeURIComponent(gitlabToken)}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleStartOAuth = () => {
    // Open GitLab OAuth in the same window
    window.location.href = `/api/gitlab/auth?channelId=${channelId}`;
  };

  const handleConnectProject = async () => {
    if (!selectedProject || !gitlabToken) return;

    setIsConnecting(true);
    try {
      const response = await fetch("/api/gitlab/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          channelId,
          accessToken: gitlabToken,
          projectId: selectedProject.id,
          projectPath: selectedProject.fullPath,
        }),
      });

      if (response.ok) {
        mutate();
        setStep("connected");
        setGitLabToken(null);
        setSelectedProject(null);
      }
    } catch (err) {
      console.error("Failed to connect project:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(
        `/api/gitlab/integrations?channelId=${channelId}`,
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

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.fullPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitLabLogo className="h-5 w-5 text-[#FC6D26]" />
            GitLab Integration
          </DialogTitle>
          <DialogDescription>
            Connect a GitLab project to #{channelName} for rich issue, MR,
            and commit mentions.
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm">What you can do:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#FC6D26] mt-0.5">•</span>
                  Mention issues with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    #123
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FC6D26] mt-0.5">•</span>
                  Mention merge requests with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    !456
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FC6D26] mt-0.5">•</span>
                  Reference commits with SHA hashes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FC6D26] mt-0.5">•</span>
                  Link to files with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    src/file.ts:42
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FC6D26] mt-0.5">•</span>
                  Hover over mentions for rich previews
                </li>
              </ul>
            </div>

            <Button onClick={handleStartOAuth} className="w-full gap-2 bg-[#FC6D26] hover:bg-[#E24329]">
              <GitLabLogo className="h-4 w-4" />
              Connect with GitLab
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select a project</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-1">
                  {filteredProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No projects found
                    </p>
                  ) : (
                    filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={cn(
                          "w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors",
                          selectedProject?.id === project.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        )}
                      >
                        {project.avatarUrl ? (
                          <img
                            src={project.avatarUrl}
                            alt={project.name}
                            className="h-8 w-8 rounded"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-[#FC6D26]/10 flex items-center justify-center">
                            <GitLabLogo className="h-4 w-4 text-[#FC6D26]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {project.fullPath}
                            </span>
                            {project.visibility === "private" ? (
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : project.visibility === "internal" ? (
                              <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                            ) : (
                              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            {selectedProject?.id === project.id && (
                              <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {project.description}
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
                  setGitLabToken(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnectProject}
                disabled={!selectedProject || isConnecting}
                className="bg-[#FC6D26] hover:bg-[#E24329]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Project"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "connected" && integration && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#FC6D26]/10 flex items-center justify-center">
                  <GitLabLogo className="h-5 w-5 text-[#FC6D26]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {integration.project_path}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected project
                  </p>
                </div>
                <a
                  href={`https://gitlab.com/${integration.project_path}`}
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
                  !456
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
                Change Project
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

