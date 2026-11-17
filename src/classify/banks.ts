export interface BankDefinition {
  canonicalName: string;
  aliases: string[];
}

export const NIGERIAN_BANKS: BankDefinition[] = [
  { canonicalName: 'Access Bank', aliases: ['access', 'access bank', 'accessbank', 'diamond', 'diamond bank'] },
  { canonicalName: 'GTBank', aliases: ['gtbank', 'gtb', 'guaranty trust', 'guaranty trust bank', 'gtco'] },
  { canonicalName: 'Zenith Bank', aliases: ['zenith', 'zenith bank'] },
  { canonicalName: 'First Bank', aliases: ['first bank', 'firstbank', 'fbn', 'first bank of nigeria'] },
  { canonicalName: 'UBA', aliases: ['uba', 'united bank for africa'] },
  { canonicalName: 'Fidelity Bank', aliases: ['fidelity', 'fidelity bank'] },
  { canonicalName: 'FCMB', aliases: ['fcmb', 'first city monument bank'] },
  { canonicalName: 'Union Bank', aliases: ['union bank', 'unionbank'] },
  { canonicalName: 'Sterling Bank', aliases: ['sterling', 'sterling bank'] },
  { canonicalName: 'Stanbic IBTC', aliases: ['stanbic', 'stanbic ibtc', 'stanbic bank'] },
  { canonicalName: 'Wema Bank', aliases: ['wema', 'wema bank', 'alat', 'alat by wema'] },
  { canonicalName: 'Ecobank', aliases: ['ecobank', 'eco bank'] },
  { canonicalName: 'Polaris Bank', aliases: ['polaris', 'polaris bank', 'skye bank'] },
  { canonicalName: 'Keystone Bank', aliases: ['keystone', 'keystone bank'] },
  { canonicalName: 'Unity Bank', aliases: ['unity', 'unity bank'] },
  { canonicalName: 'Providus Bank', aliases: ['providus', 'providus bank', 'providusbank'] },
  { canonicalName: 'Jaiz Bank', aliases: ['jaiz', 'jaiz bank'] },
  { canonicalName: 'Globus Bank', aliases: ['globus', 'globus bank'] },
  { canonicalName: 'Titan Trust Bank', aliases: ['titan trust', 'titan trust bank', 'titan bank'] },
  { canonicalName: 'Premium Trust Bank', aliases: ['premium trust', 'premium trust bank'] },
  { canonicalName: 'Parallex Bank', aliases: ['parallex', 'parallex bank'] },
  { canonicalName: 'Optimus Bank', aliases: ['optimus', 'optimus bank'] },
  { canonicalName: 'SunTrust Bank', aliases: ['suntrust', 'suntrust bank'] },
  { canonicalName: 'Lotus Bank', aliases: ['lotus', 'lotus bank'] },
  { canonicalName: 'Taj Bank', aliases: ['taj', 'taj bank', 'tajbank'] },
  { canonicalName: 'Kuda Bank', aliases: ['kuda', 'kuda bank', 'kuda microfinance'] },
  { canonicalName: 'OPay', aliases: ['opay', 'paycom'] },
  { canonicalName: 'PalmPay', aliases: ['palmpay', 'palm pay'] },
  { canonicalName: 'Moniepoint', aliases: ['moniepoint', 'monie point', 'teamapt'] },
  { canonicalName: 'Carbon', aliases: ['carbon', 'one finance'] },
  { canonicalName: 'VFD Microfinance Bank', aliases: ['vfd', 'vfd bank', 'vfd mfb'] },
  { canonicalName: 'FairMoney', aliases: ['fairmoney', 'fair money', 'fairmoney mfb'] },
  { canonicalName: 'Paga', aliases: ['paga'] },
  { canonicalName: 'Raven', aliases: ['raven', 'raven bank'] },
  { canonicalName: 'Sparkle', aliases: ['sparkle', 'sparkle bank'] },
];

// Helper to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compiled regexes for bank matching
export const BANK_MATCHERS = NIGERIAN_BANKS.map((b) => {
  // Sort aliases by length descending so longer phrases match first
  const sorted = [...b.aliases].sort((a, c) => c.length - a.length);
  const pattern = sorted.map(escapeRegex).join('|');
  return {
    bank: b,
    regex: new RegExp(`\\b(${pattern})\\b`, 'i'),
  };
});

export function findBankInText(text: string): BankDefinition | null {
  for (const matcher of BANK_MATCHERS) {
    if (matcher.regex.test(text)) {
      return matcher.bank;
    }
  }
  return null;
}
