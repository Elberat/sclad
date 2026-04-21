-- ================================================================
-- Migration 001: Initial Schema
-- Single-tenant Inventory Management System
-- ================================================================


-- ----------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ----------------------------------------------------------------
-- 2. TRIGGER HELPER: set updated_at on every UPDATE
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------
-- 3. TABLES
-- ----------------------------------------------------------------

CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text        UNIQUE NOT NULL,
  full_name    text,
  role         text        NOT NULL
                           CHECK (role IN ('viewer','cashier','warehouse_manager','super_admin')),
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  archived_at  timestamptz
);

CREATE TABLE warehouses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  archived_at  timestamptz
);

CREATE TABLE item_categories (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  archived_at  timestamptz
);

CREATE TABLE items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    uuid          NOT NULL REFERENCES item_categories(id),
  name           text          NOT NULL,
  model          text,
  sku            text,
  description    text,
  specs_json     jsonb,
  purchase_price numeric(12,2),
  sale_price     numeric(12,2),
  image_url      text,
  is_active      boolean       NOT NULL DEFAULT true,
  created_at     timestamptz   NOT NULL DEFAULT NOW(),
  updated_at     timestamptz   NOT NULL DEFAULT NOW(),
  archived_at    timestamptz
);

CREATE TABLE inventory_balances (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  uuid        NOT NULL REFERENCES warehouses(id),
  item_id       uuid        NOT NULL REFERENCES items(id),
  quantity      integer     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, item_id)
);

CREATE TABLE inventory_operations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type                     text        NOT NULL CHECK (type IN ('receipt','sale','transfer')),
  item_id                  uuid        NOT NULL REFERENCES items(id),
  source_warehouse_id      uuid        REFERENCES warehouses(id),
  destination_warehouse_id uuid        REFERENCES warehouses(id),
  quantity                 integer     NOT NULL CHECK (quantity > 0),
  comment                  text,
  created_by_user_id       uuid        REFERENCES profiles(id),
  created_at               timestamptz NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------
CREATE INDEX idx_inv_bal_warehouse  ON inventory_balances (warehouse_id);
CREATE INDEX idx_inv_bal_item       ON inventory_balances (item_id);

CREATE INDEX idx_inv_ops_item       ON inventory_operations (item_id);
CREATE INDEX idx_inv_ops_created_at ON inventory_operations (created_at DESC);
CREATE INDEX idx_inv_ops_source     ON inventory_operations (source_warehouse_id);
CREATE INDEX idx_inv_ops_dest       ON inventory_operations (destination_warehouse_id);


-- ----------------------------------------------------------------
-- 5. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_item_categories_updated_at
  BEFORE UPDATE ON item_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ----------------------------------------------------------------
-- 6. HELPER: get_my_role()
--    SECURITY DEFINER bypasses RLS — no recursion risk.
--    Must be defined before RLS policies reference it.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS
$$ SELECT role FROM profiles WHERE id = auth.uid() $$;

REVOKE ALL ON FUNCTION get_my_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_my_role() TO authenticated;


