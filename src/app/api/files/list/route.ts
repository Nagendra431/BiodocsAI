import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    console.log("📂 [FILES/LIST] Fetching files...");
    const session = await auth();
    if (!session?.user?.email) {
      console.log("❌ [FILES/LIST] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ [FILES/LIST] User authenticated:", session.user.email);

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log("❌ [FILES/LIST] User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ [FILES/LIST] User found:", user.id);

    // Fetch all documents for the user
    const documents = await db.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`📄 [FILES/LIST] Found ${documents.length} documents`);

    // Fetch research papers/deep research reports
    const researchReports = await db.deepResearchReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topic: true,
        createdAt: true,
        wordCount: true,
        referenceCount: true,
      },
    });

    console.log(`🔬 [FILES/LIST] Found ${researchReports.length} research reports`);

    // Combine and format all files
    const documentFiles = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      createdAt: doc.createdAt.toISOString(),
      size: "~50 KB",
    }));

    const researchFiles = researchReports.map((report) => ({
      id: report.id,
      title: report.topic,
      type: "research-paper" as const,
      createdAt: report.createdAt.toISOString(),
      size: report.wordCount ? `~${Math.round(report.wordCount / 200)} KB` : "~50 KB",
      wordCount: report.wordCount,
      referenceCount: report.referenceCount,
    }));

    const files = [...documentFiles, ...researchFiles].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`✅ [FILES/LIST] Returning ${files.length} total files`);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
