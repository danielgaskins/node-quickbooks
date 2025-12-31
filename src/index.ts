import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';
import * as crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';
import { XMLParser } from 'fast-xml-parser';
import * as _ from 'lodash';
import { criteriaToString, capitalize } from './utils';

const version = '3.0.0';
const xmlParser = new XMLParser();

export interface QuickBooksConfig {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  realmId: string;
  useSandbox?: boolean;
  debug?: boolean;
  minorversion?: number | string;
  oauthversion?: '1.0a' | '2.0';
  refreshToken?: string;
}

export class QuickBooks {
  public consumerKey: string;
  public consumerSecret: string;
  public token: string;
  public tokenSecret: string;
  public realmId: string;
  public useSandbox: boolean;
  public debug: boolean;
  public endpoint: string;
  public minorversion: number | string;
  public oauthversion: '1.0a' | '2.0';
  public refreshToken: string | null;

  static APP_CENTER_BASE = 'https://appcenter.intuit.com';
  static V3_ENDPOINT_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company/';
  static TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  static REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
  static USER_INFO_URL = 'https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo';

  constructor(
    consumerKeyOrConfig: string | QuickBooksConfig,
    consumerSecret?: string,
    token?: string,
    tokenSecret?: string | boolean,
    realmId?: string,
    useSandbox?: boolean,
    debug?: boolean,
    minorversion?: number | string,
    oauthversion?: '1.0a' | '2.0',
    refreshToken?: string
  ) {
    let config: QuickBooksConfig;

    if (typeof consumerKeyOrConfig === 'object') {
      config = consumerKeyOrConfig;
    } else {
      config = {
        consumerKey: consumerKeyOrConfig,
        consumerSecret: consumerSecret!,
        token: token,
        tokenSecret: typeof tokenSecret === 'string' ? tokenSecret : undefined,
        realmId: realmId!,
        useSandbox: useSandbox,
        debug: debug,
        minorversion: minorversion,
        oauthversion: oauthversion,
        refreshToken: refreshToken
      };
    }

    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.token = config.token || '';
    this.tokenSecret = config.tokenSecret || '';
    this.realmId = config.realmId;
    this.useSandbox = config.useSandbox || false;
    this.debug = config.debug || false;
    this.minorversion = config.minorversion || 75;
    this.oauthversion = config.oauthversion || '1.0a';
    this.refreshToken = config.refreshToken || null;

    this.endpoint = this.useSandbox
      ? QuickBooks.V3_ENDPOINT_BASE_URL
      : QuickBooks.V3_ENDPOINT_BASE_URL.replace('sandbox-', '');

    if (!this.tokenSecret && this.oauthversion !== '2.0') {
      throw new Error('tokenSecret not defined');
    }
  }

  // --- Core Request Handling ---

