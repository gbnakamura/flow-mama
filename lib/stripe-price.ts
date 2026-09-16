import type Stripe from "stripe";

export function lookupKeyForQuantity(quantity: number) {
  if (quantity >= 10) return "flow_mama_10_plus";
  if (quantity >= 6) return "flow_mama_6_9";
  return "flow_mama_1_5";
}

export function priceForQuantity(price: Stripe.Price, quantity: number) {
  if (quantity < 1) throw new Error("Quantity must be at least one.");

  if (price.billing_scheme === "per_unit") {
    if (price.unit_amount === null) throw new Error("Stripe price has no unit amount.");
    return { unitPricePence: price.unit_amount, totalPence: price.unit_amount * quantity };
  }

  if (price.tiers_mode !== "volume" || !price.tiers?.length) {
    throw new Error("The Stripe price must use volume pricing.");
  }

  const tier = price.tiers.find((candidate) => candidate.up_to === null || quantity <= candidate.up_to);
  if (!tier || tier.unit_amount === null) throw new Error("No Stripe pricing tier matches this booking.");

  const flatAmount = tier.flat_amount ?? 0;
  return {
    unitPricePence: tier.unit_amount,
    totalPence: tier.unit_amount * quantity + flatAmount,
  };
}
