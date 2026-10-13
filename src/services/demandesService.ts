import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { UploadedFileMeta } from './storageService.ts';

export type StatutDemande =
  | 'Nouvelle'
  | 'En cours'
  | 'Pièces manquantes'
  | 'Prêt pour retrait'
  | 'Délivré'
  | 'Rejetée';

export interface DemandeModel {
  id: string; // Numéro de suivi exact utilisé comme document ID
  numeroSuivi: string;
  cin: string;
  nomComplet: string;
  dateNaissance: string;
  lieuNaissance: string;
  communeEnregistrement: string;
  anneeEnregistrement: string;
  numeroActe: string; // Format ex: 234/78
  telephone: string;
  email?: string;
  adresse: string;
  typeDocument: string;
  nombreCopies: number;
  statut: StatutDemande;
  cinRectoUrl?: string;
  cinVersoUrl?: string;
  piecesJointes?: UploadedFileMeta[];
  notesInternes?: string;
  notesCitoyen?: string;
  dateRetrait?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type CreateDemandeInput = Omit<DemandeModel, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Génère un identifiant unique de suivi civil pour Ouled Teima (ex: OT-2026-784912)
 */
export function generateNumeroSuivi(): string {
  const currentYear = new Date().getFullYear();
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
  return `OT-${currentYear}-${randomSixDigits}`;
}

/**
 * Enregistre une nouvelle demande citoyenne dans la collection Firestore "demandes"
 * avec le numéro de suivi comme Document ID.
 */
export async function createDemande(input: CreateDemandeInput): Promise<string> {
  const numeroSuivi = input.numeroSuivi || generateNumeroSuivi();
  const path = `demandes/${numeroSuivi}`;

  const payload = {
    ...input,
    id: numeroSuivi,
    numeroSuivi,
    statut: input.statut || 'Nouvelle',
    nombreCopies: Number(input.nombreCopies) || 1,
    notesInternes: input.notesInternes || '',
    notesCitoyen: input.notesCitoyen || '',
    dateRetrait: input.dateRetrait || '',
    piecesJointes: input.piecesJointes || [],
    cinRectoUrl: input.cinRectoUrl || '',
    cinVersoUrl: input.cinVersoUrl || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = doc(db, 'demandes', numeroSuivi);
    await setDoc(docRef, payload);
    return numeroSuivi;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Récupère une demande par son identifiant / numéro de suivi unique (getDoc)
 */
export async function getDemandeByNumero(numeroSuivi: string): Promise<DemandeModel | null> {
  const cleanId = numeroSuivi.trim();
  const path = `demandes/${cleanId}`;

  try {
    const docRef = doc(db, 'demandes', cleanId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    return {
      id: snap.id,
      ...data,
    } as DemandeModel;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Souscription en temps réel (onSnapshot) pour les employés et officiers d'état civil
 */
export function subscribeDemandes(
  onData: (demandes: DemandeModel[]) => void,
  onError?: (error: any) => void
): () => void {
  const collectionPath = 'demandes';
  const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: DemandeModel[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));
      onData(items);
    },
    (error) => {
      console.error('Erreur onSnapshot demandes:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  );

  return unsubscribe;
}

/**
 * Mise à jour administrative d'une demande (statut, notes, date de retrait)
 */
export async function updateDemande(
  numeroSuivi: string,
  updates: Partial<DemandeModel>
): Promise<void> {
  const cleanId = numeroSuivi.trim();
  const path = `demandes/${cleanId}`;

  try {
    const docRef = doc(db, 'demandes', cleanId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Formate un timestamp Firestore ou date ISO en chaîne lisible
 */
export function formatDemandeDate(rawDate: any, lang: 'ar' | 'fr' = 'ar'): string {
  if (!rawDate) return '-';
  let dateObj: Date;
  if (rawDate instanceof Timestamp) {
    dateObj = rawDate.toDate();
  } else if (rawDate.seconds) {
    dateObj = new Date(rawDate.seconds * 1000);
  } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
    dateObj = new Date(rawDate);
  } else {
    dateObj = new Date();
  }

  if (isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
