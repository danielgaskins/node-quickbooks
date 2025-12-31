import { expect } from 'chai';
import config from './config';
import QuickBooks from '../src/index';
import { subMinutes } from 'date-fns';

const qbo = new QuickBooks(config);

describe('Change Data Capture', function() {
  this.timeout(30000);

  it('should create an Attachable and capture the change', async () => {
    // 1. Create
    const attachable = await qbo.createAttachable({ Note: 'CDC Attachable', Tag: 'Testing' });
    expect(attachable.Note).to.equal('CDC Attachable');

    // 2. CDC
    // Look back 5 minutes to ensure we catch it
    const since = subMinutes(new Date(), 5);
    const response = await qbo.changeDataCapture(['Attachable'], since);
    
    // 3. Verify
    const cdcResponse = response.CDCResponse[0];
    expect(cdcResponse.QueryResponse).to.exist;
    
    // 4. Cleanup
    await qbo.deleteAttachable(attachable.Id);
  });
});
