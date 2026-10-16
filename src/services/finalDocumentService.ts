import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';
import { storage } from '../firebase.ts';
import { 
  DemandeModel, 
  DocumentFinalMeta, 
  StatutHistoryEntry, 
  updateDemande 
} from './demandesService.ts';

export const MAX_FINAL_DOC_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export type FinalDocPhase = 'idle' | 'preparing' | 'uploading' | 'saving' | 'done' | 'failed';

export interface FinalDocProgressEvent {
  phase: FinalDocPhase;
  percent: number;
  attempt: number;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
}

/**
 * Standardized logging with clear phase, error code, and message labels
 */
function logPhaseError(phase: FinalDocPhase, attempt: number, err: any) {
  const errorCode = err?.code || err?.name || 'UNKNOWN_ERROR';
  const errorMessage = err?.message || String(err);
  console.error(
    `[FinalDocUpload] Phase: "${phase}" | Attempt: ${attempt}/3 | Error Code: "${errorCode}" | Message: "${errorMessage}"`,
    err
  );
}

/**
 * Validation strictly for official final documents (PDF, JPG, PNG <= 5 Mo)
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
 * Phase 1 Preparation:
 * - PDF: NEVER compress or transform.
 * - Images: Only compress if strictly necessary (> 2 Mo) to stay well under size limit.
 */
