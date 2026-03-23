import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const targetPath     = path.join(__dirname, '../src/environments/environment.ts');
const targetProdPath = path.join(__dirname, '../src/environments/environment.prod.ts');
const templatePath     = path.join(__dirname, '../src/environments/environment.template.ts');
const templateProdPath = path.join(__dirname, '../src/environments/environment.prod.template.ts');

// Read template files
const envTemplate     = fs.readFileSync(templatePath, 'utf8');
const envProdTemplate = fs.readFileSync(templateProdPath, 'utf8');

const envContent = envTemplate
  .replace('${SUPABASE_URL}',             process.env.SUPABASE_URL             || '')
  .replace('${SUPABASE_ANON_KEY}',        process.env.SUPABASE_ANON_KEY        || '')
  .replace('${CLOUDINARY_CLOUD_NAME}',    process.env.CLOUDINARY_CLOUD_NAME    || '')
  .replace('${CLOUDINARY_UPLOAD_PRESET}', process.env.CLOUDINARY_UPLOAD_PRESET || '');

const envProdContent = envProdTemplate;

fs.writeFileSync(targetPath,     envContent,     'utf8');
fs.writeFileSync(targetProdPath, envProdContent, 'utf8');

console.log('✅ Environment files generated successfully!');
console.log(`   - ${targetPath}`);
console.log(`   - ${targetProdPath}`);
