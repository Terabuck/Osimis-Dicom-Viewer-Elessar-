                        Merge Orthanc Web Viewer Back
-------------------------------------------------------------------------------

This repository is a fork of orthanc-webviewer-plugin. It is useful to retrieve
changes from the old Orthanc Web Viewer, especially bug fixes.

1. Create a new branch (eg. `<USER>-upgrade-wvo`).

2. Install [git-remote-hg](https://github.com/fingolfin/git-remote-hg) to 
   retrieves changes from mercurial to git.

3. Add orthanc-webviewer-plugin mercurial repository as a git remote (using
   hg:: prefix from `git-remote-hg`).

4. Merge the desired changes. As the directory structure and most of the files
   have changed, professional merging tool such as sublimerge may reveal
   helpful.

5. Create a pull request. The standard quality procedure should be followed, 
   except it is not required to create a task in youtrack.