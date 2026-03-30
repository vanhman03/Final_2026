import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, CreditCard, Trash2, Star, Gift, Package, CheckCircle2, XCircle, Store, ShoppingBag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { productsApi, ordersApi, Product } from '@/services';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface CartItem extends Product {
  quantity: number;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function ShopPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Fetch products from API
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getProducts({ limit: 50 }),
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const order = await ordersApi.createOrder(
        cart.map(item => ({ product_id: item.id, quantity: item.quantity }))
      );
      // Get VNPay redirect URL right after order creation
      const { paymentUrl } = await ordersApi.createPaymentUrl(order.id);
      return { order, paymentUrl };
    },
    onSuccess: ({ order, paymentUrl }) => {
      toast({
        title: 'Order created!',
        description: `Order #${order.id.slice(0, 8)} has been created. Redirecting to payment...`,
      });
      setCart([]);
      setIsCartOpen(false);
      // Redirect browser to VNPay payment gateway
      window.location.href = paymentUrl;
    },
    onError: (error) => {
      toast({
        title: 'Failed to create order',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const products = productsData?.products || [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock ?? 0)) {
          toast({
            title: 'Hết hàng dự trữ',
            description: `Bạn đã thêm số lượng tối đa hiện có (${product.stock}).`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if ((product.stock ?? 0) <= 0) {
        toast({
          title: 'Hết hàng',
          description: 'Sản phẩm này đã hết hàng.',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({
      title: 'Đã thêm vào giỏ!',
      description: `${product.name} đã được thêm vào giỏ hàng.`,
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const newQuantity = item.quantity + delta;
            if (delta > 0 && newQuantity > (item.stock ?? 0)) {
              toast({
                title: 'Không đủ hàng',
                description: `Sản phẩm này chỉ còn ${item.stock} trong kho.`,
                variant: 'destructive',
              });
              return item;
            }
            return { ...item, quantity: Math.max(0, newQuantity) };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to checkout.',
        variant: 'destructive',
      });
      return;
    }
    createOrderMutation.mutate();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                Toy Shop <Gift className="inline-block w-8 h-8 text-pink-500 mb-1" />
              </h1>
              <p className="text-muted-foreground">Educational toys for your little learners!</p>
            </div>

            <Button
              variant="default"
              size="lg"
              className="gap-2 relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              Cart
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-bold"
                >
                  {totalItems}
                </motion.span>
              )}
            </Button>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-3xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-5">
                    <Skeleton className="h-4 w-16 mb-3" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-8 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ y: -8 }}
                  className={`bg-card rounded-3xl shadow-card border border-border overflow-hidden group transition-all duration-300 ${!product.in_stock ? 'opacity-60 grayscale' : ''}`}
                >
                  <div 
                    className="cursor-pointer group-hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center text-8xl p-8 relative">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-20 h-20 text-muted-foreground/20" />
                      )}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
                        <span className={`text-[10px] md:text-xs px-2 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm ${product.in_stock ? 'bg-green-100/90 text-green-700 border border-green-200' : 'bg-red-100/90 text-red-700 border border-red-200'}`}>
                          {product.in_stock ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                          {product.in_stock ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                        <span className="text-[10px] md:text-xs px-2 py-1 bg-white/90 text-slate-700 rounded-full font-bold shadow-sm border border-slate-200 backdrop-blur-sm">
                          Số lượng: {product.stock ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 pb-0">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        {product.category || 'Toys'}
                      </span>
                      <h3 className="font-bold text-lg mt-3 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xl font-extrabold text-gradient-hero mb-0">
                        {formatVND(product.price)}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-4">

                    <Button
                      variant={product.in_stock ? "fun" : "secondary"}
                      className="w-full gap-2"
                      onClick={() => addToCart(product)}
                      disabled={!product.in_stock}
                    >
                      {product.in_stock ? (
                        <>
                          <Plus className="w-4 h-4" />
                          Add to Cart
                        </>
                      ) : (
                        'Hết hàng'
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && products.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-bold mb-2">No products available</h3>
              <p className="text-muted-foreground">Check back soon for new arrivals!</p>
            </motion.div>
          )}
        </div>

        {/* Cart Drawer */}
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-foreground/50 z-40"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                    Your Cart
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                    ✕
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                    <h3 className="text-xl font-bold mb-2">Cart is empty</h3>
                    <p className="text-muted-foreground">Add some toys to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-4 bg-muted/50 rounded-2xl p-4"
                      >
                        <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center text-3xl">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain rounded-xl" />
                          ) : (
                            <Package className="w-8 h-8 text-muted-foreground/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{item.name}</h3>
                          <p className="text-sm text-primary font-semibold">
                            {formatVND(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium">Total:</span>
                    <span className="text-2xl font-extrabold text-gradient-hero">
                      {formatVND(totalPrice)}
                    </span>
                  </div>
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full gap-2"
                    onClick={handleCheckout}
                    disabled={createOrderMutation.isPending}
                  >
                    <CreditCard className="w-5 h-5" />
                    {createOrderMutation.isPending ? 'Processing...' : 'Checkout with VNPay'}
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden p-0 gap-0 border-none">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
              <div className="w-full md:w-1/2 bg-gradient-to-br from-primary/5 to-secondary/5 p-8 flex items-center justify-center text-9xl min-h-[300px]">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-contain drop-shadow-2xl" />
                ) : (
                  <Package className="w-32 h-32 text-muted-foreground/10" />
                )}
              </div>
              <div className="w-full md:w-1/2 p-8 flex flex-col">
                <DialogHeader className="text-left mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-primary/10 text-primary pointer-events-none">
                      {selectedProduct.category || 'Toys'}
                    </Badge>
                    <Badge variant="outline" className={selectedProduct.in_stock ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-500 border-red-200 bg-red-50'}>
                      {selectedProduct.in_stock ? 'Còn hàng' : 'Hết hàng'}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-extrabold leading-tight mb-2">
                    {selectedProduct.name}
                  </DialogTitle>
                  <p className="text-3xl font-black text-pink-500">
                    {formatVND(selectedProduct.price)}
                  </p>
                </DialogHeader>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Mô tả sản phẩm</h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                      {selectedProduct.description || 'Không có mô tả cho sản phẩm này.'}
                    </p>
                  </div>

                  <div className="bg-secondary/5 rounded-2xl p-4 border border-secondary/10 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Số lượng có sẵn:</span>
                    <span className="font-bold text-lg">{selectedProduct.stock} sản phẩm</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Button
                    variant={selectedProduct.in_stock ? "hero" : "secondary"}
                    size="xl"
                    className="w-full gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={!selectedProduct.in_stock}
                  >
                    {selectedProduct.in_stock ? (
                      <>
                        <Plus className="w-5 h-5" />
                        Thêm vào giỏ hàng
                      </>
                    ) : (
                      'Tạm hết hàng'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
