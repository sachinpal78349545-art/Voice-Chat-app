import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { uploadToCloudinary } from "./cloudinary";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://demo.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

console.log("[Firebase] Init OK");
console.log("[Firebase] Project:", firebaseConfig.projectId);

export interface UploadResult {
  url: string;
}

export async function directUpload(
  fileOrBlob: File | Blob,
  _path: string,
  _contentType?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const sizeKB = ((fileOrBlob.size || 0) / 1024).toFixed(1);
  console.log("[Upload] Cloudinary upload | size:", sizeKB, "KB");
  const url = await uploadToCloudinary(fileOrBlob, onProgress);
  console.log("[Upload] Cloudinary URL:", url.substring(0, 100));
  return { url };
}

export const uploadWithAppCheck = directUpload;

// ✅ Add storage export for compatibility with ProfilePage.tsx (uses Firebase Storage API but actually uploads via Cloudinary)
const storageRefs = new Map<string, string>();

export const storage = {
  ref: (path: string) => ({
    async uploadBytes(file: File): Promise<{ ref: { toString: () => string }; metadata: { fullPath: string } }> {
      const { url } = await directUpload(file, path);
      storageRefs.set(path, url);
      return {
        ref: { toString: () => path },
        metadata: { fullPath: path },
      };
    },
    async getDownloadURL(): Promise<string> {
      const url = storageRefs.get(path);
      if (url) return url;
      throw new Error(`No URL found for path: ${path}. Upload first.`);
    },
    toString: () => path,
  }),
};