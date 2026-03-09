import { describe, it, expect, vi } from 'vitest';
import { Observer, bus } from '../src/core/observer.js';

describe('Observer (Patrón Observador)', () => {
  it('debe registrar y emitir eventos', () => {
    const obs = new Observer();
    const handler = vi.fn();
    obs.on('test', handler);
    obs.emit('test', { data: 123 });
    expect(handler).toHaveBeenCalledWith({ data: 123 });
  });

  it('debe permitir múltiples handlers por evento', () => {
    const obs = new Observer();
    const h1 = vi.fn();
    const h2 = vi.fn();
    obs.on('evt', h1);
    obs.on('evt', h2);
    obs.emit('evt', 'payload');
    expect(h1).toHaveBeenCalledWith('payload');
    expect(h2).toHaveBeenCalledWith('payload');
  });

  it('debe desuscribir handlers con off()', () => {
    const obs = new Observer();
    const handler = vi.fn();
    obs.on('evt', handler);
    obs.off('evt', handler);
    obs.emit('evt', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('on() debe retornar función de desuscripción', () => {
    const obs = new Observer();
    const handler = vi.fn();
    const unsub = obs.on('evt', handler);
    unsub();
    obs.emit('evt', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('emit sin handlers no debe fallar', () => {
    const obs = new Observer();
    expect(() => obs.emit('noexiste', 'data')).not.toThrow();
  });

  it('bus debe ser una instancia global de Observer', () => {
    expect(bus).toBeInstanceOf(Observer);
  });

  it('errores en handlers no deben detener otros handlers', () => {
    const obs = new Observer();
    const badHandler = vi.fn(() => { throw new Error('fail'); });
    const goodHandler = vi.fn();
    obs.on('evt', badHandler);
    obs.on('evt', goodHandler);
    obs.emit('evt', 'data');
    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });
});
