export const environment = {
  production: false,
  supabase: {
    url: '${SUPABASE_URL}',
    anonKey: '${SUPABASE_ANON_KEY}',
  },
  cloudinary: {
    cloudName: '${CLOUDINARY_CLOUD_NAME}',
    uploadPreset: '${CLOUDINARY_UPLOAD_PRESET}',
  },
};
