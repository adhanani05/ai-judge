import { useState, useRef } from "react";
import { z } from "zod";
import { db, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firestore helpers
async function saveSubmission(submission: any) {
  await setDoc(doc(db, "submissions", submission.id), submission, { merge: true });
}
async function saveQueue(queueId: string) {
  await setDoc(doc(db, "queues", queueId), { id: queueId, createdAt: Date.now() }, { merge: true });
}

// Zod schema to validate file format
const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  storagePath: z.string(),
  downloadURL: z.string(),
  contentType: z.string(),
  uploadedAt: z.number(),
});

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
  attachments: z.array(attachmentSchema).optional(),
});

export default function UploadPage() {
  const [fileName, setFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedSubmissions, setUploadedSubmissions] = useState<any[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState<Set<string>>(new Set());
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef<boolean>(false);
  const currentSubmissionIdRef = useRef<string | null>(null);

  const resetState = () => {
    setFileName("");
    setParsedCount(0);
    setStatus("idle");
    setErrorMessage("");
    setUploadProgress(0);
    setUploadedSubmissions([]);
    setUploadingAttachments(new Set());
    setCurrentSubmissionId(null);
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

      // Store uploaded submissions for attachment management
      setUploadedSubmissions(submissions);
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

  const handleAttachmentUpload = async (submissionId: string, files: FileList) => {
    console.log("Starting attachment upload for submission:", submissionId, "Files:", files.length);
    
    // Prevent multiple simultaneous uploads for the same submission
    if (uploadingAttachments.has(submissionId)) {
      console.log("Upload already in progress for submission:", submissionId);
      return;
    }
    
    // Check if files are actually selected
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }
    
    // Uploading state is already set in handleAttachmentFileChange
    
    try {
      const attachments = [];
      const currentSubmission = uploadedSubmissions.find(sub => sub.id === submissionId);
      const existingAttachments = currentSubmission?.attachments || [];
      const existingFilenames = new Set(existingAttachments.map((att: any) => att.filename));
      
      for (const file of Array.from(files)) {
        // Validate file type (images only)
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} not supported. Please upload PNG, JPEG, or WebP images only.`);
        }

        // Check for duplicate filenames
        if (existingFilenames.has(file.name)) {
          console.log(`Skipping duplicate file: ${file.name}`);
          continue;
        }

        // Upload to Firebase Storage
        const storagePath = `submissions/${submissionId}/attachments/${file.name}`;
        console.log("Uploading file to path:", storagePath);
        const storageRef = ref(storage, storagePath);
        
        try {
          await uploadBytes(storageRef, file);
          console.log("File uploaded successfully:", file.name);
          const downloadURL = await getDownloadURL(storageRef);
          console.log("Download URL generated:", downloadURL);

          attachments.push({
            id: `${submissionId}_${file.name}_${Date.now()}`,
            filename: file.name,
            storagePath,
            downloadURL,
            contentType: file.type,
            uploadedAt: Date.now(),
          });
        } catch (uploadError) {
          console.error(`Failed to upload file ${file.name}:`, uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Only update if there are new attachments
      if (attachments.length > 0) {
        // Update submission document with attachments (append to existing)
        const submissionRef = doc(db, "submissions", submissionId);
        const updatedAttachments = [...existingAttachments, ...attachments];
        
        await updateDoc(submissionRef, {
          attachments: updatedAttachments
        });

        // Update local state
        setUploadedSubmissions(prev => 
          prev.map(sub => 
            sub.id === submissionId 
              ? { ...sub, attachments: updatedAttachments }
              : sub
          )
        );
      }

    } catch (error) {
      console.error("Attachment upload failed:", error);
      setErrorMessage(`Failed to upload attachments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingAttachments(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };

  const handleAttachmentClick = (submissionId: string) => {
    console.log("Attachment button clicked for submission:", submissionId);
    console.log("Is currently uploading:", uploadingAttachments.has(submissionId));
    
    // Don't allow clicking if already uploading
    if (uploadingAttachments.has(submissionId)) {
      console.log("Already uploading for this submission, ignoring click");
      return;
    }
    
    // Set both state and ref immediately for reliable access
    setCurrentSubmissionId(submissionId);
    currentSubmissionIdRef.current = submissionId;
    
    console.log("Opening file picker for submission:", submissionId);
    attachmentInputRef.current?.click();
  };

  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change event triggered");
    console.log("isUploading:", isUploadingRef.current);
    console.log("currentSubmissionId:", currentSubmissionId);
    console.log("Files selected:", e.target.files?.length || 0);
    
    // Prevent multiple simultaneous calls
    if (isUploadingRef.current) {
      console.log("Upload already in progress, ignoring file change");
      return;
    }
    
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      console.log("No files selected, resetting state");
      setCurrentSubmissionId(null);
      return;
    }
    
    // Use ref as fallback if state isn't updated yet
    const submissionId = currentSubmissionId || currentSubmissionIdRef.current;
    
    if (!submissionId) {
      console.log("No submission ID set, cannot upload");
      e.target.value = '';
      return;
    }
    
    console.log("Processing files for submission:", submissionId);
    isUploadingRef.current = true;
    // Immediately set uploading state for UI feedback
    setUploadingAttachments(prev => new Set(prev).add(submissionId));
    
    try {
      await handleAttachmentUpload(submissionId, files);
    } finally {
      isUploadingRef.current = false;
      // Reset the input and state
      e.target.value = '';
      setCurrentSubmissionId(null);
      currentSubmissionIdRef.current = null;
    }
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

        <input
          ref={attachmentInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleAttachmentFileChange}
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

        {uploadedSubmissions.length > 0 && (
          <div className="submissions-section">
            <h3>Uploaded Submissions</h3>
            <div className="submissions-list">
              {uploadedSubmissions.map((submission) => (
                <div key={submission.id} className="submission-item">
                  <div className="submission-header">
                    <span className="submission-id">📋 {submission.id}</span>
                    <span className="submission-queue">Queue: {submission.queueId}</span>
                  </div>
                  <div className="submission-actions">
                    <button
                      onClick={() => handleAttachmentClick(submission.id)}
                      disabled={uploadingAttachments.has(submission.id)}
                      className="attachment-button"
                    >
                      {uploadingAttachments.has(submission.id) ? (
                        <>
                          <span className="button-spinner"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          📷 Upload Images
                        </>
                      )}
                    </button>
                  </div>
                  {submission.attachments && submission.attachments.length > 0 && (
                    <div className="attachments-list">
                      <h4>Attachments:</h4>
                      {submission.attachments.map((attachment: any) => (
                        <div key={attachment.id} className="attachment-item">
                          <span className="attachment-name">📄 {attachment.filename}</span>
                          <span className="attachment-type">({attachment.contentType})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="upload-help">
          <h4>File Format Requirements</h4>
          <ul>
            <li>File must be in JSON format</li>
            <li>Must contain an array of submission objects</li>
            <li>Each submission must include: id, queueId, labelingTaskId, createdAt, questions, and answers</li>
            <li>Image attachments: Upload PNG, JPEG, or WebP images for AI vision analysis</li>
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