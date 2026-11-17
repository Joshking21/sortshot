import { CategoryId } from '../db/schema';
import { BANK_MATCHERS } from './banks';
import {
  extractAccounts,
  extractAddresses,
  extractAllEntities,
  extractAmounts,
  extractCodes,
  extractDates,
  extractTimes,
  extractUrls,
  ExtractedEntity,
} from './extract';
import {
  BANK_DETAILS_KEYWORDS,
  CATEGORY_ORDER,
  CATEGORY_THRESHOLDS,
  CHAT_KEYWORDS,
  EVENT_KEYWORDS,
  ID_DOCUMENT_KEYWORDS,
  NIGERIAN_CITIES_AREAS,
  REGEX_CHAT_TIMESTAMP,
  RECEIPT_KEYWORDS,
  SHOPPING_KEYWORDS,
} from './rules';

export interface ClassificationResult {
  primary: CategoryId;
  cats: CategoryId[];
  sensitive: boolean;
  entities: ExtractedEntity[];
  scores: Record<CategoryId, number>;
}

export function generateTextSignature(text: string): string {
  // Lower-case text, digits kept, all whitespace and punctuation removed, first 400 characters
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 400);
}

export function classifyText(text: string, referenceTimestamp: number = Date.now()): ClassificationResult {
  const trimmed = text.trim();
  const textLen = trimmed.length;

  const entities = extractAllEntities(text, referenceTimestamp);
  const lowerText = text.toLowerCase().replace(/\s+/g, ' ');

  const scores: Record<CategoryId, number> = {
    bank_details: 0,
    receipt: 0,
    chat: 0,
    event: 0,
    address: 0,
    link: 0,
    code: 0,
    id_document: 0,
    shopping: 0,
    other: 0,
    little_text: 0,
  };

  // 1. bank_details
  const accounts = entities.filter((e) => e.type === 'account');
  if (accounts.length > 0) {
    scores.bank_details += 3;
  }
  const hasBankName = BANK_MATCHERS.some((m) => m.regex.test(text));
  if (hasBankName) {
    scores.bank_details += 2;
  }
  let bankKwPoints = 0;
  for (const kw of BANK_DETAILS_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      bankKwPoints += 1;
      if (bankKwPoints >= 2) break;
    }
  }
  scores.bank_details += bankKwPoints;

  // 2. receipt
  const amounts = entities.filter((e) => e.type === 'amount');
  if (amounts.length > 0) {
    scores.receipt += 2;
  }
  let receiptKwPoints = 0;
  for (const kw of RECEIPT_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      receiptKwPoints += 1;
      if (receiptKwPoints >= 4) break;
    }
  }
  scores.receipt += receiptKwPoints;
  const dates = entities.filter((e) => e.type === 'date');
  if (dates.length > 0) {
    scores.receipt += 1;
  }

  // 3. chat
  const chatTimestampMatches = text.match(REGEX_CHAT_TIMESTAMP) || [];
  if (chatTimestampMatches.length >= 3) {
    scores.chat += 3;
  }
  let chatKwPoints = 0;
  for (const kw of CHAT_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      chatKwPoints += 1;
      if (chatKwPoints >= 3) break;
    }
  }
  scores.chat += chatKwPoints;

  // 4. event
  if (dates.length > 0) {
    scores.event += 2;
  }
  const times = extractTimes(text);
  if (times.length > 0 || chatTimestampMatches.length > 0) {
    scores.event += 1;
  }
  let eventKwPoints = 0;
  for (const kw of EVENT_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      eventKwPoints += 1;
      if (eventKwPoints >= 3) break;
    }
  }
  scores.event += eventKwPoints;

  // 5. address
  const addresses = entities.filter((e) => e.type === 'address');
  if (addresses.length > 0) {
    scores.address += 4;
  }
  const hasAreaOrCity = NIGERIAN_CITIES_AREAS.some((city) =>
    new RegExp(`\\b${city}\\b`, 'i').test(text)
  );
  if (hasAreaOrCity) {
    scores.address += 1;
  }

  // 6. link
  const urls = entities.filter((e) => e.type === 'url');
  if (urls.length > 0) {
    scores.link += 3;
  }

  // 7. code
  const codes = entities.filter((e) => e.type === 'code');
  if (codes.length > 0) {
    scores.code += 4;
  }

  // 8. id_document
  let idDocPoints = 0;
  for (const kw of ID_DOCUMENT_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      idDocPoints += 2;
      if (idDocPoints >= 4) break;
    }
  }
  scores.id_document += idDocPoints;

  // 9. shopping
  if (amounts.length > 0) {
    scores.shopping += 1;
  }
  let shoppingKwPoints = 0;
  for (const kw of SHOPPING_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(text)) {
      shoppingKwPoints += 1;
      if (shoppingKwPoints >= 4) break;
    }
  }
  scores.shopping += shoppingKwPoints;

  // Evaluate matching categories
  const matchingCats: CategoryId[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (scores[cat] >= CATEGORY_THRESHOLDS[cat]) {
      matchingCats.push(cat);
    }
  }

  // Sort matching categories best first (highest score, ties broken by CATEGORY_ORDER index)
  matchingCats.sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
  });

  let primary: CategoryId;
  if (matchingCats.length > 0) {
    primary = matchingCats[0];
  } else {
    primary = textLen < 25 ? 'little_text' : 'other';
    matchingCats.push(primary);
  }

  const sensitive =
    matchingCats.includes('bank_details') ||
    matchingCats.includes('code') ||
    matchingCats.includes('id_document');

  return {
    primary,
    cats: matchingCats,
    sensitive,
    entities,
    scores,
  };
}
