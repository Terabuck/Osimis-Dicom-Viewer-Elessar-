#!/usr/bin/groovy

// Set build parameters
def isUserDevBranch = env.BRANCH_NAME != "dev" && env.BRANCH_NAME != "master" && !env.BRANCH_NAME.startsWith("release")

def userInput = [
    buildDocker: true,
    buildWindows: isUserDevBranch ? false : true,
    buildOSX: false
];

// The built version, defined via `git describe` in scripts/ci/setEnv.sh call
def VIEWER_VERSION;

if (/*!isUserDevBranch*/ false) { // @warning @todo uncomment to force windows build on dev
    echo 'Master/Dev branch: serious test & build business enforced...'
}
else {
    echo 'User personal branch: let the user choose what he wants to build...'

    // Let user override default settings (max 30 seconds to do so)
    try {
        timeout(time: 30, unit: 'SECONDS') {
            userInput = input(
                id: 'userInput', message: 'Configure build', parameters: [
                    [$class: 'BooleanParameterDefinition', defaultValue: userInput['buildDocker'], description: 'Build Docker (/!\\ false -> disable tests & deployment)', name: 'buildDocker'],
                    [$class: 'BooleanParameterDefinition', defaultValue: userInput['buildWindows'], description: 'Build Windows', name: 'buildWindows'],
                    [$class: 'BooleanParameterDefinition', defaultValue: userInput['buildOSX'], description: 'Build OSX', name: 'buildOSX']
                ]
            )
        }
    } catch (err) {
        // Do nothing, keep default settings (since user has not answered)
        echo "User personal branch: user either has aborted or hasn't chosen the build settings within the 30 seconds delay..."
    }
}

// Print the build parameters
echo 'Build Docker          : ' + (userInput['buildDocker'] ? 'OK' : 'KO (/!\\ tests disabled)')
echo 'Build Windows         : ' + (userInput['buildWindows'] ? 'OK' : 'KO')
echo 'Build OSX             : ' + (userInput['buildOSX'] ? 'OK' : 'KO')

