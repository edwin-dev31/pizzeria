-- Product variants: sizes/prices for products like pizzas
CREATE TABLE product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          text NOT NULL,          -- e.g. "PERSONAL", "PEQUEÑA"
  label         text,                   -- e.g. "4 porciones · 1 persona"
  price         numeric(10,2) NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "admin_write_variants" ON product_variants FOR ALL
  USING (user_has_branch_access(
    (SELECT branch_id FROM products WHERE id = product_id)
  ))
  WITH CHECK (user_has_branch_access(
    (SELECT branch_id FROM products WHERE id = product_id)
  ));
