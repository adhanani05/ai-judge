import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

// ------------------------------
// 🧩 Type Definition
// ------------------------------
export type Judge = {
  id?: string;
  name: string;
  systemPrompt: string;
  model: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

// ------------------------------
// 🔥 Collection Reference
// ------------------------------
const JUDGES_COLLECTION = "judges";

// ------------------------------
// 📦 Fetch All Judges
// ------------------------------
export async function getJudges(): Promise<Judge[]> {
  const snap = await getDocs(collection(db, JUDGES_COLLECTION));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Judge),
  }));
}

// ------------------------------
// ✨ Create Judge (with ID + timestamps)
// ------------------------------
export async function createJudge(judge: Omit<Judge, "id">) {
  const timestamp = Date.now();
  const data = { ...judge, createdAt: timestamp, updatedAt: timestamp };

  // Add the judge and store Firestore's auto-ID as the 'id' field
  const docRef = await addDoc(collection(db, JUDGES_COLLECTION), data);
  await setDoc(docRef, { id: docRef.id }, { merge: true });

  console.log("✅ Judge created:", docRef.id);
  return docRef.id;
}

// ------------------------------
// 🛠 Update Judge
// ------------------------------
export async function updateJudge(id: string, data: Partial<Judge>) {
  await updateDoc(doc(db, JUDGES_COLLECTION, id), {
    ...data,
    updatedAt: Date.now(),
  });
  console.log("✅ Judge updated:", id);
}

// ------------------------------
// ❌ Delete Judge
// ------------------------------
export async function deleteJudge(id: string) {
  await deleteDoc(doc(db, JUDGES_COLLECTION, id));
  console.log("🗑️ Judge deleted:", id);
}
