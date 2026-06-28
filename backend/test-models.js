import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1',
});

async function main() {
  console.log('Listing available Cerebras models...');
  try {
    const response = await client.models.list();
    console.log('\nSuccess! Available models:');
    response.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

main();
