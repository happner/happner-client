1.1.6 2017-03-21
----------------
  - added __version to exchange
  - added __custom to exchange if cluster

1.1.7 2017-03-21
----------------
  - onward release of happn-3

1.2.0 2017-03-23
----------------
  - onward release of happn-3

1.2.3 2017-04-07
----------------
  - onward release of happn-3

1.2.4 2017-04-18
----------------
  - onward release of happn-3

2.0.0 2017-08-19
----------------
  - bumped happn-3 to ^3.0.0

3.0.0 2017-11-27
----------------
  - bumped happn-3 to ^5.1.1

3.0.1 2018-01-08
----------------
  - log dependencies met and unmet

4.0.0 2018-04-12
----------------
  - onward release of happn-3

5.0.0 2018-05-24
----------------
  - onward release of happn-3

5.0.1 2018-05-29
----------------
  - added check for client.session in implementors-provider

5.0.2 2018-05-29
----------------
  - onward release of happner-2

5.1.0 2018-06-08
----------------
  - new dataClient() access to actual happn-3 client

6.0.0 2018-09-10
----------------
  - happn-3 version 8.0.0

6.0.1 2018-09-10
----------------
  - happner-2 version up

6.0.2 2018-09-10
----------------
  - happner-2 version up

6.0.3 2018-09-10
----------------
  - happn-3 version 8.0.1

6.0.4 2018-10-29
----------------
  - happn-3 version 8.0.3

6.1.0 2018-11-06
----------------
  - happn-3 version 8.1.1

6.2.0 2018-11-17
----------------
  - happn-3 version 8.2.1

6.3.0 2018-11-17
----------------
  - happn-3 version 8.2.7
  - happner-2 version 9.3.0

7.0.0 2019-03-01
----------------
  - happn-3 version 9.0.0
  - happner-2 version 10.0.0

7.0.1 2019-03-19
----------------
  - happn-3 version 9.0.1

8.0.0 2019-06-25
----------------
  - happn-3 version 10.0.0

8.0.1 2019-06-25
----------------
  - happn-3 version 10.1.1

8.1.0 2019-07-25
----------------
  - happn-3 update

8.1.1 2019-08-02
----------------
  - removed let from client side code

8.1.2 2019-08-13
----------------
  - fixed __getUpdatedDependencyDescription method when description is not an array and component does not exist

9.0.0 2019-09-22
----------------
  - $origin checked as property of callback in happner-client.js
  - peer client url added as part of addPeer in implementors provider
  - peer url and description emitted as part of dependency-met event in implementors provider
  - breaking: peer arrival departure event keys changed

10.0.0 2019-11-28
-----------------
  - happn-3 version 11.0.0, breaking client disconnection on token revocation

11.0.0 2020-02-24
-----------------
  - bump happn-3 to version 11.2.0
  - breaking: peer/arrived/description event changed on logDependenciesMet, now for every dependency peer, not just the first one

11.0.1 2020-02-24
-----------------
  - bump happn-3 to version 11.3.2 for async@3

11.0.2 2020-06-04
-----------------
  - bump happn-3 to version 11.4.0
  - IE11 support in implementors provider

11.0.3 2020-06-05
-----------------
  - bump happn-3 to version 11.5.0

11.0.4 2020-06-17
-----------------
  - runaway promise warning - browser, due to operations provider not returning a promise

11.1.0 2020-06-24
-----------------
  - added coercedSatisfies to the semver implementation

11.1.1 2020-06-30
-----------------
  - removed bluebird dependency

11.1.2 2020-09-10
-----------------
  - patch: ignore brokered descriptions JIRA: SMC-989

11.1.3 2020-09-18
-----------------
  - patch: brokered descriptions are ignored - but the mesh carries on loading: JIRA: SMC-989

11.1.4 2020-09-18
-----------------
  - added coercedSatisfies to the semver implementation for local instances. SMC-1089
  - fixed unit test 03 to release mocha process
  - added node v14 to travis tests

11.1.5 2020-09-30
-----------------
  - SMC-1147: upped the default requestTimeout and responseTimeout to 1 minutes and 2 minutes respectively

11.1.6 2020-10-04
-----------------
  - happn-3 patch: selective security cache clearing and concurrency 1 queue on dataChanged event - SMC-1189

11.1.7 2020-11-19
-----------------
  - happn-3: feature: SMC-1269 - logging a JSON object on socket error
  - happn-3: feature: SMC-1321 - only print error message for fail to decode JSON socket error, also just warning

11.1.8 2020-11-19
-----------------
  - SMC-1482 - fix: redirected logs not in correct format

11.1.9 2020-12-03
-----------------
  - SMC-1565 to fix semver satisfies specific prerelease versions

11.2.0 2021-01-20
-----------------
  - SMC-917: modified implementors provider to emit startup/dependencies/… …
  - SMC-917: added events.once to implementors provider
  - smc-917 - prerelease publish
  - SMC-917: Added registerAndCheckDependencies method in ImplementorsPro… …
  - SMC-917: Added unit tests for SMC-917 changes to ./lib/provides/imple… …
  - SMC-917: ImplementorsProvidor: AddAndCheckDependencies now checks for… …
  - SMC-917: Chore: lint-fixed
  - SMC-917: Code review changes (minor)

11.3.0 2021-04-16
-----------------
  - SMC-1807 - light client
  - SMC-1807: updated travis - removed Node 10 support, added node 15 support

11.3.1 2021-05-24
-----------------
  - SMC-1807 - bumped package-lock to accomodate latest version of happner