-- Tạo liên kết giữa bảng order_items và orders
ALTER TABLE public.order_items 
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
  ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE CASCADE;

-- Tạo liên kết giữa bảng order_items và products
ALTER TABLE public.order_items 
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE SET NULL;

-- Làm mới bộ nhớ đệm
NOTIFY pgrst, 'reload schema';
