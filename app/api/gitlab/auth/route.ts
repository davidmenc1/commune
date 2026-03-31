import { NextRequest, NextResponse } from "next/server";
import {
  GITLAB_CLIENT_ID,
  GITLAB_OAUTH_URL,
  GITLAB_REDIRECT_URI,
  GITLAB_SCOPES,
} from "@/lib/gitlab";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 }
    );
  }

  // Store channelId in state parameter for the callback
  const state = Buffer.from(JSON.stringify({ channelId })).toString("base64");

  const authUrl = new URL(GITLAB_OAUTH_URL);
  authUrl.searchParams.set("client_id", GITLAB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GITLAB_REDIRECT_URI);
  authUrl.searchParams.set("scope", GITLAB_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

