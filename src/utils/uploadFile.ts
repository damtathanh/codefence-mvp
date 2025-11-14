// src/utils/uploadFile.ts
import { supabase } from "../lib/supabaseClient";
import type { MinimalProfile } from "./getUserFolderName";
import { getUserFolderName } from "./getUserFolderName";

/**
 * Build filename with timestamp + unique suffix
 */
const buildFileName = (fileName: string) => {
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${uniqueSuffix}${ext}`;
};

const BUCKET = "attachments"; // CHANGE THIS IF YOUR BUCKET NAME IS DIFFERENT

/**
 * Uploads a file to Supabase Storage and returns a public URL.
 */
export async function uploadFile(file: File, profile?: MinimalProfile): Promise<string> {
  if (!file) throw new Error("No file provided to uploadFile.");

  const folderName = getUserFolderName(profile);
  const fileName = buildFileName(file.name);
  const filePath = `${folderName}/${fileName}`;

  try {
    // UPLOAD
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadFile] Upload error:", uploadError);
      throw new Error(uploadError.message);
    }

    if (!uploadData) {
      throw new Error("Upload failed: no data returned.");
    }

    // PUBLIC URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.error("[uploadFile] Missing publicUrl:", urlData);
      throw new Error("Failed to get public URL for uploaded file.");
    }

    return urlData.publicUrl;

  } catch (err: any) {
    console.error("[uploadFile] Caught error:", err);
    throw new Error(err?.message ?? "Unknown upload error");
  }
}

export default uploadFile;
