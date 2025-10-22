import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";

// Tell Firebase this function uses the OPENAI_API_KEY secret
setGlobalOptions({
  region: "us-central1",
  secrets: ["OPENAI_API_KEY"],
});

export const runJudgeEvaluation = onCall<{ 
  judgePrompt: string; 
  questionText: string; 
  answer: string; 
  model: string; 
}, any>(async (request) => {
  const { judgePrompt, questionText, answer, model } = request.data;

  // ✅ Read the injected secret from process.env
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("Missing OPENAI_API_KEY secret");
    throw new Error("Server misconfiguration: no OpenAI API key found.");
  }

  const openai = new OpenAI({ apiKey });

  const messages = [
    {
      role: "system" as const,
      content: [{ type: "text" as const, text: judgePrompt }],
    },
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: `Question: ${questionText}\nAnswer: ${answer}`,
        },
      ],
    },
  ];

  const start = Date.now();

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0,
  });

  const latencyMs = Date.now() - start;
  const text = completion.choices[0]?.message?.content ?? "{}";

  let parsed;
  try {
    parsed = JSON.parse(
      text.replace(/^```json\s*/, "").replace(/```$/, "").trim()
    );
  } catch {
    parsed = { verdict: "inconclusive", reasoning: "Invalid JSON returned" };
  }

  return {
    verdict: parsed.verdict || "inconclusive",
    reasoning: parsed.reasoning || text,
    latencyMs,
  };
});
