#!/bin/bash
# Set build variables. Generates them in the .env file.
#
# arguments: $1 = branchName (optional; if not provided, it will get it 
#                             from a git command.  In a jenkins build context,
#                             the branch name is not available through git so it must be
#                             passed as an argument)
#
# arguments: $2 = tag        (optional; if not provided, it will write a
#                             random tag. The tag is only used for temporary
#                             operation and has no impact over the published 
#                             zips and docker images)
#
# Usage:
#    ./scripts/ci/setEnv.sh [$branchName]
#    source .env
#

function _setEnvMain {
	local tag gitLongTag branchName releaseCommitId releaseTag srcRoot

	# Retrieve git metadata
	gitLongTag=$(git describe --long --dirty)
	branchName=${1:-$(git rev-parse --abbrev-ref HEAD)} #if no argument defined, get the branch name from git
	releaseCommitId=$(git rev-parse --short HEAD)

	viewerVersion=$(git describe --tags --long --dirty=-dirty) # version as used in cmake for backend build
	echo "ViewerVersion=$viewerVersion"
	if [[ ! $branchName ]]; then
		# Exit if detached head
		branchName=$(git rev-parse --abbrev-ref HEAD)
		if [[ $branchName == HEAD ]]; then
			exit 2
		fi
	elif [[ $branchName == "master" ]]; then
		
		# in the master branch, make sure the tag is clean ('1.2.3'; not 1.2.3-alpha) and there has been 0 commits since the tag has been set.
		if [[ $gitLongTag =~ [0-9]+.[0-9]+.[0-9]+-0-g[0-9a-f]+$ ]]; then 

			releaseTag=$(echo $gitLongTag | sed -r "s/([0-9]+\.[0-9]+\.[0-9]+)-[0-9]+-.+/\1/")
		else

			echo "Invalid tag on the master branch.  Make sure you have just tagged the master branch with something like '1.2.3' and that there has been no commit after the tag."
			exit -1	
		fi
	else
		# in other branches than master, the versionNumber is the branchName
		releaseTag=$branchName
		
		# if the branch name is something like 'am/WVB-27', the image tag should be 'am-WVB-27'
		# replace / by -
		releaseTag=${releaseTag//\//-}
	fi

	# Generate random tag
	if [[ $2 ]]; then
		tag=$2
		export TAG=$tag
	elif [[ $TAG ]]; then
		tag=$TAG
	else
		# Force lower case because Docker sometimes make the conversion,
		# sometimes it does not...
		export TAG=${TAG:-$(LC_CTYPE=POSIX \
			tr -c -d '[:alnum:]' < /dev/urandom \
			| head -c 10 \
			| dd conv=lcase 2> /dev/null \
		)}

		tag=$TAG
	fi


	# Generate random port
	if [[ ! $demoPort ]]; then
		# FIXME look for unallocated ports
		echo "Using a random demo port in range 20000-39999"
		demoPort=$((RANDOM % 20000 + 20000))
	fi

	srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"

	# Export variables (in a file so we can source them in later stages of the build)
tee <<EOT > .env
export TAG=$tag
export SRC_ROOT="$srcRoot"
export BRANCH_NAME=$branchName
export VIEWER_VERSION="$viewerVersion" # version as used in cmake for backend build

# Delivery
export MAIN_IMAGE=osimis/orthanc-webviewer-plugin
export COMMIT_ID=$releaseCommitId
export RELEASE_TAG=$releaseTag
export AWS_URL=s3://orthanc.osimis.io/public/osimisWebViewer/

# Test (c++ & integration)
export TEST_COMPOSE_PROJECT=wv_test_${tag}
export TEST_NETWORK=wvtest${tag}_default
export TEST_COMPOSE_FILE=${srcRoot}/tests/docker-compose.yml
export TEST_IMAGE=osimis/orthanc-webviewer-plugin/test # (with specific orthanc config)
export TEST_RUNNER_IMAGE=osimis/orthanc-webviewer-plugin/test-runner # (with chrome)
export TEST_TMP_CONTAINER=osimis-orthanc-webviewer-plugin-test-${tag}
export TEST_CONFIG=${srcRoot}/scripts/ci/ciOrthancTestConfig.json

# Demo (with default dicoms)
export DEMO_IMAGE=osimis/orthanc-webviewer-plugin/demo
export DEMO_PORT=${demoPort:-3333}

# Build
export JS_BUILDER_IMAGE=osimis/orthanc-webviewer-plugin/js-builder
export JS_BUILDER_CONTAINER=osimis-orthanc-webviewer-plugin-js-builder-${tag}
EOT
	# Print variables
	cat .env
}

_setEnvMain "$@"