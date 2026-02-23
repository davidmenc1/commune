"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Copy, Loader2, Plus, Trash2 } from "lucide-react";

type Webhook = {
  id: string;
  name: string;
  created_at: string | number;
  last_used_at: string | number | null;
};

type CreateResponse = {
  webhook: Webhook;
  token: string;
  url: string;
};

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    console.error("Failed to copy", err);
  }
}

export function WebhookDialog({
  channelId,
  jwt,
  open,
  onOpenChange,
}: {
  channelId: string;
  jwt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('webhooks');
  const tCommon = useTranslations('common');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lastCreated, setLastCreated] = useState<CreateResponse | null>(null);

  function formatDate(value?: string | number | null) {
    if (!value) return tCommon('never');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return tCommon('unknown');
    return date.toLocaleString();
  }

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${jwt}` }),
    [jwt]
  );

  useEffect(() => {
    if (!open) return;
    void loadWebhooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channelId, jwt]);

  async function loadWebhooks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/channels/${channelId}/webhooks`,
        { headers: authHeader }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('failedToLoad'));
      }
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('failedToCreate'));
      }
      setLastCreated(data as CreateResponse);
      setWebhooks((prev) => [...prev, data.webhook]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreate'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteWebhook(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/channels/${channelId}/webhooks/${id}`,
        {
          method: "DELETE",
          headers: authHeader,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('failedToDelete'));
      }
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (lastCreated?.webhook.id === id) {
        setLastCreated(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToDelete'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('manageWebhooks')}</DialogTitle>
          <DialogDescription>
            {t('noWebhooksDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('title')}</p>
            <div className="rounded-md border">
              <ScrollArea className="max-h-64">
                <div className="divide-y">
                  {loading ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('loading')}
                    </div>
                  ) : webhooks.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      {t('noWebhooks')}
                    </div>
                  ) : (
                    webhooks.map((hook) => (
                      <div
                        key={hook.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{hook.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('created')} {formatDate(hook.created_at)} · {t('lastUsed')}{" "}
                            {formatDate(hook.last_used_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWebhook(hook.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('createWebhook')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder={t('webhookName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createWebhook} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                {tCommon('create')}
              </Button>
            </div>
            {lastCreated && (
              <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium">
                  {t('webhookCreated')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{lastCreated.webhook.name}</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">URL:</span>
                    <code className="rounded bg-muted px-2 py-1 text-[11px]">
                      {lastCreated.url}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(lastCreated.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Token:</span>
                    <code className="rounded bg-muted px-2 py-1 text-[11px]">
                      {lastCreated.token}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(lastCreated.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground">
                    {t('saveDetails')}
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="font-medium">Example request</p>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-[11px] break-all">
                        {`curl -X POST \\\n  -H "Content-Type: application/json" \\\n  -d '{"content":"Hello from webhook"}' \\\n  "${lastCreated.url}"`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(
                            `curl -X POST -H "Content-Type: application/json" -d '{"content":"Hello from webhook"}' "${lastCreated.url}"`
                          )
                        }
                        aria-label="Copy example curl"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Payload must include a JSON string field named <code>content</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

