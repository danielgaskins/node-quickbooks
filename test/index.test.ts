import { expect } from 'chai';
import config from './config';
import QuickBooks from '../src/index';
import { v4 as uuidv4 } from 'uuid';

const qbo = new QuickBooks(
  config.consumerKey,
  config.consumerSecret,
  config.token,
  config.tokenSecret,
  config.realmId,
  config.useSandbox,
  config.debug,
  undefined,
  '1.0a'
);

describe('Attachable CRUDQ', function() {
  this.timeout(15000);
  let attachableId: string;
  let currentAttachable: any;

  it('should create an Attachable', async () => {
    const response = await qbo.createAttachable({ Note: 'My File' });
    expect(response.Note).to.equal('My File');
    attachableId = response.Id;
    currentAttachable = response;
  });

  it('should get an Attachable', async () => {
    const response = await qbo.getAttachable(attachableId);
    expect(response.Note).to.equal('My File');
    currentAttachable = response;
  });

  it('should update an Attachable', async () => {
    currentAttachable.Note = 'My Updated File';
    const response = await qbo.updateAttachable(currentAttachable);
    expect(response.Note).to.equal('My Updated File');
  });

  it('should find Attachables', async () => {
    const response = await qbo.findAttachables({ Note: 'My Updated File' });
    const list = response.QueryResponse.Attachable;
    expect(list.length).to.be.greaterThan(0);
    expect(list[0].Note).to.equal('My Updated File');
  });

  it('should delete an Attachable', async () => {
    const response = await qbo.deleteAttachable(attachableId);
    expect(response.status).to.equal('Deleted');
  });
});

describe('Query', function() {
  this.timeout(15000);

  it('should fetch Accounts', async () => {
    const response = await qbo.findAccounts({ limit: 5 });
    expect(response.QueryResponse.Account.length).to.be.greaterThan(0);
  });

  it('should fetch Expense Accounts by AccountType', async () => {
    const response = await qbo.findAccounts({ AccountType: 'Expense', limit: 1 });
    const list = response.QueryResponse.Account;
    expect(list.length).to.be.greaterThan(0);
    expect(list[0].AccountType).to.equal('Expense');
  });

  // List of entities to test query generation
  const queries = [
    'Account', 'Attachable', 'Bill', 'BillPayment', 'Budget', 'Class', 
    'CompanyInfo', 'CreditMemo', 'Customer', 'Department', 'Deposit', 
    'Employee', 'Estimate', 'ExchangeRate', 'Invoice', 'Item', 
    'JournalEntry', 'Payment', 'PaymentMethod', 'Preferences', 
    'Purchase', 'PurchaseOrder', 'RefundReceipt', 'SalesReceipt', 
    'TaxAgency', 'TaxCode', 'TaxRate', 'Term', 'TimeActivity', 
    'Vendor', 'VendorCredit'
  ];

  queries.forEach(q => {
    it(`should fetch ${q}`, async () => {
      // Dynamic method call
      const method = `find${q.endsWith('y') ? q.slice(0, -1) + 'ies' : q + 's'}`;
      // @ts-ignore
      const response = await qbo[method]({ limit: 1 });
      expect(response).to.have.property('QueryResponse');
    });
  });
});

describe('Reports', function() {
  this.timeout(30000);

  const reports = [
    'BalanceSheet', 'ProfitAndLoss', 'TrialBalance', 'CashFlow',
    'InventoryValuationSummary', 'CustomerSales', 'ItemSales',
    'CustomerIncome', 'CustomerBalance', 'AgedReceivables',
    'VendorBalance', 'AgedPayables', 'VendorExpenses', 'TransactionList'
  ];

  reports.forEach(report => {
    it(`should fetch ${report} Report`, async () => {
      // @ts-ignore
      const response = await qbo[`report${report}`]({ date_macro: 'This Fiscal Year-to-date' });
      expect(response).to.have.property('Header');
    });
  });
});
