import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "us-central1");

export async function runJudgeEvaluation({
  judgePrompt,
  questionText,
  answer,
  model,
  attachments,
}: {
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
}) {
  const callFunction = httpsCallable(functions, "runJudgeEvaluation");
  const result = await callFunction({ judgePrompt, questionText, answer, model, attachments });
  return result.data as {
    verdict: "pass" | "fail" | "inconclusive";
    reasoning: string;
    latencyMs: number;
  };
}
