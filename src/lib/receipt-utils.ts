import type { Transaction, TransactionType, TransactionStatus } from './types';
import { CURRENCIES } from './api';

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

// ============ Helper Functions ============

function getCurrencyName(code: string): string {
  const curr = CURRENCIES.find((c) => c.code === code);
  return curr ? `${curr.flag} ${curr.nameAr}` : code;
}

function getCurrencySymbol(code: string): string {
  const curr = CURRENCIES.find((c) => c.code === code);
  return curr?.symbol || code;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  if (currency === 'SYP' || currency === 'LBP') {
    return `${amount.toLocaleString('ar-SA')} ${symbol}`;
  }
  return `${symbol}${amount.toLocaleString('ar-SA')}`;
}

function formatDateTimeAr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeColor(type: TransactionType): string {
  switch (type) {
    case 'exchange':
      return '#059669'; // emerald-600
    case 'remittance':
      return '#d97706'; // amber-600
    case 'deposit':
      return '#0d9488'; // teal-600
    case 'withdrawal':
      return '#ea580c'; // orange-600
    default:
      return '#6b7280'; // gray-500
  }
}

function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'completed':
      return '#059669'; // emerald-600
    case 'pending':
      return '#d97706'; // amber-600
    case 'cancelled':
      return '#dc2626'; // red-600
    case 'failed':
      return '#dc2626'; // red-600
    default:
      return '#6b7280'; // gray-500
  }
}

// ============ Receipt HTML Generator ============

/**
 * Generates a printable receipt HTML string for a transaction.
 * This HTML can be used for printing or for displaying in a new window.
 *
 * The receipt includes:
 * - Company header with branding
 * - Transaction details (type, currencies, amounts, rate, fee, status)
 * - Customer/recipient information
 * - Footer with contact info
 *
 * @param transaction - The transaction data to generate a receipt for
 * @returns A complete HTML string for the receipt
 */
