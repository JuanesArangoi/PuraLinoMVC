import { describe, it, expect } from 'vitest';
import { DiscountStrategies } from '../src/strategies/discount.js';

describe('DiscountStrategies (Estrategia de Descuento)', () => {
  describe('percentage()', () => {
    it('debe calcular descuento del 10% correctamente', () => {
      const result = DiscountStrategies.percentage({ total: 100000, percent: 10 });
      expect(result.discount).toBe(10000);
      expect(result.total).toBe(90000);
    });

    it('debe calcular descuento del 25% correctamente', () => {
      const result = DiscountStrategies.percentage({ total: 200000, percent: 25 });
      expect(result.discount).toBe(50000);
      expect(result.total).toBe(150000);
    });

    it('debe manejar descuento del 0%', () => {
      const result = DiscountStrategies.percentage({ total: 50000, percent: 0 });
      expect(result.discount).toBe(0);
      expect(result.total).toBe(50000);
    });

    it('debe manejar descuento del 100%', () => {
      const result = DiscountStrategies.percentage({ total: 80000, percent: 100 });
      expect(result.discount).toBe(80000);
      expect(result.total).toBe(0);
    });

    it('debe manejar totales decimales', () => {
      const result = DiscountStrategies.percentage({ total: 99999, percent: 15 });
      expect(result.discount).toBeCloseTo(14999.85, 2);
      expect(result.total).toBeCloseTo(84999.15, 2);
    });

    it('descuento + total debe ser igual al total original', () => {
      const total = 150000;
      const result = DiscountStrategies.percentage({ total, percent: 33 });
      expect(result.discount + result.total).toBeCloseTo(total, 2);
    });
  });
});
