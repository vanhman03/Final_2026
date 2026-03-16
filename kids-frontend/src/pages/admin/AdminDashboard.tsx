import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, Play, Video, Search, Filter, Users, ShoppingBag,
  ShoppingCart, BarChart3, Star, Trophy, Package, AlertCircle, Check, X
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi, AdminStats } from '@/services/adminApi';
import { productsApi } from '@/services/productsApi';
import { videosApi } from '@/services/videosApi';
import { Profile } from '@/services/profilesApi';
import { Order } from '@/services/ordersApi';
import { Product } from '@/services/productsApi';


// ─── Constants ────────────────────────────────────────────────────────────────
const AGE_GROUPS = ['0-3', '3-6', '6-9', '9-12'];
const VIDEO_CATEGORIES = ['Alphabet', 'Numbers', 'Animals', 'Music', 'Science', 'Art', 'Stories'];
const PRODUCT_CATEGORIES = ['Toys', 'Books', 'Games', 'Stationery', 'Clothes', 'Electronics', 'Other'];

const BADGE_OPTIONS = [
  '🌟 Star Learner', '🎮 Game Master', '📚 Bookworm',
  '🏆 Top Scorer', '🔥 Color Streak Master',
  '🧩 Puzzle Pro', '🧠 Puzzle Zen Master', '🌈 Rainbow Achiever',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────
type TabId = 'videos' | 'products' | 'orders' | 'users';
const TABS: { id: TabId; label: string; icon: React.ElementType; emoji: string; color: string }[] = [
  { id: 'videos', label: 'Videos', icon: Video, emoji: '🎬', color: 'from-purple-500 to-indigo-500' },
  { id: 'products', label: 'Products', icon: ShoppingBag, emoji: '🛍️', color: 'from-pink-500 to-rose-500' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, emoji: '🛒', color: 'from-green-500 to-teal-500' },
  { id: 'users', label: 'Users', icon: Users, emoji: '👥', color: 'from-orange-500 to-amber-500' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface VideoItem {
  id: string; title: string; youtube_video_id: string; youtube_url: string | null;
  age_group: string; category: string; duration: string; thumbnail_emoji: string | null; created_at: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('videos');
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Videos state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoCategory, setVideoCategory] = useState('all');
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [videoForm, setVideoForm] = useState({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: '📺' });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', in_stock: true });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrderLoading, setIsOrderLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Users state
  const [users, setUsers] = useState<Profile[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userForm, setUserForm] = useState({ display_name: '', points: '', screen_time_limit: '' });
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);
  const [badgeTargetUser, setBadgeTargetUser] = useState<Profile | null>(null);

  // ─── Fetching ────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchVideos = useCallback(async () => {
    setIsVideoLoading(true);
    try {
      const { videos: data } = await videosApi.getVideos({ limit: 50 });
      setVideos(data || []);
    } catch { toast({ title: 'Lỗi', description: 'Không thể tải danh sách video.', variant: 'destructive' }); }
    finally { setIsVideoLoading(false); }
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    setIsProductLoading(true);
    try {
      const { products: data } = await productsApi.getProducts({ limit: 50 });
      setProducts(data);
    } catch { toast({ title: 'Lỗi', description: 'Không thể tải sản phẩm.', variant: 'destructive' }); }
    finally { setIsProductLoading(false); }
  }, [toast]);


  const fetchOrders = useCallback(async () => {
    setIsOrderLoading(true);
    try {
      const status = orderStatusFilter === 'all' ? undefined : orderStatusFilter;
      const data = await adminApi.getAllOrders(1, 50, status);
      setOrders(data.orders);
    } catch { toast({ title: 'Lỗi', description: 'Không thể tải đơn hàng.', variant: 'destructive' }); }
    finally { setIsOrderLoading(false); }
  }, [toast, orderStatusFilter]);

  const fetchUsers = useCallback(async () => {
    setIsUserLoading(true);
    try {
      const data = await adminApi.getUsers(1, 50, userSearch || undefined);
      setUsers(data.users);
    } catch { toast({ title: 'Lỗi', description: 'Không thể tải người dùng.', variant: 'destructive' }); }
    finally { setIsUserLoading(false); }
  }, [toast, userSearch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'videos') fetchVideos(); }, [activeTab, fetchVideos]);
  useEffect(() => { if (activeTab === 'products') fetchProducts(); }, [activeTab, fetchProducts]);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, fetchOrders, orderStatusFilter]);
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, fetchUsers]);

  // ─── Video Handlers ───────────────────────────────────────────────────────────
  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const youtubeId = extractYouTubeId(videoForm.youtubeUrl);
    if (!youtubeId) return toast({ title: 'URL không hợp lệ', description: 'Nhập YouTube URL hợp lệ.', variant: 'destructive' });
    const payload = {
      title: videoForm.title,
      youtube_video_id: youtubeId,
      youtube_url: videoForm.youtubeUrl,
      age_group: videoForm.ageGroup,
      category: videoForm.category,
      duration: videoForm.duration,
      thumbnail_emoji: videoForm.thumbnailEmoji,
    };
    try {
      if (editingVideo) {
        await videosApi.updateVideo(editingVideo.id, payload);
        toast({ title: '✅ Đã cập nhật video!' });
      } else {
        await videosApi.createVideo(payload);
        toast({ title: '🎬 Đã thêm video mới!' });
      }
      resetVideoForm(); fetchVideos();
    } catch { toast({ title: 'Lỗi', description: 'Không thể lưu video.', variant: 'destructive' }); }
  };

  const handleVideoDelete = async (id: string) => {
    if (!confirm('Xóa video này?')) return;
    try {
      await videosApi.deleteVideo(id);
      toast({ title: '🗑️ Đã xóa video' }); fetchVideos();
    } catch { toast({ title: 'Lỗi khi xóa', variant: 'destructive' }); }
  };

  const resetVideoForm = () => {
    setVideoForm({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: '📺' });
    setEditingVideo(null); setIsVideoDialogOpen(false);
  };

  // ─── Product Handlers ─────────────────────────────────────────────────────────
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: productForm.name, description: productForm.description || undefined, price: parseFloat(productForm.price), image_url: productForm.image_url || undefined, category: productForm.category, age_group: productForm.age_group || undefined, in_stock: productForm.in_stock };
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload);
        toast({ title: '✅ Đã cập nhật sản phẩm!' });
      } else {
        await adminApi.createProduct(payload);
        toast({ title: '🛍️ Đã thêm sản phẩm mới!' });
      }
      resetProductForm(); fetchProducts();
    } catch { toast({ title: 'Lỗi', description: 'Không thể lưu sản phẩm.', variant: 'destructive' }); }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    try { await adminApi.deleteProduct(id); toast({ title: '🗑️ Đã xóa sản phẩm' }); fetchProducts(); }
    catch { toast({ title: 'Lỗi khi xóa', variant: 'destructive' }); }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', in_stock: true });
    setEditingProduct(null); setIsProductDialogOpen(false);
  };

  // ─── Order Handlers ───────────────────────────────────────────────────────────
  const handleOrderStatusChange = async (orderId: string, status: 'pending' | 'completed' | 'failed' | 'cancelled') => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      toast({ title: '✅ Đã cập nhật trạng thái đơn hàng!' });
      fetchOrders();
    } catch { toast({ title: 'Lỗi khi cập nhật', variant: 'destructive' }); }
  };

  // ─── User Handlers ────────────────────────────────────────────────────────────
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await adminApi.updateUser(editingUser.id, {
        display_name: userForm.display_name || undefined,
        points: userForm.points ? parseInt(userForm.points) : undefined,
        screen_time_limit: userForm.screen_time_limit ? parseInt(userForm.screen_time_limit) : undefined,
      });
      toast({ title: '✅ Đã cập nhật người dùng!' });
      setIsUserDialogOpen(false); fetchUsers();
    } catch { toast({ title: 'Lỗi khi cập nhật', variant: 'destructive' }); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Xóa người dùng này? Hành động không thể hoàn tác.')) return;
    try { await adminApi.deleteUser(id); toast({ title: '🗑️ Đã xóa người dùng' }); fetchUsers(); }
    catch { toast({ title: 'Lỗi khi xóa', variant: 'destructive' }); }
  };

  const handleAwardBadge = async (badge: string) => {
    if (!badgeTargetUser) return;
    try {
      await adminApi.awardBadge(badgeTargetUser.id, badge);
      toast({ title: '🏆 Đã trao huy hiệu!' }); setIsBadgeDialogOpen(false); fetchUsers();
    } catch (err: any) { toast({ title: err.message || 'Lỗi', variant: 'destructive' }); }
  };

  // ─── Filtered data ────────────────────────────────────────────────────────────
  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()) &&
    (videoCategory === 'all' || v.category === videoCategory)
  );
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  // ─── Access guard ─────────────────────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-3xl shadow-card border">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Truy cập bị từ chối</h2>
            <p className="text-muted-foreground">Chỉ quản trị viên mới có thể truy cập trang này.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 50%, #f093fb15 100%)' }}>
        <div className="container mx-auto px-4 py-8">

          {/* ── Header ──────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg">
                ⭐
              </div>
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                  Trang Quản Trị
                </h1>
                <p className="text-muted-foreground">Quản lý nội dung, sản phẩm, đơn hàng và người dùng</p>
              </div>
            </div>
          </motion.div>

          {/* ── Stats Cards ──────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Video', value: stats?.totalVideos ?? '-', icon: '🎬', gradient: 'from-purple-400 to-purple-600' },
              { label: 'Sản phẩm', value: stats?.totalProducts ?? '-', icon: '🛍️', gradient: 'from-pink-400 to-rose-600' },
              { label: 'Đơn hàng', value: stats?.totalOrders ?? '-', icon: '🛒', gradient: 'from-green-400 to-teal-600' },
              { label: 'Người dùng', value: stats?.totalUsers ?? '-', icon: '👥', gradient: 'from-orange-400 to-amber-600' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-5 shadow-md border border-white/50 dark:bg-card">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-2xl mb-3 shadow`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-extrabold">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Tab Navigation ────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${isActive ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105` : 'bg-white dark:bg-card text-muted-foreground hover:bg-muted border'}`}>
                  <span>{tab.emoji}</span>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>

          {/* ── Tab Content ───────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>

              {/* ════ VIDEOS TAB ════════════════════════════════════════════ */}
              {activeTab === 'videos' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input placeholder="Tìm video..." value={videoSearch} onChange={e => setVideoSearch(e.target.value)} className="pl-12 rounded-2xl" />
                    </div>
                    <Select value={videoCategory} onValueChange={setVideoCategory}>
                      <SelectTrigger className="w-full sm:w-44 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white gap-2 hover:opacity-90" onClick={() => { setEditingVideo(null); setVideoForm({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: '📺' }); }}>
                          <Plus className="w-4 h-4" /> Thêm Video
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle className="text-xl font-bold">{editingVideo ? '✏️ Sửa Video' : '🎬 Thêm Video Mới'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleVideoSubmit} className="space-y-4 mt-2">
                          <div><Label>Tiêu đề</Label><Input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề video" required className="mt-1 rounded-xl" /></div>
                          <div><Label>YouTube URL</Label><Input value={videoForm.youtubeUrl} onChange={e => setVideoForm(f => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." required className="mt-1 rounded-xl" /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Nhóm tuổi</Label>
                              <Select value={videoForm.ageGroup} onValueChange={v => setVideoForm(f => ({ ...f, ageGroup: v }))}>
                                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{AGE_GROUPS.map(a => <SelectItem key={a} value={a}>{a} tuổi</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Danh mục</Label>
                              <Select value={videoForm.category} onValueChange={v => setVideoForm(f => ({ ...f, category: v }))}>
                                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Thời lượng</Label><Input value={videoForm.duration} onChange={e => setVideoForm(f => ({ ...f, duration: e.target.value }))} placeholder="3:45" required className="mt-1 rounded-xl" /></div>
                            <div><Label>Emoji</Label><Input value={videoForm.thumbnailEmoji} onChange={e => setVideoForm(f => ({ ...f, thumbnailEmoji: e.target.value }))} placeholder="📺" className="mt-1 rounded-xl" /></div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={resetVideoForm}>Hủy</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white">{editingVideo ? 'Cập nhật' : 'Thêm'}</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {isVideoLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-card rounded-3xl h-56 animate-pulse" />)}</div>
                  ) : filteredVideos.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredVideos.map((video, idx) => (
                        <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * idx }}
                          className="bg-white dark:bg-card rounded-3xl shadow-md border border-border overflow-hidden group hover:shadow-xl transition-shadow">
                          <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-7xl relative">
                            {video.thumbnail_emoji || '📺'}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <a href={`https://youtube.com/watch?v=${video.youtube_video_id}`} target="_blank" rel="noopener noreferrer">
                                <Button size="icon" variant="secondary" className="rounded-full"><Play className="w-4 h-4" /></Button>
                              </a>
                              <Button size="icon" variant="secondary" className="rounded-full" onClick={() => { setEditingVideo(video); setVideoForm({ title: video.title, youtubeUrl: video.youtube_url || `https://youtube.com/watch?v=${video.youtube_video_id}`, ageGroup: video.age_group, category: video.category, duration: video.duration, thumbnailEmoji: video.thumbnail_emoji || '📺' }); setIsVideoDialogOpen(true); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="destructive" className="rounded-full" onClick={() => handleVideoDelete(video.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold truncate mb-2">{video.title}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">{video.category}</span>
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">{video.age_group} tuổi</span>
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">{video.duration}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16"><div className="text-7xl mb-4">🎬</div><p className="text-muted-foreground text-lg">Chưa có video nào</p></div>
                  )}
                </div>
              )}

              {/* ════ PRODUCTS TAB ════════════════════════════════════════════ */}
              {activeTab === 'products' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input placeholder="Tìm sản phẩm..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-12 rounded-2xl" />
                    </div>
                    <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white gap-2 hover:opacity-90" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', in_stock: true }); }}>
                          <Plus className="w-4 h-4" /> Thêm Sản phẩm
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle>{editingProduct ? '✏️ Sửa Sản phẩm' : '🛍️ Thêm Sản phẩm Mới'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleProductSubmit} className="space-y-4 mt-2">
                          <div><Label>Tên sản phẩm</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" placeholder="Ví dụ: Đồ chơi xếp hình" /></div>
                          <div><Label>Mô tả</Label><Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-xl" placeholder="Mô tả sản phẩm..." /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Giá (VND)</Label><Input type="number" min="0" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} required className="mt-1 rounded-xl" placeholder="50000" /></div>
                            <div><Label>Nhóm tuổi</Label><Input value={productForm.age_group} onChange={e => setProductForm(f => ({ ...f, age_group: e.target.value }))} className="mt-1 rounded-xl" placeholder="3-6" /></div>
                          </div>
                          <div><Label>Danh mục</Label>
                            <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label>URL Hình ảnh</Label><Input value={productForm.image_url} onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))} className="mt-1 rounded-xl" placeholder="https://..." /></div>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" id="in_stock" checked={productForm.in_stock} onChange={e => setProductForm(f => ({ ...f, in_stock: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                            <Label htmlFor="in_stock">Còn hàng</Label>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={resetProductForm}>Hủy</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white">{editingProduct ? 'Cập nhật' : 'Thêm'}</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {isProductLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="bg-card rounded-3xl h-48 animate-pulse" />)}</div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredProducts.map((product, idx) => (
                        <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * idx }}
                          className="bg-white dark:bg-card rounded-3xl shadow-md border overflow-hidden hover:shadow-xl transition-shadow">
                          <div className="h-40 bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center text-6xl relative">
                            {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : '🛍️'}
                            <div className="absolute top-2 right-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.in_stock ? '✅ Còn hàng' : '❌ Hết hàng'}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold truncate mb-1">{product.name}</h3>
                            <p className="text-sm text-muted-foreground truncate mb-3">{product.description || 'Không có mô tả'}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-extrabold text-pink-500">{product.price?.toLocaleString('vi-VN')}₫</span>
                              <div className="flex gap-2">
                                <Button size="icon" variant="outline" className="rounded-xl" onClick={() => { setEditingProduct(product); setProductForm({ name: product.name, description: product.description || '', price: String(product.price), image_url: product.image_url || '', category: product.category || 'Toys', age_group: product.age_group || '', in_stock: product.in_stock }); setIsProductDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                <Button size="icon" variant="destructive" className="rounded-xl" onClick={() => handleProductDelete(product.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16"><div className="text-7xl mb-4">🛍️</div><p className="text-muted-foreground text-lg">Chưa có sản phẩm nào</p></div>
                  )}
                </div>
              )}

              {/* ════ ORDERS TAB ════════════════════════════════════════════ */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    {['all', 'pending', 'completed', 'failed', 'cancelled'].map(s => (
                      <button key={s} onClick={() => setOrderStatusFilter(s)}
                        className={`px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${orderStatusFilter === s ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white shadow' : 'bg-white dark:bg-card border text-muted-foreground hover:bg-muted'}`}>
                        {s === 'all' ? '🛒 Tất cả' : s === 'pending' ? '⏳ Chờ xử lý' : s === 'completed' ? '✅ Hoàn thành' : s === 'failed' ? '❌ Thất bại' : '🚫 Đã hủy'}
                      </button>
                    ))}
                  </div>

                  {isOrderLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl h-20 animate-pulse" />)}</div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order, idx) => (
                        <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * idx }}
                          className="bg-white dark:bg-card rounded-2xl p-5 shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-sm font-mono text-muted-foreground">#{order.id.slice(0, 8)}...</p>
                            <p className="text-xl font-extrabold text-green-600">{parseFloat(String(order.total_amount)).toLocaleString('vi-VN')}₫</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.payment_status]}`}>
                              {order.payment_status === 'pending' ? '⏳ Chờ xử lý' : order.payment_status === 'completed' ? '✅ Hoàn thành' : order.payment_status === 'failed' ? '❌ Thất bại' : '🚫 Đã hủy'}
                            </span>
                            <Select value={order.payment_status} onValueChange={v => handleOrderStatusChange(order.id, v as any)}>
                              <SelectTrigger className="w-40 rounded-xl text-xs h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">⏳ Chờ xử lý</SelectItem>
                                <SelectItem value="completed">✅ Hoàn thành</SelectItem>
                                <SelectItem value="failed">❌ Thất bại</SelectItem>
                                <SelectItem value="cancelled">🚫 Đã hủy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16"><div className="text-7xl mb-4">🛒</div><p className="text-muted-foreground text-lg">Không có đơn hàng nào</p></div>
                  )}
                </div>
              )}

              {/* ════ USERS TAB ════════════════════════════════════════════ */}
              {activeTab === 'users' && (
                <div>
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input placeholder="Tìm người dùng..." value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} className="pl-12 rounded-2xl" />
                    </div>
                    <Button className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white" onClick={fetchUsers}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Award badge dialog */}
                  <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
                    <DialogContent className="max-w-sm rounded-3xl">
                      <DialogHeader><DialogTitle>🏆 Trao Huy Hiệu cho {badgeTargetUser?.display_name}</DialogTitle></DialogHeader>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {BADGE_OPTIONS.map(badge => (
                          <button key={badge} onClick={() => handleAwardBadge(badge)}
                            className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 border border-orange-200 rounded-2xl text-sm font-semibold text-left hover:shadow-md hover:scale-105 transition-all dark:from-orange-900/20 dark:to-yellow-900/20">
                            {badge}
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit user dialog */}
                  <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                    <DialogContent className="max-w-md rounded-3xl">
                      <DialogHeader><DialogTitle>✏️ Sửa Thông tin Người dùng</DialogTitle></DialogHeader>
                      <form onSubmit={handleUserSubmit} className="space-y-4 mt-2">
                        <div><Label>Tên hiển thị</Label><Input value={userForm.display_name} onChange={e => setUserForm(f => ({ ...f, display_name: e.target.value }))} className="mt-1 rounded-xl" /></div>
                        <div><Label>Điểm thưởng</Label><Input type="number" min="0" value={userForm.points} onChange={e => setUserForm(f => ({ ...f, points: e.target.value }))} className="mt-1 rounded-xl" /></div>
                        <div><Label>Giới hạn thời gian xem (phút/ngày)</Label><Input type="number" min="0" max="1440" value={userForm.screen_time_limit} onChange={e => setUserForm(f => ({ ...f, screen_time_limit: e.target.value }))} className="mt-1 rounded-xl" /></div>
                        <div className="flex gap-3 pt-2">
                          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsUserDialogOpen(false)}>Hủy</Button>
                          <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white">Lưu</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {isUserLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl h-20 animate-pulse" />)}</div>
                  ) : users.length > 0 ? (
                    <div className="space-y-4">
                      {users.map((u, idx) => (
                        <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * idx }}
                          className="bg-white dark:bg-card rounded-2xl p-5 shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-300 to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow">
                              {u.display_name?.[0]?.toUpperCase() || '👤'}
                            </div>
                            <div>
                              <p className="font-bold">{u.display_name || 'Chưa đặt tên'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{u.user_id?.slice(0, 12)}...</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">⭐ {u.points ?? 0} điểm</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🕐 {u.screen_time_limit ?? 60} phút/ngày</span>
                                {Array.isArray(u.badges) && u.badges.length > 0 && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">🏆 {u.badges.length} huy hiệu</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => { setBadgeTargetUser(u); setIsBadgeDialogOpen(true); }}>
                              <Trophy className="w-3 h-3" /> Trao huy hiệu
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => { setEditingUser(u); setUserForm({ display_name: u.display_name || '', points: String(u.points ?? 0), screen_time_limit: String(u.screen_time_limit ?? 60) }); setIsUserDialogOpen(true); }}>
                              <Edit className="w-3 h-3" /> Sửa
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-xl gap-1 text-xs" onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 className="w-3 h-3" /> Xóa
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16"><div className="text-7xl mb-4">👥</div><p className="text-muted-foreground text-lg">Không tìm thấy người dùng nào</p></div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
