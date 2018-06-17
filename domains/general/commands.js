///// GENERAL FUNCTIONS

var os = require('os');

// HELP
controller.hears('^help', 'ambient,direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () {});
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
- *running jobs* : List all currently running jobs
- *build* _JOB_NAME_ : Launch a build for the job name specified ( ex: _build DXCO4SF-1150-TST-DevRootOrg_ )

JIRA
- *current sprint* : List open issues of the current sprint
- *issues of* _@USER_ : List open issues of a user
- *my issues*  : List your open issues

ABSENCES / VACATIONS / SICK LEAVE
- *absences* _(optional) @USER_ : List current and future absences 
- *past absences* _(optional) @USER_ : Display past absences 
- *my absences* : List current and future absences 
- *my past absences* : Display past absences
- *add absences validator* _@USER_ : Adds an absence validator
- *remove absences validator* _@USER_ : Removes an absence validator

MISC
- *tell me* _EXPRESSION_ : Retrieves value corresponding to expression
- *learn* _EXPRESSION_=_VALUE_ : Stores value corresponding to expression
- *start quizz* : Launch a quizz in the channel 
- *start trivia* : Launch a trivia in the channel 
`});
});

// UPTIME
controller.hears(['^uptime', '^identify yourself', '^who are you', '^what is your name'],'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.startTyping(message, function () {});
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());
    bot.reply(message,
        ':robot_face: I am a bot named <@' + bot.identity.name +
         '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

// LEAVE
controller.hears(['^leave'],'direct_mention', function(bot, message) {
    bot.startTyping(message, function () {});
    bot.reply(message,'C\'est vraiment trop injuste :sad: ');
    bot.api.channels.leave({channel: message.channel},function(err,response) {
        console.log('Left channel '+message.channel)
    })
});

controller.hears(['^whisper (.*)'], 'ambient,direct_message,direct_mention,mention', function (bot, message) { 
    var text = message.match[1]; 
    bot.whisper(message,{ text: text}) 
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

