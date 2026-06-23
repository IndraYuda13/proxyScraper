import axios from 'axios';
import * as cheerio from 'cheerio';
import { askGemma } from './ai';
import { ProxyItem, checkAndSaveProxies } from './checker';
import { updateStatus, getStatus, updateSourceStat, logMessage } from './db';

const SEARXNG_ENDPOINT = 'https://9router.indrayuda.my.id/v1/search';
const SEARXNG_KEY = 'sk-68b631cc8464b3ed-tbnd2g-cc2ff8e3';

async function checkStopSignal(): Promise<boolean> {
  const status = await getStatus();
  return !!status?.should_stop;
}

function cleanJsonString(str: string): string {
  const match = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : str;
}

async function generateQueries(): Promise<string[]> {
  await logMessage('Requesting AI (Gemma) to generate search queries...', 'info');
  const prompt = `You are a system query generator. Output exactly 12 search engine queries to find active public proxy list URLs (HTTP, HTTPS, SOCKS4, SOCKS5). Make them highly diverse, unusual, and unique. You MUST return JSON with the key "queries" containing an array of strings. Follow this schema:
{"queries": ["query 1", "query 2", ...]}
Do not include any explanation or markdown formatting in your response. Output raw JSON object only.`;
  
  const response = await askGemma(prompt, true, true, 0, 0.9);
  try {
    const data = JSON.parse(cleanJsonString(response));
    if (data && Array.isArray(data.queries)) {
      const queries = data.queries.slice(0, 15);
      await logMessage(`Successfully generated ${queries.length} search queries via AI.`, 'info');
      return queries;
    }
  } catch (e) {
    await logMessage('Failed to parse AI query response. Falling back to default query list.', 'warn');
  }
  
  return [
    'free proxy list country',
    'fresh socks5 proxy list txt',
    'http proxy list github public',
    'daily updated free proxy list table',
    'free proxy list speed fast anonymous',
    'public proxy server list free',
    'socks4 proxy port 1080 list',
    'http proxy port 8080 list daily',
    'elite high anonymity proxy list',
    'working proxies direct list download'
  ];
}

