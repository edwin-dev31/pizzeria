#!/bin/sh
set -e

echo "Replacing Supabase/Cloudinary config at runtime..."

find /usr/share/nginx/html -type f -name "*.js" | while read file; do
  sed -i "s|__SUPABASE_URL__|${SUPABASE_URL}|g"                   "$file"
  sed -i "s|__SUPABASE_ANON_KEY__|${SUPABASE_ANON_KEY}|g"         "$file"
  sed -i "s|__CLOUDINARY_CLOUD_NAME__|${CLOUDINARY_CLOUD_NAME}|g" "$file"
  sed -i "s|__CLOUDINARY_UPLOAD_PRESET__|${CLOUDINARY_UPLOAD_PRESET}|g" "$file"
done

echo "Done. Starting nginx..."
exec nginx -g "daemon off;"
