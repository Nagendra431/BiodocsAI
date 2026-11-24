export interface PricingPlan {
  id: string;
  name: string;
  credits: number;
  priceUSD: number;
  priceINR: number;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    credits: 100,
    priceUSD: 0,
    priceINR: 0,
    features: [
      "100 free credits on signup",
      "Basic AI features",
      "Limited presentations",
      "Community support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    credits: 1000,
    priceUSD: 9.99,
    priceINR: 799,
    features: [
      "1,000 credits/month",
      "All AI features",
      "Unlimited presentations",
      "Priority support",
      "Export to PDF/PPTX",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 5000,
    priceUSD: 29.99,
    priceINR: 2499,
    popular: true,
    features: [
      "5,000 credits/month",
      "Advanced AI models",
      "Custom themes",
      "API access",
      "Priority processing",
      "Dedicated support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: 20000,
    priceUSD: 99.99,
    priceINR: 8499,
    features: [
      "20,000 credits/month",
      "All Pro features",
      "Custom integrations",
      "Team collaboration",
      "SLA guarantee",
      "24/7 support",
    ],
  },
];

// Credit costs for different operations
export const CREDIT_COSTS = {
  // Presentation
  presentation_outline: 5,
  presentation_generate: 10,
  presentation_edit: 3,
  
  // Research
  research_paper: 15,
  deep_research: 20,
  
  // Chat
  chat_message: 1,
  
  // Editor
  editor_generate: 5,
  editor_improve: 3,
  editor_citations: 2,
  
  // Images
  image_generate: 5,
  image_unsplash: 0, // Free
};

export function getCreditCost(operation: string): number {
  return CREDIT_COSTS[operation as keyof typeof CREDIT_COSTS] || 1;
}

export function getPlanById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === planId);
}
