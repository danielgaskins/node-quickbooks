import * as _ from 'lodash';

export const isNumeric = (n: any): boolean => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

export const checkProperty = (field: any, name: string): boolean => {
  return field && field.toLowerCase() === name;
};

export const toCriterion = (c: any): any[] => {
  const fields = _.keys(c);
  if (_.intersection(fields, ['field', 'value']).length === 2) {
    return [{
      field: c.field,
      value: c.value,
      operator: c.operator || '='
    }];
  } else {
    return fields.map((k) => ({
      field: k,
      value: c[k],
      operator: _.isArray(c[k]) ? 'IN' : '='
    }));
  }
};

export const criteriaToString = (criteria: any): string => {
  if (_.isString(criteria)) return criteria.indexOf(' ') === 0 ? criteria : " " + criteria;
  
  const cs = _.isArray(criteria) ? criteria.map(toCriterion) : toCriterion(criteria);
  const flattened = _.flatten(cs);
  let sql = '';
  let limit, offset, desc, asc;

  for (let i = 0; i < flattened.length; i++) {
    const criterion = flattened[i];
    if (checkProperty(criterion.field, 'fetchall')) continue;
    if (checkProperty(criterion.field, 'limit')) {
      limit = criterion.value;
      continue;
    }
    if (checkProperty(criterion.field, 'offset')) {
      offset = criterion.value;
      continue;
    }
    if (checkProperty(criterion.field, 'desc')) {
      desc = criterion.value;
      continue;
    }
    if (checkProperty(criterion.field, 'asc')) {
      asc = criterion.value;
      continue;
    }
    
    if (sql !== '') sql += ' and ';
    
    sql += criterion.field + ' ' + criterion.operator + ' ';
    
    const quote = (x: any) => {
      // Correctly escape single quotes
      return _.isString(x) ? "'" + x.replace(/'/g, "\'") + "'" : x;
    };
    
    if (_.isArray(criterion.value)) {
      sql += '(' + criterion.value.map(quote).join(',') + ')';
    } else {
      sql += quote(criterion.value);
    }
  }
  
  if (sql !== '') sql = ' where ' + sql;
  if (asc) sql += ' orderby ' + asc + ' asc';
  if (desc) sql += ' orderby ' + desc + ' desc';
  
  sql += ' startposition ' + (offset || 1);
  sql += ' maxresults ' + (limit || 1000);
  
  return sql;
};

export const capitalize = (s: string): string => {
  return s.substring(0, 1).toUpperCase() + s.substring(1);
};
