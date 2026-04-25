import { apiRequest } from "./apiClient.js";

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
export const fetchProducts = ({
    page = 1,
    limit = 10,
    search = "",
    type = "",
    status = "",
    category = "",
    brand = "",
    model = "",
} = {}) => {
    const query = buildQuery({ page, limit, search, type, status, category, brand, model });

    return apiRequest(`/product-details/get/all?${query}`, {
        method: "GET",
    });
};

// 🔹 Get Product By ID
export const fetchProductById = async (productId) =>
    apiRequest(`/product-details/${productId}`, {
        method: "GET",
    });

// 🔹 Create Product
export const createProduct = async (productData) =>
    apiRequest("/product-details/create-product", {
        method: "POST",
        body: JSON.stringify(productData),
    });

// 🔹 Update Product
export const updateProduct = async (productId, productData) =>
    apiRequest(`/product-details/${productId}`, {
        method: "PUT",
        body: JSON.stringify(productData),
    });

// 🔹 Delete Product
export const deleteProduct = async (productId) =>
    apiRequest(`/product-details/delete/${productId}`, {
        method: "DELETE",
    });

// 🔹 Create / Update Stock
export const updateProductStock = async (stockData) =>
    apiRequest("/product-details/createOrUpdate/product-stocks", {
        method: "PUT",
        body: JSON.stringify(stockData),
    });

// 🔹 Fetch Products By Brands
export const fetchProductsByBrands = async (brands = []) =>
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

    return apiRequest(`/product-details/low-stock?${query}`, {
        method: "GET",
    });
};

// 🔹 Get Product Types
export const getProductTypes = async () => {
    return apiRequest("/product-details/types", {
        method: "GET",
    });
};

// 🔹 Get Product Categories
export const getProductCategories = async () => {
    return apiRequest("/product-details/categories", {
        method: "GET",
    });
};