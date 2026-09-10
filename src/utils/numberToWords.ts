/**
 * Converts a numerical amount in Indian Rupees to words for official Krishi Seva Kendra invoices.
 */
export function numberToWordsRupees(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertLessThanOneThousand(num: number): string {
    let current = '';
    if (num >= 100) {
      current += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      current += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      current += ones[num] + ' ';
    }
    return current.trim();
  }

  const rounded = Math.floor(Math.abs(amount));
  let result = '';

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanOneThousand(remainder);
  }

  const trimmed = result.trim();
  return trimmed ? `${trimmed} Rupees Only` : 'Zero Rupees Only';
}
