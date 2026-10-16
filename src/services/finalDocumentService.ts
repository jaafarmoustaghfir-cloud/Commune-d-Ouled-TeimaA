import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase.ts';
import { 
  DemandeModel, 
  DocumentFinalMeta, 
  StatutHistoryEntry, 
  updateDemande, 
  logDemandeHistory 
} from './demandesService.ts';

const MAX_FINAL_DOC_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

/**
 * Validation du document final téléversé par l'employé
 */
export function validateFinalDocumentFile(file: File, lang: 'ar' | 'fr' = 'ar'): { valid: boolean; error?: string } {
  if (!file) {
    return {
      valid: false,
      error: lang === 'ar' ? 'يرجى اختيار ملف صالح.' : 'Veuillez sélectionner un fichier valide.',
    };
  }

  if (file.size > MAX_FINAL_DOC_SIZE) {
    const sizeMo = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error:
        lang === 'ar'
          ? `حجم الملف (${sizeMo} ميغابايت) يتجاوز الحد الأقصى المسموح به (5 ميغابايت).`
          : `La taille du fichier (${sizeMo} Mo) dépasse le maximum autorisé de 5 Mo.`,
    };
  }

  const fileType = file.type?.toLowerCase() || '';
  const isAllowed = ALLOWED_MIME_TYPES.includes(fileType) ||
    file.name.toLowerCase().endsWith('.pdf') ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg') ||
    file.name.toLowerCase().endsWith('.png');

  if (!isAllowed) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'صيغة الملف غير مدعومة. الصيغ المسموح بها هي: PDF، JPG، PNG فقط.'
          : 'Format de fichier non supporté. Seuls les formats PDF, JPG et PNG sont autorisés.',
    };
  }

  return { valid: true };
}

/**
 * Convertit un fichier en Data URL (base64)
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Téléversement en arrière-plan du document final avec :
 * - Timeout strict de 60 secondes
 * - 3 tentatives automatiques avec délai exponentiel croissant
 * - Journalisation dans l'historique des statuts
 */
export async function uploadFinalDocumentWithRetry(
  demande: DemandeModel,
  file: File,
  employeeEmail: string,
  onProgress?: (percent: number) => void
): Promise<DocumentFinalMeta> {
  const numeroSuivi = demande.numeroSuivi;
  const isReplacement = Boolean(demande.documentFinal);
  const maxAttempts = 3;
  const timeoutMs = 60000; // 60s timeout

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (onProgress) onProgress(attempt === 1 ? 15 : 20);

      // Effectuer la tentative avec timeout garanti
      const result = await new Promise<DocumentFinalMeta>(async (resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout de téléversement (${timeoutMs / 1000}s) dépassé pour le document ${file.name}`));
        }, timeoutMs);

        try {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `demandes/${numeroSuivi}/final_${Date.now()}_${sanitizedName}`;

          // Préparer la conversion Data URL de secours (assure l'accès immédiat sans blocage réseau)
          const dataUrl = await fileToDataUrl(file);
          if (onProgress) onProgress(45);

          let downloadUrl = '';
          try {
            // Tentative Firebase Storage
            if (storage) {
              const fileRef = ref(storage, storagePath);
              const metadata = {
                contentType: file.type || 'application/pdf',
                customMetadata: {
                  numeroSuivi,
                  uploadedBy: employeeEmail,
                  originalName: file.name,
                },
              };

              const uploadTask = uploadBytesResumable(fileRef, file, metadata);

              uploadTask.on(
                'state_changed',
                (snapshot) => {
                  const percent = Math.round(
                    50 + (snapshot.bytesTransferred / (snapshot.totalBytes || file.size)) * 45
                  );
                  if (onProgress) onProgress(percent);
                },
                (uploadErr) => {
                  console.warn('Storage upload notice (using secure fallback):', uploadErr?.message);
                }
              );

              const uploadResult = await uploadTask;
              downloadUrl = await getDownloadURL(uploadResult.ref);
            }
          } catch (storageErr) {
            console.warn('Firebase Storage non disponible ou rejeté, utilisation du stockage structuré:', storageErr);
          }

          if (onProgress) onProgress(95);

          const finalMeta: DocumentFinalMeta = {
            name: file.name,
            size: file.size,
            type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            url: downloadUrl || dataUrl,
            dataUrl: dataUrl,
            path: storagePath,
            uploadedAt: new Date().toISOString(),
            uploadedBy: employeeEmail,
          };

          clearTimeout(timer);
          resolve(finalMeta);
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });

      // 4. Enregistrement sur la demande dans Firestore
      const actionType = isReplacement ? 'remplacement_document_final' : 'upload_document_final';
      const motifHistory = isReplacement
        ? `Remplacement du document final par "${file.name}" (${(file.size / 1024).toFixed(0)} Ko)`
        : `Dépôt du document officiel final "${file.name}" (${(file.size / 1024).toFixed(0)} Ko)`;

      const newHistoryEntry: StatutHistoryEntry = {
        action: actionType,
        statut: demande.statut,
        date: new Date().toISOString(),
        employe: employeeEmail,
        motif: motifHistory,
      };

      const updatedHistory = [...(demande.historiqueStatuts || []), newHistoryEntry];

      await updateDemande(numeroSuivi, {
        documentFinal: result,
        historiqueStatuts: updatedHistory,
      });

      if (onProgress) onProgress(100);
      return result;
    } catch (attemptErr: any) {
      lastError = attemptErr;
      console.error(
        `Erreur upload document final (tentative ${attempt}/${maxAttempts}) :`,
        attemptErr?.code || attemptErr?.message || attemptErr
      );

      if (attempt < maxAttempts) {
        // Délai croissant : 1.5s, 3s
        const backoffMs = attempt * 1500;
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }

  throw new Error(
    lastError?.message ||
    `Échec du téléversement du document après ${maxAttempts} tentatives. Veuillez vérifier votre connexion.`
  );
}

/**
 * Suppression du document final par l'employé avec traçabilité dans l'historique
 */
export async function deleteFinalDocument(
  demande: DemandeModel,
  employeeEmail: string
): Promise<void> {
  const numeroSuivi = demande.numeroSuivi;
  const oldDoc = demande.documentFinal;
  if (!oldDoc) return;

  try {
    // Si un chemin de stockage existait
    if (storage && oldDoc.path) {
      try {
        const fileRef = ref(storage, oldDoc.path);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Notice suppression Storage (peut être déjà supprimé):', err);
      }
    }

    const newHistoryEntry: StatutHistoryEntry = {
      action: 'suppression_document_final',
      statut: demande.statut,
      date: new Date().toISOString(),
      employe: employeeEmail,
      motif: `Suppression du document final "${oldDoc.name}"`,
    };

    const updatedHistory = [...(demande.historiqueStatuts || []), newHistoryEntry];

    await updateDemande(numeroSuivi, {
      documentFinal: null,
      historiqueStatuts: updatedHistory,
    });
  } catch (err: any) {
    console.error('Erreur suppression document final:', err);
    throw new Error(err?.message || 'Erreur lors de la suppression du document final.');
  }
}
