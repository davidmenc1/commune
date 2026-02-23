import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import { GitLabClient } from "@/lib/gitlab";

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

// GET - Fetch projects for a given GitLab access token
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gitlabToken = request.nextUrl.searchParams.get("token");
  if (!gitlabToken) {
    return NextResponse.json(
      { error: "GitLab token is required" },
      { status: 400 }
    );
  }

  try {
    const client = new GitLabClient(gitlabToken);
    const projects = await client.getProjects();

    // Return simplified project data
    const simplifiedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      path: project.path,
      fullPath: project.path_with_namespace,
      namespace: project.namespace.name,
      namespaceAvatar: project.namespace.avatar_url,
      visibility: project.visibility,
      description: project.description,
      webUrl: project.web_url,
      avatarUrl: project.avatar_url,
    }));

    return NextResponse.json({ projects: simplifiedProjects });
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

