import { renderHook, act } from '@testing-library/react';
import { useAIChat } from './useAIChat';

// Mock fetch
global.fetch = jest.fn();

describe('useAIChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useAIChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle input changes', () => {
    const { result } = renderHook(() => useAIChat());

    act(() => {
      result.current.handleInputChange({
        target: { value: 'test query' }
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.input).toBe('test query');
  });

  it('should send message and handle streaming response', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"text","text":"Hello"}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"type":"text","text":" World"}\n\n'));
        controller.close();
      }
    });

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockResponse,
      headers: { get: () => 'text/event-stream' }
    });

    const { result } = renderHook(() => useAIChat());

    act(() => {
      result.current.handleInputChange({
        target: { value: 'Hello' }
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn()
      } as any);
    });

    expect(result.current.messages).toHaveLength(2); // User message + AI response
    expect(result.current.messages[0].text).toBe('Hello');
    expect(result.current.messages[0].isUser).toBe(true);
    expect(result.current.input).toBe(''); // Should clear after submit
  });

  it('should handle errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAIChat());

    act(() => {
      result.current.handleInputChange({
        target: { value: 'Hello' }
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn()
      } as any);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].text).toContain('error');
    expect(result.current.isLoading).toBe(false);
  });
}); 