import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { runJudgeEvaluation } from "../lib/llm";
import { saveEvaluation } from "../lib/api/evaluations";
import { getJudges } from "../lib/api/judges";

export default function QueueDetailPage() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState({ planned: 0, done: 0, failed: 0 });
  const queueId = "queue_1";

  async function handleRun() {
    console.log("▶ handleRun triggered for queue:", queueId);
    setRunning(true);

    try {
      // Fetch Judges
      const judgesRaw = await getJudges();
      const judges = judgesRaw.map((j) => ({
        ...j,
        id: j.id || (j as any).docId || "", // normalize IDs
      }));
      console.log("Judges fetched:", judges.length);

      // Fetch Submissions
      const subsSnap = await getDocs(
        query(collection(db, "submissions"), where("queueId", "==", queueId))
      );
      const submissions = subsSnap.docs.map((d) => d.data());
      console.log("Submissions fetched:", submissions.length);

      // Fetch Assignments
      const assignSnap = await getDocs(
        query(collection(db, "assignments"), where("queueId", "==", queueId))
      );
      const assignments = assignSnap.docs.map((d) => d.data());
      console.log("Assignments fetched:", assignments);

      // Initialize counters
      let plannedCount = 0;
      let doneCount = 0;
      let failedCount = 0;

      const totalTasks: Array<Promise<void>> = [];

      // Iterate submissions → questions → judges
      for (const sub of submissions) {
        for (const q of sub.questions) {
          const questionText = q.data.questionText;
          const answer = sub.answers[q.data.id];

          // Find assignment for this question
          const assignment = assignments.find(
            (a) =>
              a.questionTemplateId === q.data.id ||
              a.questionTemplateId === `${queueId}_${q.data.id}`
          );

          const assignedJudgeIds = assignment?.judgeIds || [];
          const activeJudges = judges.filter((j) =>
            assignedJudgeIds.includes(j.id)
          );

          console.log(
            `Question: ${q.data.id} | Assigned Judges:`,
            activeJudges.map((j) => j.name)
          );
          
          if (sub.attachments && sub.attachments.length > 0) {
            console.log(
              `Submission ${sub.id} has ${sub.attachments.length} attachment(s):`,
              sub.attachments.map((att: any) => `${att.filename} (${att.contentType})`)
            );
          }

          if (activeJudges.length === 0) {
            console.warn(
              `⚠️ No assigned judges found for question ${q.data.id}`
            );
            continue;
          }

  
          // Run each judge
  
          for (const judge of activeJudges) {
            plannedCount++;
            setSummary((prev) => ({ ...prev, planned: plannedCount }));

            const runTask = (async () => {
              try {
                const result = await runJudgeEvaluation({
                  judgePrompt: judge.systemPrompt,
                  questionText,
                  answer: JSON.stringify(answer),
                  model: judge.model,
                  attachments: sub.attachments || [],
                });

                await saveEvaluation({
                  submissionId: sub.id,
                  queueId: sub.queueId,
                  questionTemplateId: q.data.id,
                  judgeId: judge.id!,
                  verdict: result.verdict,
                  reasoning: result.reasoning,
                  model: judge.model,
                  provider: "openai",
                  latencyMs: result.latencyMs,
                  createdAt: Date.now(),
                });

                doneCount++;
                setSummary((prev) => ({ ...prev, done: doneCount }));
                console.log(`Saved evaluation for ${q.data.id} by ${judge.name}`);
              } catch (err) {
                console.error(`Judge ${judge.name} failed:`, err);
                failedCount++;
                setSummary((prev) => ({ ...prev, failed: failedCount }));
              }
            })();

            totalTasks.push(runTask);
          }
        }
      }

      // Wait for all evaluations
      await Promise.all(totalTasks);

      console.log("✅ Run complete:", {
        planned: plannedCount,
        done: doneCount,
        failed: failedCount,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setRunning(false);
    }
  }

  // Render UI
  return (
    <div className="run-page">
      <div className="run-container">
        <div className="run-header">
          <h1>Run Evaluations</h1>
          <p className="run-description">
            Execute AI judge evaluations on submitted answers. Make sure judges are assigned to questions first.
          </p>
        </div>

        <div className="run-section">
          <button
            onClick={handleRun}
            disabled={running}
            className={`run-button ${running ? 'running' : ''}`}
          >
            {running ? (
              <>
                <div className="button-spinner"></div>
                Running Evaluations...
              </>
            ) : (
              <>
                <span className="button-icon">▶️</span>
                Run AI Judges
              </>
            )}
          </button>
        </div>

        <div className="summary-section">
          <h2>Run Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{summary.planned}</div>
              <div className="summary-label">Planned</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.done}</div>
              <div className="summary-label">Completed</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.failed}</div>
              <div className="summary-label">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
