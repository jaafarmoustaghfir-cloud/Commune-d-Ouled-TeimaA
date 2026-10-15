import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';

export interface PieceModel {
  id: string;
  categorie: 'cin_recto' | 'cin_verso' | 'complementaire';
  nom: string;
  type: string;
  dataUrl?: string;
  url?: string;
  taille?: number;
  statut: 'en_attente' | 'validee' | 'refusee';
  motifRefus?: string;
  verifiePar?: string;
  verifieLe?: any;
  createdAt?: any;
}

export interface PieceResume {
  id: string;
  categorie: 'cin_recto' | 'cin_verso' | 'complementaire';
  nom: string;
  type: string;
  statut: 'en_attente' | 'validee' | 'refusee';
  motifRefus?: string;
}

const MAX_PIECE_SIZE = 700 * 1024; // 700 KB max for Firestore documents

/**
 * Validate piece before upload
 */
export function validatePieceJustificative(
  file: File,
  lang: 'ar' | 'fr' = 'ar'
): { valid: boolean; error?: string } {
  if (!file) {
    return {
      valid: false,
      error: lang === 'ar' ? 'الرجاء اختيار ملف صالح.' : 'Veuillez sélectionner un fichier valide.',
    };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'صيغة الملف غير مقبولة. الصيغ المسموح بها هي: PDF، JPG، PNG فقط.'
          : 'Format de fichier non supporté. Seuls les formats PDF, JPG et PNG sont acceptés.',
    };
  }

  if (file.type === 'application/pdf' && file.size > 850 * 1024) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'حجم ملف PDF يتجاوز 800 كيلوبايت. يرجى ضغط الملف أو التقاط صورة واضحة بالهاتف.'
          : 'Le fichier PDF dépasse 800 Ko. Veuillez compresser le document ou fournir une photo JPEG claire.',
    };
  }

  return { valid: true };
}

/**
 * Client-side compression of images using HTML5 Canvas
 * Reduces max width to 1000px and JPEG quality to 0.6.
 * If size exceeds 700KB, retries with reduced dimensions/quality up to 3 times.
 */
export async function compressImageFile(file: File): Promise<{ dataUrl: string; size: number }> {
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ dataUrl: result, size: file.size });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let quality = 0.65;
        let maxWidth = 1100;
        let attempts = 0;
        let finalDataUrl = '';

        while (attempts < 3) {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context not available'));
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          finalDataUrl = canvas.toDataURL('image/jpeg', quality);
          // Calculate approx size in bytes
          const approxBytes = Math.round((finalDataUrl.length * 3) / 4);

          if (approxBytes <= MAX_PIECE_SIZE || attempts === 2) {
            return resolve({ dataUrl: finalDataUrl, size: approxBytes });
          }

          attempts++;
          quality -= 0.15;
          maxWidth -= 200;
        }

        resolve({ dataUrl: finalDataUrl, size: (finalDataUrl.length * 3) / 4 });
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Save a piece to the Firestore subcollection `demandes/{numeroSuivi}/pieces/{pieceId}`
 * with a 20-second timeout guarantee.
 */
export async function savePieceJustificativeFirestore(
  numeroSuivi: string,
  file: File,
  categorie: 'cin_recto' | 'cin_verso' | 'complementaire'
): Promise<PieceModel> {
  const timeoutMs = 20000;

  return new Promise<PieceModel>(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs / 1000}s) dépassé lors de l'envoi de la pièce ${file.name}`));
    }, timeoutMs);

    try {
      const { dataUrl, size } = await compressImageFile(file);
      const pieceId = `${categorie}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const pieceRef = doc(db, 'demandes', numeroSuivi, 'pieces', pieceId);

      const pieceData = {
        id: pieceId,
        categorie,
        nom: file.name,
        type: file.type || 'image/jpeg',
        dataUrl,
        taille: size,
        statut: 'en_attente' as const,
        createdAt: serverTimestamp(),
      };

      await setDoc(pieceRef, pieceData);
      clearTimeout(timer);

      resolve({
        id: pieceId,
        categorie,
        nom: file.name,
        type: file.type || 'image/jpeg',
        dataUrl,
        taille: size,
        statut: 'en_attente',
      });
    } catch (error) {
      clearTimeout(timer);
      console.error('Erreur enregistrement pièce Firestore:', error);
      reject(error);
    }
  });
}

/**
 * Retrieve all pieces for a demand from the subcollection.
 * If subcollection is empty, also fall back to parent document URLs if present.
 */
export async function getPiecesForDemande(numeroSuivi: string): Promise<PieceModel[]> {
  try {
    const colRef = collection(db, 'demandes', numeroSuivi, 'pieces');
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      const pieces: PieceModel[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        pieces.push({
          id: d.id,
          categorie: data.categorie || 'complementaire',
          nom: data.nom || 'Document',
          type: data.type || 'image/jpeg',
          dataUrl: data.dataUrl || data.url,
          url: data.url || data.dataUrl,
          taille: data.taille,
          statut: data.statut || 'en_attente',
          motifRefus: data.motifRefus || '',
          verifiePar: data.verifiePar || '',
          verifieLe: data.verifieLe?.toDate?.() || data.verifieLe,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
      });
      return pieces;
    }

    // Fallback: check parent document if pieces were stored directly in older format
    const parentDocRef = doc(db, 'demandes', numeroSuivi);
    const parentDoc = await getDoc(parentDocRef);
    if (parentDoc.exists()) {
      const data = parentDoc.data();
      const fallbackList: PieceModel[] = [];

      if (data.cinRectoUrl) {
        fallbackList.push({
          id: 'cin_recto_fallback',
          categorie: 'cin_recto',
          nom: 'CIN_Recto.jpg',
          type: 'image/jpeg',
          dataUrl: data.cinRectoUrl,
          url: data.cinRectoUrl,
          statut: 'en_attente',
        });
      }
      if (data.cinVersoUrl) {
        fallbackList.push({
          id: 'cin_verso_fallback',
          categorie: 'cin_verso',
          nom: 'CIN_Verso.jpg',
          type: 'image/jpeg',
          dataUrl: data.cinVersoUrl,
          url: data.cinVersoUrl,
          statut: 'en_attente',
        });
      }
      if (Array.isArray(data.piecesJointes)) {
        data.piecesJointes.forEach((pj: any, idx: number) => {
          fallbackList.push({
            id: `pj_${idx}`,
            categorie: pj.category || 'complementaire',
            nom: pj.name || `Document_${idx + 1}`,
            type: pj.type || 'application/pdf',
            dataUrl: pj.url,
            url: pj.url,
            statut: 'en_attente',
          });
        });
      }
      return fallbackList;
    }

    return [];
  } catch (err) {
    console.error('Erreur getPiecesForDemande:', err);
    return [];
  }
}

/**
 * Update verification status of a piece (Agent action)
 */
export async function updatePieceVerification(
  numeroSuivi: string,
  pieceId: string,
  statut: 'validee' | 'refusee',
  verifiePar: string,
  motifRefus?: string
): Promise<void> {
  const pieceRef = doc(db, 'demandes', numeroSuivi, 'pieces', pieceId);
  const payload: any = {
    statut,
    verifiePar,
    verifieLe: serverTimestamp(),
  };
  if (motifRefus) {
    payload.motifRefus = motifRefus;
  }
  await updateDoc(pieceRef, payload);
}
