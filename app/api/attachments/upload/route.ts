import { NextRequest, NextResponse } from "next/server";
import { createLocalJWKSet, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { JwksData } from "@/app/auth/jwt";

let jwksData: JwksData | null = null;

const ATTACHMENTS_DIR = join(process.cwd(), "data", "attachments");

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT
    if (jwksData === null) {
      const res = await fetch("http://localhost:3000/api/auth/jwks");
      jwksData = await res.json();
    }

    if (jwksData === null) {
      return NextResponse.json(
        { error: "JWKS data not found" },
        { status: 500 }
      );
    }

    const jwt = request.headers.get("Authorization")?.split(" ")[1] ?? "";

    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(jwt, createLocalJWKSet(jwksData), {
      audience: "http://localhost:3000",
      issuer: "http://localhost:3000",
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate attachment ID and sanitize filename
    const attachmentId = nanoid();
    const sanitizedFilename = sanitizeFilename(file.name);
    const storagePath = `${attachmentId}_${sanitizedFilename}`;

    // Ensure attachments directory exists
    await mkdir(ATTACHMENTS_DIR, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(ATTACHMENTS_DIR, storagePath);
    await writeFile(filePath, buffer);

    // Return attachment metadata
    return NextResponse.json({
      id: attachmentId,
      filename: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: String(file.size),
      storage_path: storagePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}


