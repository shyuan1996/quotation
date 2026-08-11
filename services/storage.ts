import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadString,
} from 'firebase/storage';
import { auth, db, isFirebaseConfigured, storage } from '../firebaseConfig';
import {
  createQuoteItemId,
  DEFAULT_COMPANY_INFO,
  QuotationData,
  QuoteItem,
} from '../types';

const COLLECTION_NAME = 'quotations';
const MAX_LIST_SIZE = 100;
const MAX_AMOUNT = 1_000_000_000;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null
);

const readString = (value: unknown, fallback = ''): string => (
  typeof value === 'string' ? value : fallback
);

const readNullableString = (value: unknown): string | null => (
  typeof value === 'string' && value.length > 0 ? value : null
);

const readNumber = (
  value: unknown,
  fallback = 0,
  min = 0,
  max = MAX_AMOUNT,
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const readTimestamp = (value: unknown): number | undefined => {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (isRecord(value) && typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return typeof millis === 'number' && Number.isFinite(millis) ? millis : undefined;
  }

  return undefined;
};

const normalizeItem = (value: unknown): QuoteItem | null => {
  if (!isRecord(value)) return null;

  const rawId = value.id;
  const id = typeof rawId === 'string' || typeof rawId === 'number'
    ? rawId
    : createQuoteItemId();

  return {
    id,
    name: readString(value.name),
    spec: readString(value.spec),
    description: value.description === null ? null : readString(value.description),
    quantity: readNumber(value.quantity, 0),
    price: readNumber(value.price, 0),
  };
};

const normalizeQuotation = (value: unknown, id: string): QuotationData => {
  const data = isRecord(value) ? value : {};
  const companyInfo = isRecord(data.companyInfo) ? data.companyInfo : {};
  const clientInfo = isRecord(data.clientInfo) ? data.clientInfo : {};
  const quoteDetails = isRecord(data.quoteDetails) ? data.quoteDetails : {};
  const items = Array.isArray(data.items)
    ? data.items.map(normalizeItem).filter((item): item is QuoteItem => item !== null)
    : [];

  return {
    id,
    fileName: readString(data.fileName, `quotation-${id}`),
    companyInfo: {
      name: readString(companyInfo.name, DEFAULT_COMPANY_INFO.name),
      address: readString(companyInfo.address, DEFAULT_COMPANY_INFO.address),
      phone: readString(companyInfo.phone, DEFAULT_COMPANY_INFO.phone),
      fax: readString(companyInfo.fax, DEFAULT_COMPANY_INFO.fax),
      email: readString(companyInfo.email, DEFAULT_COMPANY_INFO.email),
      taxId: readString(companyInfo.taxId, DEFAULT_COMPANY_INFO.taxId),
    },
    clientInfo: {
      name: readString(clientInfo.name),
      contact: readString(clientInfo.contact),
      address: readString(clientInfo.address),
      phone: readString(clientInfo.phone),
    },
    quoteDetails: {
      number: readString(quoteDetails.number, 'Q-NEW'),
      date: readString(quoteDetails.date),
      taxRate: readNumber(quoteDetails.taxRate, 5, 0, 100),
    },
    items: items.length > 0 ? items : [{
      id: createQuoteItemId(),
      name: '',
      spec: '',
      description: null,
      quantity: 1,
      price: 0,
    }],
    themeColor: readString(data.themeColor, '#1f2937'),
    logo: readNullableString(data.logo),
    seal: readNullableString(data.seal),
    salesPerson: readString(data.salesPerson),
    notes: readString(data.notes),
    extraNote: readString(data.extraNote),
    discount: readNumber(data.discount, 0),
    isTaxInclusive: data.isTaxInclusive === true,
    updatedAt: readTimestamp(data.updatedAt),
  };
};

const getUserCollection = () => {
  if (!isFirebaseConfigured || !db || !auth) {
    throw new Error('Firebase 尚未設定');
  }

  const user = auth.currentUser;
  if (!user) throw new Error('請先登入');

  return {
    user,
    collectionRef: collection(db, 'users', user.uid, COLLECTION_NAME),
  };
};

const uploadQuotationImage = async (
  value: string | null,
  userId: string,
  quotationId: string,
  imageName: 'logo' | 'seal',
): Promise<string | null> => {
  if (!value) return null;
  if (!value.startsWith('data:')) return value;
  if (!storage) throw new Error('Firebase Storage 尚未設定');

  const imageRef = ref(
    storage,
    `users/${userId}/quotations/${quotationId}/${imageName}.png`,
  );
  await uploadString(imageRef, value, 'data_url');
  return getDownloadURL(imageRef);
};

export const saveQuotationToCloud = async (
  data: QuotationData,
): Promise<QuotationData> => {
  const { user, collectionRef } = getUserCollection();
  const quotationId = data.id?.trim() || doc(collectionRef).id;
  const docRef = doc(collectionRef, quotationId);
  const { id: _id, updatedAt: _updatedAt, logo, seal, ...quotationPayload } = data;

  const [logoUrl, sealUrl] = await Promise.all([
    uploadQuotationImage(logo, user.uid, quotationId, 'logo'),
    uploadQuotationImage(seal, user.uid, quotationId, 'seal'),
  ]);

  await setDoc(docRef, {
    ...quotationPayload,
    logo: logoUrl,
    seal: sealUrl,
    updatedAt: serverTimestamp(),
  });

  return {
    ...data,
    id: docRef.id,
    logo: logoUrl,
    seal: sealUrl,
    updatedAt: Date.now(),
  };
};

export const fetchQuotationsFromCloud = async (): Promise<QuotationData[]> => {
  const { collectionRef } = getUserCollection();
  const q = query(
    collectionRef,
    orderBy('updatedAt', 'desc'),
    limit(MAX_LIST_SIZE),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((snapshot) => (
    normalizeQuotation(snapshot.data(), snapshot.id)
  ));
};

export const deleteQuotationFromCloud = async (quotationId: string): Promise<void> => {
  const { user, collectionRef } = getUserCollection();
  const cleanId = quotationId.trim();
  if (!cleanId || cleanId.includes('/')) throw new Error('無效的報價單 ID');

  await deleteDoc(doc(collectionRef, cleanId));

  if (storage) {
    await Promise.allSettled([
      deleteObject(ref(storage, `users/${user.uid}/quotations/${cleanId}/logo.png`)),
      deleteObject(ref(storage, `users/${user.uid}/quotations/${cleanId}/seal.png`)),
    ]);
  }
};
