var gulp = require('gulp');
var path = require('path');
var Server = require('karma').Server;
var Happner = require('happner-2');
var mesh;

gulp.task('start', function(done) {
  function TestComponent() {}

  TestComponent.prototype.method1 = function($happn, args, callback) {
    callback = args; // callback comes in position1
    callback(null, 'result1');
  };

  TestComponent.prototype.method2 = function($happn, args, callback) {
    callback(null, 'result2');
  };

  TestComponent.prototype.doEmit = function($happn, args, callback) {
    $happn.emit('test-emmission', args);
    callback();
  };

  TestComponent.prototype.allowedMethod = function($origin, input, callback, $happn) {
    // "max-nasty" injection
    input.meshName = $happn.info.mesh.name;
    input.originUser = $origin.username;
    callback(null, input);
  };

  TestComponent.prototype.deniedMethod = function(input, callback) {
    callback(null, input);
  };

  var testComponent = new TestComponent();
  const DOMAIN = 'DOMAIN_NAME';

  var meshConfig = {
    domain: DOMAIN,
    happn: {
      secure: true,
      adminPassword: 'xxx'
    },
    modules: {
      test: {
        instance: testComponent
      },
      component1: {
        path: [path.resolve(__dirname, '..'), '__fixtures', 'test', 'browser', 'component-1'].join(
          path.sep
        )
      },
      component2: {
        path: [path.resolve(__dirname, '..'), '__fixtures', 'test', 'browser', 'component-2'].join(
          path.sep
        )
      },
      testComponent2: {
        path: [path.resolve(__dirname, '..'), '__fixtures', 'test', 'browser', 'component-3'].join(
          path.sep
        )
      },
      testComponent3: {
        path: [path.resolve(__dirname, '..'), '__fixtures', 'test', 'browser', 'component-4'].join(
          path.sep
        )
      }
    },
    components: {
      component1: {},
      component2: {},
      test: {},
      testComponent2: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      testComponent3: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    }
  };

  Happner.create(meshConfig)

    .then(function(_mesh) {
      mesh = _mesh;
    })

    .then(function() {
      var security = mesh.exchange.security;
      return Promise.all([
        security.addGroup({
          name: 'group',
          permissions: {
            events: {
              [`/${DOMAIN}/testComponent2/test/event`]: { authorized: true },
              [`/${DOMAIN}/testComponent3/test/event`]: { authorized: true },
              [`/${DOMAIN}/testComponent2/variable-depth/event/*`]: { authorized: true }
            },
            methods: {
              [`/${DOMAIN}/test/allowedMethod`]: { authorized: true },
              [`/${DOMAIN}/testComponent2/method1`]: { authorized: true },
              [`/${DOMAIN}/testComponent2/emitEvent`]: { authorized: true }
            }
          }
        }),
        security.addUser({
          username: 'username',
          password: 'password'
        })
      ]).then(function(results) {
        return security.linkGroup(...results);
      });
    })

    .then(function() {
      var karma = new Server(
        {
          configFile: __dirname + '/01.karma.conf.js',
          singleRun: true
        },
        function() {
          done();
        }
      );

      karma.start();
    })

    .catch(done);
});

gulp.task(
  'default',
  gulp.series('start', function(done) {
    mesh.stop({ reconnect: false }, done);
  })
);
