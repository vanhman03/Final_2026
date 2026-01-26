import { api } from './api';
import { Product } from './productsApi';

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_at_purchase: number;
    product?: Product;
}

export interface Order {
    id: string;
    user_id: string;
    total_amount: number;
    payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
    vnp_txn_ref?: string;
    created_at: string;
    order_items?: OrderItem[];
}

export interface OrdersResponse {
    orders: Order[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateOrderItem {
    product_id: string;
    quantity: number;
}

export const ordersApi = {
    getOrders: (status?: string, page = 1, limit = 20) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('page', String(page));
        params.append('limit', String(limit));
        return api.get<OrdersResponse>(`/api/orders?${params}`);
    },

    getOrder: (id: string) => api.get<Order>(`/api/orders/${id}`),

    createOrder: (items: CreateOrderItem[]) =>
        api.post<Order>('/api/orders', { items }),

    cancelOrder: (id: string) => api.put<Order>(`/api/orders/${id}/cancel`),
};
