import { classifyText, generateTextSignature } from '../src/classify/classify';
import { TEST_FIXTURES } from './fixtures';

describe('Classifier Engine', () => {
  describe('42 Realistic Test Fixtures', () => {
    TEST_FIXTURES.forEach((fixture) => {
      it(`correctly classifies "${fixture.name}" (${fixture.id})`, () => {
        const result = classifyText(fixture.text);

        // Check primary category
        expect(result.primary).toBe(fixture.expectedPrimary);

        // Check that all expected categories are present
        for (const cat of fixture.expectedCatsContain) {
          expect(result.cats).toContain(cat);
        }

        // Check sensitivity flag
        expect(result.sensitive).toBe(fixture.expectedSensitive);
      });
    });
  });

  describe('Fallback behavior', () => {
    it('returns little_text for texts with length < 25 and no matched category', () => {
      const result = classifyText('Just a random word.');
      expect(result.primary).toBe('little_text');
      expect(result.sensitive).toBe(false);
    });

    it('returns other for texts with length >= 25 and no matched category', () => {
      const result = classifyText('This is a longer paragraph that does not contain any sensitive numbers or special words.');
      expect(result.primary).toBe('other');
      expect(result.sensitive).toBe(false);
    });
  });

  describe('Text Signature generation', () => {
    it('normalizes text by lowercasing and stripping whitespace/punctuation', () => {
      const sig1 = generateTextSignature('Hello, World! 123');
      const sig2 = generateTextSignature('hello world 123');
      expect(sig1).toBe('helloworld123');
      expect(sig1).toBe(sig2);
    });

    it('truncates at 400 characters', () => {
      const longText = 'a'.repeat(500);
      const sig = generateTextSignature(longText);
      expect(sig.length).toBe(400);
    });
  });

  describe('Sensitivity Logic', () => {
    it('marks bank_details, code, and id_document as sensitive', () => {
      const bankResult = classifyText('Bank: GTBank\nAccount Number: 0123456789\nAccount Name: ABIOLA');
      expect(bankResult.sensitive).toBe(true);

      const codeResult = classifyText('Your verification code is 849201. Never share this code.');
      expect(codeResult.sensitive).toBe(true);

      const idResult = classifyText('National Identity Management Commission\nNIN: 92837162534\nDate of birth: 12/03/1990');
      expect(idResult.sensitive).toBe(true);
    });

    it('does not mark normal receipts or events as sensitive', () => {
      const receiptResult = classifyText('Transaction Receipt\nTransfer Successful\nAmount: ₦5,000.00\nDate: 12/03/2026');
      expect(receiptResult.sensitive).toBe(false);
    });
  });
});
