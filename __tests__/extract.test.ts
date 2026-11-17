import {
  extractAccounts,
  extractAddresses,
  extractAllEntities,
  extractAmounts,
  extractCodes,
  extractDates,
  extractEmails,
  extractPhones,
  extractUrls,
} from '../src/classify/extract';
import { TEST_FIXTURES } from './fixtures';

describe('Entity Extraction Engine', () => {
  describe('Account Extractor (NUBAN)', () => {
    it('extracts 10-digit NUBAN with bank and account name', () => {
      const text = `GTBank
0123456789
Account Name: EBUKA OKONKWO`;
      const accounts = extractAccounts(text);
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0].value).toBe('0123456789');
      expect(accounts[0].label).toContain('GTBank');
      expect(accounts[0].label).toContain('0123456789');
      expect(accounts[0].label).toContain('EBUKA OKONKWO');
    });

    it('handles account numbers with spaces or dashes', () => {
      const text = `Access Bank
012 345 6789
KAYODE ADAMS`;
      const accounts = extractAccounts(text);
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0].value).toBe('0123456789');
      expect(accounts[0].label).toContain('Access Bank');
    });

    it('rejects 11-digit Nigerian phone numbers', () => {
      const text = `Call me on 08031234567 for inquiries. No account here.`;
      const accounts = extractAccounts(text);
      expect(accounts.length).toBe(0);
    });
  });

  describe('Amount Extractor', () => {
    it('extracts Naira amount and detects debit (out) direction', () => {
      const text = `Debit Alert
You have sent ₦50,000.00 to TUNDE
Transfer successful`;
      const amounts = extractAmounts(text);
      expect(amounts.length).toBe(1);
      expect(amounts[0].value).toBe('50000.00');
      const extra = JSON.parse(amounts[0].extra || '{}');
      expect(extra.currency).toBe('NGN');
      expect(extra.direction).toBe('out');
    });

    it('extracts amount with NGN prefix and detects credit (in) direction', () => {
      const text = `Your account has been credited with NGN 125,500.50 received from APEX VENTURES`;
      const amounts = extractAmounts(text);
      expect(amounts.length).toBe(1);
      expect(amounts[0].value).toBe('125500.50');
      const extra = JSON.parse(amounts[0].extra || '{}');
      expect(extra.direction).toBe('in');
    });

    it('extracts USD, EUR, and GBP amounts', () => {
      const text = `Invoiced $250.00, converted from £200.00 and €230.00`;
      const amounts = extractAmounts(text);
      expect(amounts.length).toBe(3);
      expect(amounts.some((a) => a.value === '250.00')).toBe(true);
      expect(amounts.some((a) => a.value === '200.00')).toBe(true);
      expect(amounts.some((a) => a.value === '230.00')).toBe(true);
    });
  });

  describe('Date Extractor', () => {
    it('extracts day-first numeric dates (Nigeria standard)', () => {
      const text = `Transaction occurred on 14/08/2026 at the terminal`;
      const dates = extractDates(text);
      expect(dates.length).toBe(1);
      expect(dates[0].value).toBe('2026-08-14');
    });

    it('extracts named month formats', () => {
      const text = `Join us on Saturday, 14 March 2026 for the celebration`;
      const dates = extractDates(text);
      expect(dates.length).toBe(1);
      expect(dates[0].value).toBe('2026-03-14');
    });
  });

  describe('Address Extractor', () => {
    it('extracts Nigerian street and city addresses', () => {
      const text = `Come over to 14 Admiralty Way, Lekki Phase 1, Lagos for the meeting.`;
      const addresses = extractAddresses(text);
      expect(addresses.length).toBe(1);
      expect(addresses[0].value).toContain('Admiralty Way');
      expect(addresses[0].value).toContain('Lekki');
    });

    it('extracts Plot numbers in Abuja', () => {
      const text = `Office location: Plot 502 Constitution Avenue, Central Business District, Abuja`;
      const addresses = extractAddresses(text);
      expect(addresses.length).toBe(1);
      expect(addresses[0].value).toContain('Plot 502');
    });
  });

  describe('URL Extractor', () => {
    it('extracts full https URLs and bare domains', () => {
      const text = `Check https://expo.dev and github.com/expo for updates.`;
      const urls = extractUrls(text);
      expect(urls.length).toBe(2);
      expect(urls.some((u) => u.value === 'https://expo.dev')).toBe(true);
      expect(urls.some((u) => u.value.includes('github.com'))).toBe(true);
    });
  });

  describe('Code / OTP Extractor', () => {
    it('extracts 4-8 digit code when near trigger words', () => {
      const text = `Your OTP code is 492019. Never share this with anyone.`;
      const codes = extractCodes(text);
      expect(codes.length).toBe(1);
      expect(codes[0].value).toBe('492019');
    });

    it('ignores calendar years like 2026 as codes', () => {
      const text = `The code is 884123 for conference year 2026`;
      const codes = extractCodes(text);
      expect(codes.length).toBe(1);
      expect(codes[0].value).toBe('884123');
    });
  });

  describe('Phone Extractor', () => {
    it('normalizes Nigerian 0-leading numbers to +234 format', () => {
      const text = `Contact the rider at 08034567890`;
      const phones = extractPhones(text);
      expect(phones.length).toBe(1);
      expect(phones[0].value).toBe('+2348034567890');
    });

    it('keeps +234 formatted numbers', () => {
      const text = `WhatsApp me on +2349012345678`;
      const phones = extractPhones(text);
      expect(phones.length).toBe(1);
      expect(phones[0].value).toBe('+2349012345678');
    });
  });

  describe('Email Extractor', () => {
    it('extracts valid email addresses', () => {
      const text = `Send receipts to billing@sortshot.app or support@example.com`;
      const emails = extractEmails(text);
      expect(emails.length).toBe(2);
      expect(emails[0].value).toBe('billing@sortshot.app');
      expect(emails[1].value).toBe('support@example.com');
    });
  });

  describe('Fixtures Entity Check', () => {
    TEST_FIXTURES.forEach((fixture) => {
      if (fixture.expectedEntitiesCheck) {
        it(`extracts expected entities for "${fixture.name}"`, () => {
          const entities = extractAllEntities(fixture.text);
          const check = fixture.expectedEntitiesCheck;

          if (check?.hasAccount) {
            expect(entities.some((e) => e.type === 'account')).toBe(true);
          }
          if (check?.hasAmount) {
            expect(entities.some((e) => e.type === 'amount')).toBe(true);
          }
          if (check?.hasDate) {
            expect(entities.some((e) => e.type === 'date')).toBe(true);
          }
          if (check?.hasUrl) {
            expect(entities.some((e) => e.type === 'url')).toBe(true);
          }
          if (check?.hasCode) {
            expect(entities.some((e) => e.type === 'code')).toBe(true);
          }
          if (check?.hasPhone) {
            expect(entities.some((e) => e.type === 'phone')).toBe(true);
          }
          if (check?.hasAddress) {
            expect(entities.some((e) => e.type === 'address')).toBe(true);
          }
        });
      }
    });
  });
});
