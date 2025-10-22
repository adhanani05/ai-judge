import { useEffect, useState } from "react";
import {
  getJudges,
  createJudge,
  updateJudge,
  deleteJudge,
  type Judge,
} from "../lib/api/judges";

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // form state
  const [editing, setEditing] = useState<Judge | null>(null);
  const [form, setForm] = useState({
    name: "",
    model: "",
    systemPrompt: "",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await getJudges();
      setJudges(data);
    } catch (err) {
      setError("Failed to load judges. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      errors.name = "Judge name is required";
    }
    
    if (!form.model.trim()) {
      errors.model = "Model is required";
    }
    
    if (!form.systemPrompt.trim()) {
      errors.systemPrompt = "System prompt is required";
    } else if (form.systemPrompt.trim().length < 10) {
      errors.systemPrompt = "System prompt must be at least 10 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const now = Date.now();
      const payload = {
        ...form,
        createdAt: editing?.createdAt ?? now,
        updatedAt: now,
      };

      if (editing?.id) {
        await updateJudge(editing.id, payload);
        setSuccess("Judge updated successfully!");
      } else {
        await createJudge(payload);
        setSuccess("Judge created successfully!");
      }

      setForm({ name: "", model: "", systemPrompt: "", active: true });
      setEditing(null);
      await load();
    } catch (err) {
      setError("Failed to save judge. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      await deleteJudge(id);
      setSuccess("Judge deleted successfully!");
      await load();
    } catch (err) {
      setError("Failed to delete judge. Please try again.");
      console.error(err);
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  const handleEdit = (judge: Judge) => {
    setEditing(judge);
    setForm({
      name: judge.name,
      model: judge.model,
      systemPrompt: judge.systemPrompt,
      active: judge.active,
    });
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ name: "", model: "", systemPrompt: "", active: true });
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="judges-page">
      <div className="judges-container">
        <div className="judges-header">
          <h1>AI Judges</h1>
          <p className="judges-description">
            Manage AI judges that will evaluate submissions. Each judge uses a specific model and system prompt.
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">❌</span>
            {error}
          </div>
        )}

        {/* Form */}
        <div className="judges-form-section">
          <h2>{editing ? "Edit Judge" : "Add New Judge"}</h2>
          <form onSubmit={handleSubmit} className="judges-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Judge Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g., GPT-4 Judge"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={formErrors.name ? "error" : ""}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="model">Model *</label>
                <input
                  id="model"
                  type="text"
                  placeholder="e.g., gpt-4o-mini"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={formErrors.model ? "error" : ""}
                />
                {formErrors.model && <span className="error-text">{formErrors.model}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="systemPrompt">System Prompt / Rubric *</label>
              <textarea
                id="systemPrompt"
                placeholder="Enter the system prompt that defines how this judge should evaluate submissions..."
                rows={4}
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                className={formErrors.systemPrompt ? "error" : ""}
              />
              {formErrors.systemPrompt && <span className="error-text">{formErrors.systemPrompt}</span>}
              <div className="form-help">
                This prompt will be used to instruct the AI model on how to evaluate submissions.
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="checkbox-text">Active</span>
              </label>
              <div className="form-help">
                Only active judges will be available for assignment to submissions.
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? "Saving..." : editing ? "Update Judge" : "Add Judge"}
              </button>
              
              {editing && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Judges List */}
        <div className="judges-list-section">
          <h2>Current Judges ({judges.length})</h2>
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading judges...</p>
            </div>
          ) : judges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h3>No judges yet</h3>
              <p>Create your first AI judge to start evaluating submissions.</p>
            </div>
          ) : (
            <div className="judges-grid">
              {judges.map((judge) => (
                <div key={judge.id} className="judge-card">
                  <div className="judge-header">
                    <h3 className="judge-name">{judge.name}</h3>
                    <div className={`judge-status ${judge.active ? 'active' : 'inactive'}`}>
                      {judge.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="judge-details">
                    <div className="judge-detail">
                      <span className="detail-label">Model:</span>
                      <span className="detail-value">{judge.model}</span>
                    </div>
                    
                    <div className="judge-detail">
                      <span className="detail-label">System Prompt:</span>
                      <div className="prompt-preview">
                        {expandedPrompt === judge.id 
                          ? judge.systemPrompt
                          : judge.systemPrompt.length > 100 
                            ? `${judge.systemPrompt.substring(0, 100)}...` 
                            : judge.systemPrompt
                        }
                        {judge.systemPrompt.length > 100 && (
                          <button
                            className="expand-prompt-btn"
                            onClick={() => setExpandedPrompt(
                              expandedPrompt === judge.id ? null : judge.id!
                            )}
                          >
                            {expandedPrompt === judge.id ? 'Show Less' : 'Show More'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="judge-detail">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(judge.createdAt)}</span>
                    </div>
                    
                    {judge.updatedAt !== judge.createdAt && (
                      <div className="judge-detail">
                        <span className="detail-label">Updated:</span>
                        <span className="detail-value">{formatDate(judge.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="judge-actions">
                    <button
                      onClick={() => handleEdit(judge)}
                      className="btn btn-sm btn-outline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(judge.id!)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this judge? This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="btn btn-danger"
                >
                  Delete Judge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}