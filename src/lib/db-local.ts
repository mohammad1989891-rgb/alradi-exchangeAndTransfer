// IndexedDB wrapper for offline storage
import type { Currency, Vault, Account, Transaction, Debt, AccountVault } from '@/types';

const DB_NAME = 'sarafa-db';
const DB_VERSION = 2; // Incremented for AccountVault store

// Store names
const STORES = {
  CURRENCIES: 'currencies',
  VAULTS: 'vaults',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  DEBTS: 'debts',
  SETTINGS: 'settings',
  ACCOUNT_VAULTS: 'accountVaults', // New store for account-specific vaults
};

// Open database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores with indexes
      if (!db.objectStoreNames.contains(STORES.CURRENCIES)) {
        const currencyStore = db.createObjectStore(STORES.CURRENCIES, { keyPath: 'id' });
        currencyStore.createIndex('code', 'code', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.VAULTS)) {
        const vaultStore = db.createObjectStore(STORES.VAULTS, { keyPath: 'id' });
        vaultStore.createIndex('currencyId', 'currencyId', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
        const accountStore = db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
        accountStore.createIndex('name', 'name', { unique: false });
        accountStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        transactionStore.createIndex('accountId', 'accountId', { unique: false });
        transactionStore.createIndex('currencyId', 'currencyId', { unique: false });
        transactionStore.createIndex('date', 'date', { unique: false });
        transactionStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.DEBTS)) {
        const debtStore = db.createObjectStore(STORES.DEBTS, { keyPath: 'id' });
        debtStore.createIndex('accountId', 'accountId', { unique: false });
        debtStore.createIndex('currencyId', 'currencyId', { unique: false });
        debtStore.createIndex('isPaid', 'isPaid', { unique: false });
        debtStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Account-specific vaults store
      if (!db.objectStoreNames.contains(STORES.ACCOUNT_VAULTS)) {
        const accountVaultStore = db.createObjectStore(STORES.ACCOUNT_VAULTS, { keyPath: 'id' });
        accountVaultStore.createIndex('accountId', 'accountId', { unique: false });
        accountVaultStore.createIndex('currencyId', 'currencyId', { unique: false });
        accountVaultStore.createIndex('accountCurrency', ['accountId', 'currencyId'], { unique: true });
        accountVaultStore.createIndex('isDefault', 'isDefault', { unique: false });
      }
    };
  });
}

// Generic CRUD operations
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function add<T>(storeName: string, item: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(item);
  });
}

async function put<T>(storeName: string, item: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(item);
  });
}

async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Currency operations
export const currencyDB = {
  getAll: () => getAll<Currency>(STORES.CURRENCIES),
  getById: (id: string) => getById<Currency>(STORES.CURRENCIES, id),
  add: (currency: Currency) => add(STORES.CURRENCIES, currency),
  update: (currency: Currency) => put(STORES.CURRENCIES, currency),
  delete: (id: string) => remove(STORES.CURRENCIES, id),
  clear: () => clear(STORES.CURRENCIES),
};

// Vault operations
export const vaultDB = {
  getAll: () => getAll<Vault>(STORES.VAULTS),
  getById: (id: string) => getById<Vault>(STORES.VAULTS, id),
  getByCurrency: (currencyId: string) => getByIndex<Vault>(STORES.VAULTS, 'currencyId', currencyId),
  add: (vault: Vault) => add(STORES.VAULTS, vault),
  update: (vault: Vault) => put(STORES.VAULTS, vault),
  delete: (id: string) => remove(STORES.VAULTS, id),
  clear: () => clear(STORES.VAULTS),
};

// Account operations
export const accountDB = {
  getAll: () => getAll<Account>(STORES.ACCOUNTS),
  getById: (id: string) => getById<Account>(STORES.ACCOUNTS, id),
  add: (account: Account) => add(STORES.ACCOUNTS, account),
  update: (account: Account) => put(STORES.ACCOUNTS, account),
  delete: (id: string) => remove(STORES.ACCOUNTS, id),
  clear: () => clear(STORES.ACCOUNTS),
};

// Transaction operations
export const transactionDB = {
  getAll: () => getAll<Transaction>(STORES.TRANSACTIONS),
  getById: (id: string) => getById<Transaction>(STORES.TRANSACTIONS, id),
  getByAccount: (accountId: string) => getByIndex<Transaction>(STORES.TRANSACTIONS, 'accountId', accountId),
  getByCurrency: (currencyId: string) => getByIndex<Transaction>(STORES.TRANSACTIONS, 'currencyId', currencyId),
  getByDate: (date: string) => getByIndex<Transaction>(STORES.TRANSACTIONS, 'date', date),
  add: (transaction: Transaction) => add(STORES.TRANSACTIONS, transaction),
  update: (transaction: Transaction) => put(STORES.TRANSACTIONS, transaction),
  delete: (id: string) => remove(STORES.TRANSACTIONS, id),
  clear: () => clear(STORES.TRANSACTIONS),
};

