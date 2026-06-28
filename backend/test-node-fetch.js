import OpenAI from 'openai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1',
  fetch: fetch,
});

async function main() {
  console.log('Testing Cerebras API connection with node-fetch...');
  const startTime = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: 'gemma-4-31b',
      messages: [
        { role: 'user', content: 'Say "Cerebras with node-fetch is running Gemma 4!"' }
      ]
    });
    const duration = Date.now() - startTime;
    console.log('\nSuccess!');
    console.log('Response:', response.choices[0].message.content);
    console.log(`Latency: ${duration}ms`);
  } catch (err) {
    console.error('Error connecting to Cerebras:', err.message);
  }
}

main();
