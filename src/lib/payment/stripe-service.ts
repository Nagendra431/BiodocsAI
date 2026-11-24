import Stripe from "stripe";
import { env } from "@/env";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

export class StripeService {
  static async createCheckoutSession(
    userId: string,
    planId: string,
    planName: string,
    amount: number, // in cents
    credits: number
  ) {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${planName} Plan`,
              description: `${credits.toLocaleString()} credits`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.NEXTAUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXTAUTH_URL}/pricing`,
      metadata: {
        userId,
        planId,
        credits: credits.toString(),
      },
    });

    return session;
  }

  static async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<Stripe.Event | null> {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return null;
    }

    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);
      return null;
    }
  }

  static async getSession(sessionId: string) {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    return stripe.checkout.sessions.retrieve(sessionId);
  }
}