// Lock overall build to avoid issues related to slow unit test runs or docker ip/name conflicts for instance
// This allow to benefits the optimization of using a common workspace for every branches (for instance, test
// preparation docker image is reused in new branches), but can increase slowness if the branch content differences
// is heavy (in terms of disk space). Use jenkins' dir plugin instead of ws plugin to have control over our own locking mechanism.
// @warning make sure not to use the jenkins' dir plugin if this lock is removed.
// @warning make sure we do not rely on `:latest-local` docker tags anymore if this lock is removed.
lock(resource: 'webviewer', inversePrecedence: false) {
    def workspacePath = '../_common-wvb-ws'

    // Init environment
    stage('Retrieve: sources') {
        node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
            // Clean up workspace first on non development branches
            if (!isUserDevBranch) {
                deleteDir()
            }

            checkout scm
            sh 'scripts/ci/ciLogDockerState.sh prebuild'
            sh 'scripts/ci/setEnv.sh ${BRANCH_NAME}'

            // Retrieve GIT version `git describe --tags --long --dirty=-dirty` (used to inject version in backend via Version.h)
            sh '. ${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}/.env && echo ${VIEWER_VERSION} > .viewer_version'
            VIEWER_VERSION = readFile('.viewer_version').trim()
            sh 'rm .viewer_version'
        }}}
    }

    // Build frontend
    stage('Build: js') {
        node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
            sh 'scripts/ci/ciBuildFrontend.sh'
        }}}
    }

    // Publish temporary frontend so we can embed it within orthanc plugin
    stage('Publish: js -> AWS (commitId)') {
        node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
            withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-orthanc.osimis.io']]) {
                sh 'scripts/ci/ciPushFrontend.sh tagWithCommitId'
            }
        }}}
    }
    
    def buildMap = [:]

    // Build windows
    if (userInput['buildWindows']) {
        buildMap.put('windows', {
            stage('Build: windows') {
                node('windows && vs2015') { dir(path: workspacePath) {
                    // Clean up workspace first on non development branches as
                    // well as development branches with visual studio. We do 
                    // this because visual studio seems to keep AUTOGENERATED
                    // c++ binary object file cache even when the corresponding 
                    // frontend folder has changed. Thus, we enforce it to be
                    // rebuilt.
                    deleteDir()

                    //stage('Retrieve sources') {}
                    checkout scm

                    //stage('Build C++ Windows plugin') {}
                    bat "cd scripts & cd ci & powershell.exe ./ciBuildWindows.ps1 %BRANCH_NAME% ${VIEWER_VERSION} build"
                }}
            }
        })
    }

    // Build osx
    if (userInput['buildOSX']) {
        buildMap.put('osx', {
            stage('Build: osx') {
                node('osx && xcode') { dir(path: workspacePath) {
                    // Clean up workspace first on non development branches
                    if (!isUserDevBranch) {
                        deleteDir()
                    }
                    
                    //stage('Retrieve sources') {}
                    checkout scm

                    //stage('Build C++ OSX plugin') {}
                    sh "cd scripts/ci && ./ciBuildOSX.sh $BRANCH_NAME ${VIEWER_VERSION} build"
                }}
            }
        })
    }

    // Build docker & launch tests
    if (userInput['buildDocker']) {
        buildMap.put('docker', {
            stage('Build: LSB') {
                node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-orthanc.osimis.io']]) {
                        sh 'scripts/ci/ciBuildLsb.sh'
                    }
                }}}
            }

        })
    }

    parallel(buildMap)

    // Deploy docker image
    if (userInput['buildDocker']) {
        stage('Deploy: docker demo') {
            node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-orthanc.osimis.io']]) {
                    Random random = new Random();

                    // Set subnet (divide by 16 for /28 mask - `bash -c` because dash doesn't support $RANDOM)
                    def demoSubnet = sh(
                        script: 'bash -c \'echo "10.$(($RANDOM % 256)).$(($RANDOM % 256)).$(($RANDOM % (256 / 16) * 16))/28"\'',
                        returnStdout: true
                    ).trim()

                    // Chose random port
                    // @todo remove DEMO_PORT from setEnv
                    int minPort = 20000
                    int maxPort = 40000
                    int demoPort = random.nextInt(maxPort - minPort + 1) + minPort;

                    // Build demo
                    sh 'scripts/ci/setEnv.sh ${BRANCH_NAME}'
                    sh "demo/scripts/buildDocker.sh"

                    // Load docker registry (required by docker-compose)
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-jenkinsosimis') {
                        // Set docker-compose project name
                        def dockerProject = "wvb_demo_${BRANCH_NAME}"

                        // Stop previous demo (if already exists)
                        sh "SUBNET=${demoSubnet} PORT=${demoPort} docker-compose -p ${dockerProject} down || true"
                        
                        // Start demo
                        sh "SUBNET=${demoSubnet} PORT=${demoPort} docker-compose -p ${dockerProject} up -d orthanc_populated"
                    }

                    // Retrieve ticket number
                    def ticketNumber = '?'
                    if (isUserDevBranch) {
                        try {
                            ticketNumber = ((env.BRANCH_NAME =~ /.+(?:\-|\/)(\w+\-\d+).*/)[0][1])
                        } catch(err) {
                            // ignore incompatible branch name
                        }
                    }

                    // Send message on slack with address
                    slackSend color: '#800080', message: "wvb: ${BRANCH_NAME} deployed.\n- http://qa.wvb.osidev.net:${demoPort}"
                }
            }}}
        }
    }

    // Wait for docker build (& integration tests) before running publishing scripts
    // ...

    def publishMap = [:]

    // Publish osx release
    if (userInput['buildOSX']) {
        publishMap.put('osx', {
            stage('Publish: osx') {
                node('osx') { dir(path: workspacePath) {
                    //stage('Retrieve sources') {}
                    checkout scm

                    //stage('Publish C++ OSX plugin') {}
                    sh "cd scripts/ci && ./ciBuildOSX.sh $BRANCH_NAME ${VIEWER_VERSION} publish"
                }}
            }
        })
    }

    // Publish windows release
    if (userInput['buildWindows']) {
        publishMap.put('windows', {
            stage('Publish: C++ Windows plugin') {
                node('windows && vs2015') { dir(path: workspacePath) {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-orthanc.osimis.io']]) {
                        bat "cd scripts & cd ci & powershell.exe ./ciBuildWindows.ps1 %BRANCH_NAME% ${VIEWER_VERSION} publish"
                    }
                }}
            }
        })
    }

    // note: the LSB is published directly.  We do not publish the osimis/orthanc-webviewer-plugin docker image anymore

    parallel(publishMap)

    // Publish js code for in-lify integration (until we use iframe) & wvp usage as a library
    stage('Publish: js -> AWS (release)') {
        node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
            withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-orthanc.osimis.io']]) {
                sh 'scripts/ci/ciPushFrontend.sh tagWithReleaseTag'
            }
        }}}
    }

    // Clean up
    stage('Clean up') {
        node('master && docker') { dir(path: workspacePath) { wrap([$class: 'AnsiColorBuildWrapper']) {
            sh 'scripts/ci/ciLogDockerState.sh postbuild'
            sh 'scripts/ci/ciCleanup.sh'
        }}}
    }

}
