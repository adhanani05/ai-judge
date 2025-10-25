# AI Judge

## Overview
A React + TypeScript web app that simulates an internal annotation platform. It lets users upload submissions, define AI judges, assign them to questions, and automatically evaluate answers using LLMs. All data and evaluations are persisted in Firebase Firestore, with LLM calls executed through Firebase Cloud Functions for security.

## How to Run

### Setup
Clone and install:
```bash
git clone https://github.com/your-username/ai-judge.git
cd ai-judge
npm install
```

Add environment variables in `.env.local`:
```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_MEASUREMENT_ID=...
```

Start development server:
```bash
npm run dev
```
The app runs at http://localhost:5173.

## Data & LLM Persistence
- **Submissions, Judges, Assignments, Evaluations** → stored in Firebase Firestore
- **File attachments (images)** → stored in Firebase Storage
- **LLM evaluations** → executed securely via Firebase Cloud Functions using OpenAI (gpt-4o / gpt-4o-mini)

## Extra Features
- **Image Uploads**: Users can attach images to submissions; these are uploaded to Firebase Storage and analyzed by GPT-4o
- **Reset All Data**: A single button clears all Firestore collections for quick resets and testing

## Trade-offs & Scope Decisions

### 1) Omitted per-judge field inclusion (question/answer/metadata toggles)
**Why**: I prioritized a stable, correct evaluation pipeline (ingestion → judge CRUD → assignment → run → persistence → results). The field-selection UI adds config surface area, extra state to store per judge, and more branching in the prompt builder and tests.

**Impact**: Keeps the run path predictable and easier to debug; avoids half-working toggles.

**Future**: Add three booleans on the Judge model (`includeQuestionText`, `includeAnswer`, `includeAttachments`) with sane defaults and a small "Prompt Config" section in the judge form. The runner already accepts structured inputs, so wiring this later is straightforward.

### 2) No animated charts
**Why**: Charts require additional libraries, tuning, and interaction states that don't improve core correctness or LLM integration. I focused on a clean results table, filters, and a pass-rate summary.

**Impact**: Less visual flair, but a clearer internal-tool UX with fewer moving parts.

**Future**: Add verdict distribution and pass-rate-by-judge using a light chart lib; animation is a polish layer once the data views are proven stable.

### 3) Single-queue execution (queue_1), no queue selector
**Why**: The spec says "Run AI Judges on the queue page… iterate through the submissions in the chosen queue." I implemented a single active queue to keep the demo simple and the flow linear.

**Impact**: Reduces UI/route complexity and avoids multi-queue edge cases; still stores submissions for any queueId.

**Future**: Add a queue dropdown or `/queue/:queueId` route and pass the selection into the existing runner query (`where("queueId", "==", selectedQueue)`).

### 4) One provider (OpenAI) only
**Why**: Depth over breadth. Integrating multiple vendors (Anthropic/Gemini) would duplicate auth/config, error handling, and response parsing, risking instability.

**Impact**: Tighter, well-tested integration and clearer failure modes (timeouts, rate-limits, JSON parsing).

**Future**: Abstract the LLM call behind a provider interface (`Provider.run(prompt) → { verdict, reasoning }`) and add adapters for other vendors.

### 5) Images allowed; PDFs not evaluated by the model
**Why**: OpenAI can read image URLs directly, but PDFs require a heavier pipeline (download from storage → upload to OpenAI Files API → reference by file_id). That adds bandwidth, latency, and more error cases.

**Impact**: Multimodal evaluations work for screenshots without extra backend complexity. PDFs still upload to storage for record-keeping but are not parsed by the model.

**Future**: Add a PDF path in the Cloud Function that streams the file to OpenAI's Files API when a vision-capable model is selected.

## Time Spent
Approximately 9 hours total, including setup, Firebase integration, core pipeline, extra features, and end-to-end testing.

**Author**: Aditya Dhanani  
**Date**: October 2025