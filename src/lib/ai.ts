import axios from 'axios';
import { getStatus } from './db';

const DEFAULT_ENDPOINT = 'https://9router.indrayuda.my.id/v1/chat/completions';
const DEFAULT_KEY = 'sk-68b631cc8464b3ed-tbnd2g-cc2ff8e3';

export async function askGemma(prompt: string, useThinking = true, jsonMode = false, retryCount = 0, temperature = 0.7): Promise<string> {
  let endpoint = DEFAULT_ENDPOINT;
  let apiKey = DEFAULT_KEY;
  let enabled = true;

  try {
    const status = await getStatus();
    if (status) {
      endpoint = status.ai_endpoint || DEFAULT_ENDPOINT;
      apiKey = status.ai_api_key || DEFAULT_KEY;
      enabled = status.ai_enabled !== undefined ? !!status.ai_enabled : true;
    }
  } catch (dbErr) {
    // Fallback to default credentials if DB is not ready
  }

  if (!enabled) {
    return '';
  }

  try {
    const payload: any = {
      model: "gemma",
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      "x-router-thinking": useThinking ? "high" : "off"
    };

    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const res = await axios.post(endpoint, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return res.data?.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    const errorMessage = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || err.message);
    if (err.response?.status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exhausted')) {
      console.log('Gemma 429 Resource Exhausted, sleeping 15 seconds...');
      await new Promise(r => setTimeout(r, 15000));
      return askGemma(prompt, useThinking, jsonMode, retryCount + 1, temperature);
    }
    
    if (err.response?.status === 500 || errorMessage.includes('500')) {
      console.log(`Gemma 500 Internal Error, backing off 15 seconds... (Retry ${retryCount})`);
      await new Promise(r => setTimeout(r, 15000));
      if (retryCount < 3) {
        return askGemma(prompt, useThinking, jsonMode, retryCount + 1, temperature);
      }
    }
    
    if (useThinking && retryCount < 2) {
      console.log('Gemma thinking mode failed, trying fallback...');
      return askGemma(prompt, false, jsonMode, retryCount + 1, temperature);
    }
    
    console.error('Gemma AI error:', err.response?.data || err.message);
    return '';
  }
}
