import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import { GitHubClient } from "@/lib/github";

function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authHeader.replace("Bearer ", "");
  try {
    const payload = decodeJwt(jwt);
    return jwtSchema.parse(payload);
  } catch {
    return null;
  }
}

// GET - Fetch repositories for a given GitHub access token
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const githubToken = request.nextUrl.searchParams.get("token");
  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub token is required" },
      { status: 400 }
    );
  }

  try {
    const client = new GitHubClient(githubToken);
    const repos = await client.getRepos();

    // Return simplified repo data
    const simplifiedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      private: repo.private,
      description: repo.description,
      htmlUrl: repo.html_url,
    }));

    return NextResponse.json({ repos: simplifiedRepos });
  } catch (err) {
    console.error("Failed to fetch repos:", err);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