-- ----------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_operations ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────
-- All authenticated users can read profiles
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can create / modify / delete profiles
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING     (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  TO authenticated
  USING (get_my_role() = 'super_admin');

-- ── warehouses ───────────────────────────────────────────────────
CREATE POLICY "warehouses_select"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "warehouses_insert"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "warehouses_update"
  ON warehouses FOR UPDATE
  TO authenticated
  USING     (get_my_role() IN ('warehouse_manager','super_admin'))
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "warehouses_delete"
  ON warehouses FOR DELETE
  TO authenticated
  USING (get_my_role() IN ('warehouse_manager','super_admin'));

-- ── item_categories ──────────────────────────────────────────────
CREATE POLICY "item_categories_select"
  ON item_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "item_categories_insert"
  ON item_categories FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "item_categories_update"
  ON item_categories FOR UPDATE
  TO authenticated
  USING     (get_my_role() IN ('warehouse_manager','super_admin'))
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "item_categories_delete"
  ON item_categories FOR DELETE
  TO authenticated
  USING (get_my_role() IN ('warehouse_manager','super_admin'));

-- ── items ────────────────────────────────────────────────────────
CREATE POLICY "items_select"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "items_insert"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "items_update"
  ON items FOR UPDATE
  TO authenticated
  USING     (get_my_role() IN ('warehouse_manager','super_admin'))
  WITH CHECK (get_my_role() IN ('warehouse_manager','super_admin'));

CREATE POLICY "items_delete"
  ON items FOR DELETE
  TO authenticated
  USING (get_my_role() IN ('warehouse_manager','super_admin'));

-- ── inventory_balances (SELECT only — writes via RPC) ────────────
CREATE POLICY "inventory_balances_select"
  ON inventory_balances FOR SELECT
  TO authenticated
  USING (true);

-- ── inventory_operations (SELECT only — writes via RPC) ──────────
CREATE POLICY "inventory_operations_select"
  ON inventory_operations FOR SELECT
  TO authenticated
  USING (true);


-- ----------------------------------------------------------------
-- 8. TABLE GRANTS
-- ----------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON profiles, warehouses, item_categories, items
  TO authenticated;

-- Only SELECT; DML on these tables happens exclusively through
-- SECURITY DEFINER RPC functions.
GRANT SELECT
  ON inventory_balances, inventory_operations
  TO authenticated;


-- ================================================================
-- 9. RPC: create_receipt
--    Roles: warehouse_manager, super_admin
--    p_items JSON format: [{"item_id": "<uuid>", "quantity": N}, ...]
-- ================================================================
CREATE OR REPLACE FUNCTION create_receipt(
  p_warehouse_id uuid,
  p_items        jsonb,
  p_comment      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id  uuid;
  v_role     text;
  v_wh_ok    boolean;
  v_idx      integer;
  v_elem     jsonb;
  v_item_id  uuid;
  v_qty      integer;
  v_item_ok  boolean;
BEGIN
  -- ── auth ──────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('warehouse_manager','super_admin') THEN
    RAISE EXCEPTION 'insufficient_role'
      USING DETAIL = 'Required: warehouse_manager or super_admin';
  END IF;

  -- ── validate warehouse ────────────────────────────────────────
  SELECT is_active INTO v_wh_ok
  FROM warehouses WHERE id = p_warehouse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'warehouse_not_found'
      USING DETAIL = p_warehouse_id::text;
  END IF;
  IF NOT v_wh_ok THEN
    RAISE EXCEPTION 'warehouse_not_active'
      USING DETAIL = p_warehouse_id::text;
  END IF;

  -- ── validate items array ──────────────────────────────────────
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items_empty';
  END IF;

  -- ── iterate ───────────────────────────────────────────────────
  FOR v_idx IN 0 .. jsonb_array_length(p_items) - 1
  LOOP
    v_elem    := p_items->v_idx;
    v_item_id := (v_elem->>'item_id')::uuid;
    v_qty     := (v_elem->>'quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_quantity'
        USING DETAIL = 'item index ' || v_idx::text || ' must have quantity > 0';
    END IF;

    SELECT is_active INTO v_item_ok
    FROM items WHERE id = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_found'
        USING DETAIL = v_item_id::text;
    END IF;
    IF NOT v_item_ok THEN
      RAISE EXCEPTION 'item_not_active'
        USING DETAIL = v_item_id::text;
    END IF;

    -- upsert balance
    INSERT INTO inventory_balances (warehouse_id, item_id, quantity, updated_at)
    VALUES (p_warehouse_id, v_item_id, v_qty, NOW())
    ON CONFLICT (warehouse_id, item_id)
    DO UPDATE SET
      quantity   = inventory_balances.quantity + EXCLUDED.quantity,
      updated_at = NOW();

    -- log operation
    INSERT INTO inventory_operations
      (type, item_id, destination_warehouse_id, quantity, comment, created_by_user_id, created_at)
    VALUES
      ('receipt', v_item_id, p_warehouse_id, v_qty, p_comment, v_user_id, NOW());
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION create_receipt(uuid, jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_receipt(uuid, jsonb, text) TO authenticated;


-- ================================================================
-- 10. RPC: create_sale
--     Roles: cashier, super_admin
--     Uses SELECT FOR UPDATE to prevent race conditions.
-- ================================================================
CREATE OR REPLACE FUNCTION create_sale(
  p_warehouse_id uuid,
  p_item_id      uuid,
  p_quantity     integer,
  p_comment      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id    uuid;
  v_role       text;
  v_balance    inventory_balances%ROWTYPE;
  v_new_qty    integer;
BEGIN
  -- ── auth ──────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('cashier','super_admin') THEN
    RAISE EXCEPTION 'insufficient_role'
      USING DETAIL = 'Required: cashier or super_admin';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  -- ── lock balance row ──────────────────────────────────────────
  SELECT * INTO v_balance
  FROM inventory_balances
  WHERE warehouse_id = p_warehouse_id AND item_id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_stock'
      USING DETAIL = '0';
  END IF;

  IF v_balance.quantity < p_quantity THEN
    RAISE EXCEPTION 'insufficient_stock'
      USING DETAIL = v_balance.quantity::text;
  END IF;

  -- ── deduct ────────────────────────────────────────────────────
  v_new_qty := v_balance.quantity - p_quantity;

  UPDATE inventory_balances
  SET quantity = v_new_qty, updated_at = NOW()
  WHERE id = v_balance.id;

  INSERT INTO inventory_operations
    (type, item_id, source_warehouse_id, quantity, comment, created_by_user_id, created_at)
  VALUES
    ('sale', p_item_id, p_warehouse_id, p_quantity, p_comment, v_user_id, NOW());

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_qty);
END;
$$;

REVOKE ALL ON FUNCTION create_sale(uuid, uuid, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_sale(uuid, uuid, integer, text) TO authenticated;


-- ================================================================
-- 11. RPC: create_transfer
--     Roles: warehouse_manager, super_admin
--     Atomic: deduct source → upsert destination → log operation.
-- ================================================================
CREATE OR REPLACE FUNCTION create_transfer(
  p_source_warehouse_id      uuid,
  p_destination_warehouse_id uuid,
  p_item_id                  uuid,
  p_quantity                 integer,
  p_comment                  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id       uuid;
  v_role          text;
  v_src_active    boolean;
  v_dst_active    boolean;
  v_item_active   boolean;
  v_src_balance   inventory_balances%ROWTYPE;
BEGIN
  -- ── auth ──────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('warehouse_manager','super_admin') THEN
    RAISE EXCEPTION 'insufficient_role'
      USING DETAIL = 'Required: warehouse_manager or super_admin';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  -- ── same-warehouse guard ──────────────────────────────────────
  IF p_source_warehouse_id = p_destination_warehouse_id THEN
    RAISE EXCEPTION 'same_warehouse'
      USING DETAIL = 'Source and destination must differ';
  END IF;

  -- ── validate warehouses ───────────────────────────────────────
  SELECT is_active INTO v_src_active
  FROM warehouses WHERE id = p_source_warehouse_id;
  IF NOT FOUND OR NOT v_src_active THEN
    RAISE EXCEPTION 'source_warehouse_invalid'
      USING DETAIL = p_source_warehouse_id::text;
  END IF;

  SELECT is_active INTO v_dst_active
  FROM warehouses WHERE id = p_destination_warehouse_id;
  IF NOT FOUND OR NOT v_dst_active THEN
    RAISE EXCEPTION 'destination_warehouse_invalid'
      USING DETAIL = p_destination_warehouse_id::text;
  END IF;

  -- ── validate item ─────────────────────────────────────────────
  SELECT is_active INTO v_item_active
  FROM items WHERE id = p_item_id;
  IF NOT FOUND OR NOT v_item_active THEN
    RAISE EXCEPTION 'item_invalid'
      USING DETAIL = p_item_id::text;
  END IF;

  -- ── lock source balance ───────────────────────────────────────
  SELECT * INTO v_src_balance
  FROM inventory_balances
  WHERE warehouse_id = p_source_warehouse_id AND item_id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_stock'
      USING DETAIL = '0';
  END IF;

  IF v_src_balance.quantity < p_quantity THEN
    RAISE EXCEPTION 'insufficient_stock'
      USING DETAIL = v_src_balance.quantity::text;
  END IF;

  -- ── deduct source ─────────────────────────────────────────────
  UPDATE inventory_balances
  SET quantity = quantity - p_quantity, updated_at = NOW()
  WHERE id = v_src_balance.id;

  -- ── upsert destination ────────────────────────────────────────
  INSERT INTO inventory_balances (warehouse_id, item_id, quantity, updated_at)
  VALUES (p_destination_warehouse_id, p_item_id, p_quantity, NOW())
  ON CONFLICT (warehouse_id, item_id)
  DO UPDATE SET
    quantity   = inventory_balances.quantity + EXCLUDED.quantity,
    updated_at = NOW();

  -- ── log operation ─────────────────────────────────────────────
  INSERT INTO inventory_operations
    (type, item_id, source_warehouse_id, destination_warehouse_id,
     quantity, comment, created_by_user_id, created_at)
  VALUES
    ('transfer', p_item_id, p_source_warehouse_id, p_destination_warehouse_id,
     p_quantity, p_comment, v_user_id, NOW());

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION create_transfer(uuid, uuid, uuid, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_transfer(uuid, uuid, uuid, integer, text) TO authenticated;
