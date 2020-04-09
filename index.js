const {EventEmitter} = require('events');

module.exports = (iterator, maxBuffer) => {
  const buf = [];
  const itemBuffered = new EventEmitter();
  let filling = false;
  let done = false;

  const upstream = iterator[Symbol.asyncIterator]();
  let upstreamDone = false;

  const next = async () => {
    // done is done
    if (done) {
      return {done: true};
    }

    // if there's a buffered item, use it
    if (buf.length > 0) {
      const item = buf.shift();
      if (item.done) {
        done = true;
      }
      maybeFill();
      return item;
    } else {
      // nothing buffered, so queue a promise that will resolve when
      // something is (may be) available
      const p = new Promise(resolve => itemBuffered.once('buf', resolve));
      maybeFill();
      return p.then(next);
    }
  };

  const maybeFill = () => {
    if (filling) {
      return;
    }
    if (buf.length < maxBuffer && !upstreamDone) {
      filling = true;
      upstream.next().then(item => {
        filling = false;
        upstreamDone = item.done;
        buf.push(item);
        itemBuffered.emit('buf')
        maybeFill();
      });
    }
  };
  
  const iter = {
    [Symbol.asyncIterator]: () => ({next}),
  };
  Object.defineProperty(iter, 'length', {
    get: () => buf.length,
  });
  return iter;
};
