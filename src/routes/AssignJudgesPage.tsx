import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

export default function AssignJudgesPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const queueId = "queue_1"; // You can make this dynamic later

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Fetch all submissions for this queue
        const subsSnap = await getDocs(
          query(collection(db, "submissions"), where("queueId", "==", queueId))
        );
        const allQuestions = subsSnap.docs.flatMap((d) => d.data().questions);
        setQuestions(allQuestions);

        // Fetch all judges
        const judgesSnap = await getDocs(collection(db, "judges"));
        setJudges(judgesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Fetch existing assignments
        const assignSnap = await getDocs(
          query(collection(db, "assignments"), where("queueId", "==", queueId))
        );
        const existing: Record<string, string[]> = {};
        assignSnap.docs.forEach((doc) => {
          const data = doc.data();
          existing[data.questionTemplateId] = data.judgeIds;
        });
        setAssignments(existing);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // toggle judge checkbox
  function toggleJudge(questionId: string, judgeId: string) {
    setAssignments((prev) => {
      const current = prev[questionId] || [];
      const newList = current.includes(judgeId)
        ? current.filter((id) => id !== judgeId)
        : [...current, judgeId];
      return { ...prev, [questionId]: newList };
    });
  }

  async function saveAssignments() {
    try {
      setSaving(true);
      setSuccess("");
      
      for (const [questionId, judgeIds] of Object.entries(assignments)) {
        await setDoc(doc(db, "assignments", `${queueId}_${questionId}`), {
          queueId,
          questionTemplateId: questionId,
          judgeIds,
          createdAt: Date.now(),
        });
      }
      
      setSuccess("Assignments saved successfully!");
    } catch (error) {
      console.error("Failed to save assignments:", error);
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <div className="assign-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading questions and judges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assign-page">
      <div className="assign-container">
        <div className="assign-header">
          <h1>Assign Judges</h1>
          <p className="assign-description">
            Select which judges should evaluate each question. Judges will be assigned to evaluate submissions for their selected questions.
          </p>
        </div>

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}

        {questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❓</div>
            <h3>No questions found</h3>
            <p>Make sure you have uploaded submissions for this queue.</p>
          </div>
        ) : judges.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <h3>No judges available</h3>
            <p>Create some judges first before assigning them to questions.</p>
          </div>
        ) : (
          <>
            <div className="assignment-summary">
              <h2>Assignment Summary</h2>
              <div className="summary-stats">
                <div className="stat-card">
                  <div className="stat-value">{questions.length}</div>
                  <div className="stat-label">Questions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{judges.length}</div>
                  <div className="stat-label">Available Judges</div>
                </div>
              </div>
            </div>

            <div className="questions-section">
              <h2>Question Assignments</h2>
              <div className="questions-list">
                {questions.map((q) => (
                  <div key={q.data.id} className="question-card">
                    <div className="question-header">
                      <h3 className="question-title">{q.data.questionText}</h3>
                    </div>
                    
                    <div className="judges-section">
                      <h4>Select Judges:</h4>
                      <div className="judges-grid">
                        {judges.map((j) => (
                          <label key={j.id} className="judge-checkbox">
                            <input
                              type="checkbox"
                              checked={assignments[q.data.id]?.includes(j.id) || false}
                              onChange={() => toggleJudge(q.data.id, j.id)}
                            />
                            <div className="checkbox-content">
                              <span className="judge-name">{j.name}</span>
                              <span className="judge-model">{j.model}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="save-section">
              <button
                onClick={saveAssignments}
                disabled={saving}
                className="btn btn-primary btn-large"
              >
                {saving ? (
                  <>
                    <div className="btn-spinner"></div>
                    Saving...
                  </>
                ) : (
                  "Save Assignments"
                )}
              </button>
              <p className="save-help">
                This will save all judge assignments for evaluation.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}