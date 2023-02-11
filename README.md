# Osimis Web Viewer

The [Osimis'](htpp://www.osimis.io/) Web Viewer provides medical image 
visualization straight from the browser.

It is distributed as a plugin to [Orthanc](http://www.orthanc-server.com/). In 
other words, the viewer can be connected to most modalities, but also leveraged
through Orthanc's strong architectural extensibility.

2D rendering is supported with the usual tools:

- Zooming
- Panning
- Windowing
- Length Measurement
- Angle Measurement
- Point/Circle/Rectangle of Interest
- Image Flipping/Rotation
- Multiframe support

Have a look at [our blog](http://www.osimis.io/en/blog.html).

## Demo

A demo of the viewer is available at those links:

- [IRM study](http://osimisviewer.osimis.io/osimis-viewer/app/index.html?study=1b4c72ad-5aba2557-9fc396b3-323e190c-07d36585).
- [Full demo](http://osimisviewer.osimis.io/), embedded within the Orthanc
  Explorer. Other studies are available from there.

## What's new

See the [release notes](https://bitbucket.org/osimis/osimis-webviewer-plugin/src/master/RELEASE_NOTES.txt).

## Installation & Usage

The latest stable version is available [here](http://www.osimis.io/en/download.html).

Nightly builds are available [here](http://orthanc.osimis.io/#/nightly).
They are still unstable at the moment.

We recommend to download the binaries for Windows and Mac OS X & the docker
image for Linux.

[This article](http://www.osimis.io/en/blog/2016/06/03/deploy-Orthanc-on-a-PC-in-38-seconds.html)
details the installation process on Windows.

[This procedure](https://osimis.atlassian.net/wiki/spaces/OKB/pages/26738689/How+to+use+osimis+orthanc+Docker+images#Howtouseosimis/orthancDockerimages?-Quickstart) explains how to use the
docker image on Linux.

For Mac OS X, the procedure is very similar to the windows' one. Unzip the
downloaded folder and double click on the `startOrthanc.command` file.

## Configuration

Orthanc is configurable via a [JSON file](https://orthanc.chu.ulg.ac.be/book/users/configuration.html).
This plugin provide a few optional options as well.  Check [this page](https://osimis.atlassian.net/wiki/spaces/OKB/pages/10321921/Osimis+Web+Viewer+-+Configuration+file) for a full list.


## Licensing

The Osimis' Web Viewer is licensed under the AGPL license. See the COPYING
file.
We also kindly ask scientific works and clinical studies that make use of
Orthanc to cite Orthanc in their associated publications. Similarly, we ask
open-source and closed-source products that make use of Orthanc to warn us
about this use. You can cite S. Jodogne's work using the following BibTeX
entry:

```
@inproceedings{Jodogne:ISBI2013,
author = {Jodogne, S. and Bernard, C. and Devillers, M. and Lenaerts, E. and Coucke, P.},
title = {Orthanc -- {A} Lightweight, {REST}ful {DICOM} Server for Healthcare and Medical Research},
booktitle={Biomedical Imaging ({ISBI}), {IEEE} 10th International Symposium on}, 
year={2013}, 
pages={190-193}, 
ISSN={1945-7928},
month=apr,
url={http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6556444},
address={San Francisco, {CA}, {USA}}
}
```

## Contact & Bug/Feedback Report

Any question/feedback/bug report are well appreciated. You may report them on the [Orthanc Users Group](https://groups.google.com/forum/#!forum/orthanc-users).

The full bug/feedback report procedure is available in the 
`procedures/report-bug-or-feedback.md` file.

## Authentification Proxy Development & Plugin's routes

See the `procedures/develop-auth-proxy.md` file.

## Development

### Folder structure

Six folders are available at the root:

- `backend/` contains the C++ plugin source code (& cmake build process).
- `frontend/` contains the HTML/JavaScript source code (& gulp build process).
- `reverse-proxy/` contains a reverse proxy suitable for development.
- `demo/` contains a standalone docker, proxied version of orthanc and the
  viewer with sample files.
- `scripts/` contains global demo building scripts, it is mostly used by the
  Continuous Integration System. It also contains scripts to build/run the web
  viewer demo in a docker environment.
- `tests/` contains the integration tests.

### Build

See the `procedures/bootstrap-dev-environment.md` file.

### Development

See the `procedures/bootstrap-dev-environment.md` file.

### Testing

See the `procedures/run-tests.md` file.

### Release procedure

See the `procedures/release-version.md` file. The
`procedures/archive-test-reports.md` file will be mentionned.

### Pulling changes back from orthanc-webviewer-plugin

See the `procedures/merge-orthancwebviewer.md` file.
