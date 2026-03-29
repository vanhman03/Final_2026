-- Migration: Thêm quản lý tồn kho (stock) cho bảng products

-- 1. Thêm cột stock, mặc định là 0
ALTER TABLE products ADD COLUMN stock integer NOT NULL DEFAULT 0;



-- 3. Tạo function và trigger tự động tính in_stock dựa trên số lượng stock
CREATE OR REPLACE FUNCTION set_in_stock_from_stock()
RETURNS TRIGGER AS $$
BEGIN
    NEW.in_stock := NEW.stock > 0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_in_stock_from_stock ON products;
CREATE TRIGGER trigger_update_in_stock_from_stock
BEFORE INSERT OR UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION set_in_stock_from_stock();

-- 4. Tạo function và trigger tự động trừ/cộng kho khi cập nhật trạng thái đơn hàng (payment_status)
CREATE OR REPLACE FUNCTION deduct_stock_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Nếu đơn hàng chuyển sang 'completed', trừ kho
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
            UPDATE products
            SET stock = GREATEST(0, stock - item.quantity)
            WHERE id = item.product_id;
        END LOOP;
    END IF;
    
    -- Nếu đơn hàng từ 'completed' bị chuyển về trạng thái khác (hủy/thất bại), cộng lại kho
    IF OLD.payment_status = 'completed' AND NEW.payment_status != 'completed' THEN
        FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
            UPDATE products
            SET stock = stock + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_stock_on_order_complete ON orders;
CREATE TRIGGER trigger_deduct_stock_on_order_complete
AFTER UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_order_complete();
