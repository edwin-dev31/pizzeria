import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});


enum VariantSize {
  Personal = 'PERSONAL',
  Pequena  = 'PEQUENA',
  Mediana  = 'MEDIANA',
  Gigante  = 'GIGANTE',
}

const TAMANO_KEY_TO_ENUM: Record<string, VariantSize> = {
  personal: VariantSize.Personal,
  pequena:  VariantSize.Pequena,
  mediana:  VariantSize.Mediana,
  gigante:  VariantSize.Gigante,
};

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

interface ThemeConfigSeed {
  color_background: string;
  color_primary: string;
  color_secondary: string;
  color_text_light: string;
  color_dark_support: string;
}

interface TamanoSeed {
  nombre: string;
  porciones: string;
  personas: string;
}

interface PizzaSeed {
  nombre: string;
  imagen?: string;
  ingredientes?: string;
  precios: Record<string, number>;
}

interface ProductSeed {
  nombre: string;
  imagen?: string;
  descripcion?: string;
  precio?: number;
}

interface ModelJson {
  theme_config: ThemeConfigSeed;
  branches: BranchSeed[];
  tamanos: Record<string, TamanoSeed>;
  pizzas: PizzaSeed[];
  hamburguesas: ProductSeed[];
  perros: ProductSeed[];
  especiales: ProductSeed[];
  desgranados: ProductSeed[];
  super_salchipapas: ProductSeed[];
  clasicos: ProductSeed[];
  adicionales: ProductSeed[];
}


const modelPath = path.resolve(__dirname, '..', '..', 'model.json');
const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8')) as ModelJson;

const SECTION_KEYS: Array<{ key: keyof ModelJson; name: string }> = [
  { key: 'pizzas',            name: 'Pizzas' },
  { key: 'hamburguesas',      name: 'Hamburguesas' },
  { key: 'perros',            name: 'Perros' },
  { key: 'especiales',        name: 'Especiales' },
  { key: 'desgranados',       name: 'Desgranados' },
  { key: 'super_salchipapas', name: 'Super Salchipapas' },
  { key: 'clasicos',          name: 'Clasicos' },
  { key: 'adicionales',       name: 'Adicionales' },
];

// ── Clear ────────────────────────────────────────────────────────────────────

async function clearDatabase(): Promise<void> {
  console.log('\n🗑  Limpiando base de datos...');
  const tables = [
    'product_variants',
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
    console.log(`  ✓ ${table}`);
  }
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  // 1. Tenant
  console.log('\n→ Tenant...');
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants').insert({ name: "Jiro's Pizzeria" }).select('id').single();
  if (tenantError) throw tenantError;
  const tenantId: string = tenantData.id;

  // 2. Branches
  console.log('→ Branches...');
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .insert(model.branches.map((b) => ({ ...b, tenant_id: tenantId })))
    .select('id, slug');
  if (branchError) throw branchError;
  const branches = branchData as Array<{ id: string; slug: string }>;

  // 3. Theme configs
  console.log('→ Theme configs...');
  const { error: themeError } = await supabase.from('theme_configs').insert(
    branches.map((b) => ({ branch_id: b.id, ...model.theme_config }))
  );
  if (themeError) throw themeError;

  // 4. Sections + products per branch
  for (const branch of branches) {
    console.log(`\n→ Branch: ${branch.slug}`);

    const { data: sectionData, error: sectionError } = await supabase
      .from('menu_sections')
      .insert(SECTION_KEYS.map((s, idx) => ({ branch_id: branch.id, name: s.name, display_order: idx })))
      .select('id, name');
    if (sectionError) throw sectionError;
    const sections = sectionData as Array<{ id: string; name: string }>;

    for (const sectionMeta of SECTION_KEYS) {
      const section = sections.find((s) => s.name === sectionMeta.name);
      if (!section) continue;

      const isPizzas = sectionMeta.key === 'pizzas';
      const items = (model[sectionMeta.key] ?? []) as Array<PizzaSeed | ProductSeed>;
      if (items.length === 0) continue;

      console.log(`  ↳ ${sectionMeta.name}: ${items.length} productos`);

      // Insert products — base price = lowest variant price for pizzas
      const { data: insertedProducts, error: productError } = await supabase
        .from('products')
        .insert(items.map((p, idx) => {
          const basePrice = isPizzas
            ? Math.min(...Object.values((p as PizzaSeed).precios))
            : ((p as ProductSeed).precio ?? 0);
          return {
            section_id: section.id,
            branch_id: branch.id,
            name: p.nombre,
            description: isPizzas
              ? ((p as PizzaSeed).ingredientes ?? null)
              : ((p as ProductSeed).descripcion ?? null),
            price: basePrice,
            is_available: true,
            display_order: idx,
          };
        }))
        .select('id, name');
      if (productError) throw productError;

      const prodList = insertedProducts as Array<{ id: string; name: string }>;

      // Insert images
      const imageRows = prodList.flatMap((prod) => {
        const src = items.find((p) => p.nombre === prod.name);
        if (!src?.imagen) return [];
        return [{ product_id: prod.id, url: src.imagen, display_order: 0 }];
      });
      if (imageRows.length > 0) {
        const { error: imgError } = await supabase.from('product_images').insert(imageRows);
        if (imgError) throw imgError;
      }

      // Insert variants for pizzas
      if (isPizzas) {
        const variantRows = prodList.flatMap((prod) => {
          const src = items.find((p) => p.nombre === prod.name) as PizzaSeed | undefined;
          if (!src?.precios) return [];
          return Object.entries(src.precios).map(([key, price], idx) => {
            const tamano = model.tamanos[key];
            return {
              product_id: prod.id,
              name: TAMANO_KEY_TO_ENUM[key] ?? key.toUpperCase(),
              label: tamano ? `${tamano.porciones} · ${tamano.personas}` : null,
              price,
              display_order: idx,
            };
          });
        });
        if (variantRows.length > 0) {
          const { error: varError } = await supabase.from('product_variants').insert(variantRows);
          if (varError) throw varError;
        }
      }
    }
  }
}

// ── Re-assign admin roles ────────────────────────────────────────────────────

async function assignAdminRoles(): Promise<void> {
  console.log('\n→ Asignando roles admin...');
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u: { email?: string }) => u.email === 'admin@jiropizzeria.com');
  if (!user) { console.log('  ⚠ Admin user not found, skipping.'); return; }

  const { data: branches } = await supabase.from('branches').select('id');
  if (!branches?.length) return;

  const { error } = await supabase.from('admin_branch_roles').insert(
    branches.map((b: { id: string }) => ({ user_id: user.id, branch_id: b.id, role: 'admin' }))
  );
  if (error) throw error;
  console.log(`  ✓ Admin asignado a ${branches.length} branches`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await clearDatabase();
    await seed();
    await assignAdminRoles();
    console.log('\n✓ Seed completo.');
  } catch (err) {
    console.error('\n✗ Seed falló:', err);
    process.exit(1);
  }
}

main();
