-- ============================================================
-- Initial Schema Migration — Pizzeria Platform
-- ============================================================

CREATE TABLE tenants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE branches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug            text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  whatsapp_number text NOT NULL,
  currency_symbol text NOT NULL DEFAULT '$',
  is_active       boolean NOT NULL DEFAULT true,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE menu_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name          text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    uuid NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  price         numeric(10,2) NOT NULL DEFAULT 0,
  is_available  boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE product_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url           text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE admin_branch_roles (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'admin',
  UNIQUE(user_id, branch_id)
);

CREATE TABLE theme_configs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE UNIQUE,
  color_background   text NOT NULL DEFAULT '#181412',
  color_primary      text NOT NULL DEFAULT '#ae4313',
  color_secondary    text NOT NULL DEFAULT '#e99e21',
  color_text_light   text NOT NULL DEFAULT '#d6d1c5',
  color_dark_support text NOT NULL DEFAULT '#502212',
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE menu_sections ADD CONSTRAINT menu_sections_branch_name_unique UNIQUE (branch_id, name);
ALTER TABLE products ADD CONSTRAINT products_section_name_unique UNIQUE (section_id, name);

-- RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_branches" ON branches FOR SELECT USING (is_active = true);

ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_sections" ON menu_sections FOR SELECT USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_products" ON products FOR SELECT USING (is_available = true);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_images" ON product_images FOR SELECT USING (true);

ALTER TABLE theme_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_theme" ON theme_configs FOR SELECT USING (true);

ALTER TABLE admin_branch_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_own_roles" ON admin_branch_roles FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION user_has_branch_access(bid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_branch_roles
    WHERE user_id = auth.uid() AND branch_id = bid
  );
$$;

CREATE POLICY "admin_write_sections" ON menu_sections FOR ALL
  USING (user_has_branch_access(branch_id))
  WITH CHECK (user_has_branch_access(branch_id));

CREATE POLICY "admin_write_products" ON products FOR ALL
  USING (user_has_branch_access(branch_id))
  WITH CHECK (user_has_branch_access(branch_id));

CREATE POLICY "admin_write_images" ON product_images FOR ALL
  USING (user_has_branch_access(
    (SELECT branch_id FROM products WHERE id = product_id)
  ));

CREATE POLICY "admin_write_theme" ON theme_configs FOR ALL
  USING (user_has_branch_access(branch_id))
  WITH CHECK (user_has_branch_access(branch_id));

CREATE POLICY "admin_write_branches" ON branches FOR ALL
  USING (user_has_branch_access(id))
  WITH CHECK (user_has_branch_access(id));
