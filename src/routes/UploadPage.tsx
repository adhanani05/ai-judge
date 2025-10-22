import { useState, useRef } from "react";
import { z } from "zod";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

// Firestore helpers
async function saveSubmission(submission: any) {
  await setDoc(doc(db, "submissions", submission.id), submission, { merge: true });
}
async function saveQueue(queueId: string) {
  await setDoc(doc(db, "queues", queueId), { id: queueId, createdAt: Date.now() }, { merge: true });
}

// Zod schema to validate file format
const submissionSchema = z.object({
  id: z.string(),
  queueId: z.string(),
  labelingTaskId: z.string(),
  createdAt: z.number(),
  questions: z.array(
    z.object({
      rev: z.number(),
      data: z.object({
        id: z.string(),
        questionType: z.string(),
        questionText: z.string(),
      }),
    })
  ),
  answers: z.record(
  z.string(),
  z.object({
    choice: z.string().optional(),
    reasoning: z.string().optional(),
    freeForm: z.string().optional(),
  })
),
});

export default function UploadPage() {
  const [fileName, setFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFileName("");
    setParsedCount(0);
    setStatus("idle");
    setErrorMessage("");
    setUploadProgress(0);
  };

  const processFile = async (file: File) => {
    try {
      setFileName(file.name);
      setStatus("uploading");
      setErrorMessage("");
      setUploadProgress(0);

      const text = await file.text();
      const json = JSON.parse(text);
      const submissions = z.array(submissionSchema).parse(json);
      setParsedCount(submissions.length);

      // collect queues
      const queueSet = new Set<string>();
      let processedCount = 0;
      
      for (const sub of submissions) {
        queueSet.add(sub.queueId);
        await saveSubmission(sub);
        processedCount++;
        setUploadProgress((processedCount / submissions.length) * 80); // 80% for submissions
      }
      
      let queueCount = 0;
      for (const q of queueSet) {
        await saveQueue(q);
        queueCount++;
        setUploadProgress(80 + (queueCount / queueSet.size) * 20); // 20% for queues
      }

      setStatus("done");
      setUploadProgress(100);
    } catch (err) {
      console.error(err);
      setStatus("error");
      if (err instanceof z.ZodError) {
        setErrorMessage("Invalid file format. Please check that your JSON matches the expected schema.");
      } else if (err instanceof SyntaxError) {
        setErrorMessage("Invalid JSON format. Please check your file.");
      } else {
        setErrorMessage("Upload failed. Please try again or check the console for details.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/json") {
      await processFile(file);
    } else {
      setErrorMessage("Please upload a valid JSON file.");
      setStatus("error");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>Upload Submissions</h1>
          <p className="upload-description">
            Upload a JSON file containing submission data to process and store in the system.
          </p>
        </div>

        <div 
          className={`upload-area ${isDragOver ? 'drag-over' : ''} ${status === 'done' ? 'success' : ''} ${status === 'error' ? 'error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
        >
          <div className="upload-content">
            {status === "idle" && (
              <>
                <div className="upload-icon">📁</div>
                <h3>Drop your JSON file here</h3>
                <p>or click to browse files</p>
                <div className="file-types">
                  <span className="file-type-badge">JSON</span>
                </div>
              </>
            )}
            
            {status === "uploading" && (
              <>
                <div className="upload-icon spinning">⏳</div>
                <h3>Uploading...</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p>{Math.round(uploadProgress)}% complete</p>
              </>
            )}
            
            {status === "done" && (
              <>
                <div className="upload-icon">✅</div>
                <h3>Upload Complete!</h3>
                <p>Successfully processed {parsedCount} submissions</p>
                <button className="upload-again-btn" onClick={resetState}>
                  Upload Another File
                </button>
              </>
            )}
            
            {status === "error" && (
              <>
                <div className="upload-icon">❌</div>
                <h3>Upload Failed</h3>
                <p className="error-message">{errorMessage}</p>
                <button className="retry-btn" onClick={resetState}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {fileName && status !== "idle" && (
          <div className="file-info">
            <div className="file-details">
              <span className="file-name">📄 {fileName}</span>
              {parsedCount > 0 && (
                <span className="file-count">{parsedCount} submissions</span>
              )}
            </div>
          </div>
        )}

        <div className="upload-help">
          <h4>File Format Requirements</h4>
          <ul>
            <li>File must be in JSON format</li>
            <li>Must contain an array of submission objects</li>
            <li>Each submission must include: id, queueId, labelingTaskId, createdAt, questions, and answers</li>
          </ul>
          
          <h4>Sample Format</h4>
          <div className="sample-code">
            <pre><code>{`[
  {
    "id": "sub_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "q_template_1",
          "questionType": "single_choice_with_reasoning",
          "questionText": "Is the sky blue?"
        }
      }
    ],
    "answers": {
      "q_template_1": {
        "choice": "yes",
        "reasoning": "Observed on a clear day."
      }
    }
  }
]`}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}