# Migration Guide: v2.x to v3.0.0

Version 3.0.0 is a complete rewrite of the `node-quickbooks` library in TypeScript. It replaces deprecated dependencies (like `request`) with modern alternatives (`axios`) and introduces first-class Promise support.

## 1. Installation

Update your package.json:

```bash
npm install @danielgaskins/node-quickbooks@latest
```

## 2. Importing the Library

### CommonJS (Old)
```javascript
var QuickBooks = require('node-quickbooks');
```

### TypeScript / ES Modules (New)
```typescript
import QuickBooks from '@danielgaskins/node-quickbooks';
// OR for CommonJS in v3:
// const { QuickBooks } = require('@danielgaskins/node-quickbooks');
```

## 3. Configuration

While v3 attempts to support the legacy constructor arguments, it is **highly recommended** to switch to the configuration object pattern for better type safety and readability.

### v2.x Style
```javascript
var qbo = new QuickBooks(
  consumerKey,
  consumerSecret,
  oauthToken,
  tokenSecret,
  realmId,
  true, // useSandbox
  true, // debug
  null, // minorVersion
  '1.0a', // oauthVersion
  null // refreshToken
);
```

### v3.x Style (Recommended)
```typescript
const qbo = new QuickBooks({
  consumerKey: '...',
  consumerSecret: '...',
  token: '...',
  tokenSecret: '...',
  realmId: '...',
  useSandbox: true,
  debug: true,
  oauthversion: '1.0a' // or '2.0'
});
```

## 4. Promises vs Callbacks

v3.x is built on Promises. You can use `async/await`.

### v2.x (Callback Hell)
```javascript
qbo.findAccounts({}, function(err, accounts) {
  if (err) console.log(err);
  else {
    qbo.createCustomer({ DisplayName: 'New' }, function(e, customer) {
      // ...
    });
  }
});
```

### v3.x (Async/Await)
```typescript
try {
  const accounts = await qbo.findAccounts({});
  const customer = await qbo.createCustomer({ DisplayName: 'New' });
} catch (error) {
  console.error(error);
}
```
*Note: Legacy callbacks are still supported for most methods to ease migration, but strictly typed environments may prefer Promises.*

## 5. Error Handling

Errors are now standard JavaScript `Error` objects or Axios error objects wrapped to match the QBO Fault structure. 

```typescript
try {
  await qbo.createCustomer({...});
} catch (err) {
  // err.Fault.Error[0].Message contains the API error message
  console.error(err); 
}
```

## 6. Known Limitations in v3.0.0

*   **File Uploads**: The `upload` method is currently a placeholder and throws a "Not Implemented" error. If you rely on attachment uploads, please continue using v2.x until this is addressed in a minor release.
*   **Dependencies**: `request`, `bluebird`, and `underscore` have been removed. If your application relied on `qbo` exposing these internal libraries (unlikely), update your code to import them directly.

## 7. TypeScript Types

If you are using TypeScript, you no longer need `@types/node-quickbooks`. The definitions are bundled with the package.

```typescript
import { QuickBooks, QuickBooksConfig } from '@danielgaskins/node-quickbooks';
```
