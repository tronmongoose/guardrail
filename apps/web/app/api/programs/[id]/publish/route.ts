import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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

  // Create Stripe product + price if priced
  let stripeProductId = program.stripeProductId;
  let stripePriceId = program.stripePriceId;

  if (program.priceInCents > 0 && !stripeProductId) {
    const product = await stripe.products.create({
      name: program.title,
      metadata: { programId: program.id },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: program.priceInCents,
      currency: program.currency,
    });
    stripeProductId = product.id;
    stripePriceId = price.id;
  }

  const updated = await prisma.program.update({
    where: { id },
    data: { published: true, stripeProductId, stripePriceId },
  });

  return NextResponse.json(updated);
}
