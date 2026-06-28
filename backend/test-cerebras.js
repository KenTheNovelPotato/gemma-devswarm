import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.CEREBRAS_API_KEY;
if (!apiKey) {
  console.error('Error: CEREBRAS_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.cerebras.ai/v1',
});

async function main() {
  console.log('Testing Cerebras API connection with model gemma-4-31b...');
  const startTime = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: 'gemma-4-31b',
      messages: [
        { role: 'user', content: 'Say "Cerebras is running Gemma 4 at extreme speeds!"' }
      ]
    });
    const duration = Date.now() - startTime;
    console.log('\nSuccess!');
    console.log('Response:', response.choices[0].message.content);
    console.log(`Latency: ${duration}ms`);
    if (response.usage) {
      console.log('Tokens:', response.usage);
    }
  } catch (err) {
    console.error('Error connecting to Cerebras:', err.message);
  }
}

main();
