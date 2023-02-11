                         Develop Authentification Proxy
-------------------------------------------------------------------------------

Most of the viewer's user require an authentification method at some point.
Developing a reverse-proxy is the most versatile way to achieve that goal.
This file references each HTTP routes used. When the web viewer is embedded 
within an iframe, parsing the routes allows to block and allow requests upon
user credentials retrieved from cookies.

To keep good performances, the proxy overhead should be kept small. On large
systems, this can be achieved using eventual consistency: proxy's internal
requests can be cached for a small amount of time (at least a few minutes).
Most programming language comes with a memcached module. This fit well for
this concerns. A Redis database may also be used.

The plugin uses severals GET HTTP routes. These routes are considered unstable
and may change often (see `procedures/release-version.md` for more details).
The current file should be looked upon for any update. Release notes also 
include breaking changes.

----

```
GET /osimis-viewer/studies/<study_uid:str>/annotations
```

This route retrieves the annotations of all the images of a specific study. It may be intercepted by an authentication proxy to only provide the annotations of the connected user.

----

```
PUT /osimis-viewer/images/<instance_uid:str>/<frame_index:int>/annotations
```

This route set the annotations of a specific image. It may be intercepted by an authentication proxy to store them in an external database based on the connected user.

----

```
GET /osimis-viewer/images/<instance_uid:str>/<frame_index:int>/{low|medium|high|pixeldata}-quality
```

This route retrieve an image binary (embedded in KLV format, see source code
for detailed format informations - use 0 for monoframe instances).

----

```
GET /osimis-viewer/series/<series_uid:str>
```

This route provides informations about a series.

----

```
GET /osimis-viewer/config.js
```

Called as `../config.js` relative path from `/osimis-viewer/app/`.
This route provides configuration for frontend.

----

```
GET /osimis-viewer/app/*
```

This route serves the frontend.

----

The following Orthanc routes are also used:

```
GET /studies/
GET /patients/<uid>
GET /studies/<uid>
GET /studies/<uid>/archive
GET /instances/<uid>/simplified-tags
GET /instances/<uid>/pdf
GET /instances/<uid>/frames/0/raw
GET /instances/<uid>/study
GET /series/<uid>/study
GET /plugins/osimis-web-viewer
GET /system
```
