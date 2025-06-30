// Simple test to verify the register API route structure
import { POST } from '@/app/api/register/route';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.REGISTER_LAMBDA_ENDPOINT = 'http://mock-lambda-endpoint';
process.env.SHARED_SECRET_KEY = 'dGVzdC1zZWNyZXQta2V5LTMyLWJ5dGVzLWxvbmc=';

// Mock fetch
global.fetch = jest.fn();

describe('POST /api/register', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should handle registration request with warmup', async () => {
    // Mock successful warmup and registration requests
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true }) // warmup request
      .mockResolvedValueOnce({ ok: true }); // actual request

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

    expect(response.status).toBe(202);
    expect(data.message).toBe('登録処理を開始しました。完了時に通知をお送りします。');
    expect(fetch).toHaveBeenCalledTimes(2); // warmup + actual
  });

  it('should proceed even if warmup fails', async () => {
    // Mock failed warmup but successful registration
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Warmup failed')) // warmup request fails
      .mockResolvedValueOnce({ ok: true }); // actual request succeeds

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

    expect(response.status).toBe(202);
    expect(data.message).toBe('登録処理を開始しました。完了時に通知をお送りします。');
  });
});