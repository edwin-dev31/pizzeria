import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

// --- Load model.json (two levels up from scripts/) ---
const modelPath = path.resolve(__dirname, '..', '..', 'model.json');
const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8')) as Record<
  string,
  Array<{ nombre: string; descripcion?: string; precio?: number }>
>;

const SECTION_KEYS: Array<{ key: string; name: string }> = [
  { key: 'pizzas',           name: 'Pizzas' },
  { key: 'hamburguesas',     name: 'Hamburguesas' },
  { key: 'perros',           name: 'Perros' },
  { key: 'especiales',       name: 'Especiales' },
  { key: 'desgranados',      name: 'Desgranados' },
  { key: 'super_salchipapas',name: 'Super Salchipapas' },
  { key: 'clasicos',         name: 'Clásicos' },
  { key: 'adicionales',      name: 'Adicionales' },
];

const BRANCHES = [
  { slug: 'norte', display_name: "Jiro's Norte", whatsapp_number: '0000000000', currency_symbol: '$', is_active: true, display_order: 0 },
  { slug: 'sur',   display_name: "Jiro's Sur",   whatsapp_number: '0000000000', currency_symbol: '$', is_active: true, display_order: 1 },
];

async function main() {
  try {
    // 1. Upsert tenant
    console.log('→ Seeding tenant...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .upsert({ name: "Jiro's Pizzeria" }, { onConflict: 'name' })
      .select('id')
      .single();
    if (tenantError) throw tenantError;
    const tenantId: string = tenantData.id;
    console.log(`  tenant id: ${tenantId}`);

    // 2. Upsert branches
    console.log('→ Seeding branches...');
    const branchRows = BRANCHES.map((b) => ({ ...b, tenant_id: tenantId }));
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .upsert(branchRows, { onConflict: 'slug' })
      .select('id, slug');
    if (branchError) throw branchError;
    const branches = branchData as Array<{ id: string; slug: string }>;
    branches.forEach((b) => console.log(`  branch: ${b.slug} → ${b.id}`));

    // 3. For each branch, upsert sections and products
    for (const branch of branches) {
      console.log(`\n→ Seeding sections for branch: ${branch.slug}`);

      const sectionRows = SECTION_KEYS.map((s, idx) => ({
        branch_id: branch.id,
        name: s.name,
        display_order: idx,
      }));

      const { data: sectionData, error: sectionError } = await supabase
        .from('menu_sections')
        .upsert(sectionRows, { onConflict: 'branch_id,name' })
        .select('id, name');
      if (sectionError) throw sectionError;
      const sections = sectionData as Array<{ id: string; name: string }>;

      for (const sectionMeta of SECTION_KEYS) {
        const section = sections.find((s) => s.name === sectionMeta.name);
        if (!section) continue;

        const products = model[sectionMeta.key] ?? [];
        if (products.length === 0) continue;

        console.log(`  ↳ ${sectionMeta.name}: ${products.length} productos`);

        const productRows = products.map((p, idx) => ({
          section_id: section.id,
          branch_id: branch.id,
          name: p.nombre,
          description: p.descripcion ?? null,
          price: p.precio ?? 0,
          is_available: true,
          display_order: idx,
        }));

        const { error: productError } = await supabase
          .from('products')
          .upsert(productRows, { onConflict: 'section_id,name' });
        if (productError) throw productError;
      }
    }

    console.log('\n✓ Seed completo.');
  } catch (err) {
    console.error('\n✗ Seed falló:', err);
    process.exit(1);
  }
}

main();
