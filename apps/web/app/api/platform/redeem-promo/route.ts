import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function getValidCodes(): Set<string> {
  const envCodes = process.env.PLATFORM_PROMO_CODES;
  const raw = envCodes ? envCodes : "JOURNEY";
  return new Set(
    raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
  );
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Idempotent — already has access
  if (user.platformPromoGranted || user.platformPaymentComplete) {
    logger.info({ operation: "platform.redeem_promo.already_granted", userId: user.id });
    return NextResponse.json({ success: true });
  }

  let code: string;
  try {
    const body = await req.json();
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
  }

  const validCodes = getValidCodes();
  if (!validCodes.has(code)) {
    logger.warn({ operation: "platform.redeem_promo.invalid_code", userId: user.id });
    return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { platformPromoGranted: true },
  });

  logger.info({ operation: "platform.redeem_promo.success", userId: user.id, code });

  return NextResponse.json({ success: true });
}
