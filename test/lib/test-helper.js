module.exports = class TestHelper {
  constructor() {
    this.expect = require('expect.js');
    this.delay = require('await-delay');
    this.path = require('path');
    this.why = require('why-is-node-running');
  }
  static create() {
    return new TestHelper();
  }
  name(filename, depth = 4) {
    const segments = filename.split(this.path.sep);
    if (segments.length < depth) return segments.join(' / ');
    return segments.slice(segments.length - depth).join(' / ');
  }
};
