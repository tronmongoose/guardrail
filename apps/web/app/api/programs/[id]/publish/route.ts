import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If program has a price and Stripe is configured, create product/price
  let stripeProductId = program.stripeProductId;
  let stripePriceId = program.stripePriceId;

  if (program.priceInCents > 0 && isStripeConfigured()) {
    const stripe = getStripe();

    // Create or update Stripe product
    if (!stripeProductId) {
      const product = await stripe.products.create({
        name: program.title,
        description: program.description || undefined,
        metadata: { programId: program.id },
      });
      stripeProductId = product.id;
    } else {
      await stripe.products.update(stripeProductId, {
        name: program.title,
        description: program.description || undefined,
      });
    }

    // Create new price (Stripe prices are immutable, so we always create new)
    const price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: program.priceInCents,
      currency: program.currency,
    });
    stripePriceId = price.id;
  }

  const updated = await prisma.program.update({
    where: { id },
    data: {
      published: true,
      stripeProductId,
      stripePriceId,
    },
  });

  return NextResponse.json(updated);
}
