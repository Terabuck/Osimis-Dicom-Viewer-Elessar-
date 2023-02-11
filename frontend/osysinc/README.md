# OsiSync

## Description

OsiSync is a command line tool made to develop on multiple projects at the same time.
It works on top of gulp and bower and is recommended to be used with the yeoman osimis-angular generator to avoid the complex installation process.

## Use Case

Assume you develop two projects, A and B. A uses B as a bower dependency.
You update the B project, but want the A project to contain B changes as well.
To do so, you have to build B, update the bower.json version number and reinstall the built B into A via bower.

OsiSync solves this issue. It helps you gain a phenomenal productivity!
You also keep advantage of using bower for managing interproject dependencies.

## Installation

- clone this repo
- run `npm install`
- run `npm link`

## Definitions

### Master
The master project is the project you're working from.
It can have multiple slaves projects.

### Slaves

A slave project is a dependency of the master project you develop.

## Usage

To start osisync:

```bash
cd your_master_project
osisync
```

The parameter --verbose print the gulp output.
A project prefix can be set to limit the verbose printing to the specified project (eg. --verbose=smd).



## Installation

### Build Process (without osisync)

1. Build the slave

```bash
cd your_slave_project
gulp build
# - gulp build has to create a built version of your project.
# - the build folder has to contains a bower.json file
# - this bower.json has to contains the bower "main" attribute (see bower doc)
# - the bower.json "name" attribute has to be defined.
```

2. Install the slave in the master

```bash
cd your_master_project
bower install --save ../relative_path_to_your_slave/your_build_folder
# you can also use a remote path (with the optional bower registry)
# and use bower link to make the link from your file system.
# this has the avantage of allowing version control using git tags.
# see bower doc for further information.
```

3. Update the slave in the master

```bash
cd your_master_project
# if you don't use the bower registry with a git tag based versioning,
# you have to remove the project from your bower_components to allow bower
# to update it because bower doesn't know when a change has occured.
rm -rf bower_components/your_slave_project_name
# there is another way around : use bower versioning system instead (see bower doc) and use bower install --save with another version.
bower install
```

### OsiSync Process

#### Requirements 
The standard build process (see previous section) has to be done prior to osisync use.

#### Installation

##### Master Project

###### osisync.json

Your master project must contain an osisync.json file.

```json
{
  "name": "master_project_name",
  "prefix": "mpn",
  "slaves": [
    "relative_path_to_your_slave_project/"
  ]
}
```

- name must be the same as in the bower.json
- prefix can be anything, it is mostly used for the logger but must be unique. 3 letters is the standard.
- slaves point to the root directories of your slaves

###### gulpfile.js

OsiSync CLI launches master "gulp serve-dev" command.
The gulp task has to be adapted to work with osisync.

TLDR; this process is already done in the yeoman generator-osimis-angular

- The gulpfile should inject osisync

```js
var osisync = require('osisync');
```

- To avoid port conflict, osisync.getPort() should be used. It returns a port. An available range of ten ports by project can be provided by this function.

- The index.html has to be piped with osisync.master.processHtmlStream().

For instance, osisync.master#processHtmlStream will convert this line

```html
<script src="/bower_components/your_dependency/js/app.js"></script>
```

To those line

```html
<script src="http://localhost:6416/src/some_file.js"></script>
<script src="http://localhost:6416/src/some_file2.js"></script>
<script src="http://localhost:6416/src/some_file3.js"></script>
<!-- ... -->
```

- The output should be written in .osisync hidden directory to avoid conflict with the standard gulp process

- The whole gulp process has to be adapted to watch .osisync/index.html instead of index.html when osisync is used (see gulpfile of generator-osimis-angular)

- The server should serve .osisync/index.html instead of index.html when osisync is used (see server.js of generator-osimis-angular)

- Once the server is launched, this command has to be called:

```js
osisync.master.start({
    serverPort: serverPort,
    browserSyncPort: browserSyncPort,
    browserSyncUiPort: browserSyncUiPort,
    weinrePort: weinrePort,
    nodeDebugPort: nodeDebugPort
});
```

##### Slave Project

TLDR; this process is already done in the yeoman generator-osimis-angular

###### osisync.json

Your slave projects must contain an osisync.json file.

```json
{
  "name": "slave_project_name",
  "prefix": "spn",
  "ignore": [
    "**/*.spec.js"
  ],
  "dev": {
    "inject:js": [
        "src/app/**/*.module.js",
        "src/app/**/*.js"
    ],
    "inject:templates:js": [
        ".tmp/templates.js"
    ],
    "inject:css": [
        ".tmp/styles.css"
    ]
  },
  "build": {
    "js/app.js": [
        "inject:js",
        "inject:templates:js"
    ],
    "styles/app.css": [
        "inject:css"
    ]
  }
}
```

OsiSync deconstructs the build process to allow synchronized development workflows. This json file tells him how to do it.

Its structure is based on the structure of the index.html of any generator-osimis-angular project. As it is fairly hard to understand how it works, it can be helpful to have a look at how the index file is constructed within generator-osimis-angular.

- The "build" sections contains keys that relate to built files present in the bower.json main section. The values are the injections present in the "dev" section of this osisync.json file
- The "dev" section presents the injected source files in the index.html. The order is important (in this case, angular module are loaded prior to the rest).
- The "ignore" section ignores certain files. In this case, we make sure unit test specs are not injected in the master index.html.

Note a master can also be a slave, so this osisync.json could also contain a "slaves" section.

###### gulpfile.js

- The gulpfile should inject osisync

```js
var osisync = require('osisync');
```

- The gulpfile must contain an osisync task
    - This task must start a server.
    - This task should apply preprocessing in live (ie. watch the files that needs to be preprocessed, and preprocess them). For instance, the angular .tmp/template.js and the scss -> .tmp/*.css
    - Once the server has started, osising.slave#start must be called.

```js
osisync.slave.start({
    host: 'localhost',
    port: serverPort
});
```

#### Main Issues

##### Bower decendency change

At each dependency change on your slave project, you have to redo the original build process before using osisync again.
This way, you let bower handle the new dependency in your master project.

## Source code

### The CLI

The CLI load the master and slave gulp processes.
It handles their communication via Inter-Process Communication.

The source code is located in the folders __bin/__ and __lib/__.

### The Node Library

The node library is used to communicate from the gulp processes to the CLI main process (via Inter-Process Communication).

The __lib/master.js__ file also contains the gulp plugin to process the html and split the <script></script> elements with the data retrieved from the CLI main process.

The source code is located in the folder __lib/__.