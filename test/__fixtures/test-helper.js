module.exports = class TestHelper {
  constructor() {
    this.expect = require('expect.js');
    this.delay = require('await-delay');
    this.path = require('path');
    this.why = require('why-is-node-running');
    this.util = require('util');
  }
  static create() {
    return new TestHelper();
  }
  name(filename, depth = 4) {
    const segments = filename.split(this.path.sep);
    if (segments.length < depth) return segments.join(' / ');
    return segments.slice(segments.length - depth).join(' / ');
  }
  fixturesPath(append) {
    if (typeof append === 'string') return `${__dirname}${this.path.sep}${append}`;
    return __dirname;
  }
  log(msg) {
    if (typeof msg === 'object') msg = JSON.stringify(msg, null, 2)
    console.log(msg);
  }
  async listOpenHandles(ms) {
    this.log(`about to list open handles in ${ms}ms`);
    await this.delay(ms || 0);
    this.why();
  }
};
