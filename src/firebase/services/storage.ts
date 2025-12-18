
'use client';

import { FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { errorEmitter } from '../error-emitter';

/**
 * Faz o upload de uma imagem em formato Data URL para o Firebase Storage.
 * @param storage Instância do Firebase Storage.
 * @param path Caminho completo no storage onde o arquivo será salvo (ex: 'profile-pictures/user123.jpg').
 * @param dataUrl A imagem em formato Data URL (ex: 'data:image/jpeg;base64,...').
 * @returns A URL pública de download do arquivo.
 */
export async function uploadDataUrl(storage: FirebaseStorage, path: string, dataUrl: string): Promise<string> {
    const storageRef = ref(storage, path);
    
    try {
        // O SDK do Firebase v9+ para web lida com a string Data URL diretamente.
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Erro ao fazer upload do arquivo:", error);
        // O ideal é emitir um erro mais específico, mas por enquanto lançamos um erro genérico.
        throw new Error("Falha no upload do arquivo.");
    }
}

/**
 * Deleta um arquivo do Firebase Storage.
 * @param storage Instância do Firebase Storage.
 * @param path Caminho completo do arquivo a ser deletado.
 */
export async function deleteFile(storage: FirebaseStorage, path: string): Promise<void> {
    const storageRef = ref(storage, path);
    
    try {
        await deleteObject(storageRef);
    } catch (error: any) {
         // Ignora o erro se o arquivo não existir, o que é comum.
        if (error.code === 'storage/object-not-found') {
            console.warn(`Arquivo não encontrado em ${path}, não foi possível deletar.`);
            return;
        }
        console.error("Erro ao deletar arquivo:", error);
        throw new Error("Falha ao deletar o arquivo.");
    }
}
