"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickBooks = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const oauth_1_0a_1 = __importDefault(require("oauth-1.0a"));
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const fast_xml_parser_1 = require("fast-xml-parser");
const _ = __importStar(require("lodash"));
const utils_1 = require("./utils");
const version = '3.0.0';
const xmlParser = new fast_xml_parser_1.XMLParser();
class QuickBooks {
    constructor(consumerKeyOrConfig, consumerSecret, token, tokenSecret, realmId, useSandbox, debug, minorversion, oauthversion, refreshToken) {
        let config;
        if (typeof consumerKeyOrConfig === 'object') {
            config = consumerKeyOrConfig;
        }
        else {
            config = {
                consumerKey: consumerKeyOrConfig,
                consumerSecret: consumerSecret,
                token: token,
                tokenSecret: typeof tokenSecret === 'string' ? tokenSecret : undefined,
                realmId: realmId,
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
    async request(verb, url, data = null, headers = {}, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.endpoint}${this.realmId}${url}`;
        // Query string handling for special characters in SQL
        let queryString = '';
        if (options.qs) {
            // Custom query string assembly to match legacy behavior and handle escaping
            const params = new URLSearchParams();
            // Basic params
            if (options.qs.minorversion)
                params.append('minorversion', String(options.qs.minorversion));
            if (options.qs.requestid)
                params.append('requestid', options.qs.requestid);
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
        const reqHeaders = {
            'User-Agent': `node-quickbooks: version ${version}`,
            'Request-Id': (0, uuid_1.v4)(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...headers
        };
        if (this.oauthversion === '2.0') {
            reqHeaders['Authorization'] = `Bearer ${this.token}`;
        }
        else {
            const oauth = new oauth_1_0a_1.default({
                consumer: { key: this.consumerKey, secret: this.consumerSecret },
                signature_method: 'HMAC-SHA1',
                hash_function: (base_string, key) => crypto.createHmac('sha1', key).update(base_string).digest('base64')
            });
            const authData = oauth.authorize({ url: requestUrl, method: verb }, { key: this.token, secret: this.tokenSecret });
            reqHeaders['Authorization'] = oauth.toHeader(authData).Authorization;
        }
        if (this.debug) {
            console.log(`Invoking: ${verb.toUpperCase()} ${requestUrl}`);
            if (data)
                console.log(JSON.stringify(data, null, 2));
        }
        try {
            const response = await (0, axios_1.default)({
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
        }
        catch (error) {
            if (this.debug && error.response) {
                console.log('Error Response:', JSON.stringify(error.response.data, null, 2));
            }
            // Normalize error to match legacy behavior
            const errBody = error.response ? error.response.data : error;
            throw errBody;
        }
    }
    // --- Dynamic Method Implementations (Helpers) ---
    unwrap(data, entityName) {
        const name = (0, utils_1.capitalize)(entityName);
        return (data || {})[name] || data;
    }
    handleCallback(promise, cb) {
        if (cb) {
            promise.then(data => cb(null, data)).catch(err => cb(err));
        }
        else {
            return promise;
        }
    }
    // --- CRUD Operations ---
    create(entityName, entity, callback) {
        const url = `/${entityName.toLowerCase()}`;
        const p = this.request('POST', url, entity)
            .then(data => this.unwrap(data, entityName));
        return this.handleCallback(p, callback);
    }
    read(entityName, id, callback) {
        const url = `/${entityName.toLowerCase()}/${id}`;
        const p = this.request('GET', url)
            .then(data => this.unwrap(data, entityName));
        return this.handleCallback(p, callback);
    }
    update(entityName, entity, callback) {
        if (!entity.Id || !entity.SyncToken) {
            // Allow ExchangeRate update which handles it differently in legacy, but generally QBO requires Id/SyncToken
            if (entityName.toLowerCase() !== 'exchangerate') {
                const err = new Error(`${entityName} must contain Id and SyncToken fields`);
                if (callback)
                    return callback(err);
                return Promise.reject(err);
            }
        }
        const url = `/${entityName.toLowerCase()}?operation=update`;
        const p = this.request('POST', url, entity)
            .then(data => this.unwrap(data, entityName));
        return this.handleCallback(p, callback);
    }
    delete(entityName, idOrEntity, callback) {
        const url = `/${entityName.toLowerCase()}?operation=delete`;
        let promise;
        if (_.isObject(idOrEntity)) {
            promise = this.request('POST', url, idOrEntity);
        }
        else {
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
    query(entity, criteria, callback) {
        let queryStr = '';
        if (!criteria)
            criteria = {};
        // Handle "Select count(*)" optimization legacy logic
        // (Simplified for this migration: legacy modifies URL directly in complex ways)
        // We will assume standard select * unless count prop is present
        let url = `/query`;
        let q = `select * from ${entity}`;
        // Check for count
        if (criteria && (criteria.count || (_.isArray(criteria) && criteria.some((x) => x.field === 'count')))) {
            q = `select count(*) from ${entity}`;
        }
        const sqlRaw = (0, utils_1.criteriaToString)(criteria); // Helper returns " where ..."
        // Legacy criteriaToString includes "maxresults" etc appended. 
        // We append the SQL criteria to the select statement.
        // Naive merge:
        q += sqlRaw;
        const p = this.request('GET', url, null, {}, { qs: { query: q } })
            .then(data => data.QueryResponse);
        return this.handleCallback(p, callback);
    }
    report(reportType, criteria, callback) {
        const url = `/reports/${reportType}`;
        // report criteria are just query params
        const p = this.request('GET', url, null, {}, { qs: criteria || {} });
        return this.handleCallback(p, callback);
    }
    batch(items, callback) {
        const p = this.request('POST', '/batch', { BatchItemRequest: items });
        return this.handleCallback(p, callback);
    }
    changeDataCapture(entities, since, callback) {
        let url = '/cdc?entities=';
        url += typeof entities === 'string' ? entities : entities.join(',');
        url += '&changedSince=';
        url += typeof since === 'string' ? since : (0, date_fns_1.formatISO)(since);
        const p = this.request('GET', url);
        return this.handleCallback(p, callback);
    }
    upload(filename, contentType, stream, entityType, entityId, callback) {
        // This is complex to port 1:1 without 'form-data' or similar if using Streams in Node with Axios.
        // For now, we will throw Not Implemented or implement a basic version if required.
        // Given the constraints and dependencies, this is a placeholder to ensure compilation.
        const err = new Error("Upload not yet fully implemented in TypeScript port.");
        const cb = _.isFunction(entityType) ? entityType : callback;
        if (cb)
            return cb(err);
        return Promise.reject(err);
    }
    // --- Helper Methods ---
    getUserInfo(callback) {
        const p = this.request('GET', QuickBooks.USER_INFO_URL);
        return this.handleCallback(p, callback);
    }
}
exports.QuickBooks = QuickBooks;
QuickBooks.APP_CENTER_BASE = 'https://appcenter.intuit.com';
QuickBooks.V3_ENDPOINT_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company/';
QuickBooks.TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
QuickBooks.REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
QuickBooks.USER_INFO_URL = 'https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo';
// Populate prototype with dynamic methods
const createEntities = [
    'account', 'attachable', 'bill', 'billPayment', 'class', 'creditMemo', 'customer',
    'department', 'employee', 'estimate', 'invoice', 'item', 'journalEntry', 'payment',
    'paymentMethod', 'purchase', 'purchaseOrder', 'refundReceipt', 'salesReceipt',
    'taxAgency', 'taxService', 'term', 'timeActivity', 'transfer', 'vendor', 'vendorCredit'
];
const updateEntities = [
    'account', 'attachable', 'bill', 'billPayment', 'class', 'companyInfo', 'creditMemo',
    'customer', 'department', 'deposit', 'employee', 'estimate', 'invoice', 'item',
    'journalCode', 'journalEntry', 'payment', 'paymentMethod', 'preferences', 'purchase',
    'purchaseOrder', 'refundReceipt', 'salesReceipt', 'taxAgency', 'taxCode', 'taxRate',
    'term', 'timeActivity', 'transfer', 'vendor', 'vendorCredit', 'exchangeRate'
];
const deleteEntities = [
    'attachable', 'bill', 'billPayment', 'creditMemo', 'deposit', 'estimate', 'invoice',
    'journalCode', 'journalEntry', 'payment', 'purchase', 'purchaseOrder', 'refundReceipt',
    'salesReceipt', 'timeActivity', 'transfer', 'vendorCredit'
];
const readEntities = [
    'account', 'attachable', 'bill', 'billPayment', 'class', 'companyInfo', 'companyCurrency',
    'creditMemo', 'customer', 'customerType', 'department', 'deposit', 'employee', 'estimate',
    'exchangeRate', 'invoice', 'item', 'journalCode', 'journalEntry', 'payment', 'paymentMethod',
    'preferences', 'purchase', 'purchaseOrder', 'refundReceipt', 'reports', 'salesReceipt',
    'taxAgency', 'taxCode', 'taxRate', 'term', 'timeActivity', 'transfer', 'vendor', 'vendorCredit'
];
const queryEntities = [
    'account', 'attachable', 'bill', 'billPayment', 'budget', 'class', 'companyInfo', 'companyCurrency',
    'creditMemo', 'customer', 'customerType', 'department', 'deposit', 'employee', 'estimate',
    'exchangeRate', 'invoice', 'item', 'journalCode', 'journalEntry', 'payment', 'paymentMethod',
    'preferences', 'purchase', 'purchaseOrder', 'refundReceipt', 'salesReceipt', 'taxAgency',
    'taxCode', 'taxRate', 'term', 'timeActivity', 'transfer', 'vendor', 'vendorCredit'
];
const reportEntities = [
    'BalanceSheet', 'ProfitAndLoss', 'ProfitAndLossDetail', 'TrialBalance', 'TrialBalanceFR',
    'CashFlow', 'InventoryValuationSummary', 'CustomerSales', 'ItemSales', 'CustomerIncome',
    'CustomerBalance', 'CustomerBalanceDetail', 'AgedReceivables', 'AgedReceivableDetail',
    'VendorBalance', 'VendorBalanceDetail', 'AgedPayables', 'AgedPayableDetail', 'VendorExpenses',
    'TransactionList', 'TransactionListWithSplits', 'TransactionListByCustomer',
    'TransactionListByVendor', 'GeneralLedger', 'TaxSummary', 'DepartmentSales', 'ClassSales',
    'AccountList', 'JournalReport'
];
// Attach methods
createEntities.forEach(e => {
    QuickBooks.prototype[`create${(0, utils_1.capitalize)(e)}`] = function (entity, cb) {
        return this.create(e, entity, cb);
    };
});
readEntities.forEach(e => {
    QuickBooks.prototype[`get${(0, utils_1.capitalize)(e)}`] = function (id, cb) {
        return this.read(e, id, cb);
    };
});
updateEntities.forEach(e => {
    QuickBooks.prototype[`update${(0, utils_1.capitalize)(e)}`] = function (entity, cb) {
        return this.update(e, entity, cb);
    };
});
deleteEntities.forEach(e => {
    QuickBooks.prototype[`delete${(0, utils_1.capitalize)(e)}`] = function (idOrEntity, cb) {
        return this.delete(e, idOrEntity, cb);
    };
});
queryEntities.forEach(e => {
    const pluralize = (s) => {
        if (s.endsWith('s'))
            return s + 'es';
        if (s.endsWith('y'))
            return s.substring(0, s.length - 1) + 'ies';
        return s + 's';
    };
    const name = `find${pluralize((0, utils_1.capitalize)(e))}`;
    QuickBooks.prototype[name] = function (criteria, cb) {
        return this.query(e, criteria, cb);
    };
});
reportEntities.forEach(e => {
    const name = `report${e}`;
    QuickBooks.prototype[name] = function (options, cb) {
        return this.report(e, options, cb);
    };
});
exports.default = QuickBooks;
