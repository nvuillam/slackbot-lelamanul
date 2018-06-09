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
var request = require('request');
var jenkinsapi = require('jenkins-api');
var async = require('async');
/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}

function getGithubClient() {
    var github = require('octonode');

    var scopes = {
        'scopes': ['user', 'repo', 'gist', 'admin:org'],
        'note': 'admin script'
    };

    github.auth.config({
        username: process.env.GIT_USERNAME,
        password: process.env.GIT_PASSWORD
    }).login(scopes, function (err, id, token, headers) {
        console.log(id, token);
    });

    var client = github.client({
        username: process.env.GIT_USERNAME, //'nvuillam',
        password: process.env.GIT_PASSWORD //'7b35856c1fe3057e7ed65578007a20e9decc2d07'
        //id: process.env.GIT_CLIENT_ID,
        //secret: process.env.GIT_CLIENT_SECRET
    }, {
            hostname: process.env.GIT_HOSTNAME // 'partner-github.csc.com/api/v3'
        });

    return client;
}


// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('hello', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.reply(message, 'Hello!');
});

controller.hears('youhou', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.reply(message, '... houuu ... houuu .... houu ....');
});

// HELP
controller.hears('help', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.reply(message, {
        text: `Commands for lelamanul
GITHUB:
- *members* : List members of ${process.env.GIT_ORG}
- *pull requests* : List open pull requests of ${process.env.GIT_ORG}/${process.env.GIT_MAIN_REPO}
- *repos* : List repos of ${process.env.GIT_ORG}
- *teams* : List teams of ${process.env.GIT_ORG}
JENKINS
- *jobs* : List all jenkins jobs of ${process.env.JENKINS_MAIN_VIEW}
- *build* _JOB_NAME_ : Launch a build for the job name specified ( ex: build DXCO4SF-1150-TST-DevRootOrg)
`});
});

//////////// GITHUB ////////////

// Search in github ( not working yet )
controller.hears('git search code', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    var queryToken = message.text.substring(message.text.indexOf('git search code') + ('git search code'.length + 1));
    var query = '/api/v3/search/code?q=' + queryToken.trim();
    console.log('Query: ' + query);
    client.get(query, {}, function (err, status, result, headers) {
        console.log(headers);
        console.log(result); //json object

        var text = 'Search results : *' + result.total_count + '*';
        var attachments = [];
        result.items.forEach(item => {
            var attachment = {
                text: item.path + '(' + item.repository.name + ')',
                title_link: item.html_url,
            };
            attachments.push(attachment);
        });
        bot.reply(message, { text: text, attachments: attachments });
    });

});

// List members of default github org
controller.hears('pull requests', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/repos/' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO + '/pulls?per_page=50', {}, function (err, status, pullRequests, headers) {
        console.log(headers);
        console.log(pullRequests); //json object

        var text = 'Repo *' + process.env.GIT_MAIN_REPO + '* contains *' + pullRequests.length + '* pull requests\n';
        var attachments = [];
        pullRequests.forEach(pullRequest => {
            var attachment = {
                title: pullRequest.title,
                title_link: pullRequest.html_url,
                fields: [
                    {
                        title: "User",
                        value: pullRequest.user.login,
                        short: true
                    },
                    {
                        title: "Status",
                        value: pullRequest.state,
                        short: true
                    }
                ]
            };
            attachments.push(attachment);
        });
        bot.reply(message, { text: text, attachments: attachments });
    });

});

// List teams of default org
controller.hears('teams', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/teams?per_page=50', {}, function (err, status, teams, headers) {
        console.log(headers);
        console.log(teams); //json object

        var text = 'Organization *' + process.env.GIT_ORG + '* contains *' + teams.length + '* team(s)\n';
        var attachments = []
        teams.forEach(team => {
            var attachment = {
                //text:'- <'+encodeURI(team.url)+'|'+team.name+">  \n",
                color: 'good',
                title: team.name,
                title_link: team.url,
                actions: [
                    {
                        type: "button",
                        text: "Members",
                        url: team.members_url
                    },
                    {
                        type: "button",
                        text: "Repos",
                        url: team.repositories_url
                    }
                ]
            }
            attachments.push(attachment);


        });
        bot.reply(message, { text: text, attachments: attachments });
    });

});

// List members of default github org
controller.hears('members', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/members?per_page=50', {}, function (err, status, members, headers) {
        console.log(headers);
        console.log(members); //json object

        var memberListStr = 'Organization *' + process.env.GIT_ORG + '* contains *' + members.length + '* member(s)\n';
        members.forEach(member => {
            memberListStr += '- <' + encodeURI(member.html_url) + '|' + member.login + ">  \n";
        });
        console.log('Formatted member list \n' + memberListStr);
        bot.reply(message, { attachments: [{ text: memberListStr }] });
    });

});

