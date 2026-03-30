import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  QueryConstraint,
  DocumentData,
  Unsubscribe,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Temel CRUD ────────────────────────────────────────────────────────────────

export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  await setDoc(doc(db, collectionName, docId), data);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function queryDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

// ─── Gerçek zamanlı dinleme ────────────────────────────────────────────────────

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    callback(data);
  });
}

export function subscribeToDocument<T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, collectionName, docId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as T);
    }
  });
}

// ─── Toplu işlemler ────────────────────────────────────────────────────────────

export async function batchWrite(
  operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: DocumentData;
  }>
): Promise<void> {
  const batch = writeBatch(db);
  for (const op of operations) {
    const ref = doc(db, op.collection, op.id);
    if (op.type === 'set' && op.data) {
      batch.set(ref, op.data);
    } else if (op.type === 'update' && op.data) {
      batch.update(ref, op.data);
    } else if (op.type === 'delete') {
      batch.delete(ref);
    }
  }
  await batch.commit();
}

export async function batchAddDocuments<T extends DocumentData>(
  collectionName: string,
  items: T[]
): Promise<void> {
  // Firestore batch yazma limiti 500
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const ref = doc(collection(db, collectionName));
      batch.set(ref, { ...item, createdAt: new Date().toISOString() });
    }
    await batch.commit();
  }
}

// ─── Koleksiyon temizleme (Admin) ──────────────────────────────────────────────

export async function deleteCollection(collectionName: string): Promise<void> {
  const snap = await getDocs(collection(db, collectionName));
  const CHUNK_SIZE = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ─── Sorgu yardımcıları ────────────────────────────────────────────────────────

export { where, orderBy, query, collection };
export type { QueryConstraint, Unsubscribe };
export { serverTimestamp };
