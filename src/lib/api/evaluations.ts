import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export type Evaluation = {
  submissionId: string;
  queueId: string;
  questionTemplateId: string;
  judgeId: string;
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
  createdAt: number;
  model: string;
  provider: string;
  latencyMs: number;
  error?: string;
};

export async function saveEvaluation(evaluation: Evaluation) {
  await addDoc(collection(db, "evaluations"), evaluation);
}
