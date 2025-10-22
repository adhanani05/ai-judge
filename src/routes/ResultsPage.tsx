import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

type Evaluation = {
  id?: string;
  submissionId: string;
  queueId: string;
  questionTemplateId: string;
  judgeId: string;
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
  createdAt: number;
  model: string;
  provider: string;
};

export default function ResultsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filtered, setFiltered] = useState<Evaluation[]>([]);
  const [judgesMap, setJudgesMap] = useState<Record<string, string>>({});
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any>>({});
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<string | null>(null);
  const [expandedJudges, setExpandedJudges] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      // --- Load evaluations
      const evalSnap = await getDocs(collection(db, "evaluations"));
      const evals = evalSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Evaluation) }));
      setEvaluations(evals);
      setFiltered(evals);

      // --- Load judges
      const judgeSnap = await getDocs(collection(db, "judges"));
      const judgeMap: Record<string, string> = {};
      judgeSnap.docs.forEach((d) => {
        const data = d.data();
        judgeMap[d.id] = data.name || "Unnamed Judge";
      });
      setJudgesMap(judgeMap);

      // --- Load submissions
      const subsSnap = await getDocs(collection(db, "submissions"));
      const questionMap: Record<string, string> = {};
      const submissionMap: Record<string, any> = {};
      subsSnap.docs.forEach((doc) => {
        const data = doc.data() as any;
        submissionMap[data.id] = data;
        data.questions?.forEach((q: any) => {
          if (q.data?.id && q.data?.questionText)
            questionMap[q.data.id] = q.data.questionText;
        });
      });
      setQuestionsMap(questionMap);
      setSubmissionsMap(submissionMap);
    }

    loadData();
  }, []);

  // --- Filters
  useEffect(() => {
    let list = [...evaluations];

    if (selectedJudges.length)
      list = list.filter((e) => selectedJudges.includes(e.judgeId));
    if (selectedQuestions.length)
      list = list.filter((e) => selectedQuestions.includes(e.questionTemplateId));
    if (selectedVerdicts.length)
      list = list.filter((e) => selectedVerdicts.includes(e.verdict));

    setFiltered(list);
  }, [selectedJudges, selectedQuestions, selectedVerdicts, evaluations]);

  // --- Stats
  const passCount = filtered.filter((e) => e.verdict === "pass").length;
  const total = filtered.length;
  const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : "0.0";

  function toggleFilter(
    current: string[],
    setter: (val: string[]) => void,
    value: string
  ) {
    setter(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  }

  function renderExpandableText(
    text: string,
    expandedState: string | null,
    setExpandedState: (val: string | null) => void,
    itemId: string,
    maxLength: number = 50,
    buttonClass: string = "expand-reasoning-btn"
  ) {
    const isExpanded = expandedState === itemId;
    const shouldTruncate = text.length > maxLength;
    
    return (
      <div className="expandable-content">
        {isExpanded || !shouldTruncate
          ? text
          : `${text.substring(0, maxLength)}...`
        }
        {shouldTruncate && (
          <button
            className={buttonClass}
            onClick={() => setExpandedState(
              isExpanded ? null : itemId
            )}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    );
  }

  const uniqueJudgeIds = Array.from(new Set(evaluations.map((e) => e.judgeId)));
  const uniqueQuestionIds = Array.from(
    new Set(evaluations.map((e) => e.questionTemplateId))
  );

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <h1>AI Judge Results</h1>
          <p className="results-description">
            View and analyze evaluation results from AI judges. Use filters to focus on specific data.
          </p>
        </div>

        {/* Summary */}
        <div className="summary-section">
          <h2>Evaluation Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{passRate}%</div>
              <div className="summary-label">Pass Rate</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{total}</div>
              <div className="summary-label">Total Evaluations</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{passCount}</div>
              <div className="summary-label">Passed</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{total - passCount}</div>
              <div className="summary-label">Failed/Inconclusive</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <h2>Filters</h2>
          <div className="filters-grid">
            <div className="filter-group">
              <h3>Filter by Judge</h3>
              <div className="filter-options">
                {uniqueJudgeIds.map((id) => (
                  <label key={id} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedJudges.includes(id)}
                      onChange={() => toggleFilter(selectedJudges, setSelectedJudges, id)}
                    />
                    <span className="checkbox-text">
                      {renderExpandableText(
                        judgesMap[id] || id,
                        expandedJudges,
                        setExpandedJudges,
                        `filter-judge-${id}`,
                        30,
                        "expand-filter-btn"
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Filter by Question</h3>
              <div className="filter-options">
                {uniqueQuestionIds.map((id) => (
                  <label key={id} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(id)}
                      onChange={() =>
                        toggleFilter(selectedQuestions, setSelectedQuestions, id)
                      }
                    />
                    <span className="checkbox-text">
                      {renderExpandableText(
                        questionsMap[id] || id,
                        expandedQuestions,
                        setExpandedQuestions,
                        `filter-${id}`,
                        40,
                        "expand-filter-btn"
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Filter by Verdict</h3>
              <div className="filter-options">
                {["pass", "fail", "inconclusive"].map((v) => (
                  <label key={v} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedVerdicts.includes(v)}
                      onChange={() => toggleFilter(selectedVerdicts, setSelectedVerdicts, v)}
                    />
                    <span className={`checkbox-text verdict-${v}`}>{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="results-section">
          <h2>Evaluation Results</h2>
          <div className="table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Question</th>
                  <th>Judge</th>
                  <th>Verdict</th>
                  <th>Reasoning</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="submission-cell">
                      {submissionsMap[e.submissionId]?.id || e.submissionId}
                    </td>
                    <td className="question-cell">
                      {renderExpandableText(
                        questionsMap[e.questionTemplateId] || e.questionTemplateId,
                        expandedQuestions,
                        setExpandedQuestions,
                        `${e.id}-question`,
                        60,
                        "expand-question-btn"
                      )}
                    </td>
                    <td className="judge-cell">
                      {renderExpandableText(
                        judgesMap[e.judgeId] || e.judgeId,
                        expandedJudges,
                        setExpandedJudges,
                        `${e.id}-judge`,
                        30,
                        "expand-judge-btn"
                      )}
                    </td>
                    <td className={`verdict-cell verdict-${e.verdict}`}>
                      <span className={`verdict-badge verdict-${e.verdict}`}>
                        {e.verdict}
                      </span>
                    </td>
                    <td className="reasoning-cell">
                      {renderExpandableText(
                        e.reasoning,
                        expandedReasoning,
                        setExpandedReasoning,
                        e.id!,
                        100,
                        "expand-reasoning-btn"
                      )}
                    </td>
                    <td className="date-cell">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No evaluations found</h3>
                        <p>Try adjusting your filters or run some evaluations first.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
