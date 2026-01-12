import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebaseConfig';
import { QuotationData } from '../types';

const COLLECTION_NAME = 'quotations';

export const saveQuotationToCloud = async (data: QuotationData): Promise<void> => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  
  // Create a doc reference. Use fileName as ID for simplicity, or auto-id if preferred.
  // Using fileName as ID ensures uniqueness by name.
  const docRef = doc(db, COLLECTION_NAME, data.fileName);
  
  const payload = {
    ...data,
    updatedAt: Timestamp.now().toMillis()
  };

  await setDoc(docRef, payload);
};

export const fetchQuotationsFromCloud = async (): Promise<QuotationData[]> => {
  if (!isFirebaseConfigured) return [];

  const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  })) as QuotationData[];
};

export const deleteQuotationFromCloud = async (fileName: string): Promise<void> => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, COLLECTION_NAME, fileName));
};
