/**
 * Libraries
 */
var http = require('http');
var request = require('request');
var Botkit = require('botkit');
var fs = require('fs');


/**
 * Configure & Create bot
 */
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}


var config = {};
if (!process.env.MONGOLAB_URI) {
    console.error('Please set MONGOLAB_URI env variable')
    System.exit(1)
}

var mongoStorage = require('botkit-storage-mongo')({ mongoUri: process.env.MONGOLAB_URI })
config = {
    storage: mongoStorage,
    port: process.env.PORT,
    debug: true
};
console.log('Mongolab storage')



var controller = Botkit.slackbot(config);

controller.configureSlackApp( 
    { 
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET, 
        scopes: ['bot']
    } 
); 

// Set up WebServer for hooks and oAuth
controller.setupWebserver(process.env.PORT,function(err,webserver) { 
    controller.createWebhookEndpoints(controller.webserver); 

    controller.createOauthEndpoints(controller.webserver,function(err,req,res) { 
        if (err) { 
            res.status(500).send('ERROR: ' + err); 
        } else { 
            res.send('Success!'); 
        } 
    }); 
}); 

// Start bot listener

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
eval(fs.readFileSync('./domains/general/commands.js') + '')

// Github
eval(fs.readFileSync('./domains/github/commands.js') + '')

// Jenkins
eval(fs.readFileSync('./domains/jenkins/commands.js') + '')

// Jenkins
eval(fs.readFileSync('./domains/jira/commands.js') + '')

// Miscellaneous
eval(fs.readFileSync('./domains/misc/commands.js') + '')


// To keep Heroku's free dyno awake
http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Ok, dyno is awake.');
}).listen(5000);
