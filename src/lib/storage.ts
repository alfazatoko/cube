import { storage } from "./firebase";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadImage(base64: string, path: string): Promise<string> {
  // Extract base64 content if it has data URL prefix
  const base64Content = base64.includes(",") ? base64.split(",")[1] : base64;
  
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64Content, "base64", {
    contentType: "image/jpeg"
  });
  
  return await getDownloadURL(storageRef);
}

export async function deleteImage(url: string) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (err) {
    console.error("Gagal menghapus gambar dari storage", err);
  }
}
