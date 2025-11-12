import { supabase } from '../lib/supabaseClient';

/**
 * Uploads a file to Supabase Storage
 * @param file - File to upload
 * @param folder - Folder path in storage (e.g., 'messages', 'attachments')
 * @returns Public URL of uploaded file
 */
export async function uploadFile(file: File, folder: string = 'messages'): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
}

