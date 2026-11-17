import { BANK_MATCHERS, BankDefinition } from './banks';
import {
  ADDRESS_STREET_TYPES,
  CODE_TRIGGER_KEYWORDS,
  NIGERIAN_CITIES_AREAS,
  REGEX_AMOUNT,
  REGEX_CHAT_TIMESTAMP,
  REGEX_EMAIL,
  REGEX_NIGERIAN_PHONE,
  REGEX_TIME_STANDALONE,
  REGEX_URL,
} from './rules';

export interface ExtractedEntity {
  type: 'account' | 'amount' | 'date' | 'address' | 'url' | 'code' | 'phone' | 'email';
  value: string;
  label: string | null;
  extra: string | null; // JSON string
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function formatIsoDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function extractDates(text: string, referenceTimestamp: number = Date.now()): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const refYear = new Date(referenceTimestamp).getFullYear();

  // 1. yyyy-mm-dd
  const isoRegex = /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = isoRegex.exec(text)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = formatIsoDate(year, month, day);
      results.push({
        type: 'date',
        value: iso,
        label: `${day}/${month}/${year}`,
        extra: JSON.stringify({ year, month, day }),
      });
    }
  }

  // 2. dd/mm/yyyy or dd-mm-yyyy (day-first)
  const dmyRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g;
  while ((match = dmyRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1990 && year <= 2100) {
      const iso = formatIsoDate(year, month, day);
      if (!results.some((r) => r.value === iso)) {
        results.push({
          type: 'date',
          value: iso,
          label: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
          extra: JSON.stringify({ year, month, day }),
        });
      }
    }
  }

  // 3. Named month formats: 12 Mar 2026, 12th March, Mar 12, 2026, Saturday, 14 March
  const monthNamePattern = Object.keys(MONTH_NAMES).join('|');
  const namedRegex = new RegExp(
    `(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,\\s]+)?` +
      `(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamePattern})|(${monthNamePattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?:[,\\s]+(\\d{4}))?`,
    'gi'
  );

  while ((match = namedRegex.exec(text)) !== null) {
    const dayStr = match[1] || match[4];
    const monthStr = (match[2] || match[3])?.toLowerCase();
    const yearStr = match[5];

    if (dayStr && monthStr && MONTH_NAMES[monthStr]) {
      const day = parseInt(dayStr, 10);
      const month = MONTH_NAMES[monthStr];
      const year = yearStr ? parseInt(yearStr, 10) : refYear;

      if (day >= 1 && day <= 31) {
        const iso = formatIsoDate(year, month, day);
        if (!results.some((r) => r.value === iso)) {
          results.push({
            type: 'date',
            value: iso,
            label: `${day} ${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} ${year}`,
            extra: JSON.stringify({ year, month, day }),
          });
        }
      }
    }
  }

  return results;
}

export function extractTimes(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const regex = new RegExp(REGEX_TIME_STANDALONE.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const val = match[0].trim();
    if (!results.some((r) => r.value.toLowerCase() === val.toLowerCase())) {
      results.push({
        type: 'date',
        value: val,
        label: val,
        extra: JSON.stringify({ isTime: true }),
      });
    }
  }

  return results;
}

