# buffered-async-iterator

`buffer` wraps an async iterator into another async iterator, buffering items
from the wrapped async iterator.  This buffering allows the inner iterator to
produce items concurrently with consumption of the items from the outer
iterator.  An example will help:

```js
const buffer = require('buffered-async-iterator');

const someSlowIterator = ..;

for await (let item of buffer(someSlowIterator, 20)) {
  await someSlowOperation(item);
}
```

Here, `someSlowIterator` can slowly produce items (perhaps it is querying them
from a database) and we can perform `someSlowOperation` on those items (perhaps
calling some HTTP API).  Both the DB queries and the HTTP calls will happen
concurrently.

Without this functionality (that is, with `for await (let item of
someSlowIterator)`), the DB queries and the HTTP calls would alternate, each
unnecessarily waiting for the other.

The buffer has a `length` property which gives the current number of buffered
items.

```js
const buf = buffer(someSlowIterator, 20);
for await (let item of buffer) {
  await someSlowOperation(item);
  console.log(`${buf.length} items currently buffered`);
}
```

# Inspiration

Inspired by https://github.com/mirkokiefer/async-iterators but updated for modern async iterators
