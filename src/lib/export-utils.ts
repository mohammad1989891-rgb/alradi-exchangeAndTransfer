import type { Transaction, TransactionType, TransactionStatus, Remittance, RemittanceStatus } from './types';

// ============ Arabic Translation Maps ============

const TYPE_LABELS: Record<TransactionType, string> = {
  exchange: 'تحويل عملات',
  remittance: 'حوالة',
  deposit: 'إيداع',
  withdrawal: 'سحب',
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  completed: 'مكتمل',
  pending: 'معلق',
  cancelled: 'ملغى',
  failed: 'فاشل',
};

const REMITTANCE_STATUS_LABELS: Record<RemittanceStatus, string> = {
  pending: 'معلق',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

// ============ Helper Functions ============

/**
 * Escapes a value for CSV format.
 * If the value contains commas, quotes, or newlines, it wraps in double quotes
 * and escapes any internal double quotes.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats a date string in Arabic locale for CSV export.
 */
function formatDateForCSV(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generates a filename for the CSV export with the current date.
 * Format: transactions_2024-01-15.csv or remittances_2024-01-15.csv
 */
function generateFilename(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${prefix}_${year}-${month}-${day}.csv`;
}

/**
 * Triggers a CSV file download in the browser.
 */
function downloadCSV(csvContent: string, filename: string): void {
  // BOM for UTF-8 encoding support in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ Transaction CSV Export ============

/**
 * Exports an array of transactions to a CSV file and triggers a browser download.
 *
 * CSV columns (Arabic headers):
 * - الرقم (ID)
 * - النوع (Type)
 * - من عملة (From Currency)
 * - إلى عملة (To Currency)
 * - المبلغ المرسل (From Amount)
 * - المبلغ المستلم (To Amount)
 * - سعر الصرف (Rate)
 * - الرسوم (Fee)
 * - الحالة (Status)
 * - العميل (Customer)
 * - المستلم (Recipient)
 * - التاريخ (Date)
 */
export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const headers = [
    'الرقم',
    'النوع',
    'من عملة',
    'إلى عملة',
    'المبلغ المرسل',
    'المبلغ المستلم',
    'سعر الصرف',
    'الرسوم',
    'الحالة',
    'العميل',
    'المستلم',
    'التاريخ',
  ];

  const rows = transactions.map((t) => [
    escapeCSV(t.id),
    escapeCSV(TYPE_LABELS[t.type] || t.type),
    escapeCSV(t.fromCurrency),
    escapeCSV(t.toCurrency),
    t.fromAmount.toLocaleString('ar-SA'),
    t.toAmount.toLocaleString('ar-SA'),
    t.rate.toLocaleString('ar-SA'),
    t.fee.toLocaleString('ar-SA'),
    escapeCSV(STATUS_LABELS[t.status] || t.status),
    escapeCSV(t.customerName || ''),
    escapeCSV(t.recipientName || ''),
    escapeCSV(formatDateForCSV(t.createdAt)),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const filename = generateFilename('transactions');

  downloadCSV(csvContent, filename);
}

// ============ Remittance CSV Export ============

/**
 * Exports an array of remittances to a CSV file and triggers a browser download.
 *
 * CSV columns (Arabic headers):
 * - الرقم (ID)
 * - اسم المرسل (Sender Name)
 * - اسم المستلم (Recipient Name)
 * - هاتف المستلم (Recipient Phone)
 * - المبلغ (Amount)
 * - العملة (Currency)
 * - الرسوم (Fee)
 * - الحالة (Status)
 * - ملاحظات (Notes)
 * - تاريخ الإنشاء (Created At)
 * - تاريخ الإنجاز (Completed At)
 */
export function exportRemittancesToCSV(remittances: Remittance[]): void {
  const headers = [
    'الرقم',
    'اسم المرسل',
    'اسم المستلم',
    'هاتف المستلم',
    'المبلغ',
    'العملة',
    'الرسوم',
    'الحالة',
    'ملاحظات',
    'تاريخ الإنشاء',
    'تاريخ الإنجاز',
  ];

  const rows = remittances.map((r) => [
    escapeCSV(r.id),
    escapeCSV(r.senderName),
    escapeCSV(r.recipientName),
    escapeCSV(r.recipientPhone),
    r.amount.toLocaleString('ar-SA'),
    escapeCSV(r.currency),
    r.fee.toLocaleString('ar-SA'),
    escapeCSV(REMITTANCE_STATUS_LABELS[r.status] || r.status),
    escapeCSV(r.notes || ''),
    escapeCSV(formatDateForCSV(r.createdAt)),
    escapeCSV(r.completedAt ? formatDateForCSV(r.completedAt) : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const filename = generateFilename('remittances');

  downloadCSV(csvContent, filename);
}
