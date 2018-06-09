# Pet bot of DXC OmniChannel for Salesforce team

## Installation

- Deploy this repo on Heroku (Connect to github option)

- Define the following environment variable in Heroku app

  - MY_HOST : Your app current host (ex: https://myapp.herokuapp.com )
  - CLIENT_ID : Slack App client Id (ex: 424298597.3788425242061)
  - CLIENT_SECRET : Slack App client secret (ex: 54575272754f2bb0468105513e60)
  - PORT : Your bot port (ex: 8765)

  - GIT_USERNAME : Your github username ( ex: nvuillam )
  - GIT_PASSWORD : Your github password or token ( ex: dfdgdhgh6d46fg4h6fgfg6 )

  - GIT_ORG : Your main github organization  (ex: Omnichannel-for-Salesforce )
  - GIT_MAIN_REPO : Your main github repository , containing source code. ( ex: DXCO4SF_Sources )

  - JENKINS_HOST : Your jenkins instance host ( ex: jenkins.mydomain.com:8080 )
  - JENKINS_USERNAME : Your jenkins username (ex: nvuillam )
  - JENKINS_PASSWORD : Your jenkins password or token ( ex: df46d4h6fg4h6fg4h6fg6 )

  - JENKINS_MAIN_VIEW : Your Jenkins main view ( ex: DXC-OmniChannel-for-Salesforce )

  - JIRA_HOST : Your JIRA instance host ( ex: jira.mydomain.com )
  - JIRA_USERNAME : Your JIRA username ( ex: nvuillam )
  - JIRA_PASSWORD : Your JIRA password ( ex: dffgdg5dfg5df5g5 )

  - JIRA_MAIN_PROJECT_NAME : Your JIRA main project name ( ex: Cloud IRM )

## Commands

- GENERAL
  - **help** : Provide help for lamanul bot

- GITHUB:
  - **members** : List members of GIT_ORG
  - **pull requests** : List open pull requests of GIT_ORG/GIT_MAIN_REPO
  - **search code** _CODE_ : Search in GIT_MAIN_REPO code (ex: _search code Membership_m_ )
  - **search doc** _KEYWORDS_ : Search in GIT_ORG doc (ex: _search doc Installation pre-requisites_ )
  - **repos** : List repos of GIT_ORG
  - **teams** : List teams of GIT_ORG

- JENKINS
  - **jobs** : List all jenkins jobs of ${process.env.JENKINS_MAIN_VIEW}
  - **build** _JOB_NAME_ : Launch a build for the job name specified ( ex: _build DXCO4SF-1150-TST-DevRootOrg_ )

- JIRA
  - **current sprint** : List open issues of the current sprint
