-- A lone initial-stock row belongs only to an unused draft/archived product.
-- Keep the inventory ledger immutable in every other case, while allowing the
-- product lifecycle to remove that technical setup row during safe deletion.
DROP TRIGGER IF EXISTS inventory_movements_prevent_delete;

CREATE TRIGGER inventory_movements_prevent_delete
BEFORE DELETE ON inventory_movements
WHEN NOT (
  OLD.movement_type = 'initial_stock'
  AND OLD.related_order_id IS NULL
  AND OLD.source_id IS NULL
  AND OLD.stock_change > 0
  AND OLD.previous_stock = 0
  AND OLD.resulting_stock = OLD.stock_change
  AND EXISTS (
    SELECT 1 FROM products
    WHERE products.id = OLD.product_id
      AND products.status IN ('draft', 'archived')
  )
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements AS sibling
    WHERE sibling.product_id = OLD.product_id
      AND sibling.id <> OLD.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM product_order_items
    WHERE product_order_items.product_id = OLD.product_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM product_order_returns
    WHERE product_order_returns.product_id = OLD.product_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'inventory movements are immutable');
END;

PRAGMA optimize;
