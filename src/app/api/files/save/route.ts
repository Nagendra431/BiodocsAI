import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { FileService } from "@/lib/deep-research/file-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, content, type, sources } = await req.json();

    if (!title || !content || !type) {
      return NextResponse.json(
        { error: "Title, content, and type are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let savedFile;
    let supabaseFilePath: string | null = null;

    // Save to Supabase Storage if it's a deep-research type
    if (type === "deep-research") {
      try {
        console.log("💾 Saving deep-research file to Supabase Storage...");
        const fileService = new FileService();
        supabaseFilePath = await fileService.saveMarkdownFile(
          user.id,
          title,
          content
        );
        console.log("✅ Saved to Supabase Storage:", supabaseFilePath);
      } catch (storageError) {
        console.error("❌ Failed to save to Supabase Storage:", storageError);
        // Continue with database save even if Supabase fails
      }
    }

    if (id) {
      // Update existing file
      savedFile = await db.document.update({
        where: { id },
        data: {
          title,
          content,
          sources: sources ? JSON.stringify(sources) : null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new file
      savedFile = await db.document.create({
        data: {
          title,
          content,
          type,
          sources: sources ? JSON.stringify(sources) : null,
          userId: user.id,
        },
      });
    }

    // Also save to DeepResearchReport table if it's deep-research type
    if (type === "deep-research" && supabaseFilePath) {
      try {
        await db.deepResearchReport.create({
          data: {
            userId: user.id,
            topic: title,
            markdown: content,
            filePath: supabaseFilePath,
            status: "completed",
            wordCount: content.split(/\s+/).length,
            referenceCount: (content.match(/\[\d+\]/g) || []).length,
          },
        });
        console.log("✅ Saved to DeepResearchReport table");
      } catch (dbError) {
        console.error("❌ Failed to save to DeepResearchReport:", dbError);
        // Continue even if this fails
      }
    }

    return NextResponse.json({
      success: true,
      file: savedFile,
      fileId: savedFile.id,
      supabaseFilePath,
    });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }
}