export async function prepareFileForUpload(file: File): Promise<File> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    // Preserve PDF bytes completely intact
    return file;
  }

  // If image is already lightweight (<= 2MB), keep original
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  // If image is large (> 2MB), compress slightly using canvas
  return new Promise<File>((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = 2400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressed = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Convert file to base64 Data URL for server proxy fallback
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload to backend route with real XMLHttpRequest progress tracking
 */
function uploadToServerProxy(
  numeroSuivi: string,
  file: File,
  employeeEmail: string,
  onProgress?: (percent: number, loaded: number, total: number) => void,
  timeoutMs: number = 60000
): Promise<{ url: string; path: string; name: string; size: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      const base64Data = await fileToBase64(file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/employee/demandes/${encodeURIComponent(numeroSuivi)}/document-final`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = timeoutMs;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100)));
          onProgress?.(percent, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url || `/api/citizen/demandes/${encodeURIComponent(numeroSuivi)}/document-final`,
              path: response.path || `demandes/${numeroSuivi}/${file.name}`,
              name: response.name || file.name,
              size: response.size || file.size,
            });
          } catch (e) {
            resolve({
              url: `/api/citizen/demandes/${encodeURIComponent(numeroSuivi)}/document-final`,
              path: `demandes/${numeroSuivi}/${file.name}`,
              name: file.name,
              size: file.size,
            });
          }
        } else {
          reject(new Error(`Erreur serveur (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Erreur réseau lors de la communication avec le serveur d\'archivage.'));
      };

      xhr.ontimeout = () => {
        reject(new Error(`Délai de téléversement (${timeoutMs / 1000}s) dépassé sur le serveur.`));
      };

      xhr.send(
        JSON.stringify({
          numeroSuivi,
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileData: base64Data,
          employeeEmail,
        })
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Téléversement complet du document final avec :
 * 1. Progression réelle (bytesTransferred / totalBytes)
 * 2. États séparés : "preparing", "uploading", "saving", "done", "failed"
 * 3. Timeout strict de 60s par tentative
 * 4. 3 tentatives automatiques avec délai exponentiel croissant
 * 5. Gestion et journalisation try/catch de chaque phase
 */
export async function uploadFinalDocumentWithRetry(
  demande: DemandeModel,
  file: File,
  employeeEmail: string,
  onProgress?: (event: FinalDocProgressEvent) => void
): Promise<DocumentFinalMeta> {
  const numeroSuivi = demande.numeroSuivi;
  const isReplacement = Boolean(demande.documentFinal);
  const maxAttempts = 3;
  const timeoutMs = 60000; // 60s strict timeout

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let activeUploadTask: UploadTask | null = null;
    let timer: any = null;

    try {
      // --- PHASE 1: PREPARING ---
      try {
        onProgress?.({
          phase: 'preparing',
          percent: 5,
          attempt,
          message: 'Vérification et préparation du document...',
        });

        console.log(`[FinalDocUpload] Phase: "preparing" | Attempt: ${attempt}/3 | File: ${file.name} (${file.size} bytes)`);
        const preparedFile = await prepareFileForUpload(file);
        
        onProgress?.({
          phase: 'preparing',
          percent: 10,
          attempt,
          message: 'Document préparé avec succès.',
        });

        // --- PHASE 2: UPLOADING ---
        onProgress?.({
          phase: 'uploading',
          percent: 12,
          attempt,
          loadedBytes: 0,
          totalBytes: preparedFile.size,
          message: 'Début du téléversement...',
        });

        console.log(`[FinalDocUpload] Phase: "uploading" | Attempt: ${attempt}/3 | Starting bytes upload...`);

        const sanitizedName = preparedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `demandes/${numeroSuivi}/final_${Date.now()}_${sanitizedName}`;

        let downloadUrl = '';
        let uploadSucceeded = false;

        // Promise wrapper with strict 60s timeout and task cancellation
        await new Promise<void>((resolve, reject) => {
          timer = setTimeout(() => {
            if (activeUploadTask) {
              try {
                activeUploadTask.cancel();
                console.warn(`[FinalDocUpload] Phase: "uploading" | Active upload task cancelled due to 60s timeout.`);
              } catch (cErr) {
                console.warn('Error cancelling task:', cErr);
              }
            }
            reject(new Error(`Timeout de téléversement (${timeoutMs / 1000}s) dépassé lors de la tentative ${attempt}`));
          }, timeoutMs);

          // Path A: Firebase Storage
          (async () => {
            try {
              if (storage) {
                const fileRef = ref(storage, storagePath);
                const metadata = {
                  contentType: preparedFile.type || 'application/pdf',
                  customMetadata: {
                    numeroSuivi,
                    uploadedBy: employeeEmail,
                    originalName: preparedFile.name,
                  },
                };

                const uploadTask = uploadBytesResumable(fileRef, preparedFile, metadata);
                activeUploadTask = uploadTask;

                uploadTask.on(
                  'state_changed',
                  (snapshot) => {
                    const total = snapshot.totalBytes || preparedFile.size || 1;
                    const transferred = snapshot.bytesTransferred;
                    // Real transferred percentage (from 12% to 95%)
                    const realRatio = transferred / total;
                    const calculatedPercent = Math.min(95, Math.max(12, Math.round(12 + realRatio * 83)));
                    
                    onProgress?.({
                      phase: 'uploading',
                      percent: calculatedPercent,
                      attempt,
                      loadedBytes: transferred,
                      totalBytes: total,
                    });
                  },
                  (storageErr) => {
                    // Firebase Storage failed (CORS, network, or rules)
                    logPhaseError('uploading', attempt, storageErr);
                  }
                );

                const uploadSnapshot = await uploadTask;
                downloadUrl = await getDownloadURL(uploadSnapshot.ref);
                uploadSucceeded = true;
                clearTimeout(timer);
                resolve();
                return;
              }
            } catch (firebaseErr: any) {
              console.warn('[FinalDocUpload] Firebase Storage direct upload notice, switching to secure server proxy:', firebaseErr?.message);
            }

            // Path B: Fallback to secure server endpoint with real progress
            try {
              const serverResult = await uploadToServerProxy(
                numeroSuivi,
                preparedFile,
                employeeEmail,
                (percent, loaded, total) => {
                  const calculatedPercent = Math.min(95, Math.max(12, Math.round(12 + (percent / 100) * 83)));
                  onProgress?.({
                    phase: 'uploading',
                    percent: calculatedPercent,
                    attempt,
                    loadedBytes: loaded,
                    totalBytes: total,
                  });
                },
                timeoutMs
              );

              downloadUrl = serverResult.url;
              uploadSucceeded = true;
              clearTimeout(timer);
              resolve();
            } catch (serverErr: any) {
              clearTimeout(timer);
              reject(serverErr);
            }
          })();
        });

        if (!uploadSucceeded) {
          throw new Error('Échec du téléversement du fichier.');
        }

        // --- PHASE 3: SAVING REFERENCE ---
        onProgress?.({
          phase: 'saving',
          percent: 96,
          attempt,
          message: 'Enregistrement de la référence et journalisation...',
        });

        console.log(`[FinalDocUpload] Phase: "saving" | Attempt: ${attempt}/3 | Writing documentFinal to Firestore...`);

        const finalMeta: DocumentFinalMeta = {
          name: preparedFile.name,
          size: preparedFile.size,
          type: preparedFile.type || (preparedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          url: downloadUrl || `/api/citizen/demandes/${encodeURIComponent(numeroSuivi)}/document-final`,
          path: storagePath,
          uploadedAt: new Date().toISOString(),
          uploadedBy: employeeEmail,
        };

        const actionType = isReplacement ? 'remplacement_document_final' : 'upload_document_final';
        const motifHistory = isReplacement
          ? `Remplacement du document final par "${preparedFile.name}" (${(preparedFile.size / 1024).toFixed(0)} Ko)`
          : `Dépôt du document officiel final "${preparedFile.name}" (${(preparedFile.size / 1024).toFixed(0)} Ko)`;

        const newHistoryEntry: StatutHistoryEntry = {
          action: actionType,
          statut: demande.statut,
          date: new Date().toISOString(),
          employe: employeeEmail,
          motif: motifHistory,
        };

        const updatedHistory = [...(demande.historiqueStatuts || []), newHistoryEntry];

        await updateDemande(numeroSuivi, {
          documentFinal: finalMeta,
          historiqueStatuts: updatedHistory,
        });

        // --- PHASE 4: DONE ---
        onProgress?.({
          phase: 'done',
          percent: 100,
          attempt,
          message: 'Document officiel envoyé avec succès.',
        });

        console.log(`[FinalDocUpload] Phase: "done" | Document ${preparedFile.name} successfully linked to demande ${numeroSuivi}.`);
        return finalMeta;
      } catch (phaseErr: any) {
        logPhaseError('uploading', attempt, phaseErr);
        throw phaseErr;
      }
    } catch (attemptErr: any) {
      if (timer) clearTimeout(timer);
      lastError = attemptErr;

      console.error(
        `[FinalDocUpload] Tentative ${attempt}/${maxAttempts} échouée :`,
        attemptErr?.code || attemptErr?.name || 'ERROR',
        attemptErr?.message || attemptErr
      );

      if (attempt < maxAttempts) {
        const backoffMs = attempt * 1500;
        console.log(`[FinalDocUpload] Nouvelle tentative dans ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }

  // --- PHASE 5: FAILED (All retries exhausted) ---
  const finalErrorMessage =
    lastError?.message ||
    `Échec du téléversement du document après ${maxAttempts} tentatives. Veuillez vérifier votre connexion.`;

  logPhaseError('failed', maxAttempts, lastError);

  onProgress?.({
    phase: 'failed',
    percent: 0,
    attempt: maxAttempts,
    message: finalErrorMessage,
  });

  throw new Error(finalErrorMessage);
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
    console.log(`[FinalDocUpload] Deleting final document for demande ${numeroSuivi}...`);
    if (storage && oldDoc.path && !oldDoc.path.startsWith('uploads/')) {
      try {
        const fileRef = ref(storage, oldDoc.path);
        await deleteObject(fileRef);
      } catch (err: any) {
        console.warn('[FinalDocUpload] Notice suppression Storage (peut-être déjà supprimé) :', err?.message);
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

    console.log(`[FinalDocUpload] Final document removed successfully from demande ${numeroSuivi}.`);
  } catch (err: any) {
    logPhaseError('failed', 1, err);
    throw new Error(err?.message || 'Erreur lors de la suppression du document final.');
  }
}
