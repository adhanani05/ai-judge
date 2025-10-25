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
  attachments?: Array<{
    id: string;
    filename: string;
    storagePath: string;
    downloadURL: string;
    contentType: string;
    uploadedAt: number;
  }>;
}, any>(async (request) => {
  const { judgePrompt, questionText, answer, model, attachments = [] } = request.data;

  // ✅ Read the injected secret from process.env
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("Missing OPENAI_API_KEY secret");
    throw new Error("Server misconfiguration: no OpenAI API key found.");
  }

  const openai = new OpenAI({ apiKey });

  // Check if model supports vision
  const visionModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview', 'gpt-4o-mini'];
  const supportsVision = visionModels.includes(model);

  // Build content array for user message
  const userContent: any[] = [
    {
      type: "text" as const,
      text: `Question: ${questionText}\nAnswer: ${answer}`,
    },
  ];

  // Process attachments (images only)
  if (attachments.length > 0) {
    for (const attachment of attachments) {
      const attachmentUrl = attachment.downloadURL;
      
      if (attachmentUrl.endsWith(".png") || attachmentUrl.endsWith(".jpg") || attachmentUrl.endsWith(".jpeg") || attachmentUrl.endsWith(".webp")) {
        // For images: add as image_url content
        if (supportsVision) {
          userContent.push({
            type: "image_url" as const,
            image_url: { url: attachmentUrl }
          });
        } else {
          userContent.push({
            type: "text" as const,
            text: `[Image attachment: ${attachment.filename} - not processed by ${model}]`
          });
        }
      } else {
        // For non-image files, add as text note
        userContent.push({
          type: "text" as const,
          text: `[Attachment: ${attachment.filename} - ${attachment.contentType}]`
        });
      }
    }
  }

  const messages = [
    {
      role: "system" as const,
      content: [{ type: "text" as const, text: judgePrompt }],
    },
    {
      role: "user" as const,
      content: userContent,
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