// List default org repositories
controller.hears('repos', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/repos?per_page=50', {}, function (err, status, repos, headers) {
        console.log(headers);
        console.log(repos); //json object
        var text = 'Repo *' + process.env.GIT_ORG + '* contains *' + repos.length + '* repositories \n';
        var attachments = [];
        repos.forEach(repo => {
            var fields = [];
            if (repo.description != null) {
                fields.push({
                    title: "Description",
                    value: repo.description,
                    short: true
                });
            }
            if (repo.language != null) {
                fields.push({
                    title: "Language",
                    value: repo.language,
                    short: true
                });
            }
            var attachment = {
                title: repo.name,
                title_link: repo.html_url,
                fields: fields,
                color: 'good'
            };
            attachments.push(attachment);
        });
        bot.reply(message, { text: text, attachments: attachments });
    });
});


// Check github user
controller.hears('githubme', 'direct_message,mention,direct_mention', function (bot, message) {

    var client = getGithubClient();
    var ghme = client.me();

    ghme.info(function (err, data, headers) {
        console.log("error: " + err);
        console.log("data: " + JSON.stringify(data));
        console.log("headers:" + JSON.stringify(headers));
        bot.reply(message, JSON.stringify(data, null, 2));
    });

    ghme.orgs(function (err2, data2, headers2) {
        console.log("error: " + err2);
        console.log("data: " + JSON.stringify(data2));
        console.log("headers:" + JSON.stringify(headers2));
        bot.reply(message, JSON.stringify(data2, null, 2));

    });

});

//////////// JENKINS ///////////////

function getJenkinsClient() {
    console.log("http://" + process.env.JENKINS_USERNAME + ":" + process.env.JENKINS_PASSWORD + "@" + process.env.JENKINS_HOST)
    var jenkins = jenkinsapi.init("http://" + process.env.JENKINS_USERNAME + ":" + process.env.JENKINS_PASSWORD + "@" + process.env.JENKINS_HOST);
    return jenkins;
}

// Get current queue
controller.hears('queue', 'direct_message,mention,direct_mention', function (bot, message) {
    var jenkins = getJenkinsClient();
    jenkins.queue(function (err, data) {
        if (err) { return console.log(err); }
        console.log(data);
        bot.reply(message, JSON.stringify(data, null, 2));
    });
});

// List all jobs
controller.hears('jobs', 'direct_message,mention,direct_mention', function (bot, message) {
    var jenkins = getJenkinsClient();
    jenkins.all_jobs_in_view(process.env.JENKINS_MAIN_VIEW, function (err, jobs) {
        if (err) { return console.log(err); }
        console.log(jobs);
        var attachments = [];
        var promiseJobAll = jobs.map(function (item) {
            return new Promise(function (resolve, reject) {
                var fields = [];
                var color = 'warning';
                jenkins.job_info(item.name, function (err2, jobInfo) {
                    if (err2) { return console.log(err2); }
                    console.log('\n\n\n')
                    console.log(JSON.stringify(jobInfo, null, 2))
                    if (jobInfo.description != null && jobInfo.description != "") {
                        fields.push({
                            title: "Description",
                            value: jobInfo.description,
                            short: false
                        });
                    }
                    /*if (jobInfo.healthReport != null && jobInfo.healthReport[0].description != null) {
                        fields.push({
                            title: "Health",
                            value: jobInfo.healthReport[0].description,
                            short: false
                        });
                    } */
                    if (jobInfo.healthReport != null && jobInfo.healthReport[0] != null && jobInfo.healthReport[0].score != null) {
                        fields.push({
                            title: "Score",
                            value: '*' + jobInfo.healthReport[0].score + '* /100',
                            short: false
                        });
                        if (jobInfo.healthReport[0].score == 100)
                            color = 'good'
                        else if (jobInfo.healthReport[0].score <= 70) {
                            color = 'danger'
                        }
                    }
                    var attachment = {
                        title: item.name,
                        title_link: item.url,
                        fields: fields,
                        color: color
                    };
                    attachments.push(attachment);
                    resolve()
                });
            });
        });
        console.log('BEFORE PROMISE ALL: ' + attachments.length)
        Promise.all(promiseJobAll)
            .then(function () {
                bot.reply(message, { attachments: attachments });
            })
            .catch(console.error);
        console.log('AFTER PROMISE ALL: ' + attachments.length)    
    });
});

// List all jobs
controller.hears('build', 'direct_message,mention,direct_mention', function (bot, message) {
    var jenkins = getJenkinsClient();
    var keyWord = 'build'
    var jobName = message.text.substring(message.text.indexOf(keyWord) + (keyWord.length + 1));
    jenkins.build(jobName, function(err, data) {
        if (err){ return console.log(err); }
        console.log(data)
        var launchedBuildMsg
        var color = 'danger'
        if (data.statusCode === 201) {
            launchedBuildMsg = 'I launched a build for '+jobName;
            color = 'good'
        }
        else {
            launchedBuildMsg = 'Error while launching build for'+jobName
        }
        bot.reply(message, { attachments: [{ text: launchedBuildMsg , color: color }] });
    });

});

