import _ from 'lodash';
import net from 'net';
import assert from 'assert-diff';
import setupAPI from './setup-api';
import {RippleAPI} from 'ripple-api';
import ledgerClose from './fixtures/rippled/ledger-close.json';
const utils = RippleAPI._PRIVATE.ledgerUtils;


const TIMEOUT = 200000;   // how long before each test case times out
const isBrowser = (process as any).browser;

function createServer() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('listening', function() {
      resolve(server);
    });
    server.on('error', function(error) {
      reject(error);
    });
    server.listen(0, '0.0.0.0');
  });
}

describe('Connection', function() {
  this.timeout(TIMEOUT);
  beforeEach(setupAPI.setup);
  afterEach(setupAPI.teardown);

  it('default options', function() {
    const connection: any = new utils.common.Connection('url');
    assert.strictEqual(connection._url, 'url');
    assert(_.isUndefined(connection._proxyURL));
    assert(_.isUndefined(connection._authorization));
  });

  describe('trace', () => {
    const message1 = '{"type": "transaction"}';
    const message2 = '{"type": "path_find"}';
    const expectedMessages = [['send', message1], ['receive', message2]];
    const originalConsoleLog = console.log;

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('as false', function() {
      const messages = [];
      console.log = (id, msg) => messages.push([id, msg]);
      const connection: any = new utils.common.Connection('url', {trace: false});
      connection._ws = {send: function() {}};
      connection._send(message1);
      connection._onMessage(message2);
      assert.deepEqual(messages, []);
    });

    it('as true', function() {
      const messages = [];
      console.log = (id, msg) => messages.push([id, msg]);
      const connection: any = new utils.common.Connection('url', {trace: true});
      connection._ws = {send: function() {}};
      connection._send(message1);
      connection._onMessage(message2);
      assert.deepEqual(messages, expectedMessages);
    });

    it('as a function', function() {
      const messages = [];
      const connection: any = new utils.common.Connection('url', {
        trace: (id, msg) => messages.push([id, msg])
      });
      connection._ws = {send: function() {}};
      connection._send(message1);
      connection._onMessage(message2);
      assert.deepEqual(messages, expectedMessages);
    });
  });

  it('with proxy', function(done) {
    if (isBrowser) {
      done();
      return;
    }
    createServer().then((server: any) => {
      const port = server.address().port;
      const expect = 'CONNECT localhost';
      server.on('connection', socket => {
        socket.on('data', data => {
          const got = data.toString('ascii', 0, expect.length);
          assert.strictEqual(got, expect);
          server.close();
          connection.disconnect();
          done();
        });
      });

      const options = {
        proxy: 'ws://localhost:' + port,
        authorization: 'authorization',
        trustedCertificates: ['path/to/pem']
      };
      const connection = new utils.common.Connection(this.api.connection._url, options);
      connection.connect().catch((err) => {
        assert(err instanceof this.api.errors.NotConnectedError);
      });
    }, done);
  });

  it('Multiply disconnect calls', function() {
    this.api.disconnect();
    return this.api.disconnect();
  });

  it('reconnect', function() {
    return this.api.connection.reconnect();
  });

  it('NotConnectedError', function() {
    const connection = new utils.common.Connection('url');
    return connection.getLedgerVersion().then(() => {
      assert(false, 'Should throw NotConnectedError');
    }).catch(error => {
      assert(error instanceof this.api.errors.NotConnectedError);
    });
  });

  it('should throw NotConnectedError if server not responding ', function(
    done
  ) {
    if (isBrowser) {
      const phantomTest = /PhantomJS/;
      if (phantomTest.test(navigator.userAgent)) {
        // inside PhantomJS this one just hangs, so skip as not very relevant
        done();
        return;
      }
    }

    // Address where no one listens
    const connection =
      new utils.common.Connection('ws://testripple.circleci.com:129');
    connection.on('error', done);
    connection.connect().catch(error => {
      assert(error instanceof this.api.errors.NotConnectedError);
      done();
    });
  });

  it('DisconnectedError', function() {
    this.api.connection._send(JSON.stringify({
      command: 'config',
      data: {disconnectOnServerInfo: true}
    }));
    return this.api.getServerInfo().then(() => {
      assert(false, 'Should throw DisconnectedError');
    }).catch(error => {
      assert(error instanceof this.api.errors.DisconnectedError);
    });
  });

  it('TimeoutError', function() {
    this.api.connection._send = function() {
      return Promise.resolve({});
    };
    const request = {command: 'server_info'};
    return this.api.connection.request(request, 1).then(() => {
      assert(false, 'Should throw TimeoutError');
    }).catch(error => {
      assert(error instanceof this.api.errors.TimeoutError);
    });
  });

  it('DisconnectedError on send', function() {
    this.api.connection._ws.send = function(message, options, callback) {
      callback({message: 'not connected'});
    };
    return this.api.getServerInfo().then(() => {
      assert(false, 'Should throw DisconnectedError');
    }).catch(error => {
      assert(error instanceof this.api.errors.DisconnectedError);
      assert.strictEqual(error.message, 'not connected');
    });
  });

  it('ResponseFormatError', function() {
    this.api.connection._send = function(message) {
      const parsed = JSON.parse(message);
      setTimeout(() => {
        this._ws.emit('message', JSON.stringify({
          id: parsed.id,
          type: 'response',
          status: 'unrecognized'
        }));
      }, 2);
      return new Promise(() => {});
    };
    return this.api.getServerInfo().then(() => {
      assert(false, 'Should throw ResponseFormatError');
    }).catch(error => {
      assert(error instanceof this.api.errors.ResponseFormatError);
    });
  });

  it('reconnect on unexpected close ', function(done) {
    this.api.connection.on('connected', () => {
      done();
    });

    setTimeout(() => {
      this.api.connection._ws.close();
    }, 1);
  });

  describe('reconnection test', function() {
    beforeEach(function() {
      this.api.connection.__workingUrl = this.api.connection._url;
      this.api.connection.__doReturnBad = function() {
        this._url = this.__badUrl;
        const self = this;
        function onReconnect(num) {
          if (num >= 2) {
            self._url = self.__workingUrl;
            self.removeListener('reconnecting', onReconnect);
          }
        }
        this.on('reconnecting', onReconnect);
      };
    });

    afterEach(function() {

    });

    it('reconnect on several unexpected close', function(done) {
      if (isBrowser) {
        const phantomTest = /PhantomJS/;
        if (phantomTest.test(navigator.userAgent)) {
          // inside PhantomJS this one just hangs, so skip as not very relevant
          done();
          return;
        }
      }
      this.timeout(70001);
      const self = this;
      self.api.connection.__badUrl = 'ws://testripple.circleci.com:129';
      function breakConnection() {
        self.api.connection.__doReturnBad();
        self.api.connection._send(JSON.stringify({
          command: 'test_command',
          data: {disconnectIn: 10}
        }));
      }

      let connectsCount = 0;
      let disconnectsCount = 0;
      let reconnectsCount = 0;
      let code = 0;
      this.api.connection.on('reconnecting', () => {
        reconnectsCount += 1;
      });
      this.api.connection.on('disconnected', _code => {
        code = _code;
        disconnectsCount += 1;
      });
      const num = 3;
      this.api.connection.on('connected', () => {
        connectsCount += 1;
        if (connectsCount < num) {
          breakConnection();
        }
        if (connectsCount === num) {
          if (disconnectsCount !== num) {
            done(new Error('disconnectsCount must be equal to ' + num +
              '(got ' + disconnectsCount + ' instead)'));
          } else if (reconnectsCount !== num * 2) {
            done(new Error('reconnectsCount must be equal to ' + num * 2 +
              ' (got ' + reconnectsCount + ' instead)'));
          } else if (code !== 1006) {
            done(new Error('disconnect must send code 1006 (got ' + code +
              ' instead)'));
          } else {
            done();
          }
        }
      });

      breakConnection();
    });
  });

  it('reconnect event on heartbeat failure', function(done) {
    if (isBrowser) {
      const phantomTest = /PhantomJS/;
      if (phantomTest.test(navigator.userAgent)) {
        // inside PhantomJS this one just hangs, so skip as not very relevant
        done();
        return;
      }
    }
    // Set the heartbeat to less than the 1 second ping response
    this.api.connection._timeout = 500;
    // Drop the test runner timeout, since this should be a quick test
    this.timeout(5000);
    // Hook up a listener for the reconnect event
    this.api.connection.on('reconnect', () => done());
    // Trigger a heartbeat
    this.api.connection._heartbeat();
});


  it('should emit disconnected event with code 1000 (CLOSE_NORMAL)',
  function(done
  ) {
    this.api.once('disconnected', code => {
      assert.strictEqual(code, 1000);
      done();
    });
    this.api.disconnect();
  });

  it('should emit disconnected event with code 1006 (CLOSE_ABNORMAL)',
  function(done
  ) {
    this.api.once('error', error => {
      done(new Error('should not throw error, got ' + String(error)));
    });
    this.api.once('disconnected', code => {
      assert.strictEqual(code, 1006);
      done();
    });
    this.api.connection._send(JSON.stringify({
      command: 'test_command',
      data: {disconnectIn: 10}
    }));
  });

  it('should emit connected event on after reconnect', function(done) {
    this.api.once('connected', done);
    this.api.connection._ws.close();
  });

  it('Multiply connect calls', function() {
    return this.api.connect().then(() => {
      return this.api.connect();
    });
  });

  it('hasLedgerVersion', function() {
    return this.api.connection.hasLedgerVersion(8819951).then(result => {
      assert(result);
    });
  });

  it('Cannot connect because no server', function() {
    const connection = new utils.common.Connection(undefined as string);
    return connection.connect().then(() => {
      assert(false, 'Should throw ConnectionError');
    }).catch(error => {
      assert(error instanceof this.api.errors.ConnectionError, 'Should throw ConnectionError');
    });
  });

  it('connect multiserver error', function() {
    assert.throws(function() {
       new RippleAPI({servers: ['wss://server1.com', 'wss://server2.com']} as any);
    }, this.api.errors.RippleError);
  });

  it('connect throws error', function(done) {
    this.api.once('error', (type, info) => {
      assert.strictEqual(type, 'type');
      assert.strictEqual(info, 'info');
      done();
    });
    this.api.connection.emit('error', 'type', 'info');
  });

  it('emit stream messages', function(done) {
    let transactionCount = 0;
    let pathFindCount = 0;
    this.api.connection.on('transaction', () => {
      transactionCount++;
    });
    this.api.connection.on('path_find', () => {
      pathFindCount++;
    });
    this.api.connection.on('1', () => {
      assert.strictEqual(transactionCount, 1);
      assert.strictEqual(pathFindCount, 1);
      done();
    });

    this.api.connection._onMessage(JSON.stringify({
      type: 'transaction'
    }));
    this.api.connection._onMessage(JSON.stringify({
      type: 'path_find'
    }));
    this.api.connection._onMessage(JSON.stringify({
      type: 'response', id: 1
    }));
  });

  it('invalid message id', function(done) {
    this.api.on('error', (errorCode, errorMessage, message) => {
      assert.strictEqual(errorCode, 'badMessage');
      assert.strictEqual(errorMessage, 'valid id not found in response');
      assert.strictEqual(message,
        '{"type":"response","id":"must be integer"}');
      done();
    });
    this.api.connection._onMessage(JSON.stringify({
      type: 'response', id: 'must be integer'
    }));
  });

  it('propagates error message', function(done) {
    this.api.on('error', (errorCode, errorMessage, data) => {
      assert.strictEqual(errorCode, 'slowDown');
      assert.strictEqual(errorMessage, 'slow down');
      assert.deepEqual(data, {error: 'slowDown', error_message: 'slow down'});
      done();
    });
    this.api.connection._onMessage(JSON.stringify({
      error: 'slowDown', error_message: 'slow down'
    }));
  });

  it('propagates RippledError data', function(done) {
    this.api.request('subscribe', {streams: 'validations'}).catch(error => {
      assert.strictEqual(error.name, 'RippledError')
      assert.strictEqual(error.data.error, 'invalidParams')
      assert.strictEqual(error.message, 'Invalid parameters.')
      assert.strictEqual(error.data.error_code, 31)
      assert.strictEqual(error.data.error_message, 'Invalid parameters.')
      assert.deepEqual(error.data.request, { command: 'subscribe', id: 0, streams: 'validations' })
      assert.strictEqual(error.data.status, 'error')
      assert.strictEqual(error.data.type, 'response')
      done()
    })
  });

  it('unrecognized message type', function(done) {
    // This enables us to automatically support any
    // new messages added by rippled in the future.
    this.api.connection.on('unknown', (event) => {
      assert.deepEqual(event, {type: 'unknown'})
      done();
    });

    this.api.connection._onMessage(JSON.stringify({type: 'unknown'}));
  });

  it('ledger close without validated_ledgers', function(done) {
    const message = _.omit(ledgerClose, 'validated_ledgers');
    this.api.on('ledger', function(ledger) {
      assert.strictEqual(ledger.ledgerVersion, 8819951);
      done();
    });
    this.api.connection._ws.emit('message', JSON.stringify(message));
  });

  it('should throw RippledNotInitializedError if server does not have ' +
    'validated ledgers', function() {

    this.timeout(3000);

    this.api.connection._send(JSON.stringify({
      command: 'global_config',
      data: {returnEmptySubscribeRequest: 1}
    }));

    const api = new RippleAPI({server: this.api.connection._url});
    return api.connect().then(() => {
      assert(false, 'Must have thrown!');
    }, error => {
      assert(error instanceof this.api.errors.RippledNotInitializedError,
        'Must throw RippledNotInitializedError, got instead ' + String(error));
    });
  });

  it('should try to reconnect on empty subscribe response on reconnect',
  function(done) {
    this.timeout(23000);

    this.api.on('error', error => {
      done(error || new Error('Should not emit error.'));
    });
    let disconnectedCount = 0;
    this.api.on('connected', () => {
      done(disconnectedCount !== 1 ?
        new Error('Wrong number of disconnects') : undefined);
    });
    this.api.on('disconnected', () => {
      disconnectedCount++;
    });

    this.api.connection._send(JSON.stringify({
      command: 'global_config',
      data: {returnEmptySubscribeRequest: 3}
    }));

    this.api.connection._send(JSON.stringify({
      command: 'test_command',
      data: {disconnectIn: 10}
    }));
  });
});
