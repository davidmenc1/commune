import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { db } from "@/app/db/db";
import { attachmentsTable } from "@/app/db/schema";
import { eq } from "drizzle-orm";

const ATTACHMENTS_DIR = join(process.cwd(), "data", "attachments");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Look up attachment in database
    const attachment = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, id))
      .limit(1);

    if (attachment.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const { storage_path, file_type, filename } = attachment[0];
    const filePath = join(ATTACHMENTS_DIR, storage_path);

    // Check if file exists
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine if we should inline (display) or download
    const download = request.nextUrl.searchParams.get("download") === "true";

    const headers: HeadersInit = {
      "Content-Type": file_type,
      "Content-Length": String(fileBuffer.length),
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${filename}"`;
    }

    // Cache for images and other static content
    if (file_type.startsWith("image/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Serve attachment error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}


