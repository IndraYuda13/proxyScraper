import { runScraperCycle } from './src/lib/scraper';

async function main() {
  while (true) {
    try {
      await runScraperCycle();
    } catch (e) {
      console.error('Error in scraper cycle:', e);
    }
    console.log('Sleeping for 3 hours before next cycle...');
    await new Promise(resolve => setTimeout(resolve, 10800000));
  }
}

main();
