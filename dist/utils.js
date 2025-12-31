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
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = exports.criteriaToString = exports.toCriterion = exports.checkProperty = exports.isNumeric = void 0;
const _ = __importStar(require("lodash"));
const isNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
};
exports.isNumeric = isNumeric;
const checkProperty = (field, name) => {
    return field && field.toLowerCase() === name;
};
exports.checkProperty = checkProperty;
const toCriterion = (c) => {
    const fields = _.keys(c);
    if (_.intersection(fields, ['field', 'value']).length === 2) {
        return [{
                field: c.field,
                value: c.value,
                operator: c.operator || '='
            }];
    }
    else {
        return fields.map((k) => ({
            field: k,
            value: c[k],
            operator: _.isArray(c[k]) ? 'IN' : '='
        }));
    }
};
exports.toCriterion = toCriterion;
const criteriaToString = (criteria) => {
    if (_.isString(criteria))
        return criteria.indexOf(' ') === 0 ? criteria : " " + criteria;
    const cs = _.isArray(criteria) ? criteria.map(exports.toCriterion) : (0, exports.toCriterion)(criteria);
    const flattened = _.flatten(cs);
    let sql = '';
    let limit, offset, desc, asc;
    for (let i = 0; i < flattened.length; i++) {
        const criterion = flattened[i];
        if ((0, exports.checkProperty)(criterion.field, 'fetchall'))
            continue;
        if ((0, exports.checkProperty)(criterion.field, 'limit')) {
            limit = criterion.value;
            continue;
        }
        if ((0, exports.checkProperty)(criterion.field, 'offset')) {
            offset = criterion.value;
            continue;
        }
        if ((0, exports.checkProperty)(criterion.field, 'desc')) {
            desc = criterion.value;
            continue;
        }
        if ((0, exports.checkProperty)(criterion.field, 'asc')) {
            asc = criterion.value;
            continue;
        }
        if (sql !== '')
            sql += ' and ';
        sql += criterion.field + ' ' + criterion.operator + ' ';
        const quote = (x) => {
            // Correctly escape single quotes
            return _.isString(x) ? "'" + x.replace(/'/g, "\'") + "'" : x;
        };
        if (_.isArray(criterion.value)) {
            sql += '(' + criterion.value.map(quote).join(',') + ')';
        }
        else {
            sql += quote(criterion.value);
        }
    }
    if (sql !== '')
        sql = ' where ' + sql;
    if (asc)
        sql += ' orderby ' + asc + ' asc';
    if (desc)
        sql += ' orderby ' + desc + ' desc';
    sql += ' startposition ' + (offset || 1);
    sql += ' maxresults ' + (limit || 1000);
    return sql;
};
exports.criteriaToString = criteriaToString;
const capitalize = (s) => {
    return s.substring(0, 1).toUpperCase() + s.substring(1);
};
exports.capitalize = capitalize;