async function searchProxyUrls(): Promise<string[]> {
  await updateStatus({ current_step: 'Generating Search Queries via AI...' });
  const queries = await generateQueries();
  
  await updateStatus({ current_step: 'Web Search: Collecting URLs via SearXNG...' });
  const urls: Set<string> = new Set();
  let searchCount = 0;
  
  await logMessage(`Starting SearXNG search loop with ${queries.length} queries...`, 'info');
  for (const q of queries) {
    if (await checkStopSignal()) {
      await logMessage('Stop signal detected during search phase. Exiting loop.', 'warn');
      break;
    }
    try {
      const res = await axios.post(SEARXNG_ENDPOINT, {
        model: 'searxng',
        query: q,
        search_type: 'web',
        max_results: 5
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SEARXNG_KEY}`
        },
        timeout: 10000
      });

      const results = res.data?.results || [];
      for (const item of results) {
        if (item.url && item.url.startsWith('http')) {
          urls.add(item.url);
        }
      }
    } catch (e: any) {
      await logMessage(`SearXNG search failed for query "${q}": ${e.response?.data || e.message}`, 'error');
    }
    searchCount++;
    await updateStatus({ scanned_urls: urls.size, current_step: `Web Search: SearXNG ${searchCount}/${queries.length} queries` });
  }

  await logMessage(`SearXNG web search completed. Collected ${urls.size} unique URLs.`, 'info');

  const defaultFallbacks = [
    'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
    'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt',
    'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/proxy.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',
    'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
    'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt'
  ];
  
  await logMessage(`Injecting ${defaultFallbacks.length} default fallback curated source URLs...`, 'info');
  defaultFallbacks.forEach(url => urls.add(url));
  return Array.from(urls);
}

export async function scrapeSource(url: string): Promise<ProxyItem[]> {
  if (await checkStopSignal()) return [];
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const htmlContent = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const parsedProxies: ProxyItem[] = [];

    // 1. Regex Match for raw IP:Port lists
    const ipPortRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b:[0-9]{2,5}/g;
    const matches = htmlContent.match(ipPortRegex);
    if (matches && matches.length > 5 && !htmlContent.includes('<html') && !htmlContent.includes('<HTML')) {
      for (const item of matches) {
        const parts = item.split(':');
        const ip = parts[0].trim();
        const port = parts[1].trim();
        let protocol = 'http';
        if (url.toLowerCase().includes('socks5')) protocol = 'socks5';
        else if (url.toLowerCase().includes('socks4')) protocol = 'socks4';
        else if (url.toLowerCase().includes('https')) protocol = 'https';
        parsedProxies.push({ ip, port, protocol, source: url });
      }
      await updateSourceStat(url, parsedProxies.length, 0);
      await logMessage(`Regex Scraped: Found ${parsedProxies.length} proxies from raw text source: ${url}`, 'info');
      return parsedProxies;
    }

    // 2. AI Extract for HTML pages (only if AI is enabled)
    const status = await getStatus();
    const aiEnabled = status?.ai_enabled !== undefined ? !!status.ai_enabled : true;
    
    if (aiEnabled) {
      const $ = cheerio.load(htmlContent);
      const textData = $('body').text().slice(0, 8000);
      
      const prompt = `Analyze this text content of a proxy website. Find the proxies and extract them into a JSON array of objects.
Response MUST be a JSON object with this key:
{"proxies": [{"ip": "...", "port": "...", "protocol": "http|https|socks4|socks5"}]}
Text content:
${textData}`;

      const aiResponse = await askGemma(prompt, true, true, 0, 0.1);
      try {
        const data = JSON.parse(cleanJsonString(aiResponse));
        if (data && Array.isArray(data.proxies)) {
          const extracted = data.proxies.map((item: any) => ({
            ip: item.ip,
            port: item.port,
            protocol: item.protocol || 'http',
            source: url
          }));
          await updateSourceStat(url, extracted.length, 0);
          await logMessage(`AI Scraped: Extracted ${extracted.length} proxies from HTML source: ${url}`, 'info');
          return extracted;
        }
      } catch (e: any) {
        // AI extraction parsed failed
      }
    }

    await updateSourceStat(url, parsedProxies.length, 0);
    return parsedProxies;

  } catch (err: any) {
    await updateSourceStat(url, 0, 0);
    await logMessage(`Failed to scrape source ${url}: ${err.message}`, 'warn');
  }

  return [];
}

export async function runScraperCycle() {
  await logMessage('=== Starting Scraper and Checker Cycle ===', 'info');
  await updateStatus({ is_running: true, should_stop: false, scanned_urls: 0, proxies_found: 0, verified_live: 0, current_step: 'Starting Web Search' });
  
  const urls = await searchProxyUrls();
  if (await checkStopSignal()) {
    await updateStatus({ current_step: 'Idle', is_running: false, should_stop: false });
    return;
  }
  
  let totalRawFound = 0;
  let currentProgress = 0;
  
  await logMessage(`Starting parallel scraping of ${urls.length} sources...`, 'info');
  const concurrency = 15;
  for (let i = 0; i < urls.length; i += concurrency) {
    if (await checkStopSignal()) {
      await logMessage('Stop signal detected during scraping phase. Aborting.', 'warn');
      break;
    }
    const chunk = urls.slice(i, i + concurrency);
    let chunkProxies: ProxyItem[] = [];
    
    await Promise.all(chunk.map(async (url) => {
      try {
        const list = await scrapeSource(url);
        chunkProxies = chunkProxies.concat(list);
      } catch (err) {
      }
    }));

    totalRawFound += chunkProxies.length;
    currentProgress += chunk.length;
    
    await updateStatus({ 
      scanned_urls: currentProgress, 
      current_step: `Smart Extraction: Scraping ${currentProgress}/${urls.length} sources`,
      proxies_found: totalRawFound 
    });

    if (chunkProxies.length > 0 && !(await checkStopSignal())) {
      await logMessage(`Scraped chunk ${Math.floor(i/concurrency)+1}. Found ${chunkProxies.length} raw proxies. Checking and saving immediately...`, 'info');
      await checkAndSaveProxies(chunkProxies);
    }
  }

  await logMessage(`Scraper cycle finished. Total raw proxies processed: ${totalRawFound}`, 'info');
  
  await updateStatus({ current_step: 'Idle', is_running: false, should_stop: false });
  await logMessage('=== Scraper Cycle Finished successfully ===', 'info');
}
