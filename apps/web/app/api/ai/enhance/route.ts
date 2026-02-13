import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type EnhanceType = "outcome" | "description" | "transformation";

const PROMPTS: Record<EnhanceType, string> = {
  outcome: `You are a marketing expert helping course creators write compelling outcome statements.

Take the user's rough outcome statement and transform it into a specific, measurable, and compelling version.

Guidelines:
- Keep it to 1-2 sentences max
- Make it specific and measurable (e.g., "10lbs of muscle" not "get fit")
- Use active, transformation-focused language
- Focus on the end result, not the process

Input: "{input}"

Respond with ONLY the improved outcome statement, no quotes or explanation.`,

  description: `You are a copywriting expert helping course creators write engaging program descriptions.

Take the user's rough description and transform it into compelling sales copy.

Guidelines:
- Keep it to 2-3 sentences max
- Lead with the transformation or benefit
- Be specific about what learners will achieve
- Create urgency or emotional connection

Input: "{input}"

Respond with ONLY the improved description, no quotes or explanation.`,

  transformation: `You are a marketing expert helping course creators articulate their unique transformation.

Take the user's rough transformation statement and make it specific and compelling.

Guidelines:
- Use "from X to Y" format when possible
- Be specific about the before and after states
- Make it measurable and believable
- Keep it to 1-2 sentences

Input: "{input}"

Respond with ONLY the improved transformation statement, no quotes or explanation.`,
};

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, type = "outcome" } = body as { text: string; type?: EnhanceType };

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide at least 10 characters to enhance" },
        { status: 400 }
      );
    }

    const promptTemplate = PROMPTS[type];
    if (!promptTemplate) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const prompt = promptTemplate.replace("{input}", text.trim());

    // Try Anthropic first, then OpenAI
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let enhanced: string;

    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Anthropic API error: ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      enhanced = data.content[0].text.trim();
    } else if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 256,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      enhanced = data.choices[0].message.content.trim();
    } else {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    logger.info({
      operation: "ai.enhance",
      userId: user.id,
      type,
      inputLength: text.length,
      outputLength: enhanced.length,
    });

    return NextResponse.json({ enhanced });
  } catch (error) {
    logger.error({ operation: "ai.enhance_failed" }, error);
    return NextResponse.json(
      { error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}
