<!-- f35e982e-0ac1-488a-b9ab-678ec8c6a0e7 743c5647-ce58-414c-a2be-928a42267061 -->
# File Attachments Support

## Overview

Add support for file attachments at the submission level that get stored in Firebase Storage and forwarded to OpenAI's vision API when running evaluations.

## Key Changes

### 1. Update Submission Schema

Extend the submission data model in `src/routes/UploadPage.tsx`:

- Add optional `attachments` array at top-level submission object
- Each attachment includes: `id`, `filename`, `storagePath`, `downloadURL`, `contentType`, `uploadedAt`
- Update Zod schema to validate attachment structure

### 2. File Upload UI in Upload Page

Modify `src/routes/UploadPage.tsx`:

- After JSON submission upload completes, display list of uploaded submissions
- Add "Upload Attachments" button next to each submission
- Clicking button opens file picker (accept screenshots: png, jpg, jpeg, webp; PDFs, allow multiple files)
- Upload selected files to Firebase Storage at path: `submissions/{submissionId}/attachments/{filename}`
- Generate download URLs and update submission document with attachment metadata
- Display attachment list/previews for each submission in the UI

### 3. Backend Function Enhancement

Update `functions/src/index.ts`:

- Modify `runJudgeEvaluation` to accept optional `attachments` parameter
- Check if model supports vision (gpt-4o, gpt-4-turbo, gpt-4-vision-preview)
- For images: add as image_url content to messages (vision models only)
- For non-image files: add text notes about attachments
- Handle both direct URLs (for images) and document types appropriately

### 4. Frontend API Update

Update `src/lib/llm.ts`:

- Add `attachments` parameter to `runJudgeEvaluation` function
- Pass attachment URLs to backend function

### 5. Run Evaluations Page

Modify `src/routes/RunEvaluationsPage.tsx`:

- Fetch submission's `attachments` field
- Pass attachments to `runJudgeEvaluation` when available
- Display indicator when attachments are being used

### 6. Sample Data Update

Update `sample_input.json` and `test_input.json`:

- Add example with attachments field to show expected format

## Technical Details

**Firebase Storage Structure:**

```
submissions/
  {submissionId}/
    attachments/
      {filename}
```

**Attachment Object Schema:**

```typescript
{
  id: string;
  filename: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  uploadedAt: number;
}
```

**OpenAI Vision Message Format:**

```typescript
{
  role: "user",
  content: [
    { type: "text", text: "Question and answer..." },
    { type: "image_url", image_url: { url: "https://..." } }
  ]
}
```

**OpenAI Files API for PDFs:**

```typescript
// PDFs are uploaded to OpenAI Files API first
const uploaded = await openai.files.create({
  purpose: "assistants",
  file: fs.createReadStream(tempPath)
});

// Then referenced by file_id
{ type: "input_file", file_id: uploaded.id }
```

## Files to Modify

- `src/routes/UploadPage.tsx` - Add attachment upload UI and logic
- `src/lib/llm.ts` - Add attachments parameter
- `functions/src/index.ts` - Add vision support to backend
- `src/routes/RunEvaluationsPage.tsx` - Pass attachments to evaluations
- `sample_input.json` - Add example with attachments

### To-dos

- [ ] Update submission Zod schema to include optional attachments array
- [ ] Add file upload functionality to UploadPage with Firebase Storage integration
- [ ] Enhance runJudgeEvaluation Cloud Function to support vision models and attachments
- [ ] Modify llm.ts to pass attachments to backend function
- [ ] Update RunEvaluationsPage to fetch and pass submission attachments
- [ ] Add attachment examples to sample JSON files