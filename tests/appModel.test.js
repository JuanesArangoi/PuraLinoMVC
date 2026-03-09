import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock API client before importing AppModel ──
vi.mock('../src/api/client.js', () => {
  let _token = null;
  return {
    api: {
      setToken: vi.fn((t) => { _token = t; if(t) localStorage.setItem('pl_token', t); else localStorage.removeItem('pl_token'); }),
      getToken: vi.fn(() => { if(_token) return _token; const t = localStorage.getItem('pl_token'); _token = t; return t; }),
      login: vi.fn(),
      register: vi.fn(),
      getProducts: vi.fn().mockResolvedValue([]),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      getPromotions: vi.fn().mockResolvedValue([]),
      createPromotion: vi.fn(),
      togglePromotion: vi.fn(),
      getMyOrders: vi.fn().mockResolvedValue([]),
      getAllOrders: vi.fn().mockResolvedValue([]),
      createOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
      getReturns: vi.fn().mockResolvedValue([]),
      getUsers: vi.fn().mockResolvedValue([]),
      updateMe: vi.fn(),
      uploadProductImages: vi.fn(),
      deleteProductImage: vi.fn(),
      createReturn: vi.fn(),
      getMyReturns: vi.fn(),
      getReturn: vi.fn(),
      approveReturn: vi.fn(),
      rejectReturn: vi.fn(),
      markReturnReceived: vi.fn(),
      reviewReturn: vi.fn(),
      validateCoupon: vi.fn(),
    },
    me: vi.fn(),
    wishlistApi: {
      get: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      remove: vi.fn(),
    },
    suppliersApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    warehousesApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), remove: vi.fn(), addShelf: vi.fn(), removeShelf: vi.fn() },
    purchaseOrdersApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), receive: vi.fn(), remove: vi.fn(), get: vi.fn() },
    inventoryApi: { movements: vi.fn(), lowStock: vi.fn(), adjust: vi.fn() },
  };
});

import { AppModel } from '../src/models/appModel.js';
import { api, me as apiMe, wishlistApi } from '../src/api/client.js';

// ── Helpers ──
const mockProduct = (overrides = {}) => ({
  _id: 'prod1',
  name: 'Camisa Lino',
  price: 120000,
  category: 'ropa',
  stock: 10,
  description: 'Camisa de lino premium',
  images: [{ url: 'https://img.com/1.jpg', public_id: 'img1' }],
  variants: [],
  ...overrides,
});

const mockProductWithVariants = () => ({
  _id: 'prod2',
  name: 'Pantalón Lino',
  price: 150000,
  category: 'ropa',
  stock: 0,
  description: 'Pantalón de lino',
  images: [],
  variants: [
    { _id: 'var1', size: 'M', color: 'Blanco', stock: 5, priceOverride: 160000 },
    { _id: 'var2', size: 'L', color: 'Negro', stock: 0, priceOverride: 165000 },
  ],
});

