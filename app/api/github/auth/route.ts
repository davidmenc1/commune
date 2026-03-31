import { NextRequest, NextResponse } from "next/server";
import {
  GITHUB_CLIENT_ID,
  GITHUB_OAUTH_URL,
  GITHUB_REDIRECT_URI,
  GITHUB_SCOPES,
} from "@/lib/github";

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

  const authUrl = new URL(GITHUB_OAUTH_URL);
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
  authUrl.searchParams.set("scope", GITHUB_SCOPES);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

