import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Play, Video, Search, Filter } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VideoItem {
  id: string;
  title: string;
  youtube_video_id: string;
  youtube_url: string | null;
  age_group: string;
  category: string;
  duration: string;
  thumbnail_emoji: string | null;
  created_at: string;
}

const AGE_GROUPS = ['0-3', '3-6', '6-9', '9-12'];
const CATEGORIES = ['Alphabet', 'Numbers', 'Animals', 'Music', 'Science', 'Art', 'Stories'];

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: '',
    ageGroup: '3-6',
    category: 'Alphabet',
    duration: '',
    thumbnailEmoji: '📺',
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch videos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const youtubeId = extractYouTubeId(formData.youtubeUrl);
    if (!youtubeId) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingVideo) {
        // Update existing video
        const { error } = await supabase
          .from('videos')
          .update({
            title: formData.title,
            youtube_video_id: youtubeId,
            youtube_url: formData.youtubeUrl,
            age_group: formData.ageGroup,
            category: formData.category,
            duration: formData.duration,
            thumbnail_emoji: formData.thumbnailEmoji,
          })
          .eq('id', editingVideo.id);
        
        if (error) throw error;
        
        toast({
          title: 'Video updated',
          description: 'The video has been updated successfully.',
        });
      } else {
        // Add new video
        const { error } = await supabase
          .from('videos')
          .insert({
            title: formData.title,
            youtube_video_id: youtubeId,
            youtube_url: formData.youtubeUrl,
            age_group: formData.ageGroup,
            category: formData.category,
            duration: formData.duration,
            thumbnail_emoji: formData.thumbnailEmoji,
          });
        
        if (error) throw error;
        
        toast({
          title: 'Video added',
          description: 'The video has been added successfully.',
        });
      }
      
      resetForm();
      fetchVideos();
    } catch (error: any) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save video.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (error) throw error;
      
      toast({
        title: 'Video deleted',
        description: 'The video has been deleted successfully.',
      });
      
      fetchVideos();
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete video.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (video: VideoItem) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      youtubeUrl: video.youtube_url || `https://youtube.com/watch?v=${video.youtube_video_id}`,
      ageGroup: video.age_group,
      category: video.category,
      duration: video.duration,
      thumbnailEmoji: video.thumbnail_emoji || '📺',
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      youtubeUrl: '',
      ageGroup: '3-6',
      category: 'Alphabet',
      duration: '',
      thumbnailEmoji: '📺',
    });
    setEditingVideo(null);
    setIsAddDialogOpen(false);
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || video.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold">
                  <span className="text-gradient-hero">Admin Dashboard</span>
                </h1>
                <p className="text-muted-foreground">Manage videos and content</p>
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2" onClick={() => resetForm()}>
                    <Plus className="w-5 h-5" />
                    Add Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter video title"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="youtubeUrl">YouTube URL</Label>
                      <Input
                        id="youtubeUrl"
                        value={formData.youtubeUrl}
                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Age Group</Label>
                        <Select
                          value={formData.ageGroup}
                          onValueChange={(value) => setFormData({ ...formData, ageGroup: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_GROUPS.map((age) => (
                              <SelectItem key={age} value={age}>{age} years</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Input
                          id="duration"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          placeholder="e.g., 3:45"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emoji">Emoji</Label>
                        <Input
                          id="emoji"
                          value={formData.thumbnailEmoji}
                          onChange={(e) => setFormData({ ...formData, thumbnailEmoji: e.target.value })}
                          placeholder="📺"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="hero" className="flex-1">
                        {editingVideo ? 'Update' : 'Add'} Video
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid sm:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{videos.length}</p>
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Filter className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{CATEGORIES.length}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{AGE_GROUPS.length}</p>
                  <p className="text-sm text-muted-foreground">Age Groups</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Videos Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : filteredVideos.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-card rounded-2xl shadow-card border border-border overflow-hidden group"
                >
                  <div className="aspect-video bg-gradient-sky flex items-center justify-center text-6xl relative">
                    {video.thumbnail_emoji || '📺'}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <a
                        href={`https://youtube.com/watch?v=${video.youtube_video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" variant="secondary">
                          <Play className="w-5 h-5" />
                        </Button>
                      </a>
                      <Button size="icon" variant="secondary" onClick={() => handleEdit(video)}>
                        <Edit className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(video.id)}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold truncate">{video.title}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded">{video.category}</span>
                      <span>{video.age_group} yrs</span>
                      <span>{video.duration}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No videos found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
