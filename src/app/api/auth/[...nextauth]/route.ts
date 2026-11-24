import { handlers } from "@/server/auth";
import { type NextRequest } from "next/server";

// Proper error handling wrapper for auth handlers
const handleAuth = async (req: NextRequest, handler: typeof handlers.GET | typeof handlers.POST) => {
  try {
    return await handler(req);
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({
        error: "Authentication error",
        message: error instanceof Error ? error.message : "Internal Server Error"
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export async function GET(req: NextRequest) {
  return handleAuth(req, handlers.GET);
}

export async function POST(req: NextRequest) {
  return handleAuth(req, handlers.POST);
}
