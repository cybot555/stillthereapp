'use client';

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

function sanitizeFileExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg';
}

export async function uploadProofImage(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  file: File
) {
  const fileExt = sanitizeFileExtension(file.name);
  const filePath = `${sessionId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg'
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from('proofs').getPublicUrl(filePath);
  return data.publicUrl;
}
