import { db } from "@/server/db";
import { getCreditCost } from "@/lib/pricing/plans";

export class CreditService {
  /**
   * Check if user has enough credits for an operation
   */
  static async hasEnoughCredits(
    userId: string,
    operation: string
  ): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) return false;

    const cost = getCreditCost(operation);
    return user.credits >= cost;
  }

  /**
   * Deduct credits from user account
   */
  static async deductCredits(
    userId: string,
    operation: string,
    description: string
  ): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
    const cost = getCreditCost(operation);

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (user.credits < cost) {
        return {
          success: false,
          error: `Insufficient credits. Need ${cost}, have ${user.credits}`,
        };
      }

      // Deduct credits and create transaction in a single transaction
      const result = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { decrement: cost } },
        }),
        db.creditTransaction.create({
          data: {
            userId,
            amount: -cost,
            type: "usage",
            description,
            operation,
          },
        }),
      ]);

      return {
        success: true,
        remainingCredits: result[0].credits,
      };
    } catch (error) {
      console.error("Error deducting credits:", error);
      return { success: false, error: "Failed to deduct credits" };
    }
  }

  /**
   * Add credits to user account
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: "purchase" | "bonus" | "refund",
    description: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const result = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { increment: amount } },
        }),
        db.creditTransaction.create({
          data: {
            userId,
            amount,
            type,
            description,
          },
        }),
      ]);

      return {
        success: true,
        newBalance: result[0].credits,
      };
    } catch (error) {
      console.error("Error adding credits:", error);
      return { success: false, error: "Failed to add credits" };
    }
  }

  /**
   * Get user's current credit balance
   */
  static async getBalance(userId: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    return user?.credits || 0;
  }

  /**
   * Get user's credit transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    return db.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
