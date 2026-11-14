import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetaTracker,productEvent} from '../lib/meta-pixel.mjs';

test('missing or placeholder IDs never load Meta or initialize a queue',()=>{
  for(const id of [undefined,'','YOUR_PIXEL_ID','123abc']) {
    const browser={};let loaded=false;
    createMetaTracker(id,browser,()=>{loaded=true;}).track('PageView');
    assert.equal(loaded,false);assert.equal(browser.fbq,undefined);
  }
});
test('queues events during script loading, avoids duplicates, and scopes page event IDs',()=>{
  const browser={crypto:{randomUUID:()=> 'test-page'}};let loads=0;
  const tracker=createMetaTracker('123456789012345',browser,()=>{loads++;});
  tracker.track('PageView');tracker.track('PageView');
  tracker.track('InitiateCheckout',productEvent(179,2));tracker.track('InitiateCheckout',productEvent(179,2));
  assert.equal(loads,1);
  assert.deepEqual(browser.fbq.queue[0],['set','autoConfig',false,'123456789012345']);
  const events=browser.fbq.queue.filter(call=>call[0]==='trackSingle');
  assert.equal(events.length,2);
  assert.equal(events[0][4].eventID,'test-page-PageView');
  assert.equal(events[1][3].value,358);
  assert.equal(events[1][3].currency,'MAD');
});
test('confirmed orders use distinct stable purchase IDs',()=>{
  const browser={};const tracker=createMetaTracker('123456789012345',browser,()=>{});
  tracker.track('Purchase',productEvent(179,1),'purchase-order-one');
  tracker.track('Purchase',productEvent(179,1),'purchase-order-one');
  tracker.track('Purchase',productEvent(179,2),'purchase-order-two');
  const purchases=browser.fbq.queue.filter(call=>call[2]==='Purchase');
  assert.equal(purchases.length,2);
  assert.equal(purchases[0][4].eventID,'purchase-order-one');
  assert.equal(purchases[1][3].value,358);
});
test('product payloads contain only the product and purchase value',()=>{
  assert.deepEqual(Object.keys(productEvent(179)).sort(),['content_ids','content_name','content_type','contents','currency','num_items','value']);
});
test('analytics failures never throw into checkout',()=>{
  const tracker=createMetaTracker('123456789012345',{fbq(){throw new Error('blocked');}},()=>{});
  assert.doesNotThrow(()=>tracker.track('Purchase',productEvent(179),'purchase-test'));
});

test('saved leads use stable order IDs and do not duplicate on retries',()=>{
  const browser={};const tracker=createMetaTracker('123456789012345',browser,()=>{});
  tracker.track('Lead',productEvent(179,1),'lead-order-one');
  tracker.track('Lead',productEvent(179,1),'lead-order-one');
  const events=browser.fbq.queue.filter(call=>call[2]==='Lead');
  assert.equal(events.length,1);
  assert.equal(events[0][4].eventID,'lead-order-one');
});
