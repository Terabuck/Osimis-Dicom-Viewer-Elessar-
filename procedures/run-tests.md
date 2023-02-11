                                   Run Tests
-------------------------------------------------------------------------------

The Osimis Web Viewer has 4 kinds of tests:
- Backend Unit Tests.
- Frontend Unit Tests.
- Integration Tests.
- Manual Tests.

Except the Manual Tests, each tests are run automatically by our Continous
Integration System at build time. This procedure is triggered by the _Release
Procedure_.

## Prerequisites

Bootstrap a development environment (see
`procedures/bootstreap-dev-environment.md`).

For frontend unit tests & integration tests, you must install the browsers 
specified in `frontend/karma.conf.js` (Karma configuration files, Google Chrome
at the time of writing).

## Backend Unit Tests

1. Build the backend.
2. Launch the unit tests (`./backend/build/UnitTests`).

## Frontend Unit Tests

Open the `frontend/` folder.

For one-time test run:

  * `$ gulp test --novet`

For Test Driven Development:

  * `$ gulp autotest`
    The tests may be debugged using Chrome DevTools at the following URL:
    `http://localhost:9876/debug.html`.

Known Issues:

- This command remove the `frontend/build/` folder content.

## Integration Tests

See comments for testing instruction in
`tests/osimis-test-runner/osimis-test-runner.py`.

The prerequisites are the same as for the Frontend Development.

## Manual Tests

These tests are up to the Osimis' team  discretion. They may follow the Web
Viewer Pro's Test Plan as most features are identical.
