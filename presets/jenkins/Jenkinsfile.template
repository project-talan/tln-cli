def sendEmailNotification(subj, recepients) {
    emailext body: "${BUILD_URL}",
    recipientProviders: [
      [$class: 'CulpritsRecipientProvider'],
      [$class: 'DevelopersRecipientProvider'],
      [$class: 'RequesterRecipientProvider']
    ],
    subject: subj,
    to: "${recepients}"
}

def setBuildStatus(String message, String state, String context, String sha) {
  step([
    $class: "GitHubCommitStatusSetter",
    //reposSource: [$class: "ManuallyEnteredRepositorySource", url: "https://github.com/<your-repo-url>"],
    contextSource: [$class: "ManuallyEnteredCommitContextSource", context: context],
    errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
    commitShaSource: [$class: "ManuallyEnteredShaSource", sha: sha ],
    //statusBackrefSource: [$class: "ManuallyEnteredBackrefSource", backref: "${BUILD_URL}<your-url>/"],
    statusResultSource: [$class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state]] ]
  ]);
}

def printTopic(topic) {
  println("[*] ${topic} ".padRight(80, '-'))
}

node {

  //
  def pullRequest = false
  def commitSha = ''
  def buildBranch = ''
  def pullId = ''
  def lastCommitAuthorEmail = ''
  def repo = ''
  def org = ''

  //
  stage('Checkout') {
    //
    def scmVars = checkout scm
    printTopic('Job input parameters');
    println(params)
    printTopic('SCM variables')
    println(scmVars)
    //
    commitSha = scmVars.GIT_COMMIT
    buildBranch = scmVars.GIT_BRANCH
    if (buildBranch.contains('PR-')) {
      pullRequest = true
      pullId = CHANGE_ID
    } else if (params.containsKey('sha1')){
      pullRequest = true
      pullId = ghprbPullId
    } else {
    }
    //
    printTopic('Build info')
    echo "[PR:${pullRequest}] [BRANCH:${buildBranch}] [COMMIT: ${commitSha}] [PULL ID: ${pullId}]"
    printTopic('Environment variables')
    echo sh(returnStdout: true, script: 'env')
    //
    org = sh(returnStdout: true, script:'''git config --get remote.origin.url | rev | awk -F'[./:]' '{print $2}' | rev''').trim()
    repo = sh(returnStdout: true, script:'''git config --get remote.origin.url | rev | awk -F'[./:]' '{print $1}' | rev''').trim()
    //
    printTopic('Repo parameters')
    echo sh(returnStdout: true, script: 'git config --get remote.origin.url')
    echo "[org:${org}] [repo:${repo}]"
    //
    lastCommitAuthorEmail = sh(returnStdout: true, script:'''git log --format="%ae" HEAD^!''').trim()
    if (!pullRequest){
      lastCommitAuthorEmail = sh(returnStdout: true, script:'''git log -2 --format="%ae" | paste -s -d ",\n"''').trim()
    }
    printTopic('Author(s)')
    echo "[lastCommitAuthorEmail:${lastCommitAuthorEmail}]"
  }
    
  try {
    //  
    stage('Build') {
      /*
      */
    }

    //
    stage('Unit tests') {
      /*
      */
    }

    //
    stage('SonarQube analysis') {
      /*
      printTopic('Sonarqube properties')
      echo sh(returnStdout: true, script: 'cat sonar-project.properties')
      def scannerHome = tool "${SONARQUBE_SCANNER}"
      withSonarQubeEnv("${SONARQUBE_SERVER}") {
        if (pullRequest){
          sh "${scannerHome}/bin/sonar-scanner -Dsonar.analysis.mode=preview -Dsonar.github.pullRequest=${pullId} -Dsonar.github.repository=${org}/${repo} -Dsonar.github.oauth=${GITHUB_ACCESS_TOKEN} -Dsonar.login=${SONARQUBE_ACCESS_TOKEN}"
        } else {
          sh "${scannerHome}/bin/sonar-scanner -Dsonar.login=${SONARQUBE_ACCESS_TOKEN}"
          // check SonarQube Quality Gates
          //// Pipeline Utility Steps
          def props = readProperties  file: '.scannerwork/report-task.txt'
          echo "properties=${props}"
          def sonarServerUrl=props['serverUrl']
          def ceTaskUrl= props['ceTaskUrl']
          def ceTask
          //// HTTP Request Plugin
          timeout(time: 1, unit: 'MINUTES') {
            waitUntil {
              def response = httpRequest "${ceTaskUrl}"
              println('Status: '+response.status)
              println('Response: '+response.content)
              ceTask = readJSON text: response.content
              return (response.status == 200) && ("SUCCESS".equals(ceTask['task']['status']))
            }
          }
          //
          def qgResponse = httpRequest sonarServerUrl + "/api/qualitygates/project_status?analysisId=" + ceTask['task']['analysisId']
          def qualitygate = readJSON text: qgResponse.content
          echo qualitygate.toString()
          if ("ERROR".equals(qualitygate["projectStatus"]["status"])) {
            currentBuild.description = "Quality Gate failure"
            error currentBuild.description
          }
        }
      }
      */
    }
    
    //  
    stage('Delivery') {
      /*
      if (pullRequest){
      } else {
        // create docker, push
        // archiveArtifacts artifacts: 'path/2/artifact'
      }
      */
    }   

    //
    stage('Deploy') {
      /*
      if (pullRequest){
      } else {
        // 
      }
      */
    }
  } catch (e) {
    sendEmailNotification('BUILD FAILED', lastCommitAuthorEmail, e.toString())
    throw e
  }
}