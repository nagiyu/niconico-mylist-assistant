import { authOptions } from '../auth/authOptions';
import { getGoogleUserIdFromSession } from '../auth/googleAuth';
import { getDynamoClient } from '../aws/dynamoClient';

describe('Shared Auth Module', () => {
  test('authOptions should be defined', () => {
    expect(authOptions).toBeDefined();
    expect(authOptions.providers).toBeDefined();
    expect(authOptions.providers.length).toBeGreaterThan(0);
  });

  test('getGoogleUserIdFromSession should be a function', () => {
    expect(typeof getGoogleUserIdFromSession).toBe('function');
  });
});

describe('Shared AWS Module', () => {
  test('getDynamoClient should be a function', () => {
    expect(typeof getDynamoClient).toBe('function');
  });

  test('getDynamoClient should return a DynamoDBClient', () => {
    // Set required environment variables for test
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    
    const client = getDynamoClient();
    expect(client).toBeDefined();
    expect(client.constructor.name).toBe('DynamoDBClient');
  });
});