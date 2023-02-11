FROM ubuntu:18.10 as cpp-builder
 
RUN apt-get -y clean && apt-get -y update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install wget nano build-essential unzip cmake mercurial git 

WORKDIR /
RUN git clone https://bitbucket.org/osimis/osimis-webviewer-plugin.git

ARG VIEWER_VERSION=1.3.0
WORKDIR /osimis-webviewer-plugin/
RUN git describe --long --tags > /full-version.txt

WORKDIR /frontend
RUN wget http://orthanc.osimis.io/public/osimisWebViewer/$VIEWER_VERSION.zip -O /tmp/frontend.zip
RUN unzip /tmp/frontend.zip -d /frontend

WORKDIR /build

RUN cmake /osimis-webviewer-plugin/backend -DCMAKE_BUILD_TYPE=Release -DVIEWER_VERSION_FULL=$(cat /full-version.txt) -DJS_CLIENT_PATH=/frontend/frontend-build -DORTHANC_FRAMEWORK_VERSION=1.5.0
RUN make -j 5

RUN ./UnitTests

# at this stage, the viewer .so is available in /build/libOsimisWebViewer.so