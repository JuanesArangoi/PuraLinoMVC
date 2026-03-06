const baseURL = window.__API_URL__ || 'https://d2nkt7j19iaq1l.cloudfront.net';
let token = null;

function setToken(t){ token = t; if(t) localStorage.setItem('pl_token', t); else localStorage.removeItem('pl_token'); }
function getToken(){ if(token) return token; const t = localStorage.getItem('pl_token'); token = t; return token; }

async function request(path, { method='GET', body, auth=false }={}){
  const headers = { 'Content-Type': 'application/json' };
  if(auth){ const t=getToken(); if(t) headers['Authorization'] = `Bearer ${t}`; }
  let res;
  try {
    res = await fetch(`${baseURL}${path}`, { method, headers, body: body? JSON.stringify(body): undefined });
  } catch(networkErr) {
    const err = new Error('Error de conexión con el servidor');
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(()=>({}));
  if(!res.ok){
    const err = new Error(data?.error || 'Request error');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  setToken,
  getToken,
  async login({ username, password }){ return request('/auth/login', { method:'POST', body:{ username, password } }); },
  async register(payload){ return request('/auth/register', { method:'POST', body: payload }); },

  async getProducts(query){
    const q = query && Object.keys(query).length? ('?' + new URLSearchParams(query).toString()): '';
    return request('/products' + q);
  },
  async createProduct(payload){ return request('/products', { method:'POST', body: payload, auth:true }); },
  async updateProduct(id, payload){ return request(`/products/${id}`, { method:'PUT', body: payload, auth:true }); },
  async deleteProduct(id){ return request(`/products/${id}`, { method:'DELETE', auth:true }); },

  async getPromotions(){ return request('/promotions'); },
  async createPromotion(payload){ return request('/promotions', { method:'POST', body: payload, auth:true }); },
  async togglePromotion(id){ return request(`/promotions/${id}/toggle`, { method:'PATCH', auth:true }); },

  async getMyOrders(){ return request('/orders/me', { auth:true }); },
  async getAllOrders(){ return request('/orders', { auth:true }); },
  async createOrder(payload){ return request('/orders', { method:'POST', body: payload, auth:true }); },
  async updateOrderStatus(id, status){ return request(`/orders/${id}/status`, { method:'PATCH', body:{ status }, auth:true }); },

  async getReturns(){ return request('/returns', { auth:true }); },
  async getMyReturns(){ return request('/returns/me', { auth:true }); },
  async getReturn(id){ return request(`/returns/${id}`, { auth:true }); },
  async createReturn(payload){ return request('/returns', { method:'POST', body: payload, auth:true }); },
  async approveReturn(id, payload){ return request(`/returns/${id}/approve`, { method:'PATCH', body: payload, auth:true }); },
  async rejectReturn(id, payload){ return request(`/returns/${id}/reject`, { method:'PATCH', body: payload, auth:true }); },
  async markReturnReceived(id){ return request(`/returns/${id}/received`, { method:'PATCH', auth:true }); },
  async reviewReturn(id, payload){ return request(`/returns/${id}/review`, { method:'PATCH', body: payload, auth:true }); },
  async validateCoupon(code){ return request(`/returns/coupon/${code}`, { auth:true }); },

  async getUsers(){ return request('/users', { auth:true }); },
  async updateMe(payload){ return request('/users/me', { method:'PATCH', body: payload, auth:true }); },

  async uploadProductImages(productId, files){
    const formData = new FormData();
    for(const f of files) formData.append('images', f);
    const headers = {};
    const t = getToken(); if(t) headers['Authorization'] = `Bearer ${t}`;
    const res = await fetch(`${baseURL}/upload/product/${productId}/images`, { method:'POST', headers, body: formData });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data?.error || 'Upload error');
    return data;
  },
  async deleteProductImage(productId, publicId){
    return request(`/upload/product/${productId}/images/${encodeURIComponent(publicId)}`, { method:'DELETE', auth:true });
  }
};

// ── Suppliers ──
export const suppliersApi = {
  async list(){ return request('/suppliers', { auth:true }); },
  async get(id){ return request(`/suppliers/${id}`, { auth:true }); },
  async create(payload){ return request('/suppliers', { method:'POST', body: payload, auth:true }); },
  async update(id, payload){ return request(`/suppliers/${id}`, { method:'PUT', body: payload, auth:true }); },
  async remove(id){ return request(`/suppliers/${id}`, { method:'DELETE', auth:true }); }
};

// ── Warehouses ──
export const warehousesApi = {
  async list(){ return request('/warehouses', { auth:true }); },
  async get(id){ return request(`/warehouses/${id}`, { auth:true }); },
  async create(payload){ return request('/warehouses', { method:'POST', body: payload, auth:true }); },
  async update(id, payload){ return request(`/warehouses/${id}`, { method:'PUT', body: payload, auth:true }); },
  async addShelf(id, payload){ return request(`/warehouses/${id}/shelves`, { method:'POST', body: payload, auth:true }); },
  async removeShelf(id, shelfId){ return request(`/warehouses/${id}/shelves/${shelfId}`, { method:'DELETE', auth:true }); },
  async remove(id){ return request(`/warehouses/${id}`, { method:'DELETE', auth:true }); }
};

// ── Purchase Orders (Albaranes) ──
export const purchaseOrdersApi = {
  async list(){ return request('/purchase-orders', { auth:true }); },
  async get(id){ return request(`/purchase-orders/${id}`, { auth:true }); },
  async create(payload){ return request('/purchase-orders', { method:'POST', body: payload, auth:true }); },
  async update(id, payload){ return request(`/purchase-orders/${id}`, { method:'PUT', body: payload, auth:true }); },
  async updateStatus(id, status){ return request(`/purchase-orders/${id}/status`, { method:'PATCH', body:{ status }, auth:true }); },
  async receive(id, receivedItems){ return request(`/purchase-orders/${id}/receive`, { method:'POST', body:{ receivedItems }, auth:true }); },
  async remove(id){ return request(`/purchase-orders/${id}`, { method:'DELETE', auth:true }); }
};

// ── Inventory ──
export const inventoryApi = {
  async movements(query){ const q = query ? '?' + new URLSearchParams(query).toString() : ''; return request(`/inventory/movements${q}`, { auth:true }); },
  async lowStock(threshold){ return request(`/inventory/low-stock?threshold=${threshold||5}`, { auth:true }); },
  async adjust(payload){ return request('/inventory/adjust', { method:'POST', body: payload, auth:true }); }
};

// ── Payments (Mercado Pago) ──
export const paymentsApi = {
  async getConfig(){ return request('/payments/config'); },
  async createPreference(payload){ return request('/payments/create-preference', { method:'POST', body: payload, auth:true }); },
  async processPayment(payload){ return request('/payments/process', { method:'POST', body: payload, auth:true }); },
  async getStatus(orderId){ return request(`/payments/status/${orderId}`, { auth:true }); },
};

// Convenience export: get current user by token
export async function me(){ return request('/auth/me', { auth:true }); }

// Wishlist endpoints
export const wishlistApi = {
  async get(){ return request('/wishlist', { auth:true }); },
  async add(productId){ return request(`/wishlist/${productId}`, { method:'POST', auth:true }); },
  async remove(productId){ return request(`/wishlist/${productId}`, { method:'DELETE', auth:true }); }
};

// ── Settings (Banner) ──
export const settingsApi = {
  async getBanner(){ return request('/settings/banner'); },
  async updateBanner(payload){ return request('/settings/banner', { method:'PUT', body: payload, auth:true }); },
  async uploadBannerImage(file){
    const formData = new FormData();
    formData.append('image', file);
    const headers = {};
    const t = getToken(); if(t) headers['Authorization'] = `Bearer ${t}`;
    const res = await fetch(`${baseURL}/settings/banner/image`, { method:'POST', headers, body: formData });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data?.error || 'Upload error');
    return data;
  },
  async deleteBannerImage(){ return request('/settings/banner/image', { method:'DELETE', auth:true }); }
};

// Reviews endpoints
export const reviewsApi = {
  async list(productId){ return request(`/products/${productId}/reviews`); },
  async add(productId, { rating, comment }){ return request(`/products/${productId}/reviews`, { method:'POST', body:{ rating, comment }, auth:true }); },
  async pending(){ return request('/reviews/pending', { auth:true }); },
  async approve(id){ return request(`/reviews/${id}/approve`, { method:'PATCH', auth:true }); },
  async reject(id){ return request(`/reviews/${id}`, { method:'DELETE', auth:true }); }
};
