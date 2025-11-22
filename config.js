module.exports = {
  consumerKey:     process.env.QB_CONSUMER_KEY || '',
  consumerSecret:  process.env.QB_CONSUMER_SECRET || '',
  token:           process.env.QB_OAUTH_TOKEN || '',
  tokenSecret:     process.env.QB_OAUTH_TOKEN_SECRET || '',
  realmId:         process.env.QB_REALM_ID || '',
  useSandbox:      true,
  debug:           false,
  //
  // Set useSandbox to false when moving to production. For info, see the following url:
  // https://developer.intuit.com/v2/blog/2014/10/24/intuit-developer-now-offers-quickbooks-sandboxes

  testEmail:       process.env.QB_TEST_EMAIL || '',  // Use this email address for testing send*Pdf functions
  minorversion: '' // Use to set minorversion for request
}
