export const API_BASE = new URL('../api/', import.meta.url);
export const TRANSACTION_TYPES = Object.freeze(['income', 'expense', 'transfer']);
export const CATEGORIES = Object.freeze({
  income: ['allowance', 'salary', 'scholarship', 'other_income'],
  expense: ['food', 'transport', 'study', 'shopping', 'entertainment', 'health', 'other_expense'],
});
export const WISHLIST_STATUSES = Object.freeze(['considering', 'bought', 'skipped']);
export const DB_NAME = 'pocketbudget';
export const DB_VERSION = 1;
