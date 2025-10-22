import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "us-central1");

export async function runJudgeEvaluation({
  judgePrompt,
  questionText,
  answer,
  model,
}: {
  judgePrompt: string;
  questionText: string;
  answer: string;
  model: string;
}) {
  const callFunction = httpsCallable(functions, "runJudgeEvaluation");
  const result = await callFunction({ judgePrompt, questionText, answer, model });
  return result.data as {
    verdict: "pass" | "fail" | "inconclusive";
    reasoning: string;
    latencyMs: number;
  };
}
