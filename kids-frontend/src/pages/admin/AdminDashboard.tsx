import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, Play, Video, Search, Filter, Users, ShoppingBag,
  ShoppingCart, BarChart3, Star, Trophy, Package, AlertCircle, Check, X,
  LayoutDashboard, CheckCircle2, XCircle, Clock, Ban, User, History, Eye
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
import { adminApi, AdminStats, AdminUserProfile } from '@/services/adminApi';
import { productsApi } from '@/services/productsApi';
import { videosApi } from '@/services/videosApi';
import { Order, ordersApi } from '@/services/ordersApi';
import { Product } from '@/services/productsApi';


// ─── Constants ────────────────────────────────────────────────────────────────
const AGE_GROUPS = ['0-3', '3-6', '6-9', '9-12'];
const VIDEO_CATEGORIES = ['Alphabet', 'Numbers', 'Animals', 'Music', 'Science', 'Art', 'Stories'];
const PRODUCT_CATEGORIES = ['Toys', 'Books', 'Games', 'Stationery', 'Clothes', 'Electronics', 'Other'];



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
const TABS: { id: TabId; labelKey: string; icon: React.ElementType; color: string }[] = [
  { id: 'videos', labelKey: 'admin.tabs.videos', icon: Video, color: 'from-purple-500 to-indigo-500' },
  { id: 'products', labelKey: 'admin.tabs.products', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  { id: 'orders', labelKey: 'admin.tabs.orders', icon: ShoppingCart, color: 'from-green-500 to-teal-500' },
  { id: 'users', labelKey: 'admin.tabs.users', icon: Users, color: 'from-orange-500 to-amber-500' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface VideoItem {
  id: string; title: string; youtube_video_id: string; youtube_url?: string | null;
  age_group: string; category: string; duration: string; thumbnail_emoji?: string | null; created_at?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useTranslation();
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
  const [videoForm, setVideoForm] = useState({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: 'video' });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', stock: 0 });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrderLoading, setIsOrderLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

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
    } catch { toast({ title: t('common.error'), description: t('admin.videos.messages.loadFailed'), variant: 'destructive' }); }
    finally { setIsVideoLoading(false); }
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    setIsProductLoading(true);
    try {
      const { products: data } = await productsApi.getProducts({ limit: 50 });
      setProducts(data);
    } catch { toast({ title: t('common.error'), description: t('admin.products.messages.loadFailed'), variant: 'destructive' }); }
    finally { setIsProductLoading(false); }
  }, [toast]);


  const fetchOrders = useCallback(async () => {
    setIsOrderLoading(true);
    try {
      const status = orderStatusFilter === 'all' ? undefined : orderStatusFilter;
      const data = await adminApi.getAllOrders(1, 50, status);
      setOrders(data.orders);
    } catch { toast({ title: t('common.error'), description: t('admin.orders.messages.loadFailed'), variant: 'destructive' }); }
    finally { setIsOrderLoading(false); }
  }, [toast, orderStatusFilter]);

  const fetchUsers = useCallback(async () => {
    setIsUserLoading(true);
    try {
      const data = await adminApi.getUsers(1, 50, userSearch || undefined);
      setUsers(data.users);
    } catch { toast({ title: t('common.error'), description: t('admin.users.messages.loadFailed'), variant: 'destructive' }); }
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
    if (!youtubeId) return toast({ title: t('admin.videos.messages.invalidUrl'), description: t('admin.videos.messages.invalidUrlDesc'), variant: 'destructive' });
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
        toast({ title: t('admin.videos.messages.updateSuccess') });
      } else {
        await videosApi.createVideo(payload);
        toast({ title: t('admin.videos.messages.saveSuccess') });
      }
      resetVideoForm(); fetchVideos();
    } catch { toast({ title: t('common.error'), description: t('admin.videos.messages.saveFailed'), variant: 'destructive' }); }
  };

  const handleVideoDelete = async (id: string) => {
    if (!confirm(t('admin.videos.delete'))) return;
    try {
      await videosApi.deleteVideo(id);
      toast({ title: t('admin.videos.messages.deleteSuccess') }); fetchVideos();
    } catch { toast({ title: t('admin.videos.messages.deleteFailed'), variant: 'destructive' }); }
  };

  const resetVideoForm = () => {
    setVideoForm({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: 'video' });
    setEditingVideo(null); setIsVideoDialogOpen(false);
  };

  // ─── Product Handlers ─────────────────────────────────────────────────────────
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: productForm.name, description: productForm.description || undefined, price: parseFloat(productForm.price), image_url: productForm.image_url || undefined, category: productForm.category, age_group: productForm.age_group || undefined, stock: productForm.stock };
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload);
        toast({ title: t('admin.products.messages.saveSuccess') });
      } else {
        await adminApi.createProduct(payload);
        toast({ title: t('admin.products.messages.saveSuccess') });
      }
      resetProductForm(); fetchProducts();
    } catch { toast({ title: t('common.error'), description: t('admin.products.messages.saveFailed'), variant: 'destructive' }); }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm(t('admin.products.delete'))) return;
    try { await adminApi.deleteProduct(id); toast({ title: t('admin.products.messages.deleteSuccess') }); fetchProducts(); }
    catch { toast({ title: t('common.error'), variant: 'destructive' }); }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', stock: 0 });
    setEditingProduct(null); setIsProductDialogOpen(false);
  };

  // ─── Order Handlers ───────────────────────────────────────────────────────────
  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('admin.orders.messages.deleteConfirm'))) return;
    try {
      await ordersApi.adminDeleteOrder(id);
      toast({ title: t('admin.orders.messages.deleteSuccess') });
      fetchOrders();
    } catch {
      toast({ title: t('common.error'), description: t('admin.orders.messages.deleteFailed') || 'Failed to delete order', variant: 'destructive' });
    }
  };

  // ─── User Handlers ────────────────────────────────────────────────────────────
  const handleUserStatusToggle = async (id: string, currentIsActive: boolean) => {
    try {
      const newStatus = currentIsActive ? 'inactive' : 'active';
      await adminApi.updateUserStatus(id, newStatus);
      const statusLabel = newStatus === 'active' ? t('admin.users.statusActive') : t('admin.users.statusInactive');
      toast({ title: t('admin.users.messages.statusUpdated', { status: statusLabel }) });
      fetchUsers();
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(t('admin.users.deleteConfirm'))) return;
    try { await adminApi.deleteUser(id); toast({ title: t('admin.users.messages.deleteSuccess') }); fetchUsers(); }
    catch { toast({ title: t('common.error'), variant: 'destructive' }); }
  };

  // ─── Filtered data ────────────────────────────────────────────────────────────
  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()) &&
    (videoCategory === 'all' || v.category === videoCategory)
  );
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('admin.orders.pending');
      case 'completed': return t('admin.orders.completed');
      case 'failed': return t('admin.orders.failed');
      case 'cancelled': return t('admin.orders.cancelled');
      default: return status;
    }
  };

  // ─── Access guard ─────────────────────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-3xl shadow-card border">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('admin.denied')}</h2>
            <p className="text-muted-foreground">{t('admin.deniedDesc')}</p>
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-indigo-600">
                  {t('admin.dashboard')}
                </h1>
                <p className="text-muted-foreground">{t('admin.subtitle')}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Stats Cards ──────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('admin.stats.videos'), value: stats?.totalVideos ?? '-', icon: Video, gradient: 'from-purple-400 to-purple-600' },
              { label: t('admin.stats.products'), value: stats?.totalProducts ?? '-', icon: ShoppingBag, gradient: 'from-pink-400 to-rose-600' },
              { label: t('admin.stats.orders'), value: stats?.totalOrders ?? '-', icon: ShoppingCart, gradient: 'from-green-400 to-teal-600' },
              { label: t('admin.stats.users'), value: stats?.totalUsers ?? '-', icon: Users, gradient: 'from-orange-400 to-amber-600' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-5 shadow-md border border-white/50 dark:bg-card">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow`}>
                  <stat.icon className="w-6 h-6 text-white" />
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
                  <Icon className="w-4 h-4" />
                  {t(tab.labelKey)}
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
                      <Input placeholder={t('admin.videos.search')} value={videoSearch} onChange={e => setVideoSearch(e.target.value)} className="pl-12 rounded-2xl" />
                    </div>
                    <Select value={videoCategory} onValueChange={setVideoCategory}>
                      <SelectTrigger className="w-full sm:w-44 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('games.categories.all')}</SelectItem>
                        {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white gap-2 hover:opacity-90" onClick={() => { setEditingVideo(null); setVideoForm({ title: '', youtubeUrl: '', ageGroup: '3-6', category: 'Alphabet', duration: '', thumbnailEmoji: 'video' }); }}>
                          <Plus className="w-4 h-4" /> {t('admin.videos.add')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2">
                          {editingVideo ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          {editingVideo ? t('admin.videos.edit') : t('admin.videos.add')}
                        </DialogTitle></DialogHeader>
                        <form onSubmit={handleVideoSubmit} className="space-y-4 mt-2">
                          <div><Label>{t('admin.videos.title')}</Label><Input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} placeholder={t('admin.videos.title')} required className="mt-1 rounded-xl" /></div>
                          <div><Label>{t('admin.videos.youtubeUrl')}</Label><Input value={videoForm.youtubeUrl} onChange={e => setVideoForm(f => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." required className="mt-1 rounded-xl" /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>{t('admin.videos.ageGroup')}</Label>
                              <Select value={videoForm.ageGroup} onValueChange={v => setVideoForm(f => ({ ...f, ageGroup: v }))}>
                                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{AGE_GROUPS.map(a => <SelectItem key={a} value={a}>{t('videos.agePrefix')} {a}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>{t('admin.videos.category')}</Label>
                              <Select value={videoForm.category} onValueChange={v => setVideoForm(f => ({ ...f, category: v }))}>
                                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>{t('admin.videos.duration')}</Label><Input value={videoForm.duration} onChange={e => setVideoForm(f => ({ ...f, duration: e.target.value }))} placeholder="3:45" required className="mt-1 rounded-xl" /></div>
                            <div className="col-span-2">
                              <Label>{t('admin.videos.preview')}</Label>
                              <div className="mt-1 aspect-video rounded-xl bg-muted overflow-hidden border flex items-center justify-center">
                                {extractYouTubeId(videoForm.youtubeUrl) ? (
                                  <img 
                                    src={`https://img.youtube.com/vi/${extractYouTubeId(videoForm.youtubeUrl)}/mqdefault.jpg`} 
                                    className="w-full h-full object-cover"
                                    alt="Preview"
                                  />
                                ) : (
                                  <div className="text-muted-foreground text-sm">{t('admin.videos.previewPrompt')}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={resetVideoForm}>{t('common.cancel')}</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white">{editingVideo ? t('admin.videos.update') : t('admin.videos.save')}</Button>
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
                          <div className="aspect-video relative overflow-hidden">
                            <img 
                              src={`https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                              <a href={`https://youtube.com/watch?v=${video.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                <Button size="icon" className="rounded-full bg-orange-500 hover:bg-orange-600 border-none shadow-lg w-10 h-10">
                                  <Play className="w-5 h-5 fill-white ml-0.5" />
                                </Button>
                              </a>
                              <Button size="icon" className="rounded-full bg-amber-500 hover:bg-amber-600 border-none shadow-lg w-10 h-10" onClick={() => { setEditingVideo(video); setVideoForm({ title: video.title, youtubeUrl: video.youtube_url || `https://youtube.com/watch?v=${video.youtube_video_id}`, ageGroup: video.age_group, category: video.category, duration: video.duration, thumbnailEmoji: video.thumbnail_emoji || 'video' }); setIsVideoDialogOpen(true); }}>
                                <Edit className="w-5 h-5 text-white" />
                              </Button>
                              <Button size="icon" variant="destructive" className="rounded-full shadow-lg w-10 h-10" onClick={() => handleVideoDelete(video.id)}>
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold truncate mb-2">{video.title}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">{video.category}</span>
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">{t('videos.agePrefix')} {video.age_group}</span>
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">{video.duration}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-lg">{t('admin.videos.none')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ════ PRODUCTS TAB ════════════════════════════════════════════ */}
              {activeTab === 'products' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input placeholder={t('admin.products.search')} value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-12 rounded-2xl" />
                    </div>
                    <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white gap-2 hover:opacity-90" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', image_url: '', category: 'Toys', age_group: '', stock: 0 }); }}>
                          <Plus className="w-4 h-4" /> {t('admin.products.add')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle className="flex items-center gap-2">
                          {editingProduct ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          {editingProduct ? t('admin.products.edit') : t('admin.products.add')}
                        </DialogTitle></DialogHeader>
                        <form onSubmit={handleProductSubmit} className="space-y-4 mt-2">
                          <div><Label>{t('admin.products.name')}</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" placeholder={t('admin.products.namePlaceholder')} /></div>
                          <div><Label>{t('admin.products.description')}</Label><Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-xl" placeholder={t('admin.products.descriptionPlaceholder')} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>{t('admin.products.price')}</Label><Input type="number" min="0" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} required className="mt-1 rounded-xl" placeholder="50000" /></div>
                            <div><Label>{t('admin.products.ageGroup')}</Label><Input value={productForm.age_group} onChange={e => setProductForm(f => ({ ...f, age_group: e.target.value }))} className="mt-1 rounded-xl" placeholder="3-6" /></div>
                          </div>
                          <div><Label>{t('admin.products.category')}</Label>
                            <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label>{t('admin.products.imageUrl')}</Label><Input value={productForm.image_url} onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))} className="mt-1 rounded-xl" placeholder="https://..." /></div>
                          <div>
                            <Label htmlFor="stock">{t('admin.products.stock')}</Label>
                            <Input id="stock" type="number" min="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} className="mt-1 rounded-xl" placeholder="100" />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={resetProductForm}>{t('common.cancel')}</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white">{editingProduct ? t('admin.products.update') : t('admin.products.save')}</Button>
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
                            {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <Package className="w-12 h-12 text-pink-200" />}
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold shadow-sm ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.in_stock ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                                {product.in_stock ? t('admin.products.inStock') : t('admin.products.outOfStock')}
                              </span>
                              <span className="text-xs px-2 py-1 bg-white/90 text-slate-700 rounded-full font-semibold shadow-sm border">
                                {t('admin.products.stockLabel', { count: product.stock ?? 0 })}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold truncate mb-1">{product.name}</h3>
                            <p className="text-sm text-muted-foreground truncate mb-3">{product.description || t('shop.noDescription')}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-extrabold text-pink-500">{product.price?.toLocaleString('vi-VN')}₫</span>
                              <div className="flex gap-2">
                                <Button size="icon" variant="outline" className="rounded-xl" onClick={() => { setEditingProduct(product); setProductForm({ name: product.name, description: product.description || '', price: String(product.price), image_url: product.image_url || '', category: product.category || 'Toys', age_group: product.age_group || '', stock: product.stock ?? 0 }); setIsProductDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                <Button size="icon" variant="destructive" className="rounded-xl" onClick={() => handleProductDelete(product.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-lg">{t('admin.products.none')}</p>
                    </div>
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
                        {s === 'all' ? <ShoppingCart className="w-4 h-4" /> : s === 'pending' ? <Clock className="w-4 h-4" /> : s === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : s === 'failed' ? <XCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {s === 'all' ? t('admin.orders.all') : s === 'pending' ? t('admin.orders.pending') : s === 'completed' ? t('admin.orders.completed') : s === 'failed' ? t('admin.orders.failed') : t('admin.orders.cancelled')}
                      </button>
                    ))}
                  </div>

                  {isOrderLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl h-20 animate-pulse" />)}</div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order, idx) => (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, x: -20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.05 * idx }}
                          onClick={() => handleViewOrderDetails(order)}
                          className="bg-white dark:bg-card rounded-2xl p-5 shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                              <ShoppingCart className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-bold text-sm font-mono text-muted-foreground">{t('admin.orders.orderId', { id: order.id.slice(0, 8) })}</p>
                              <p className="text-xl font-extrabold text-green-600">{parseFloat(String(order.total_amount)).toLocaleString('vi-VN')}₫</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {t('admin.orders.customer', { name: order.user?.display_name || t('admin.orders.unknownCustomer') })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  • {new Date(order.created_at).toLocaleString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${STATUS_COLORS[order.payment_status]}`}>
                              {getStatusLabel(order.payment_status)}
                            </span>
                            <button
                              onClick={(e) => handleDeleteOrder(order.id, e)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                              title={t('admin.orders.delete')}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-lg">{t('admin.orders.none')}</p>
                    </div>
                  )}

                  {/* Order Details Modal */}
                  <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
                    <DialogContent className="max-w-2xl rounded-3xl overflow-hidden p-0 border-none shadow-2xl">
                      <DialogHeader className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-b">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-teal-700">
                          <Package className="w-6 h-6" />
                          {t('admin.orders.details')}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedOrder && (
                        <div className="p-6 space-y-6">
                          {/* Order Summary Grid */}
                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{t('common.user')}</p>
                              <p className="font-bold text-slate-800">{selectedOrder.user?.display_name || t('admin.orders.unknownCustomer')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{t('admin.orders.orderIdLabel')}</p>
                              <p className="font-mono text-xs font-bold text-slate-600">#{selectedOrder.id.split('-')[0].toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{t('common.time')}</p>
                              <p className="text-sm font-semibold">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{t('common.status')}</p>
                              <Badge className={`${STATUS_COLORS[selectedOrder.payment_status]} shadow-none`}>
                                {getStatusLabel(selectedOrder.payment_status)}
                              </Badge>
                            </div>
                          </div>

                          {/* Items List */}
                          <div>
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-700">
                              <ShoppingCart className="w-4 h-4" /> {t('admin.orders.items', { count: selectedOrder.order_items?.length || 0 })}
                            </h3>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                              {selectedOrder.order_items?.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group">
                                  <div className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                                    {item.product?.image_url ? (
                                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-500">
                                        <Package className="w-6 h-6" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate group-hover:text-teal-700 transition-colors">{item.product?.name || t('shop.productDeleted')}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.orders.unitPrice', { price: item.price_at_purchase?.toLocaleString('vi-VN') })}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-teal-600">x{item.quantity}</p>
                                    <p className="font-bold text-slate-900">{(item.price_at_purchase * item.quantity).toLocaleString('vi-VN')}₫</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="pt-6 border-t flex items-end justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{t('admin.orders.txnRef')}</p>
                              <p className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                {selectedOrder.vnp_txn_ref || t('admin.orders.noTxn')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-muted-foreground mb-1">{t('admin.orders.totalAmount')}</p>
                              <p className="text-3xl font-black text-teal-600 tracking-tight">
                                {selectedOrder.total_amount?.toLocaleString('vi-VN')}₫
                              </p>
                            </div>
                          </div>

                          <Button 
                            className="w-full rounded-2xl py-6 text-base font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                            onClick={() => setIsOrderDetailOpen(false)}
                          >
                            {t('common.close')}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ════ USERS TAB ════════════════════════════════════════════ */}
              {activeTab === 'users' && (
                <div>
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input placeholder={t('admin.users.search')} value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} className="pl-12 rounded-2xl" />
                    </div>
                    <Button className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white" onClick={fetchUsers}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>

                  {isUserLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl h-20 animate-pulse" />)}</div>
                  ) : users.length > 0 ? (
                    <div className="space-y-4">
                      {users.map((u, idx) => {
                        const isActive = !!u.email_confirmed_at && !u.banned_until;
                        return (
                          <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * idx }}
                            className="bg-white dark:bg-card rounded-2xl p-5 shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-300 to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow">
                                {u.display_name?.[0]?.toUpperCase() || <User className="w-6 h-6 text-white" />}
                              </div>
                              <div>
                                <p className="font-bold flex items-center gap-2">
                                  {u.display_name || t('auth.unknownUser')}
                                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {isActive ? t('admin.users.active') : t('admin.users.inactive')}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">{u.email || u.user_id?.slice(0, 12)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center cursor-pointer gap-2">
                                <span className="text-sm font-semibold text-muted-foreground">{isActive ? t('admin.users.toggleActive') : t('admin.users.toggleInactive')}</span>
                                <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={isActive} onChange={() => handleUserStatusToggle(u.id, isActive)} />
                                  <div className={`block w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'translate-x-4' : ''}`}></div>
                                </div>
                              </label>
                              <Button size="sm" variant="destructive" className="rounded-xl gap-1 text-xs" onClick={() => handleDeleteUser(u.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-lg">{t('admin.users.none')}</p>
                    </div>
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
