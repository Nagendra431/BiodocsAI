import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { StripeService } from "@/lib/payment/stripe-service";
import { getPlanById } from "@/lib/pricing/plans";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();

    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan.priceUSD === 0) {
      return NextResponse.json(
        { error: "Cannot purchase free plan" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await StripeService.createCheckoutSession(
      session.user.id,
      plan.id,
      plan.name,
      Math.round(plan.priceUSD * 100), // Convert to cents
      plan.credits
    );

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