// Debt operations
export const debtDB = {
  getAll: () => getAll<Debt>(STORES.DEBTS),
  getById: (id: string) => getById<Debt>(STORES.DEBTS, id),
  getByAccount: (accountId: string) => getByIndex<Debt>(STORES.DEBTS, 'accountId', accountId),
  getUnpaid: async () => {
    const all = await getAll<Debt>(STORES.DEBTS);
    return all.filter(d => !d.isPaid);
  },
  add: (debt: Debt) => add(STORES.DEBTS, debt),
  update: (debt: Debt) => put(STORES.DEBTS, debt),
  delete: (id: string) => remove(STORES.DEBTS, id),
  clear: () => clear(STORES.DEBTS),
};

// Account Vault operations
export const accountVaultDB = {
  getAll: () => getAll<AccountVault>(STORES.ACCOUNT_VAULTS),
  getById: (id: string) => getById<AccountVault>(STORES.ACCOUNT_VAULTS, id),
  getByAccount: (accountId: string) => getByIndex<AccountVault>(STORES.ACCOUNT_VAULTS, 'accountId', accountId),
  getByAccountAndCurrency: async (accountId: string, currencyId: string): Promise<AccountVault | undefined> => {
    const all = await getAll<AccountVault>(STORES.ACCOUNT_VAULTS);
    return all.find(v => v.accountId === accountId && v.currencyId === currencyId);
  },
  add: (accountVault: AccountVault) => add(STORES.ACCOUNT_VAULTS, accountVault),
  update: (accountVault: AccountVault) => put(STORES.ACCOUNT_VAULTS, accountVault),
  delete: (id: string) => remove(STORES.ACCOUNT_VAULTS, id),
  clear: () => clear(STORES.ACCOUNT_VAULTS),
};

// Settings operations
export const settingsDB = {
  get: (key: string) => getById<{ key: string; value: string }>(STORES.SETTINGS, key),
  set: (key: string, value: string) => put(STORES.SETTINGS, { key, value }),
  delete: (key: string) => remove(STORES.SETTINGS, key),
};

// Initialize default data
export async function initializeDefaultData() {
  const currencies = await currencyDB.getAll();
  const existingCodes = new Set(currencies.map(c => c.code));
  
  const now = new Date().toISOString();
  
  // Default currencies to add (only if not exists)
  const defaultCurrenciesData = [
    {
      code: 'USD',
      name: 'دولار أمريكي',
      symbol: '$',
      isDefault: true,
    },
    {
      code: 'SYP',
      name: 'ليرة سورية',
      symbol: 'ل.س',
      isDefault: false,
    },
    {
      code: 'EUR',
      name: 'يورو',
      symbol: '€',
      isDefault: false,
    },
    {
      code: 'TRY',
      name: 'ليرة تركية',
      symbol: '₺',
      isDefault: false,
    },
    {
      code: 'SAR',
      name: 'ريال سعودي',
      symbol: 'ر.س',
      isDefault: false,
    },
    {
      code: 'AED',
      name: 'درهم إماراتي',
      symbol: 'د.إ',
      isDefault: false,
    },
  ];

  // Add only currencies that don't exist
  for (const currencyData of defaultCurrenciesData) {
    if (!existingCodes.has(currencyData.code)) {
      const currency: Currency = {
        id: generateId(),
        ...currencyData,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      
      await currencyDB.add(currency);
      existingCodes.add(currencyData.code);

      // Create vault for the new currency
      await vaultDB.add({
        id: generateId(),
        currencyId: currency.id,
        balance: 0,
        openingBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

// Export database for backup
export async function exportData() {
  return {
    currencies: await currencyDB.getAll(),
    vaults: await vaultDB.getAll(),
    accounts: await accountDB.getAll(),
    transactions: await transactionDB.getAll(),
    debts: await debtDB.getAll(),
    accountVaults: await accountVaultDB.getAll(),
    exportedAt: new Date().toISOString(),
  };
}

// Import database from backup
export async function importData(data: {
  currencies?: Currency[];
  vaults?: Vault[];
  accounts?: Account[];
  transactions?: Transaction[];
  debts?: Debt[];
  accountVaults?: AccountVault[];
}) {
  if (data.currencies) {
    await currencyDB.clear();
    for (const item of data.currencies) {
      await currencyDB.add(item);
    }
  }
  if (data.vaults) {
    await vaultDB.clear();
    for (const item of data.vaults) {
      await vaultDB.add(item);
    }
  }
  if (data.accounts) {
    await accountDB.clear();
    for (const item of data.accounts) {
      await accountDB.add(item);
    }
  }
  if (data.accountVaults) {
    await accountVaultDB.clear();
    for (const item of data.accountVaults) {
      await accountVaultDB.add(item);
    }
  }
  if (data.transactions) {
    await transactionDB.clear();
    for (const item of data.transactions) {
      await transactionDB.add(item);
    }
  }
  if (data.debts) {
    await debtDB.clear();
    for (const item of data.debts) {
      await debtDB.add(item);
    }
  }
}
