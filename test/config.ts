export default {
  consumerKey:     process.env.QB_CONSUMER_KEY || '',
  consumerSecret:  process.env.QB_CONSUMER_SECRET || '',
  token:           process.env.QB_OAUTH_TOKEN || '',
  tokenSecret:     process.env.QB_OAUTH_TOKEN_SECRET || '',
  realmId:         process.env.QB_REALM_ID || '',
  useSandbox:      true,
  debug:           false,
  testEmail:       process.env.QB_TEST_EMAIL || '',
  minorversion:    '' 
};
