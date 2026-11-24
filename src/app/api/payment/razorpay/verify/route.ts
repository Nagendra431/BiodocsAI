import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { RazorpayService } from "@/lib/payment/razorpay-service";
import { CreditService } from "@/lib/credits/credit-service";
import { db } from "@/server/db";
import { getPlanById } from "@/lib/pricing/plans";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentId, signature, planId } = await req.json();

    // Verify payment signature
    const isValid = RazorpayService.verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get payment details
    const payment = await RazorpayService.getPayment(paymentId);

    // Create payment record and add credits
    await db.$transaction([
      db.payment.create({
        data: {
          userId: session.user.id,
          amount: payment.amount / 100, // Convert paise to rupees
          currency: "INR",
          status: "completed",
          plan: plan.id,
          creditsAdded: plan.credits,
          razorpayPaymentId: paymentId,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: {
          credits: { increment: plan.credits },
          subscriptionPlan: plan.id,
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: plan.credits,
          type: "purchase",
          description: `Purchased ${plan.name} plan`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Payment verified and credits added",
      credits: plan.credits,
    });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
