-- A01: import into an empty pocketbudget database. No demo users or credentials.
-- MySQL 8+ target. Verify compatibility if the whole team chooses MariaDB.
-- Initial schema is not a migration system. Coordinate future changes in docs.
SET NAMES utf8mb4;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE wallets (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  opening_balance_vnd BIGINT NOT NULL DEFAULT 0,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  deleted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_wallet_user (user_id),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  wallet_id CHAR(36) NOT NULL,
  destination_wallet_id CHAR(36) NULL,
  type ENUM('income','expense','transfer') NOT NULL,
  amount_vnd BIGINT UNSIGNED NOT NULL,
  category_code VARCHAR(40) NULL,
  occurred_on DATE NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  deleted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_transaction_user_date (user_id, occurred_on),
  CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  CONSTRAINT fk_transaction_destination FOREIGN KEY (destination_wallet_id) REFERENCES wallets(id),
  CONSTRAINT ck_transaction_amount CHECK (amount_vnd > 0 AND amount_vnd <= 9007199254740991),
  CONSTRAINT ck_transaction_transfer CHECK (
    (type = 'transfer' AND destination_wallet_id IS NOT NULL AND destination_wallet_id <> wallet_id AND category_code IS NULL)
    OR (type <> 'transfer' AND destination_wallet_id IS NULL AND category_code IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE budgets (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  limit_vnd BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  deleted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_budget_user_month (user_id, month),
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT ck_budget_limit CHECK (limit_vnd > 0 AND limit_vnd <= 9007199254740991)
) ENGINE=InnoDB;

CREATE TABLE wishlist (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_vnd BIGINT UNSIGNED NOT NULL,
  review_on DATE NOT NULL,
  status ENUM('considering','bought','skipped') NOT NULL DEFAULT 'considering',
  purchased_transaction_id CHAR(36) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  deleted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_wishlist_user (user_id),
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wishlist_transaction FOREIGN KEY (purchased_transaction_id) REFERENCES transactions(id),
  CONSTRAINT ck_wishlist_price CHECK (price_vnd > 0 AND price_vnd <= 9007199254740991)
) ENGINE=InnoDB;

CREATE TABLE processed_operations (
  user_id BIGINT UNSIGNED NOT NULL,
  operation_id CHAR(36) NOT NULL,
  result_json JSON NOT NULL,
  processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, operation_id),
  CONSTRAINT fk_operation_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Backend MUST also validate ownership of referenced wallets/transactions.
-- user_id foreign keys alone do not ensure a referenced wallet belongs to that user.
-- Decide wallet archival: do not hide old balance just by archiving a wallet with history.
-- Reuse/restore the existing budget row for a month after soft delete; unique key still exists.
