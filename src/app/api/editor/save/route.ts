import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, content, htmlContent } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
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

    let savedDocument;

    if (id) {
      // Update existing document
      savedDocument = await db.document.update({
        where: { id },
        data: {
          title,
          content,
          updatedAt: new Date(),
        },
      });
      console.log("✅ Document updated:", savedDocument.id);
    } else {
      // Create new document
      savedDocument = await db.document.create({
        data: {
          title,
          content,
          type: "document", // AI editor documents
          userId: user.id,
        },
      });
      console.log("✅ Document created:", savedDocument.id);
    }

    return NextResponse.json({
      success: true,
      document: savedDocument,
      documentId: savedDocument.id,
    });
  } catch (error) {
    console.error("❌ Error saving document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