export function extractAmounts(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const regex = new RegExp(REGEX_AMOUNT.source, 'gi');
  const lowerText = text.toLowerCase();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawSymbol = match[1];
    const numPart = match[2].replace(/,/g, '');
    const fullMatch = match[0];
    const matchIndex = match.index;

    let currency = 'NGN';
    let symbol = '₦';
    if (rawSymbol === '$') {
      currency = 'USD';
      symbol = '$';
    } else if (rawSymbol === '£') {
      currency = 'GBP';
      symbol = '£';
    } else if (rawSymbol === '€') {
      currency = 'EUR';
      symbol = '€';
    } else {
      currency = 'NGN';
      symbol = '₦';
    }

    const dotIdx = fullMatch.indexOf('.');
    const decimalPart = dotIdx !== -1 ? fullMatch.slice(dotIdx + 1, dotIdx + 3).padEnd(2, '0') : '00';
    const normalizedValue = `${numPart}.${decimalPart}`;

    const contextStart = Math.max(0, matchIndex - 80);
    const contextEnd = Math.min(lowerText.length, matchIndex + fullMatch.length + 80);
    const context = lowerText.slice(contextStart, contextEnd);

    let direction: 'in' | 'out' | 'unknown' = 'unknown';
    if (/\b(debit|sent|transfer to|paid|withdrawal|charge|outgoing)\b/i.test(context)) {
      direction = 'out';
    } else if (/\b(credit|received|from|deposit|refund|incoming)\b/i.test(context)) {
      direction = 'in';
    }

    const formattedAmount = `${symbol}${parseFloat(normalizedValue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    results.push({
      type: 'amount',
      value: normalizedValue,
      label: formattedAmount,
      extra: JSON.stringify({
        currency,
        symbol,
        direction,
      }),
    });
  }

  return results;
}

export function extractUrls(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const regex = new RegExp(REGEX_URL.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    let url = match[0].trim();
    url = url.replace(/[.,;:!?)]+$/, '');
    if (url.length < 4) continue;

    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    if (!results.some((r) => r.value === fullUrl)) {
      results.push({
        type: 'url',
        value: fullUrl,
        label: url,
        extra: null,
      });
    }
  }

  return results;
}

export function extractPhones(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const regex = new RegExp(REGEX_NIGERIAN_PHONE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    let normalized = raw;
    if (raw.startsWith('0')) {
      normalized = `+234${raw.slice(1)}`;
    }
    if (!results.some((r) => r.value === normalized)) {
      results.push({
        type: 'phone',
        value: normalized,
        label: normalized,
        extra: null,
      });
    }
  }

  return results;
}

export function extractEmails(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const regex = new RegExp(REGEX_EMAIL.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const email = match[0].trim();
    if (!results.some((r) => r.value.toLowerCase() === email.toLowerCase())) {
      results.push({
        type: 'email',
        value: email.toLowerCase(),
        label: email,
        extra: null,
      });
    }
  }

  return results;
}

export function extractCodes(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of CODE_TRIGGER_KEYWORDS) {
    let searchPos = 0;
    while (searchPos < lowerText.length) {
      const idx = lowerText.indexOf(keyword, searchPos);
      if (idx === -1) break;

      // Check within 30 characters before and after the keyword
      const windowStart = Math.max(0, idx - 30);
      const windowEnd = Math.min(text.length, idx + keyword.length + 30);
      const windowText = text.slice(windowStart, windowEnd);

      // Match 4-8 digit codes, or formatted like 123-456 or 123 456
      const codeRegex = /\b(\d{3,4})[\s-](\d{3,4})\b|\b\d{4,8}\b/g;
      let codeMatch: RegExpExecArray | null;
      while ((codeMatch = codeRegex.exec(windowText)) !== null) {
        let codeVal = codeMatch[0];
        if (codeMatch[1] && codeMatch[2]) {
          codeVal = `${codeMatch[1]}${codeMatch[2]}`;
        }

        // Exclude common 4-digit years (e.g. 1900-2099)
        const intVal = parseInt(codeVal, 10);
        if (codeVal.length === 4 && intVal >= 1900 && intVal <= 2099) {
          continue;
        }

        if (!results.some((r) => r.value === codeVal)) {
          results.push({
            type: 'code',
            value: codeVal,
            label: `Code: ${codeVal}`,
            extra: JSON.stringify({ keyword }),
          });
        }
      }

      searchPos = idx + keyword.length;
    }
  }

  return results;
}

export function extractAddresses(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const streetTypePattern = ADDRESS_STREET_TYPES.join('|');
  const cityPattern = NIGERIAN_CITIES_AREAS.join('|');

  const streetRegex = new RegExp(`(?:\\b(?:no\\.?\\s*)?\\d+[a-z]?\\b|plot\\s*\\d+).*?\\b(?:${streetTypePattern})\\b`, 'i');
  const cityRegex = new RegExp(`\\b(?:${cityPattern})\\b[.]?$`, 'i');
  const generalCityRegex = new RegExp(`\\b(?:${cityPattern})\\b`, 'i');
  const marketingExclusionRegex = /^(?:free\s+)?delivery\s+(?:in|to)|shipping\s+(?:in|to)|orders?\s+(?:in|to)|available\s+in/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (marketingExclusionRegex.test(line)) {
      continue;
    }

    const hasStreet = streetRegex.test(line);
    const hasCity = generalCityRegex.test(line);
    const endsWithCity = cityRegex.test(line);

    // To qualify as an address, it must have street type + number, plot number, or have city combined with street/road/area/number
    const hasAddressContext =
      hasStreet ||
      (/\bplot\s*\d+\b/i.test(line)) ||
      (hasCity && (/\b(?:no\\.?\\s*)?\\d+[a-z]?\\b/i.test(line) || new RegExp(`\\b(?:${streetTypePattern})\\b`, 'i').test(line) || line.includes(',')));

    if (hasAddressContext) {
      let combined = line;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (
          !marketingExclusionRegex.test(nextLine) &&
          (generalCityRegex.test(nextLine) || /^(?:near|opposite|behind|beside|off|estate|phase|lagos|nigeria)/i.test(nextLine))
        ) {
          combined = `${line}, ${nextLine}`;
          i++;
        }
      }

      if (!results.some((r) => r.value.toLowerCase() === combined.toLowerCase())) {
        results.push({
          type: 'address',
          value: combined,
          label: combined,
          extra: null,
        });
      }
    }
  }

  return results;
}

export function extractAccounts(text: string): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const phoneEntities = extractPhones(text);
  const phoneNumbersSet = new Set<string>();
  for (const p of phoneEntities) {
    phoneNumbersSet.add(p.value);
    phoneNumbersSet.add(`0${p.value.slice(4)}`);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Normalise digit runs with spaces/dashes (e.g. "012 345 6789" -> "0123456789")
    const collapsedLine = line.replace(/(\d)[\s-](\d)/g, '$1$2').replace(/(\d)[\s-](\d)/g, '$1$2');

    // NUBAN must be standalone 10 digits without surrounding alphanumeric characters
    const nubanRegex = /(?<![a-zA-Z0-9])\d{10}(?![a-zA-Z0-9])/g;
    let match: RegExpExecArray | null;

    while ((match = nubanRegex.exec(collapsedLine)) !== null) {
      const candidate = match[0];

      // Reject if part of 11-digit Nigerian phone (e.g. 08012345678)
      if (
        candidate.startsWith('070') ||
        candidate.startsWith('080') ||
        candidate.startsWith('081') ||
        candidate.startsWith('090') ||
        candidate.startsWith('091') ||
        candidate.startsWith('071')
      ) {
        continue;
      }
      if (phoneNumbersSet.has(`0${candidate}`) || phoneNumbersSet.has(`+234${candidate}`)) {
        continue;
      }

      // Reject if looks like date/timestamp (e.g. 2026031200)
      if (candidate.startsWith('202') && (candidate.endsWith('00') || candidate.length === 10)) {
        continue;
      }

      // Check nearby lines within 3 lines for Bank Name
      const contextLinesStart = Math.max(0, i - 3);
      const contextLinesEnd = Math.min(lines.length - 1, i + 3);
      let detectedBank: BankDefinition | null = null;

      for (let j = contextLinesStart; j <= contextLinesEnd; j++) {
        for (const matcher of BANK_MATCHERS) {
          if (matcher.regex.test(lines[j])) {
            detectedBank = matcher.bank;
            break;
          }
        }
        if (detectedBank) break;
      }

      // Check for Account Name
      let accountName: string | undefined;

      const nameKeyRegex = /(?:account\s*name|acct\s*name|name)\s*[:\-]?\s*([A-Za-z\s.'-]+)/i;
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
        const nameMatch = lines[j].match(nameKeyRegex);
        if (nameMatch && nameMatch[1]) {
          const trimmed = nameMatch[1].trim();
          if (trimmed.length > 2 && !/^(number|no|bank|moniepoint|gtbank|access)/i.test(trimmed)) {
            accountName = trimmed;
            break;
          }
        }
      }

      if (!accountName) {
        for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
          if (j === i) continue;
          const candidateLine = lines[j].trim();
          const words = candidateLine.split(/\s+/);
          if (
            words.length >= 2 &&
            words.length <= 4 &&
            /^[A-Z\s.'-]+$/.test(candidateLine) &&
            !/(bank|transfer|receipt|successful|debit|credit|account|pos|merchant|session)/i.test(candidateLine)
          ) {
            accountName = candidateLine;
            break;
          }
        }
      }

      const bankName = detectedBank ? detectedBank.canonicalName : null;
      let label = candidate;
      if (bankName && accountName) {
        label = `${bankName} · ${candidate} · ${accountName}`;
      } else if (bankName) {
        label = `${bankName} · ${candidate}`;
      } else if (accountName) {
        label = `${candidate} · ${accountName}`;
      }

      if (!results.some((r) => r.value === candidate)) {
        results.push({
          type: 'account',
          value: candidate,
          label,
          extra: JSON.stringify({
            bank: bankName,
            accountName,
          }),
        });
      }
    }
  }

  return results;
}

export function extractAllEntities(text: string, referenceTimestamp: number = Date.now()): ExtractedEntity[] {
  const accounts = extractAccounts(text);
  const amounts = extractAmounts(text);
  const dates = extractDates(text, referenceTimestamp);
  const urls = extractUrls(text);
  const codes = extractCodes(text);
  const phones = extractPhones(text);
  const emails = extractEmails(text);
  const addresses = extractAddresses(text);

  return [
    ...accounts,
    ...amounts,
    ...dates,
    ...urls,
    ...codes,
    ...phones,
    ...emails,
    ...addresses,
  ];
}
