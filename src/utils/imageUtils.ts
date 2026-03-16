import * as FileSystem from "expo-file-system/legacy";

const IMAGEKIT_PRIVATE_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY || "";

/**
 * Uploads an image to ImageKit using multipart/form-data (the format the API requires).
 * - Reads the file as raw Base64 (no data: prefix).
 * - Sends via FormData using fetch (works for https:// in React Native).
 * - Returns the CDN URL to be stored in Firestore.
 */
export const uploadFileToStorage = async (
  uri: string,
  storagePath: string,
): Promise<string> => {
  try {
    console.log(`[ImageKit] Starting upload for path: ${storagePath}`);

    // 1. Read local image as raw Base64 (no data: prefix)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Build filename and folder from storagePath
    // storagePath example: "profileImages/userId" or "receipts/userId/month-receipt"
    const pathParts = storagePath.split("/");
    const fileName = pathParts.pop() + ".jpg";
    const folder = "/" + pathParts.join("/");

    // 3. ImageKit Basic auth: base64(privateKey + ":")
    const authValue = "Basic " + btoa(IMAGEKIT_PRIVATE_KEY + ":");

    // 4. Build FormData
    const formData = new FormData();
    formData.append("file", base64);
    formData.append("fileName", fileName);
    formData.append("folder", folder || "/general");
    formData.append("useUniqueFileName", "true");

    // 5. POST to ImageKit Upload API
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authValue,
      },
      body: formData,
    });

    const data = await response.json();
    console.log(`[ImageKit] Response (${response.status}):`, data);

    if (!response.ok) {
      throw new Error(`ImageKit upload failed (${response.status}): ${data.message}`);
    }

    console.log(`[ImageKit] Upload success! URL: ${data.url}`);
    return data.url as string;

  } catch (error: any) {
    console.error("uploadFileToStorage error:", error);
    throw error;
  }
};
