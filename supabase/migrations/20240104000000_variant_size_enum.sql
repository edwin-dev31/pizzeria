-- Create enum type for pizza variant sizes
CREATE TYPE variant_size AS ENUM ('PERSONAL', 'PEQUEÑA', 'MEDIANA', 'GIGANTE');

-- Alter existing column to use the enum
ALTER TABLE product_variants
  ALTER COLUMN name TYPE variant_size USING name::variant_size;
