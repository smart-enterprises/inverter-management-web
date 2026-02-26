import { API_BASE_URL } from "../utils/api";

// AUTH HEADER

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// GENERIC REQUEST HANDLER

const apiRequest = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
                ...options.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || "API request failed");
        }

        return data;
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error);
        throw error;
    }
};

//  QUERY BUILDER

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, value);
        }
    });

    return query.toString();
};

//  PRODUCT CRUD OPERATIONS

// 🔹 Get All Products
export const fetchProducts = () =>
    apiRequest("/product-details/get/all");

// 🔹 Get Product By ID
export const fetchProductById = (productId) =>
    apiRequest(`/product-details/${productId}`);

// 🔹 Create Product
export const createProduct = (productData) =>
    apiRequest("/product-details/create-product", {
        method: "POST",
        body: JSON.stringify(productData),
    });

// 🔹 Update Product
export const updateProduct = (productId, productData) =>
    apiRequest(`/product-details/${productId}`, {
        method: "PUT",
        body: JSON.stringify(productData),
    });

// 🔹 Delete Product
export const deleteProduct = (productId) =>
    apiRequest(`/product-details/delete/${productId}`, {
        method: "DELETE",
    });

// 🔹 Create / Update Stock
export const updateProductStock = (stockData) =>
    apiRequest("/product-details/createOrUpdate/product-stocks", {
        method: "PUT",
        body: JSON.stringify(stockData),
    });

// 🔹 Fetch Products By Brands
export const fetchProductsByBrands = (brands) =>
    apiRequest("/product-details/getAllProductsByBrand", {
        method: "POST",
        body: JSON.stringify({ brands }),
    });

// 🔹 LOW STOCK PRODUCTS

export const fetchLowStockProducts = ({
    page = 1,
    limit = 10,
    threshold = 5,
} = {}) => {
    const query = buildQuery({ page, limit, threshold });

    return apiRequest(`/product-details/low-stock?${query}`);
};