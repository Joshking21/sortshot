import { CategoryId } from '../db/schema';

export interface CategoryRuleConfig {
  id: CategoryId;
  name: string;
  threshold: number;
}

export const CATEGORY_ORDER: CategoryId[] = [
  'bank_details',
  'receipt',
  'chat',
  'event',
  'address',
  'link',
  'code',
  'id_document',
  'shopping',
];

export const CATEGORY_THRESHOLDS: Record<CategoryId, number> = {
  bank_details: 4,
  receipt: 4,
  chat: 4,
  event: 4,
  address: 4,
  link: 3,
  code: 4,
  id_document: 4,
  shopping: 4,
  other: 0,
  little_text: 0,
};

export const BANK_DETAILS_KEYWORDS = [
  'account name',
  'account number',
  'acc no',
  'acct no',
  'acct',
  'bank',
] as const;

export const RECEIPT_KEYWORDS = [
  'transfer successful',
  'transaction successful',
  'payment successful',
  'debit',
  'credit',
  'receipt',
  'reference',
  'ref',
  'session id',
  'beneficiary',
  'narration',
  'transaction id',
  'sent',
  'received',
  'paid',
] as const;

export const CHAT_KEYWORDS = [
  'online',
  'typing',
  'last seen',
  'type a message',
  'message',
  'reply',
  'forwarded',
  'you deleted this message',
] as const;

export const EVENT_KEYWORDS = [
  'venue',
  'rsvp',
  'date:',
  'time:',
  'join us',
  'tickets',
  'starts',
  'register',
  'location',
  'dress code',
] as const;

export const NIGERIAN_CITIES_AREAS = [
  'lagos',
  'lekki',
  'ikeja',
  'yaba',
  'surulere',
  'ajah',
  'vi',
  'victoria island',
  'ikoyi',
  'abuja',
  'wuse',
  'garki',
  'maitama',
  'gwarinpa',
  'port harcourt',
  'ph',
  'ibadan',
  'enugu',
  'kano',
  'benin',
  'owerri',
  'uyo',
  'abeokuta',
  'warri',
  'kaduna',
  'jos',
  'ilorin',
] as const;

export const ADDRESS_STREET_TYPES = [
  'street',
  'st',
  'road',
  'rd',
  'avenue',
  'ave',
  'close',
  'crescent',
  'cres',
  'way',
  'drive',
  'lane',
  'estate',
  'layout',
  'junction',
  'plaza',
  'quarters',
] as const;

export const CODE_TRIGGER_KEYWORDS = [
  'otp',
  'code',
  'verification',
  'verify',
  'pin',
  'password',
  'token',
] as const;

export const ID_DOCUMENT_KEYWORDS = [
  'nin',
  'bvn',
  'national identity',
  'passport',
  "driver's licence",
  'drivers licence',
  'driver licence',
  'voter',
  'date of birth',
] as const;

export const SHOPPING_KEYWORDS = [
  'add to cart',
  'buy now',
  'in stock',
  'order',
  'delivery',
  'checkout',
  'price',
  'size',
  'colour',
  'color',
] as const;

// Common regexes for entity extraction
export const REGEX_URL = /(?:https?:\/\/[^\s/$.?#].[^\s]*)|(?:\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|ng|com\.ng|org|net|io|app|co|me|ly)(?:\/[^\s]*)?\b)/gi;

export const REGEX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export const REGEX_NIGERIAN_PHONE = /(?:\+234|0)[789][01]\d{8}\b/g;

export const REGEX_AMOUNT = /(₦|NGN|N|\$|£|€)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\b/gi;

export const REGEX_CHAT_TIMESTAMP = /\b([01]?\d|2[0-3]):[0-5]\d(?:\s?(?:am|pm))?\b/gi;

export const REGEX_TIME_STANDALONE = /\b(?:([01]?\d|2[0-3]):[0-5]\d(?:\s?(?:am|pm))?|\d{1,2}\s?(?:am|pm))\b/gi;
