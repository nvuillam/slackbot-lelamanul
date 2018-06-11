///// GENERAL FUNCTIONS

var os = require('os');

// HELP
controller.hears('^help', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.reply(message, {
        text: `Commands for lelamanul

GITHUB:
- *members* : List members of ${process.env.GIT_ORG}
- *pull requests* : List open pull requests of ${process.env.GIT_ORG}/${process.env.GIT_MAIN_REPO}
- *search code* _CODE_ : Search in ${process.env.GIT_MAIN_REPO} code (ex: _search code Membership_m_ )
- *search doc* _KEYWORDS_ : Search in ${process.env.GIT_ORG} doc (ex: _search doc Installation pre-requisites_ )
- *repos* : List repos of ${process.env.GIT_ORG}
- *teams* : List teams of ${process.env.GIT_ORG}

JENKINS
- *jobs* : List all jenkins jobs of ${process.env.JENKINS_MAIN_VIEW}
- *build* _JOB_NAME_ : Launch a build for the job name specified ( ex: _build DXCO4SF-1150-TST-DevRootOrg_ )

JIRA
- *current sprint* : List open issues of the current sprint

MISC
- *tell me* _EXPRESSION_ : Retrieves value corresponding to expression
- *learn* _EXPRESSION_=_VALUE_ : Stores value corresponding to expressiion
`});
});

// UPTIME
controller.hears(['^uptime', '^identify yourself', '^who are you', '^what is your name'],'direct_message,direct_mention,mention', function(bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());
    bot.reply(message,
        ':robot_face: I am a bot named <@' + bot.identity.name +
         '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }
    uptime = uptime + ' ' + unit;
    return uptime;
}

// MISC
controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('youhou', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.reply(message, '... houuu ... houuu .... houu ....');
});