export function generateReceiptHTML(transaction: Transaction): string {
  const typeLabel = TYPE_LABELS[transaction.type] || transaction.type;
  const statusLabel = STATUS_LABELS[transaction.status] || transaction.status;
  const typeColor = getTypeColor(transaction.type);
  const statusColor = getStatusColor(transaction.status);
  const fromCurrencyName = getCurrencyName(transaction.fromCurrency);
  const toCurrencyName = getCurrencyName(transaction.toCurrency);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إيصال - ${transaction.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      padding: 20px;
      direction: rtl;
    }

    .receipt {
      width: 100%;
      max-width: 400px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .receipt-header {
      background: linear-gradient(to left, #047857, #059669, #047857);
      color: white;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .receipt-header::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.05;
      background:
        radial-gradient(circle at 20% 30%, white 0%, transparent 60%),
        radial-gradient(circle at 80% 70%, white 0%, transparent 60%);
    }

    .receipt-header-content {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-placeholder {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(4px);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 20px;
      font-weight: bold;
    }

    .company-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }

    .company-subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 300;
      margin-top: 2px;
    }

    .gold-accent {
      height: 4px;
      background: linear-gradient(to left, rgba(245, 158, 11, 0.6), #fbbf24, rgba(245, 158, 11, 0.6));
    }

    .receipt-body {
      padding: 20px 24px;
    }

    .receipt-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
    }

    .receipt-label {
      font-size: 13px;
      color: #6b7280;
    }

    .receipt-value {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
    }

    .receipt-number {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .receipt-number-label {
      font-size: 14px;
      font-weight: 600;
      color: #047857;
    }

    .receipt-number-value {
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      color: #065f46;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .separator {
      height: 1px;
      background: #f3f4f6;
      margin: 12px 0;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid;
    }

    .currency-card {
      border-radius: 8px;
      padding: 12px;
    }

    .currency-card.from {
      background: rgba(249, 250, 251, 0.8);
    }

    .currency-card.to {
      background: rgba(236, 253, 245, 0.6);
      border: 1px solid rgba(209, 250, 229, 0.5);
    }

    .arrow-container {
      display: flex;
      justify-content: center;
      margin: 8px 0;
    }

    .arrow-circle {
      width: 28px;
      height: 28px;
      background: #d1fae5;
      color: #059669;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      text-align: center;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 10px;
      color: #9ca3af;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-value.fee {
      color: #d97706;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .receipt-footer {
      background: rgba(249, 250, 251, 0.5);
      border-top: 1px solid #f3f4f6;
    }

    .footer-content {
      padding: 16px 24px;
      text-align: center;
    }

    .thank-you {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .thank-you-line {
      flex: 1;
      height: 1px;
    }

    .thank-you-line.left {
      background: linear-gradient(to left, rgba(245, 158, 11, 0.5), transparent);
    }

    .thank-you-line.right {
      background: linear-gradient(to right, rgba(245, 158, 11, 0.5), transparent);
    }

    .thank-you-text {
      font-size: 14px;
      font-weight: 600;
      color: #047857;
    }

    .contact-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 10px;
      color: #9ca3af;
    }

    .contact-divider {
      width: 1px;
      height: 12px;
      background: #e5e7eb;
    }

    .bottom-stripe {
      height: 6px;
      background: linear-gradient(to left, #047857, #10b981, #047857);
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .receipt {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="receipt-header">
      <div class="receipt-header-content">
        <div class="logo-placeholder">ر</div>
        <div>
          <div class="company-name">الراضي للصرافة والحوالات</div>
          <div class="company-subtitle">Al-Radhi Exchange & Remittances</div>
        </div>
      </div>
    </div>

    <!-- Gold accent -->
    <div class="gold-accent"></div>

    <!-- Body -->
    <div class="receipt-body">
      <!-- Receipt number -->
      <div class="receipt-number">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
          <path d="M12 17.5v-11"/>
        </svg>
        <span class="receipt-number-label">إيصال رقم</span>
        <span class="receipt-number-value">${transaction.id}</span>
      </div>

      <!-- Date -->
      <div class="receipt-row">
        <span class="receipt-label">التاريخ والوقت</span>
        <span class="receipt-value">${formatDateTimeAr(transaction.createdAt)}</span>
      </div>

      <div class="separator"></div>

      <!-- Type -->
      <div class="receipt-row">
        <span class="receipt-label">نوع المعاملة</span>
        <span class="type-badge" style="color: ${typeColor}; border-color: ${typeColor}33; background: ${typeColor}0d;">
          ${typeLabel}
        </span>
      </div>

      <div class="separator"></div>

      <!-- From currency -->
      <div class="currency-card from">
        <div class="receipt-row" style="padding: 0 0 6px 0;">
          <span class="receipt-label">من (العملة)</span>
          <span class="receipt-value">${fromCurrencyName}</span>
        </div>
        <div class="receipt-row" style="padding: 0;">
          <span class="receipt-label">المبلغ</span>
          <span class="receipt-value" style="font-size: 16px; font-weight: 800; color: #111827;">
            ${formatCurrency(transaction.fromAmount, transaction.fromCurrency)}
          </span>
        </div>
      </div>

      <!-- Arrow -->
      <div class="arrow-container">
        <div class="arrow-circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg);">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
          </svg>
        </div>
      </div>

      <!-- To currency -->
      <div class="currency-card to">
        <div class="receipt-row" style="padding: 0 0 6px 0;">
          <span class="receipt-label">إلى (العملة)</span>
          <span class="receipt-value">${toCurrencyName}</span>
        </div>
        <div class="receipt-row" style="padding: 0;">
          <span class="receipt-label">المبلغ</span>
          <span class="receipt-value" style="font-size: 16px; font-weight: 800; color: #047857;">
            ${formatCurrency(transaction.toAmount, transaction.toCurrency)}
          </span>
        </div>
      </div>

      <div class="separator"></div>

      <!-- Rate / Fee / Status -->
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">سعر الصرف</span>
          <span class="stat-value">${transaction.rate.toLocaleString('ar-SA')}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الرسوم</span>
          <span class="stat-value fee">${
            transaction.fee === 0
              ? 'مجاني'
              : formatCurrency(transaction.fee, transaction.fromCurrency)
          }</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الحالة</span>
          <span class="status-badge" style="color: ${statusColor}; border-color: ${statusColor}33; background: ${statusColor}0d;">
            <span class="status-dot" style="background: ${statusColor};"></span>
            ${statusLabel}
          </span>
        </div>
      </div>

      <div class="separator"></div>

      <!-- Customer / Recipient -->
      ${transaction.customerName ? `
      <div class="receipt-row">
        <span class="receipt-label">اسم العميل</span>
        <span class="receipt-value">${transaction.customerName}</span>
      </div>
      ` : ''}
      ${transaction.recipientName ? `
      <div class="receipt-row">
        <span class="receipt-label">اسم المستلم</span>
        <span class="receipt-value">${transaction.recipientName}</span>
      </div>
      ` : ''}
      ${!transaction.customerName && !transaction.recipientName ? `
      <div style="text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0;">
        لا توجد معلومات عميل
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div class="receipt-footer">
      <div class="footer-content">
        <div class="thank-you">
          <div class="thank-you-line left"></div>
          <span class="thank-you-text">شكراً لتعاملكم معنا</span>
          <div class="thank-you-line right"></div>
        </div>
        <div class="contact-info">
          <span dir="ltr">+963-11-123-4567</span>
          <span class="contact-divider"></span>
          <span>دمشق - سوريا</span>
          <span class="contact-divider"></span>
          <span>الراضي للصرافة والحوالات</span>
        </div>
      </div>
      <div class="bottom-stripe"></div>
    </div>
  </div>
</body>
</html>`;

  return html;
}