  private async request(verb: Method, url: string, data: any = null, headers: any = {}, options: any = {}): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.endpoint}${this.realmId}${url}`;
    
    // Query string handling for special characters in SQL
    let queryString = '';
    if (options.qs) {
      // Custom query string assembly to match legacy behavior and handle escaping
      const params = new URLSearchParams();
      // Basic params
      if (options.qs.minorversion) params.append('minorversion', String(options.qs.minorversion));
      if (options.qs.requestid) params.append('requestid', options.qs.requestid);
      
      // If there is a query, append it. 
      const qsParts = [];
      qsParts.push(`minorversion=${options.qs.minorversion || this.minorversion}`);
      if (options.qs.query) {
         // Fix for the regex issue: ensure backslashes are escaped to %5C using new RegExp
         // to avoid shell heredoc interpretation issues.
         let q = options.qs.query
             .replace(/%/g, '%25')
             .replace(/=/g, '%3D')
             .replace(/</g, '%3C')
             .replace(/>/g, '%3E')
             .replace(/&/g, '%26')
             .replace(/#/g, '%23')
             .replace(new RegExp('\\', 'g'), '%5C'); 
         qsParts.push(`query=${q}`);
      }
      
      // Other params
      for (const key in options.qs) {
          if (key !== 'query' && key !== 'minorversion') {
              qsParts.push(`${key}=${encodeURIComponent(options.qs[key])}`);
          }
      }
      
      queryString = '?' + qsParts.join('&');
    }

    const requestUrl = fullUrl + queryString;
    
    const reqHeaders: any = {
      'User-Agent': `node-quickbooks: version ${version}`,
      'Request-Id': uuidv4(),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    };

    if (this.oauthversion === '2.0') {
      reqHeaders['Authorization'] = `Bearer ${this.token}`;
    } else {
      const oauth = new OAuth({
        consumer: { key: this.consumerKey, secret: this.consumerSecret },
        signature_method: 'HMAC-SHA1',
        hash_function: (base_string, key) => crypto.createHmac('sha1', key).update(base_string).digest('base64')
      });
      const authData = oauth.authorize({ url: requestUrl, method: verb }, { key: this.token, secret: this.tokenSecret });
      reqHeaders['Authorization'] = oauth.toHeader(authData).Authorization;
    }

    if (this.debug) {
      console.log(`Invoking: ${verb.toUpperCase()} ${requestUrl}`);
      if (data) console.log(JSON.stringify(data, null, 2));
    }

    try {
      const response = await axios({
        method: verb,
        url: requestUrl,
        data: data,
        headers: reqHeaders,
        responseType: options.responseType || 'json'
      });

      if (this.debug) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }

      return response.data;
    } catch (error: any) {
      if (this.debug && error.response) {
        console.log('Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      // Normalize error to match legacy behavior
      const errBody = error.response ? error.response.data : error;
      throw errBody;
    }
  }

  // --- Dynamic Method Implementations (Helpers) ---

  private unwrap(data: any, entityName: string) {
    const name = capitalize(entityName);
    return (data || {})[name] || data;
  }

  private handleCallback(promise: Promise<any>, cb?: (err: any, data?: any) => void) {
    if (cb) {
      promise.then(data => cb(null, data)).catch(err => cb(err));
    } else {
      return promise;
    }
  }

  // --- CRUD Operations ---

  public create(entityName: string, entity: any, callback?: any) {
    const url = `/${entityName.toLowerCase()}`;
    const p = this.request('POST', url, entity)
      .then(data => this.unwrap(data, entityName));
    return this.handleCallback(p, callback);
  }

  public read(entityName: string, id: string, callback?: any) {
    const url = `/${entityName.toLowerCase()}/${id}`;
    const p = this.request('GET', url)
      .then(data => this.unwrap(data, entityName));
    return this.handleCallback(p, callback);
  }

  public update(entityName: string, entity: any, callback?: any) {
    if (!entity.Id || !entity.SyncToken) {
       // Allow ExchangeRate update which handles it differently in legacy, but generally QBO requires Id/SyncToken
       if (entityName.toLowerCase() !== 'exchangerate') {
           const err = new Error(`${entityName} must contain Id and SyncToken fields`);
           if (callback) return callback(err);
           return Promise.reject(err);
       }
    }
    const url = `/${entityName.toLowerCase()}?operation=update`;
    const p = this.request('POST', url, entity)
       .then(data => this.unwrap(data, entityName));
    return this.handleCallback(p, callback);
  }

  public delete(entityName: string, idOrEntity: any, callback?: any) {
    const url = `/${entityName.toLowerCase()}?operation=delete`;
    let promise;
    if (_.isObject(idOrEntity)) {
      promise = this.request('POST', url, idOrEntity);
    } else {
      // Legacy behavior: fetch first (read) then delete. 
      // Note: This is inefficient but preserves behavior.
      // Optimized: Construct minimal entity with Id and SyncToken if possible? 
      // For now, adhere to legacy flow: GET then POST.
      promise = this.request('GET', `/${entityName.toLowerCase()}/${idOrEntity}`)
        .then(data => {
            const ent = this.unwrap(data, entityName);
            return this.request('POST', url, ent);
        });
    }
    promise = promise.then(data => this.unwrap(data, entityName));
    return this.handleCallback(promise, callback);
  }

  public query(entity: string, criteria: any, callback?: any) {
    let queryStr = '';
    if (!criteria) criteria = {};

    // Handle "Select count(*)" optimization legacy logic
    // (Simplified for this migration: legacy modifies URL directly in complex ways)
    // We will assume standard select * unless count prop is present
    
    let url = `/query`;
    let q = `select * from ${entity}`;
    
    // Check for count
    if (criteria && (criteria.count || (_.isArray(criteria) && criteria.some((x:any) => x.field === 'count')))) {
        q = `select count(*) from ${entity}`;
    }

    const sqlRaw = criteriaToString(criteria); // Helper returns " where ..."
    // Legacy criteriaToString includes "maxresults" etc appended. 
    // We append the SQL criteria to the select statement.
    
    // Naive merge:
    q += sqlRaw; 
    
    const p = this.request('GET', url, null, {}, { qs: { query: q } })
       .then(data => data.QueryResponse);
       
    return this.handleCallback(p, callback);
  }

  public report(reportType: string, criteria: any, callback?: any) {
    const url = `/reports/${reportType}`;
    // report criteria are just query params
    const p = this.request('GET', url, null, {}, { qs: criteria || {} });
    return this.handleCallback(p, callback);
  }

  public batch(items: any[], callback?: any) {
    const p = this.request('POST', '/batch', { BatchItemRequest: items });
    return this.handleCallback(p, callback);
  }

  public changeDataCapture(entities: string[] | string, since: Date | string, callback?: any) {
    let url = '/cdc?entities=';
    url += typeof entities === 'string' ? entities : entities.join(',');
    url += '&changedSince=';
    url += typeof since === 'string' ? since : formatISO(since);
    
    const p = this.request('GET', url);
    return this.handleCallback(p, callback);
  }

  public upload(filename: string, contentType: string, stream: any, entityType: string | any, entityId?: string, callback?: any) {
    // This is complex to port 1:1 without 'form-data' or similar if using Streams in Node with Axios.
    // For now, we will throw Not Implemented or implement a basic version if required.
    // Given the constraints and dependencies, this is a placeholder to ensure compilation.
    const err = new Error("Upload not yet fully implemented in TypeScript port.");
    const cb = _.isFunction(entityType) ? entityType : callback;
    if (cb) return cb(err);
    return Promise.reject(err);
  }

  // --- Helper Methods ---

  public getUserInfo(callback?: any) {
    const p = this.request('GET', QuickBooks.USER_INFO_URL);
    return this.handleCallback(p, callback);
  }

  // --- Dynamic Method Injection ---
  // To keep the API compatible, we attach methods for known entities.
  
  // Method mapping
  [key: string]: any;
}

// Populate prototype with dynamic methods
const createEntities = [
  'account','attachable','bill','billPayment','class','creditMemo','customer',
  'department','employee','estimate','invoice','item','journalEntry','payment',
  'paymentMethod','purchase','purchaseOrder','refundReceipt','salesReceipt',
  'taxAgency','taxService','term','timeActivity','transfer','vendor','vendorCredit'
];

const updateEntities = [
  'account','attachable','bill','billPayment','class','companyInfo','creditMemo',
  'customer','department','deposit','employee','estimate','invoice','item',
  'journalCode','journalEntry','payment','paymentMethod','preferences','purchase',
  'purchaseOrder','refundReceipt','salesReceipt','taxAgency','taxCode','taxRate',
  'term','timeActivity','transfer','vendor','vendorCredit','exchangeRate'
];

const deleteEntities = [
  'attachable','bill','billPayment','creditMemo','deposit','estimate','invoice',
  'journalCode','journalEntry','payment','purchase','purchaseOrder','refundReceipt',
  'salesReceipt','timeActivity','transfer','vendorCredit'
];

const readEntities = [
  'account','attachable','bill','billPayment','class','companyInfo','companyCurrency',
  'creditMemo','customer','customerType','department','deposit','employee','estimate',
  'exchangeRate','invoice','item','journalCode','journalEntry','payment','paymentMethod',
  'preferences','purchase','purchaseOrder','refundReceipt','reports','salesReceipt',
  'taxAgency','taxCode','taxRate','term','timeActivity','transfer','vendor','vendorCredit'
];

const queryEntities = [
  'account','attachable','bill','billPayment','budget','class','companyInfo','companyCurrency',
  'creditMemo','customer','customerType','department','deposit','employee','estimate',
  'exchangeRate','invoice','item','journalCode','journalEntry','payment','paymentMethod',
  'preferences','purchase','purchaseOrder','refundReceipt','salesReceipt','taxAgency',
  'taxCode','taxRate','term','timeActivity','transfer','vendor','vendorCredit'
];

const reportEntities = [
  'BalanceSheet','ProfitAndLoss','ProfitAndLossDetail','TrialBalance','TrialBalanceFR',
  'CashFlow','InventoryValuationSummary','CustomerSales','ItemSales','CustomerIncome',
  'CustomerBalance','CustomerBalanceDetail','AgedReceivables','AgedReceivableDetail',
  'VendorBalance','VendorBalanceDetail','AgedPayables','AgedPayableDetail','VendorExpenses',
  'TransactionList','TransactionListWithSplits','TransactionListByCustomer',
  'TransactionListByVendor','GeneralLedger','TaxSummary','DepartmentSales','ClassSales',
  'AccountList','JournalReport'
];

// Attach methods
createEntities.forEach(e => {
  QuickBooks.prototype[`create${capitalize(e)}`] = function(this: QuickBooks, entity: any, cb: any) {
    return this.create(e, entity, cb);
  };
});

readEntities.forEach(e => {
  QuickBooks.prototype[`get${capitalize(e)}`] = function(this: QuickBooks, id: string, cb: any) {
    return this.read(e, id, cb);
  };
});

updateEntities.forEach(e => {
  QuickBooks.prototype[`update${capitalize(e)}`] = function(this: QuickBooks, entity: any, cb: any) {
    return this.update(e, entity, cb);
  };
});

deleteEntities.forEach(e => {
  QuickBooks.prototype[`delete${capitalize(e)}`] = function(this: QuickBooks, idOrEntity: any, cb: any) {
    return this.delete(e, idOrEntity, cb);
  };
});

queryEntities.forEach(e => {
    const pluralize = (s: string) => {
        if (s.endsWith('s')) return s + 'es';
        if (s.endsWith('y')) return s.substring(0, s.length - 1) + 'ies';
        return s + 's';
    };
    
    const name = `find${pluralize(capitalize(e))}`;
    QuickBooks.prototype[name] = function(this: QuickBooks, criteria: any, cb: any) {
        return this.query(e, criteria, cb);
    };
});

reportEntities.forEach(e => {
    const name = `report${e}`;
    QuickBooks.prototype[name] = function(this: QuickBooks, options: any, cb: any) {
        return this.report(e, options, cb);
    };
});

export default QuickBooks;
