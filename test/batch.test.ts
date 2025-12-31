import { expect } from 'chai';
import config from './config';
import QuickBooks from '../src/index';

const qbo = new QuickBooks(config);

describe('Batch Api', function() {
  this.timeout(60000);

  it('should create 5 Attachables in one batch', async () => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push({
        bId: `bid${i}`,
        operation: 'create',
        Attachable: {
          Note: 'Test Attachable ' + i,
          Tag: 'BatchTesting'
        }
      });
    }

    // 1. Batch Create
    const batchResponse = await qbo.batch(items);
    expect(batchResponse.BatchItemResponse.length).to.equal(5);
    
    batchResponse.BatchItemResponse.forEach((item: any) => {
      expect(item.Attachable.Tag).to.equal('BatchTesting');
    });

    // 2. Cleanup (Find and Delete)
    const list = await qbo.findAttachables({ Tag: 'BatchTesting' });
    const attachables = list.QueryResponse.Attachable || [];
    
    // Cleanup sequentially to avoid rate limits
    for (const att of attachables) {
        await qbo.deleteAttachable(att.Id);
    }
  });
});
