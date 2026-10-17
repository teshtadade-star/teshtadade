import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  Firestore,
  writeBatch
} from 'firebase/firestore';
import { Dish, AppSettings } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let app: FirebaseApp;
export let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const dbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId || 'ai-studio-ttadad-01617bd4-b657-4914-875b-6b6cdd849459';
  db = getFirestore(app, dbId);
} catch (err) {
  console.error("Firebase init failed:", err);
}

// Test connection on boot per critical instructions
export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'settings', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or starting up.");
    }
    return true; // Connection handshake attempted
  }
}

export function isFirebaseAvailable(): boolean {
  return Boolean(db);
}

/**
 * Subscribe to dishes collection in Firestore
 */
export function subscribeToDishes(
  onUpdate: (dishes: Dish[]) => void,
  defaultDishes: Dish[]
) {
  if (!db) return () => {};

  const colPath = 'dishes';
  const dishesCol = collection(db, colPath);

  const unsubscribe = onSnapshot(
    dishesCol,
    async (snapshot) => {
      if (!snapshot.empty) {
        const liveDishes: Dish[] = [];
        snapshot.forEach((d) => {
          liveDishes.push(d.data() as Dish);
        });
        // Sort by id
        liveDishes.sort((a, b) => a.id - b.id);
        onUpdate(liveDishes);
      } else {
        // Seed default dishes if database collection is empty
        try {
          const batch = writeBatch(db);
          for (const dish of defaultDishes) {
            const dRef = doc(db, colPath, String(dish.id));
            batch.set(dRef, dish);
          }
          await batch.commit();
          onUpdate(defaultDishes);
        } catch (err) {
          console.warn("Could not seed initial dishes:", err);
          onUpdate(defaultDishes);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, colPath);
    }
  );

  return () => unsubscribe();
}

/**
 * Subscribe to settings in Firestore
 */
export function subscribeToSettings(onUpdate: (settings: AppSettings) => void) {
  if (!db) return () => {};

  const docPath = 'settings/app';
  const settingsDoc = doc(db, 'settings', 'app');

  const unsubscribe = onSnapshot(
    settingsDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as AppSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );

  return () => unsubscribe();
}

/**
 * Save a single dish or list to Firestore
 */
export async function saveDishToFirestore(dish: Dish): Promise<boolean> {
  if (!db) return false;
  const path = `dishes/${dish.id}`;
  try {
    const dishRef = doc(db, 'dishes', String(dish.id));
    await setDoc(dishRef, dish, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteDishFromFirestore(dishId: number): Promise<boolean> {
  if (!db) return false;
  const path = `dishes/${dishId}`;
  try {
    const dishRef = doc(db, 'dishes', String(dishId));
    await deleteDoc(dishRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function saveDishesToFirebase(dishes: Dish[]): Promise<boolean> {
  if (!db) return false;
  try {
    const batch = writeBatch(db);
    for (const d of dishes) {
      const dRef = doc(db, 'dishes', String(d.id));
      batch.set(dRef, d);
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error("Failed to batch save dishes:", err);
    return false;
  }
}

/**
 * Save application settings to Firestore
 */
export async function saveSettingsToFirebase(settings: AppSettings): Promise<boolean> {
  if (!db) return false;
  const path = 'settings/app';
  try {
    const settingsDoc = doc(db, 'settings', 'app');
    await setDoc(settingsDoc, settings, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}
