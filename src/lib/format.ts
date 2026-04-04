/**
 * Format number with English numerals and 2 decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(num: number, decimals: number = 2): string {
  // Handle NaN or undefined
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00';
  }
  
  // Format with English numerals and specified decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency with symbol
 * @param num - The number to format
 * @param symbol - Currency symbol
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(num: number, symbol: string = '', decimals: number = 2): string {
  const formatted = formatNumber(num, decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format date in Arabic locale
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate fees based on type
 * @param amount - Base amount
 * @param feesType - Type of fees calculation
 * @param feesAmount - Fees amount/value
 * @returns Calculated fees value
 */
export function calculateFees(
  amount: number,
  feesType: 'FIXED' | 'PERCENTAGE' | 'PER_THOUSAND',
  feesAmount: number
): number {
  switch (feesType) {
    case 'FIXED':
      return feesAmount;
    case 'PERCENTAGE':
      return (amount * feesAmount) / 100;
    case 'PER_THOUSAND':
      return (amount * feesAmount) / 1000;
    default:
      return 0;
  }
}

/**
 * Calculate final balance for a transaction
 * @param amount - Base amount
 * @param conversionFactor - Conversion factor
 * @param conversionMethod - Multiply or Divide
 * @param feesType - Type of fees
 * @param feesAmount - Fees amount
 * @param feesDirection - Income or Expense
 * @param transactionType - Transaction type (INCOME or EXPENSE)
 * @returns Final balance
 */
export function calculateFinalBalance(
  amount: number,
  conversionFactor: number,
  conversionMethod: 'MULTIPLY' | 'DIVIDE',
  feesType: 'FIXED' | 'PERCENTAGE' | 'PER_THOUSAND',
  feesAmount: number,
  feesDirection: 'INCOME' | 'EXPENSE',
  transactionType: 'INCOME' | 'EXPENSE' = 'INCOME'
): { convertedAmount: number; feesValue: number; finalBalance: number } {
  // Apply conversion
  let convertedAmount = amount;
  if (conversionMethod === 'MULTIPLY') {
    convertedAmount = amount * conversionFactor;
  } else {
    convertedAmount = amount / conversionFactor;
  }
  
  // Calculate fees
  const feesValue = calculateFees(convertedAmount, feesType, feesAmount);
  
  // Apply fees direction
  // منطق الأجور:
  // إذا تطابق اتجاه الحركة مع اتجاه الأجور = زيادة في المبلغ النهائي
  // إذا اختلف اتجاه الحركة عن اتجاه الأجور = خصم من المبلغ النهائي
  let finalBalance = convertedAmount;
  
  if (feesAmount > 0) {
    const sameDirection = transactionType === feesDirection;
    
    if (sameDirection) {
      // نفس الاتجاه = زيادة
      finalBalance = convertedAmount + feesValue;
    } else {
      // اتجاه مختلف = خصم
      finalBalance = convertedAmount - feesValue;
    }
  }
  
  return { convertedAmount, feesValue, finalBalance };
}
