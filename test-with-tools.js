const API_KEY = 'sk-T3GhQRRgZfyhS8yVN8QFIUbC1eCIuXwFUqC9z0R43LMszD6C';
const BASE_URL = 'http://newclaudeapi.icu';

async function testWithTools() {
  console.log('Testing WITH tools parameter...\n');

  const response = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4.6',
      max_tokens: 100,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: 'Test message' }],
    }),
  });

  console.log('WITH tools:');
  console.log('  Status:', response.status);
  const text = await response.text();
  console.log('  Response:', text.slice(0, 200));
  console.log('');

  // Test WITHOUT tools
  const response2 = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4.6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Test message' }],
    }),
  });

  console.log('WITHOUT tools:');
  console.log('  Status:', response2.status);
  const text2 = await response2.text();
  console.log('  Response:', text2.slice(0, 200));
}

testWithTools().catch(console.error);
