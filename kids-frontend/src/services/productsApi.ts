import { api } from './api';

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category?: string;
    age_group?: string;
    in_stock: boolean;
    stock: number;
    created_at: string;
}

export interface ProductsResponse {
    products: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ProductFilters {
    category?: string;
    age_group?: string;
    in_stock?: boolean;
    min_price?: number;
    max_price?: number;
    search?: string;
    page?: number;
    limit?: number;
}

function buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

export const productsApi = {
    getProducts: (filters: ProductFilters = {}) => {
        const query = buildQueryString(filters);
        return api.get<ProductsResponse>(`/api/products${query}`);
    },

    getProduct: (id: string) => api.get<Product>(`/api/products/${id}`),

    getCategories: () => api.get<{ categories: string[] }>('/api/products/categories/list'),
};
