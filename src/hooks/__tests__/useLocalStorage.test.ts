import { renderHook, act } from '../../test/test-utils';
import { useLocalStorage } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('returns the initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('stored-value'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('does not write to localStorage until setValue is called', () => {
    renderHook(() => useLocalStorage('test-key', 'default'));
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('writes to localStorage after setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('removes value from localStorage with the remove function', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[2](); // remove
    });

    expect(result.current[0]).toBe('default');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('handles localStorage errors gracefully on read', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('denied'); });
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('handles objects as values', () => {
    const initial = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('obj-key', initial));

    act(() => {
      result.current[1]({ name: 'updated', count: 5 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'obj-key',
      JSON.stringify({ name: 'updated', count: 5 })
    );
  });
});
