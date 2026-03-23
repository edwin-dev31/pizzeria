import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from pizza-project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- Env validation ---
const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('Set them in pizza-project/.env or export them before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Types ---
interface BranchSeed {
  slug: string;
  display_name: string;
  address?: string;
  description?: string;
  cover_image_url?: string;
  whatsapp_number: string;
  currency_symbol: string;
  is_active: boolean;
  display_order: number;
}

interface ProductSeed {
  nombre: string;
  imagen?: string;
  descripcion?: string;
  precio?: number;
}

interface ThemeConfigSeed {
  color_background: string;
  color_primary: string;
  color_secondary: string;
  color_text_light: string;
  color_dark_support: string;
}

interface ModelJson {
  theme_config: ThemeConfigSeed;
  branches: BranchSeed[];
  [key: string]: ProductSeed[] | BranchSeed[] | ThemeConfigSeed;
}

// --- Load model.json (two levels up from scripts/) ---
const modelPath = path.resolve(__dirname, '..', '..', 'model.json');
const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8')) as ModelJson;

const SECTION_KEYS: Array<{ key: string; name: string }> = [
  { key: 'pizzas',            name: 'Pizzas' },
  { key: 'hamburguesas',      name: 'Hamburguesas' },
  { key: 'perros',            name: 'Perros' },
  { key: 'especiales',        name: 'Especiales' },
  { key: 'desgranados',       name: 'Desgranados' },
  { key: 'super_salchipapas', name: 'Super Salchipapas' },
  { key: 'clasicos',          name: 'Clasicos' },
  { key: 'adicionales',       name: 'Adicionales' },
];

const BRANCHES: BranchSeed[] = model.branches;

// --- Clear all data respecting FK order ---
async function clearDatabase(): Promise<void> {
  console.log('\n🗑  Limpiando base de datos...');

  const tables = [
    'product_images',
    'products',
    'menu_sections',
    'admin_branch_roles',
    'theme_configs',
    'branches',
    'tenants',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Error limpiando ${table}: ${error.message}`);
    console.log(`  ✓ ${table} limpiada`);
  }

  console.log('  → Base de datos limpia.\n');
}

// --- Seed ---
async function seed(): Promise<void> {
  // 1. Tenant
  console.log('→ Insertando tenant...');
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: "Jiro's Pizzeria" })
    .select('id')
    .single();
  if (tenantError) throw tenantError;
  const tenantId: string = tenantData.id;
  console.log(`  tenant id: ${tenantId}`);

  // 2. Branches
  console.log('→ Insertando branches...');
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .insert(BRANCHES.map((b) => ({ ...b, tenant_id: tenantId })))
    .select('id, slug');
  if (branchError) throw branchError;
  const branches = branchData as Array<{ id: string; slug: string }>;
  branches.forEach((b) => console.log(`  branch: ${b.slug} → ${b.id}`));

  // 3. Theme configs per branch
  console.log('→ Insertando theme_configs...');
  const { error: themeError } = await supabase.from('theme_configs').insert(
    branches.map((b) => ({
      branch_id: b.id,
      ...model.theme_config,
    }))
  );
  if (themeError) throw themeError;
  console.log('  ✓ theme_configs insertados');

  // 4. Sections + products per branch
  for (const branch of branches) {
    console.log(`\n→ Secciones y productos para branch: ${branch.slug}`);

    const { data: sectionData, error: sectionError } = await supabase
      .from('menu_sections')
      .insert(
        SECTION_KEYS.map((s, idx) => ({
          branch_id: branch.id,
          name: s.name,
          display_order: idx,
        }))
      )
      .select('id, name');
    if (sectionError) throw sectionError;
    const sections = sectionData as Array<{ id: string; name: string }>;

    for (const sectionMeta of SECTION_KEYS) {
      const section = sections.find((s) => s.name === sectionMeta.name);
      if (!section) continue;

      const items = (model[sectionMeta.key] ?? []) as ProductSeed[];
      if (items.length === 0) continue;

      console.log(`  ↳ ${sectionMeta.name}: ${items.length} productos`);

      const { data: insertedProducts, error: productError } = await supabase.from('products').insert(
        items.map((p, idx) => ({
          section_id: section.id,
          branch_id: branch.id,
          name: p.nombre,
          description: p.descripcion ?? null,
          price: p.precio ?? 0,
          is_available: true,
          display_order: idx,
        }))
      ).select('id, name');
      if (productError) throw productError;

      // Insert product images
      const imageRows = (insertedProducts as Array<{ id: string; name: string }>).flatMap((prod) => {
        const src = items.find(p => p.nombre === prod.name);
        if (!src?.imagen) return [];
        return [{ product_id: prod.id, url: src.imagen, display_order: 0 }];
      });
      if (imageRows.length > 0) {
        const { error: imgError } = await supabase.from('product_images').insert(imageRows);
        if (imgError) throw imgError;
      }
    }
  }
}

async function main() {
  try {
    await clearDatabase();
    await seed();
    console.log('\n✓ Seed completo.');
  } catch (err) {
    console.error('\n✗ Seed falló:', err);
    process.exit(1);
  }
}

main();
