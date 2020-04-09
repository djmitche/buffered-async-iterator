const assert = require('assert').strict;
const buffer = require('.');

describe('buffer', function() {
  // a range function that makes items as fast as possible
  async function* range(N) {
    for (let i = 0; i < N; i++) {
      yield i;
    }
  }

  // a range function that takes 1ms per item
  async function* slowRange(N) {
    for (let i = 0; i < N; i++) {
      await new Promise(res => setTimeout(res, 1));
      yield i;
    }
  }

  // annotate events on an interator by pushing items to output
  async function* annotate(iter, prefix, output) {
    for await (let item of iter) {
      output.push(`${prefix}${item}`);
      yield item;
    }
  }

  // compose multiple functions; compose(f, g, h) is the same as f(g(h()))
  function compose(...args) {
    let r = undefined;
    for (i = args.length - 1; i >= 0; i--) {
      r = args[i](r);
    }
    return r;
  }

  // assert that the iterator produces the expected result
  async function assertIter(iter, slow, expected) {
    let got = [];
    for await (let item of iter) {
      got.push(item);
      if (slow) {
        await new Promise(res => setTimeout(res, 1));
      }
    }
    assert.deepEqual(got, expected);
  }

  it('buffers a slow iterator with buffer size 1', async function() {
    const evts = [];
    await assertIter(
      compose(
        iter => annotate(iter, 'out-', evts),
        iter => buffer(iter, 1),
        iter => annotate(iter, 'in-', evts),
        () => slowRange(4)
      ), false, [0, 1, 2, 3]);
    assert.deepEqual(evts, ['in-0', 'out-0', 'in-1', 'out-1', 'in-2', 'out-2', 'in-3', 'out-3'])
  });

  it('buffers a slow iterator with buffer size 10', async function() {
    const evts = [];
    await assertIter(
      compose(
        iter => annotate(iter, 'out-', evts),
        iter => buffer(iter, 10),
        iter => annotate(iter, 'in-', evts),
        () => slowRange(4)
      ), false, [0, 1, 2, 3]);
    assert.deepEqual(evts, ['in-0', 'out-0', 'in-1', 'out-1', 'in-2', 'out-2', 'in-3', 'out-3'])
  });

  it('buffers with a slow consumer with buffer size 1', async function() {
    const evts = [];
    await assertIter(
      compose(
        iter => annotate(iter, 'out-', evts),
        iter => buffer(iter, 1),
        iter => annotate(iter, 'in-', evts),
        () => range(4)
      ), true, [0, 1, 2, 3]);
    // note that item 0 is returned immediately and item 1 is buffered
    assert.deepEqual(evts, ['in-0', 'in-1', 'out-0', 'out-1', 'in-2', 'out-2', 'in-3', 'out-3'])
  });

  it('buffers a slow consumer with buffer size 10', async function() {
    const evts = [];
    await assertIter(
      compose(
        iter => annotate(iter, 'out-', evts),
        iter => buffer(iter, 10),
        iter => annotate(iter, 'in-', evts),
        () => range(6)
      ), true, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(evts, [
      'in-0',
      'in-1',
      // item 0 is returned immediately, and the remainder load while it is being consumed
      'out-0',
      'in-2',
      'in-3',
      'in-4',
      'in-5',
      'out-1',
      'out-2',
      'out-3',
      'out-4',
      'out-5',
    ])
  });

  it('has a length property', async function() {
    const buf = buffer(range(6), 10);
    const iter = buf[Symbol.asyncIterator]();
    // start it up..
    await iter.next();
    // give it a beat to accumulate the rest of the range..
    await new Promise(res => setTimeout(res, 1));
    assert(buf.length > 1);
  });
});
