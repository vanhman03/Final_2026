-- 1. Xóa các đơn hàng "mồ côi" (user_id không tồn tại trong profiles)
-- Điều này giúp trang Admin không bị lỗi 500 khi thực hiện JOIN dữ liệu.
DELETE FROM public.orders
WHERE user_id NOT IN (SELECT user_id FROM public.profiles)
   OR user_id IS NULL;

-- 2. Thêm ràng buộc Foreign Key chính thức giữa orders và profiles
-- Sử dụng ON DELETE CASCADE để nếu xóa user, các đơn hàng liên quan sẽ tự động biến mất.
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(user_id) 
  ON DELETE CASCADE;

-- 3. Làm mới cache schema cho PostgREST
NOTIFY pgrst, 'reload schema';
