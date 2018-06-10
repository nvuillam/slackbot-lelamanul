/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({ user: installer }, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}

/**
 * Libraries
 */
var http = require('http');
var request = require('request');

var fs = require('fs');

/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var mongoStorage = require('botkit-storage-mongo')({mongoUri: process.env.MONGOLAB_URI})
    config = {
        storage: mongoStorage ,
        debug: true
    };
    console.log('Mongolab storage')
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
        debug: true
    };
    console.log('Local storage')
}

var Botkit = require('botkit');

var controller = Botkit.slackbot(config);

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});

///// INCLUDES 

// General
eval(fs.readFileSync('./domains/general/commands.js')+'')

// Github
eval(fs.readFileSync('./domains/github/commands.js')+'')

// Jenkins
eval(fs.readFileSync('./domains/jenkins/commands.js')+'')

// Jenkins
eval(fs.readFileSync('./domains/jira/commands.js')+'')

// Miscellaneous
eval(fs.readFileSync('./domains/misc/commands.js')+'')

// To keep Heroku's free dyno awake
http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Ok, dyno is awake.');
}).listen(5000);