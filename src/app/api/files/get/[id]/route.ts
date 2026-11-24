import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Try to fetch from document table first
    const document = await db.document.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (document) {
      return NextResponse.json({
        success: true,
        id: document.id,
        title: document.title,
        content: document.content,
        type: document.type,
        sources: document.sources ? JSON.parse(document.sources as string) : null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      });
    }

    // If not found, try research reports table
    const researchReport = await db.deepResearchReport.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (researchReport) {
      return NextResponse.json({
        success: true,
        id: researchReport.id,
        title: researchReport.topic,
        content: researchReport.markdown,
        type: "research-paper",
        sources: researchReport.pmidsUsed || [],
        wordCount: researchReport.wordCount,
        referenceCount: researchReport.referenceCount,
        createdAt: researchReport.createdAt.toISOString(),
        updatedAt: researchReport.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
