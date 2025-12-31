# node-quickbooks (TypeScript)

A modern, robust Node.js client for Intuit's [QuickBooks V3 API](https://developer.intuit.com/app/developer/qbo/docs/develop), rewritten in TypeScript.

[![npm version](https://badge.fury.io/js/%40danielgaskins%2Fnode-quickbooks.svg)](https://badge.fury.io/js/%40danielgaskins%2Fnode-quickbooks)

## Features

*   **First-class TypeScript Support**: Bundled type definitions (`.d.ts`) for strict typing and autocomplete.
*   **Modern HTTP Stack**: Built on `axios` for reliable promise-based requests.
*   **Secure**: Removed deprecated dependencies (`request`, `bluebird`, `underscore`) to ensure security compliance.
*   **Flexible Auth**: Supports both OAuth 2.0 (Standard) and OAuth 1.0a (Legacy).
*   **Dynamic API**: Automatically generates methods for standard QuickBooks entities (Invoices, Customers, Payments, etc.).

---

## Installation

```bash
npm install @danielgaskins/node-quickbooks
```

## Quick Start (OAuth 2.0)

```typescript
import { QuickBooks } from '@danielgaskins/node-quickbooks';

// 1. Initialize
const qbo = new QuickBooks({
  consumerKey: 'YOUR_CLIENT_ID',
  consumerSecret: 'YOUR_CLIENT_SECRET',
  token: 'YOUR_ACCESS_TOKEN',      // OAuth 2.0 Access Token
  realmId: 'YOUR_COMPANY_ID',      // QuickBooks Company ID
  useSandbox: true,                // true for Sandbox, false for Production
  debug: true,                     // Log requests/responses
  oauthversion: '2.0',             // Required for OAuth 2.0
  refreshToken: 'YOUR_REFRESH_TOKEN' // Optional, for refreshing tokens
});

async function run() {
  try {
    // 2. Make API calls
    const accounts = await qbo.findAccounts({ limit: 5 });
    console.log(`Found ${accounts.QueryResponse.Account.length} accounts.`);

    const newCustomer = await qbo.createCustomer({
      DisplayName: `Test Customer ${Date.now()}`,
      PrimaryEmailAddr: { Address: 'test@example.com' }
    });
    console.log('Created Customer:', newCustomer.Id);

  } catch (error) {
    console.error('API Error:', error);
  }
}

run();
```

---

## Configuration

The `QuickBooks` constructor accepts a configuration object.

```typescript
interface QuickBooksConfig {
  consumerKey: string;      // OAuth Client ID (or Consumer Key for 1.0a)
  consumerSecret: string;   // OAuth Client Secret (or Consumer Secret for 1.0a)
  token: string;            // Access Token
  tokenSecret?: string;     // Access Token Secret (Required ONLY for OAuth 1.0a)
  realmId: string;          // Company ID (Realm ID)
  useSandbox?: boolean;     // Default: false
  debug?: boolean;          // Default: false (Logs to console)
  minorversion?: number;    // Default: 75
  oauthversion?: '1.0a' | '2.0'; // Default: '1.0a' (Ensure you set '2.0' for modern apps)
  refreshToken?: string;    // OAuth 2.0 Refresh Token
}
```

### Legacy Constructor Support
For backward compatibility, the library still accepts the positional argument signature from v2.x, but the object configuration above is strongly recommended.

---

## API Reference

The library exposes generic CRUD methods and dynamically generated helper methods for specific entities.

### 1. CRUD Operations

#### `create(entityName, object)`
Creates a new record in QuickBooks.
*   **Dynamic Alias**: `qbo.create[Entity](object)`
*   **Example**: `qbo.createInvoice({...})`

#### `read(entityName, id)`
Retrieves a single record by ID.
*   **Dynamic Alias**: `qbo.get[Entity](id)`
*   **Example**: `qbo.getCustomer('123')`

#### `update(entityName, object)`
Updates an existing record. **Note:** The object MUST contain `Id` and `SyncToken`.
*   **Dynamic Alias**: `qbo.update[Entity](object)`
*   **Example**: `qbo.updateItem({ Id: '5', SyncToken: '2', UnitPrice: 50 })`

#### `delete(entityName, idOrObject)`
Deletes (or voids) a record.
*   **Dynamic Alias**: `qbo.delete[Entity](id)`
*   **Example**: `qbo.deleteSalesReceipt('101')`

### 2. Querying

#### `query(entityName, criteria)`
Searches for records using SQL-like criteria.
*   **Dynamic Alias**: `qbo.find[PluralEntity](criteria)`
*   **Example**: `qbo.findEmployees({ limit: 10 })`

**Simple Filtering:**
Pass an object to filter by exact match.
```typescript
// SELECT * FROM Customer WHERE FamilyName = 'Smith'
qbo.findCustomers({ FamilyName: 'Smith' })
```

**Advanced Filtering:**
Pass an array of criteria objects for operators like `<`, `>`, `LIKE`, `IN`.
```typescript
// SELECT * FROM Invoice WHERE Balance > '100.00' AND TxnDate > '2023-01-01'
qbo.findInvoices([
  { field: 'Balance', value: '100.00', operator: '>' },
  { field: 'TxnDate', value: '2023-01-01', operator: '>' },
  { field: 'limit', value: 20 }
])
```

**Pagination:**
Supported keys in the criteria object:
*   `limit`: Max results (Default 1000)
*   `offset`: Start position
*   `desc`: Sort descending by field
*   `asc`: Sort ascending by field
*   `count`: Return count only (boolean)

### 3. Reports

#### `report(reportName, options)`
Retrieves a report.
*   **Dynamic Alias**: `qbo.report[ReportName](options)`
*   **Example**: `qbo.reportBalanceSheet({ date_macro: 'This Fiscal Year-to-date' })`

**Supported Reports:**
`BalanceSheet`, `ProfitAndLoss`, `CashFlow`, `TrialBalance`, `CustomerSales`, `ItemSales`, `AgedReceivables`, `AgedPayables`, `TransactionList`, and more.

### 4. Advanced Features

#### `batch(items)`
Perform up to 30 operations in a single HTTP request.
```typescript
qbo.batch([
  { bId: '1', operation: 'create', Customer: { DisplayName: 'Batch Cust 1' } },
  { bId: '2', operation: 'delete', Invoice: { Id: '123', SyncToken: '1' } }
])
```

#### `changeDataCapture(entities, since)`
Find changed entities since a specific timestamp.
```typescript
// entities: array of strings, since: Date object or ISO string
qbo.changeDataCapture(['Invoice', 'Customer'], new Date('2023-01-01'))
```

#### `revokeAccess(useRefreshToken?)` (OAuth 2.0)
Revokes the current access token.
```typescript
await qbo.revokeAccess(); 
// or revoke the refresh token:
await qbo.revokeAccess(true);
```

#### `getUserInfo()` (OAuth 2.0)
Retrieves the OpenID Connect user info for the authenticated user.

---

## Supported Entities

The library automatically generates methods for the following standard entities. 

*   **Account**: `createAccount`, `getAccount`, `updateAccount`, `findAccounts`
*   **Attachable**
*   **Bill**
*   **BillPayment**
*   **Class**
*   **CompanyInfo** (Read/Update only)
*   **CreditMemo**
*   **Customer**
*   **Department**
*   **Deposit**
*   **Employee**
*   **Estimate**
*   **ExchangeRate**
*   **Invoice**
*   **Item**
*   **JournalEntry**
*   **Payment**
*   **PaymentMethod**
*   **Preferences** (Read/Update only)
*   **Purchase**
*   **PurchaseOrder**
*   **RefundReceipt**
*   **SalesReceipt**
*   **TaxAgency**
*   **TaxCode**
*   **TaxRate**
*   **Term**
*   **TimeActivity**
*   **Transfer**
*   **Vendor**
*   **VendorCredit**

---

## Error Handling

The library throws standard JavaScript Errors. If the error comes from the API, the error object usually follows the Axios error structure, with the QuickBooks `Fault` object contained within `error.response.data`.

```typescript
try {
  await qbo.createInvoice({...});
} catch (error) {
  // Check if it's an API error
  if (error.Fault) {
    console.error('QBO Error:', error.Fault.Error[0].Message);
  } else {
    console.error('Network/System Error:', error);
  }
}
```

## Debugging

Enable debugging by passing `debug: true` to the constructor. This will log all HTTP requests (method, URL, headers) and responses (body) to `stdout`.

```typescript
const qbo = new QuickBooks({
  // ...
  debug: true
});
```

## Contributing

1.  Clone the repo.
2.  Install dependencies: `npm install`.
3.  Run tests: `npm test`.
4.  Build: `npm run build`.

## License

ISC
