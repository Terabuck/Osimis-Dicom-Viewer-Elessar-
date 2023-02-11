Random bug debugging procedure

STEP 1

1.1.
Only retry the tests
(env) nuKs:osimis-test-runner (TP-WVP-10)$ python osimis-test-runner.py -p ../../backend/build/ -r 20;

Or full process reloading
(env) nuKs:osimis-test-runner (TP-WVP-10)$ for i in {1..20}; do python osimis-test-runner.py -p ../../backend/build/; done;

1.2.
Retrieve failing tests

[sample a]
```
  http
    HttpRequest
      ✔ should handle succeeded GET requests (slow: 0.134 secs)
      ✔ should handle failed GET requests
      ✖ should clone the provided header object
      ✔ should send "Accept: application/json, text/plain, */*" by default as long as setRespoinseType is not used
      ✔ should send "Accept: application/json, text/plain, */*" by default as long as setRespoinseType is not used
    ✖ "after each" hook for "should send "Accept: application/json, text/plain, */*" by default as long as setRespoinseType is not used"
```

```
FAILED TESTS:
  http
    HttpRequest
      ✖ should clone the provided header object
        Chrome 53.0.2785 (Mac OS X 10.11.3)
      Uncaught SyntaxError: Fake XHR onreadystatechange handler threw exception: Unexpected end of JSON input (/Users/nuKs/Documents/_osimis/osimis-webviewer-plugin/frontend/bower_components/sinon/index.js:3960)
      Error: Uncaught SyntaxError: Fake XHR onreadystatechange handler threw exception: Unexpected end of JSON input (/Users/nuKs/Documents/_osimis/osimis-webviewer-plugin/frontend/bower_components/sinon/index.js:3960)

    ✖ "after each" hook for "should send "Accept: application/json, text/plain, */*" by default as long as setRespoinseType is not used"
      Chrome 53.0.2785 (Mac OS X 10.11.3)
    TypeError: Cannot read property 'restore' of null
        at Context.<anonymous> (/Users/nuKs/Documents/_osimis/osimis-webviewer-plugin/frontend/src/app/http/http-request.class.spec.js:25:16)
```

[sample b]
```
FAILED TESTS:
  serieslist
    directive
      ✖ should display a list of DICOM multiframe instances as a list of series (slow: 1 min 0.002 secs)
        Chrome 53.0.2785 (Mac OS X 10.11.3)
      Error: timeout of 60000ms exceeded. Ensure the done() callback is being called in this test.

      ✖ should display the list of series when unsupported series are present (eg. DICOM SR) (slow: 1 min 0.002 secs)
        Chrome 53.0.2785 (Mac OS X 10.11.3)
      Error: timeout of 60000ms exceeded. Ensure the done() callback is being called in this test.```
```


1.3.
Compare with regular test benchmarks (use the slowest working test to make the comparison) & validate test issue is not just due to machine slowness

[sample a]
```
  http
    HttpRequest
      ✔ should handle succeeded GET requests (slow: 0.095 secs)
      ✔ should handle failed GET requests
      ✔ should clone the provided header object (slow: 0.033 secs)
      ✔ should send "Accept: application/json, text/plain, */*" by default as long as sheetRespoinseType is not used
```
- <20ms (no annotation) is well under the range
- Strange, the next test is launched twice when failing and result in after each hook failing as well.

[sample b]
```
  serieslist
    directive
      ✔ should display a list of DICOM multiframe instances as a list of series (slow: 0.436 secs)
      ✔ should display the list of series when unsupported series are present (eg. DICOM SR) (slow: 0.092 secs)
```

- 0.436 MAX is twice under our timeout as well, but should confirm it's not related to slowness with a larger timeout.
- 0.033 is pretty short though, and shouldn't timeout
-> Not related to machine slowness

STEP 2

Get more log.

[sample a]
  Exception is triggered from SinonJS mock. See manual fix https://github.com/sinonjs/sinon/pull/678 - Also, sinon.log is a noop function

[sample b]
  Add assert(false, JSON.stringify(e)); to the returned failed promise

Redo first step (& select tests by adding mocha ".only" to specs sources).
Scheduling 50 jenkins jobs also work.

STEP 3

Wait and think.