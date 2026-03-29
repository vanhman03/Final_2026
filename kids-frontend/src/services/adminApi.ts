import { api } from './api';
import { Profile } from './profilesApi';
import { Order, OrdersResponse } from './ordersApi';
import { Product } from './productsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
    totalUsers: number;
    totalVideos: number;
    totalOrders: number;
    totalProducts: number;
    totalRevenue: number;
    recentOrders: Order[];
}

export interface AdminUserProfile extends Profile {
    email?: string;
    email_confirmed_at?: string | null;
    banned_until?: string | null;
}

export interface UsersResponse {
    users: AdminUserProfile[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UpdateUserRequest {
    display_name?: string;
    avatar_url?: string;
    screen_time_limit?: number;
    points?: number;
    badges?: string[];
}

export interface CreateProductRequest {
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category?: string;
    age_group?: string;
    stock?: number;
}

// ─── Admin API ───────────────────────────────────────────────────────────────

export const adminApi = {
    // Stats
    getStats: () => api.get<AdminStats>('/api/admin/stats'),

    // Users
    getUsers: (page = 1, limit = 20, search?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.append('search', search);
        return api.get<UsersResponse>(`/api/admin/users?${params}`);
    },

    updateUserStatus: (id: string, status: 'active' | 'inactive') =>
        api.put<{ message: string }>(`/api/admin/users/${id}/status`, { status }),

    deleteUser: (id: string) =>
        api.delete<null>(`/api/admin/users/${id}`),

    // Orders
    getAllOrders: (page = 1, limit = 20, status?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status && status !== 'all') params.append('status', status);
        return api.get<OrdersResponse>(`/api/orders/admin/all?${params}`);
    },

    updateOrderStatus: (id: string, status: 'pending' | 'completed' | 'failed' | 'cancelled') =>
        api.put<Order>(`/api/admin/orders/${id}/status`, { status }),

    // Products (CRUD)
    createProduct: (data: CreateProductRequest) =>
        api.post<Product>('/api/products', data),

    updateProduct: (id: string, data: Partial<CreateProductRequest>) =>
        api.put<Product>(`/api/products/${id}`, data),

    deleteProduct: (id: string) =>
        api.delete<null>(`/api/products/${id}`),

    // Bulk import videos
    bulkImportVideos: (videos: object[]) =>
        api.post<{ count: number }>('/api/admin/bulk-import-videos', { videos }),
};
