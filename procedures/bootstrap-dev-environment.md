                       Bootstrap Development Environment
-------------------------------------------------------------------------------

It is either possible to build the osimis web viewer plugin via docker or 
manually. The latter method is more suited for development as it reduces the
build-time overhead.

## Warning

Please always check bash script source header before running them!

## Global Procedures

### Docker Build

Build the frontend, backend and the reverse proxy using docker. Most suitable for production.

1. See `scripts/docker/buildDocker.sh` to build everything.
2. See `scripts/docker/startDocker.sh` to start the environment.

### OsX Dev Build

Build the frontend and backend. Once it's done, launch the backend, a gulp
process that provides a frontend developement environment, and a nginx
reverse proxy that mix this frontend dev environment with the built backend.

1. See `scripts/osx/installOsXDependencies.sh`
2. See `scripts/unix/startUnixDev.sh`

## Backend Procedures

### Docker Build

Build the backend using docker. Most suitable for production.

1. Build the frontend.
2. Build backend docker image (see `backend/scripts/buildDocker.sh`).

### Manual Build

For manual build instructions of the C++ plugin on OSX & Linux, the following 
commands provides the debug flag and build both the plugin and the unit tests.

```bash
$ cd backend/
$ mkdir build
$ cd build/
$ cmake .. -DCMAKE_BUILD_TYPE=Debug -DALLOW_DOWNLOADS=ON -DSTANDALONE_BUILD=ON
  -DSTATIC_BUILD=ON
$ make -j2
```

You can also have a look at the _backend/scripts/_ folder and the 
`backend/Resource/BuildInstructions.txt` file.

The backend will embed the _frontend/build/_ folder or download it if
unavailable.

Benchmark logs may be added via `-DBENCHMARK=1`. They only have been tested on
OSX.

Known issues/Notes:

- Make sure the _frontend/build/_ folder is full (_js/app.js_ and _js/lib.js_
  files must be available). The command _gulp serve-build_ may corrupt it (see
  _Frontend Development_ section).
- The compiler must be compatible with C++11.
- On CentOS6, `GCC4.x` triggers compilation errors. With `GCC5.2`, compilation
  works.
- `-DSTANDALONE_BUILD=OFF` is no longer tested.
- `-DSTATIC_BUILD=OFF` is no longer tested.

If you want to build the backend on windows, you may find the relevant 
information in the `scripts/ci/` folder.

## Frontend Procedures

The frontend can either be built or launched in development mode. 

### Pre Requisites

#### Docker Builds

1. Install docker and docker-compose.

#### Manual Builds/Development

1. Install [Node.js](http://nodejs.org)
 - on OSX use [homebrew](http://brew.sh) `brew install node`
 - on Windows use [chocolatey](https://chocolatey.org/) `choco install nodejs`

2. Install ruby

3. Install nginx (optional)

4. Install other dependencies

See the following scripts:

```bash
cd "${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
./scripts/unix/installAdditionalDevTools.sh
```

Refer to these instructions on how to [not require sudo](https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md)

### Docker Build

To build the frontend, you can use docker. Please refer to _scripts/_ and
_frontend/scripts/_ folders. 

### Manual Build

As an alternative to docker, you can use the following commands to build the
frontend.

```bash
cd frontend/
# install npm & bower dependencies
npm install
bower install
# generate build/ folder
gulp build
```

### Development

It is not required to rebuild the backend to develop the frontend. These
commands launch the frontend development server outside of Orthanc.

```bash
cd frontend/
# install npm & bower dependencies
npm install
bower install
# launch development server 
gulp serve-dev --nosync --novet
```

The file `frontend/server.js` serves the frontend. You may want to change 
the defined port/ip. The reverse proxy may also be used (see the
`reverse-proxy/` folder.  There's also a sample config file for nginx available
in `sample-nginx-config-for-development.md` 

You may need to set the "RemoteAccessAllowed" configuration option to true in
your Orthanc config.json file.

Known issues:
- the serve-dev command erases the _build/_ folder content.
- the server must be restarted to update index.html file.

