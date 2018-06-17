# Le lama NUL slackbot

This botkit-based slackbot allows your team to use a slack instance as a single entry point to various useful tools

- **GitHub**
- **Jenkins**
- **Jira**

It contains also lots of functions ... some more useful than others !

- **Vacations** / Sick leave tracking : use the bot to request vacations, and authorized members can validate or reject them
- **Games** for coffee breaks: **Quizz** and **Trivia** ( If you are a nazi, you can of course deactivate them )

Feel free to contribute :)


## Commands

- **GENERAL**

  - **help** : Provide help for lamanul bot

----------

- **GITHUB**

  - **members** : List members of GIT_ORG
  - **pull requests** : List open pull requests of GIT_ORG/GIT_MAIN_REPO
  - **search code** _CODE_ : Search in GIT_MAIN_REPO code (ex: _search code Membership_m_ )
  - **search doc** _KEYWORDS_ : Search in GIT_ORG doc (ex: _search doc Installation pre-requisites_ )
  - **repos** : List repos of GIT_ORG
  - **teams** : List teams of GIT_ORG

----------

- **JENKINS**

  - **jobs** : List all jenkins jobs of JENKINS_MAIN_VIEW
  - **running jobs** : List all currently running jobs  
  - **build** _JOB_NAME_ : Launch a build for the job name specified ( ex: _build DXCO4SF-1150-TST-DevRootOrg_ )

----------

- **JIRA**

  - **current sprint** : List open issues of the current sprint
  - **issues of** _@USER_ : List open issues of a user
  - **my issues**  : List your open issues

----------

- **ABSENCES / VACATIONS / SICK LEAVE**

  - **absences** _(optional) @USER_ : List current and future absences 
  - **past absences** _(optional) @USER_ : Display past absences 
  - **my absences** : List current and future absences 
  - **my past absences** : Display past absences
  - **add absences validator** _@USER_ : Adds an absence validator
  - **remove absences validator** _@USER_ : Removes an absence validator

----------

- **MISC**

  - **tell** _EXPRESSION_ : Retrieves value corresponding to expression (stored using remember command )
  - **learn** _EXPRESSION_=_VALUE_ : Stores value corresponding to expression
  - **start quizz** : Launch an interactive quizz in the channel ( https://opentdb.com database )
  - **start trivia** : Launch an interactive trivia in the channel ( http://jservice.io database )


## Installation

### Create a slack app

- Create a new app on https://api.slack.com/

  - Interactive components: https://myapp.herokuapp.com/slack/receive (can be done after next step)

  - OAuth & Permissions
  		- Callback URL: https://myapp.herokuapp.com/oauth (can be done after next step)
  		- Permission scopes: channels:write , incoming-webhook , bot
 
 - Activate bot user

### Deploy this repo on Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nvuillam/slackbot-lelamanul)

- Free heroku dyno will be fine

- Define the following environment variable in Heroku app

  - **MY_HOST** : Your app current host (ex: https://myapp.herokuapp.com )
  - **token**: Slack bot token ( ex: dfh54dg56hf46ggh64fg56gh564fg46fh)
  - **CLIENT_ID** : Slack App client Id (ex: 424298597.3788425242061) 
  - **CLIENT_SECRET** : Slack App client secret (ex: 54575272754f2bb0468105513e60) 
  - **PORT** : Your bot port (ex: 8765)
  
  - **MONGOLAB_URI** : URI of a mongo database (ex: mongodb://someuser:somepassword@ds2514520.mlab.com:55260/slackbot-lelamanul )
    - You can use mlab.com free 500mb database if you do not have a mongodb database

  - **GIT_USERNAME** : Your github username ( ex: nvuillam )
  - **GIT_PASSWORD** : Your github password or token ( ex: dfdgdhgh6d46fg4h6fgfg6 )

  - **GIT_ORG** : Your main github organization  (ex: Omnichannel-for-Salesforce )
  - **GIT_MAIN_REPO** : Your main github repository , containing source code. ( ex: DXCO4SF_Sources )

  - **JENKINS_HOST** : Your jenkins instance host ( ex: jenkins.mydomain.com:8080 )
  - **JENKINS_USERNAME** : Your jenkins username (ex: nvuillam )
  - **JENKINS_PASSWORD** : Your jenkins password or token ( ex: df46d4h6fg4h6fg4h6fg6 )
  - **JENKINS_MAIN_VIEW** : Your Jenkins main view ( ex: DXC-OmniChannel-for-Salesforce )

  - **JIRA_HOST** : Your JIRA instance host ( ex: jira.mydomain.com )
  - **JIRA_USERNAME** : Your JIRA username ( ex: nvuillam )
  - **JIRA_PASSWORD** : Your JIRA password or token ( ex: dffgdg5dfg5df5g5 )
  - **JIRA_MAIN_PROJECT_NAME** : Your JIRA main project name ( ex: Cloud IRM )

  - **ACTIVATE_QUIZZ** : Activate quizz & trivia commands

### Add lelamanul to your slack workspace

- Open https://myapp.herokuapp.com/login in a web browser
