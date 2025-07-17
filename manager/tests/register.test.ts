// Simple test to verify the register API route structure
import { POST } from '@/app/api/register/route';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.REGISTER_LAMBDA_ENDPOINT = 'http://mock-lambda-endpoint';
process.env.SHARED_SECRET_KEY = 'dGVzdC1zZWNyZXQta2V5LTMyLWJ5dGVzLWxvbmc=';

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.REGISTER_LAMBDA_ENDPOINT = 'http://mock-lambda-endpoint';
process.env.DELETE_LAMBDA_ENDPOINT = 'http://mock-delete-lambda-endpoint';
process.env.SHARED_SECRET_KEY = 'dGVzdC1zZWNyZXQta2V5LTMyLWJ5dGVzLWxvbmc=';

describe('POST /api/register', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

describe('POST /api/register', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should handle registration request with successful warmup', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Lambda is ready", timestamp: 1000 })
      })
      .mockResolvedValueOnce({ ok: true });

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword',
        id_list: ['sm12345'],
        subscription: null,
        action: 'register'
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.message).toBe('register処理を開始しました。完了時に通知をお送りします。');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
}

// Add tests for delete action

describe('POST /api/register with delete action', () => {
  it('should handle delete request with successful warmup', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Lambda is ready", timestamp: 1000 })
      })
      .mockResolvedValueOnce({ ok: true });

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword',
        id_list: ['sm12345'],
        subscription: null,
        action: 'delete'
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.message).toBe('delete処理を開始しました。完了時に通知をお送りします。');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

  it('should handle registration request with successful warmup', async () => {
    // Mock successful warmup and registration requests
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ message: "Lambda is ready", timestamp: 1000 })
      }) // warmup request
      .mockResolvedValueOnce({ ok: true }); // actual request

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword',
        id_list: ['sm12345'],
import { NextRequest } from 'next/server';

// Add tests for delete action

describe('POST /api/register with delete action', () => {
  it('should handle delete request with successful warmup', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Lambda is ready", timestamp: 1000 })
      }) // warmup request
      .mockResolvedValueOnce({ ok: true }); // actual request

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword',
        id_list: ['sm12345'],
        subscription: null,
        action: 'delete'
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.message).toBe('delete処理を開始しました。完了時に通知をお送りします。');
    expect(fetch).toHaveBeenCalledTimes(2); // warmup + actual
  });
});

        subscription: null
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.message).toBe('登録処理を開始しました。完了時に通知をお送りします。');
    expect(fetch).toHaveBeenCalledTimes(2); // warmup + actual
  });

  it('should return 503 if warmup fails', async () => {
    // Mock failed warmup
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Warmup failed')); // warmup request fails

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword', 
        id_list: ['sm12345'],
        subscription: null
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('サーバーの準備ができていません。しばらく待ってからもう一度お試しください。');
    expect(fetch).toHaveBeenCalledTimes(1); // only warmup, no actual request
  });

  it('should return 503 if warmup returns non-ok status', async () => {
    // Mock warmup with non-ok status
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 }); // warmup request fails

    const mockRequest = {
      json: async () => ({
        email: 'test@example.com',
        password: 'testpassword', 
        id_list: ['sm12345'],
        subscription: null
      })
    } as NextRequest;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('サーバーの準備ができていません。しばらく待ってからもう一度お試しください。');
    expect(fetch).toHaveBeenCalledTimes(1); // only warmup, no actual request
  });
});
