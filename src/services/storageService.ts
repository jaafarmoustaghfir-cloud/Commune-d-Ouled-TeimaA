import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.ts';

export interface UploadedFileMeta {
  name: string;
  url: string;
  size: number;
  type: string;
  category?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

export function validatePieceJustificative(file: File, lang: 'ar' | 'fr' = 'ar'): { valid: boolean; error?: string } {
  if (!file) {
    return {
      valid: false,
      error: lang === 'ar' ? 'الرجاء اختيار ملف صالح.' : 'Veuillez sélectionner un fichier valide.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? `حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)} ميغابايت) يتجاوز الحد الأقصى المسموح به (5 ميغابايت).`
          : `La taille du fichier (${(file.size / (1024 * 1024)).toFixed(1)} Mo) dépasse la limite maximale de 5 Mo.`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'صيغة الملف غير مقبولة. الصيغ المسموح بها هي: PDF، JPG، PNG فقط.'
          : 'Format de fichier non supporté. Seuls les formats PDF, JPG et PNG sont acceptés.',
    };
  }

  return { valid: true };
}

/**
 * Upload an attachment to Firebase Storage under demandes/{numeroSuivi}/{category}_{timestamp}_{filename}
 */
export async function uploadPieceJustificative(
  numeroSuivi: string,
  file: File,
  category: 'cin_recto' | 'cin_verso' | 'complementaire'
): Promise<UploadedFileMeta> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `demandes/${numeroSuivi}/${category}_${Date.now()}_${sanitizedName}`;
  const fileRef = ref(storage, path);

  try {
    const metadata = {
      contentType: file.type,
      customMetadata: {
        category,
        numeroSuivi,
        originalName: file.name,
      },
    };

    const uploadResult = await uploadBytes(fileRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    return {
      name: file.name,
      url: downloadUrl,
      size: file.size,
      type: file.type,
      category,
    };
  } catch (error: any) {
    console.error('Erreur upload Firebase Storage:', error);
    throw new Error(error?.message || 'Erreur lors du téléversement du fichier.');
  }
}
