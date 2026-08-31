const CLOUD_NAME = "dz1bhfpkc";
const UPLOAD_PRESET = "Profile_pic";
const UPLOAD_URL = "https://api.cloudinary.com/v1_1/dz1bhfpkc/image/upload";
const AUTO_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dz1bhfpkc/auto/upload";

function optimizedUrl(url: string, width = 400, height = 400): string {
  return url.replace("/upload/", `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`);
}

export async function uploadToCloudinary(
  file: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const isAudio =
    (file instanceof File && file.type.startsWith("audio/")) ||
    (file instanceof Blob && (file as any).type?.startsWith("audio/"));

  const endpoint = isAudio ? AUTO_UPLOAD_URL : UPLOAD_URL;

  const formData = new FormData();
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  formData.append("file", file);

  console.log("[Cloudinary] Uploading to:", endpoint);
  console.log("[Cloudinary] Preset:", UPLOAD_PRESET);
  console.log("[Cloudinary] File size:", ((file.size || 0) / 1024).toFixed(1), "KB");
  console.log("[Cloudinary] File type:", file.type || "unknown");

  onProgress?.(20);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    onProgress?.(80);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[Cloudinary] FAILED status:", response.status);
      console.error("[Cloudinary] FAILED body:", errBody);
      throw new Error(`Cloudinary upload failed (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    onProgress?.(100);

    const rawUrl: string = data.secure_url;
    console.log("[Cloudinary] SUCCESS url:", rawUrl);

    if (isAudio) {
      return rawUrl;
    }

    return optimizedUrl(rawUrl);
  } catch (err: any) {
    console.error("[Cloudinary] Upload error:", err?.message || err);
    throw err;
  }
}

export function getOptimizedUrl(url: string, width = 400, height = 400): string {
  if (!url.includes("cloudinary.com")) return url;
  if (url.includes("/upload/w_") || url.includes("/upload/c_")) return url;
  return optimizedUrl(url, width, height);
}