describe('AppModel', () => {
  let model;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.getToken.mockReturnValue(null);
    api.getProducts.mockResolvedValue([]);
    api.getPromotions.mockResolvedValue([]);
    model = new AppModel();
  });

  // ═══════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════
  describe('Inicialización', () => {
    it('debe crear el modelo con estado inicial correcto', () => {
      expect(model.state.products).toEqual([]);
      expect(model.state.cart).toEqual([]);
      expect(model.state.currentUser).toBeNull();
      expect(model.state.orders).toEqual([]);
      expect(model.state.promotions).toEqual([]);
      expect(model.state.wishlist).toEqual([]);
    });

    it('debe inicializar SESSION_TIMEOUT en 30 minutos', () => {
      expect(model.SESSION_TIMEOUT_MINUTES).toBe(30);
    });

    it('debe inicializar CART_EXPIRY en 2 horas', () => {
      expect(model.CART_EXPIRY_HOURS).toBe(2);
    });

    it('init() sin token debe cargar productos y promociones', async () => {
      api.getProducts.mockResolvedValue([mockProduct()]);
      api.getPromotions.mockResolvedValue([]);
      await model.init();
      expect(model.state.products).toHaveLength(1);
      expect(model.state.products[0].name).toBe('Camisa Lino');
    });

    it('init() con token válido debe restaurar sesión', async () => {
      localStorage.setItem('pl_token', 'valid-token');
      api.getToken.mockReturnValue('valid-token');
      model.token = 'valid-token';
      apiMe.mockResolvedValue({ _id: 'u1', username: 'testuser', name: 'Test', role: 'client' });
      api.getProducts.mockResolvedValue([]);
      api.getPromotions.mockResolvedValue([]);
      wishlistApi.get.mockResolvedValue([]);

      await model.init();
      expect(model.state.currentUser).not.toBeNull();
      expect(model.state.currentUser.username).toBe('testuser');
    });
  });

  // ═══════════════════════════════════════════
  // CARRITO DE COMPRAS
  // ═══════════════════════════════════════════
  describe('Carrito de Compras', () => {
    beforeEach(async () => {
      api.getProducts.mockResolvedValue([mockProduct(), mockProductWithVariants()]);
      api.getPromotions.mockResolvedValue([]);
      await model.init();
    });

    it('debe agregar producto simple al carrito', () => {
      model.addToCart('prod1');
      expect(model.state.cart).toHaveLength(1);
      expect(model.state.cart[0].product.name).toBe('Camisa Lino');
      expect(model.state.cart[0].quantity).toBe(1);
    });

    it('debe incrementar cantidad si producto ya está en el carrito', () => {
      model.addToCart('prod1');
      model.addToCart('prod1');
      expect(model.state.cart).toHaveLength(1);
      expect(model.state.cart[0].quantity).toBe(2);
    });

    it('debe lanzar error si producto no tiene stock', () => {
      const noStock = mockProduct({ _id: 'prod3', stock: 0 });
      model.state.products.push({ ...noStock, id: noStock._id });
      expect(() => model.addToCart('prod3')).toThrow('Producto sin stock');
    });

    it('debe lanzar error si excede stock disponible', () => {
      const limited = mockProduct({ _id: 'prod4', stock: 1 });
      model.state.products.push({ ...limited, id: limited._id });
      model.addToCart('prod4');
      expect(() => model.addToCart('prod4')).toThrow('Solo hay 1 unidades disponibles');
    });

    it('debe agregar producto con variante al carrito', () => {
      model.addToCart('prod2', { size: 'M', color: 'Blanco' });
      expect(model.state.cart).toHaveLength(1);
      expect(model.state.cart[0].variantId).toBe('var1');
      expect(model.state.cart[0].variant.priceOverride).toBe(160000);
    });

    it('debe lanzar error con variante sin stock', () => {
      expect(() => model.addToCart('prod2', { size: 'L', color: 'Negro' }))
        .toThrow('Variante sin stock');
    });

    it('debe lanzar error con variante inválida', () => {
      expect(() => model.addToCart('prod2', { size: 'XL', color: 'Rojo' }))
        .toThrow('Seleccione talla y color válidos');
    });

    it('debe lanzar error si producto no existe', () => {
      expect(() => model.addToCart('noexiste')).toThrow('Producto no encontrado');
    });

    it('debe eliminar producto del carrito', () => {
      model.addToCart('prod1');
      expect(model.state.cart).toHaveLength(1);
      model.removeFromCart('prod1');
      expect(model.state.cart).toHaveLength(0);
    });

    it('debe limpiar carrito completamente', () => {
      model.addToCart('prod1');
      model.addToCart('prod2', { size: 'M', color: 'Blanco' });
      expect(model.state.cart).toHaveLength(2);
      model.clearCart();
      expect(model.state.cart).toHaveLength(0);
    });

    it('cartCount() debe retornar total de unidades', () => {
      model.addToCart('prod1');
      model.addToCart('prod1');
      model.addToCart('prod2', { size: 'M', color: 'Blanco' });
      expect(model.cartCount()).toBe(3);
    });

    it('debe persistir carrito en localStorage', () => {
      model.addToCart('prod1');
      const saved = JSON.parse(localStorage.getItem('pl_cart'));
      expect(saved.items).toHaveLength(1);
      expect(saved.timestamp).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // EXPIRACIÓN DEL CARRITO
  // ═══════════════════════════════════════════
  describe('Expiración del Carrito', () => {
    it('carrito reciente no debe estar expirado', () => {
      const now = new Date().toISOString();
      expect(model.isCartExpired(now)).toBe(false);
    });

    it('carrito de hace 3 horas debe estar expirado (límite 2h)', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(model.isCartExpired(threeHoursAgo)).toBe(true);
    });

    it('carrito de hace 1 hora no debe estar expirado', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      expect(model.isCartExpired(oneHourAgo)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // PROMOCIONES
  // ═══════════════════════════════════════════
  describe('Promociones', () => {
    beforeEach(async () => {
      api.getProducts.mockResolvedValue([]);
      api.getPromotions.mockResolvedValue([
        { _id: 'promo1', code: 'DESC10', discount: 10, active: true },
        { _id: 'promo2', code: 'DESC50', discount: 50, active: false },
      ]);
      await model.init();
    });

    it('debe cargar promociones al inicializar', () => {
      expect(model.state.promotions).toHaveLength(2);
    });

    it('debe aplicar código de promoción activo', () => {
      const promo = model.applyPromo('DESC10');
      expect(promo.discount).toBe(10);
      expect(model.state.currentPromo).not.toBeNull();
    });

    it('debe lanzar error con código de promoción inactivo', () => {
      expect(() => model.applyPromo('DESC50')).toThrow('Código de promoción inválido');
    });

    it('debe lanzar error con código inexistente', () => {
      expect(() => model.applyPromo('NOEXISTE')).toThrow('Código de promoción inválido');
    });

    it('código debe ser case-insensitive', () => {
      const promo = model.applyPromo('desc10');
      expect(promo.code).toBe('DESC10');
    });
  });

  // ═══════════════════════════════════════════
  // AUTENTICACIÓN
  // ═══════════════════════════════════════════
  describe('Autenticación', () => {
    it('login debe guardar token y usuario', async () => {
      api.login.mockResolvedValue({
        token: 'jwt-token-123',
        user: { _id: 'u1', username: 'juan', name: 'Juan', role: 'client' },
      });
      const user = await model.login('juan', 'Password1');
      expect(user.username).toBe('juan');
      expect(model.state.currentUser).not.toBeNull();
      expect(api.setToken).toHaveBeenCalledWith('jwt-token-123');
    });

    it('logout debe limpiar estado completamente', async () => {
      // Simulate logged in state
      model.state.currentUser = { id: 'u1', username: 'juan' };
      model.token = 'some-token';
      model.state.cart = [{ productId: 'p1', quantity: 1 }];
      localStorage.setItem('pl_token', 'some-token');
      localStorage.setItem('pl_user', '{}');

      model.logout();

      expect(model.state.currentUser).toBeNull();
      expect(model.token).toBeNull();
      expect(model.state.cart).toHaveLength(0);
      expect(localStorage.getItem('pl_token')).toBeNull();
      expect(localStorage.getItem('pl_user')).toBeNull();
    });

    it('register debe retornar usuario creado', async () => {
      api.register.mockResolvedValue({ id: 'u2', username: 'nuevo', name: 'Nuevo User' });
      const result = await model.register({ name: 'Nuevo', email: 'n@test.com', username: 'nuevo', password: 'Pass123' });
      expect(result.username).toBe('nuevo');
    });
  });

  // ═══════════════════════════════════════════
  // TIMEOUT DE SESIÓN
  // ═══════════════════════════════════════════
  describe('Timeout de Sesión', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
      model.clearSessionTimeout();
    });

    it('debe configurar timeout al iniciar sesión', () => {
      model.state.currentUser = { id: 'u1' };
      model.startSessionTimeout();
      expect(model.sessionTimeout).not.toBeNull();
      expect(model.warningTimeout).not.toBeNull();
    });

    it('clearSessionTimeout debe limpiar timers', () => {
      model.state.currentUser = { id: 'u1' };
      model.startSessionTimeout();
      model.clearSessionTimeout();
      expect(model.sessionTimeout).toBeNull();
      expect(model.warningTimeout).toBeNull();
    });

    it('resetSessionTimeout solo funciona si hay usuario', () => {
      model.state.currentUser = null;
      model.resetSessionTimeout();
      expect(model.sessionTimeout).toBeNull();
    });
  });

  // ═══════════════════════════════════════════
  // PRODUCTOS
  // ═══════════════════════════════════════════
  describe('Productos', () => {
    it('listProducts debe retornar copia del array', async () => {
      api.getProducts.mockResolvedValue([mockProduct()]);
      api.getPromotions.mockResolvedValue([]);
      await model.init();
      const list = model.listProducts();
      expect(list).toHaveLength(1);
      list.push({ fake: true });
      expect(model.state.products).toHaveLength(1); // original no cambia
    });

    it('addProduct debe agregar al inicio del array', async () => {
      api.getProducts.mockResolvedValue([mockProduct()]);
      api.getPromotions.mockResolvedValue([]);
      await model.init();
      api.createProduct.mockResolvedValue({ _id: 'new1', name: 'Nuevo' });
      await model.addProduct({ name: 'Nuevo', price: 50000 });
      expect(model.state.products[0].name).toBe('Nuevo');
    });

    it('deleteProduct debe eliminar del array', async () => {
      api.getProducts.mockResolvedValue([mockProduct()]);
      api.getPromotions.mockResolvedValue([]);
      await model.init();
      api.deleteProduct.mockResolvedValue({});
      await model.deleteProduct('prod1');
      expect(model.state.products).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════
  // WISHLIST
  // ═══════════════════════════════════════════
  describe('Wishlist', () => {
    it('refreshWishlist debe cargar la lista', async () => {
      wishlistApi.get.mockResolvedValue([{ productId: 'prod1' }]);
      await model.refreshWishlist();
      expect(model.state.wishlist).toHaveLength(1);
    });

    it('refreshWishlist debe manejar errores graciosamente', async () => {
      wishlistApi.get.mockRejectedValue(new Error('Network error'));
      await model.refreshWishlist();
      expect(model.state.wishlist).toEqual([]);
    });

    it('isInWishlist debe verificar si producto está en la lista', async () => {
      model.state.wishlist = [{ productId: 'prod1' }];
      expect(model.isInWishlist('prod1')).toBe(true);
      expect(model.isInWishlist('prod99')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // PEDIDOS
  // ═══════════════════════════════════════════
  describe('Pedidos', () => {
    it('_adaptOrder debe normalizar la estructura del pedido', () => {
      const raw = {
        _id: 'o1',
        userId: 'u1',
        total: 120000,
        items: [
          { productId: 'p1', productName: 'Camisa', productPrice: 120000, quantity: 1, category: 'ropa', variant: null },
        ],
      };
      const adapted = model._adaptOrder(raw);
      expect(adapted.id).toBe('o1');
      expect(adapted.items[0].product.name).toBe('Camisa');
      expect(adapted.items[0].product.price).toBe(120000);
    });
  });

  // ═══════════════════════════════════════════
  // NOTIFICACIONES (Observer)
  // ═══════════════════════════════════════════
  describe('Notificaciones (Observer)', () => {
    it('notify() debe emitir evento state:change', async () => {
      const { bus } = await import('../src/core/observer.js');
      const handler = vi.fn();
      bus.on('state:change', handler);
      model.notify();
      expect(handler).toHaveBeenCalledWith(model.state);
    });
  });
});
