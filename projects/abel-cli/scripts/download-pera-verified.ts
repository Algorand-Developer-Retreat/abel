import fs from 'fs';
import { sleep } from '../src/lib/util';

const outputFilename = process.argv[2] ?? "./data/verified.json";

const defaultUrl = 'https://api.perawallet.app/v1/assets/?status=verified';
async function downloadList(url = defaultUrl, i = 1) {
  console.log('Fetching', i, url);
  const resp = await fetch(url);
  const data = await resp.json();
  const { results, next } = data;
  if (next) {
    await sleep(1000);
    return [...results, ...(await downloadList(next, i+1))];
  }
  return results;
}

const verified = await downloadList();
console.log("Got", verified.length, "pera verified items");
fs.writeFileSync(outputFilename, JSON.stringify(verified));
