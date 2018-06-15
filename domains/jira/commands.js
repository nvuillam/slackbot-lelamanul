/////////////// JIRA ////////////////////

var JiraApi = require('jira-client');

// Initialize
function getJiraClient() {
    var jira = new JiraApi({
        protocol: 'https',
        host: process.env.JIRA_HOST,
        username: process.env.JIRA_USERNAME,
        password: process.env.JIRA_PASSWORD,
        apiVersion: '2',
        strictSSL: true
    });
    return jira;
}

// check authentication to jiraa
controller.hears('^jirame', 'ambient,direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var jira = getJiraClient();
    jira.getCurrentUser().then(function (currJiraUser) {
        console.log(JSON.stringify(currJiraUser));
        bot.reply(message, { attachments: [{ text: JSON.stringify(currJiraUser, null, 2), color: 'good' }] });
    }).catch(function (error) {
        console.log(error);
        bot.reply(message, { attachments: [{ text: JSON.stringify(error, null, 2), color: 'danger' }] });
    });
});

// Get current sprint info
controller.hears('^current sprint', 'ambient,direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var jira = getJiraClient();

    jira.findRapidView(process.env.JIRA_MAIN_PROJECT_NAME).then(function (rapidView) {
        console.log(JSON.stringify(rapidView));

        jira.getLastSprintForRapidView(rapidView.id).then(function (lastSprint) {
            console.log(JSON.stringify(lastSprint));

            jira.getSprintIssues(rapidView.id, lastSprint.id).then(function (sprintIssues) {
                console.log(JSON.stringify(sprintIssues, null, 2));

                // Build response message
                var attachments = [];
                sprintIssues.contents.issuesNotCompletedInCurrentSprint.forEach(item => {
                    var fields = [
                        {
                            title: "Type",
                            value: item.typeName,
                            short: true
                        },
                        {
                            title: "Status",
                            value: item.status.name,
                            short: true
                        },
                        {
                            title: "Priority",
                            value: item.priorityName,
                            short: true
                        },
                        {
                            title: "Assignee",
                            value: item.assigneeName,
                            short: true
                        }
                    ];
                    var attachment = {
                        title:  '['+item.key+'] '+item.summary ,
                        title_link: 'https://' + process.env.JIRA_HOST + '/browse/' + item.key,
                        fields: fields,
                        color: item.color
                    };
                    attachments.push(attachment);
                });

                bot.reply(message, { attachments: attachments });

            }).catch(function (error) {
                console.log(error);
                bot.reply(message, { attachments: [{ text: JSON.stringify(error, null, 2), color: 'danger' }] });
            });

        }).catch(function (error) {
            console.log(error);
            bot.reply(message, { attachments: [{ text: JSON.stringify(error, null, 2), color: 'danger' }] });
        });
    }).catch(function (error) {
        console.log(error);
        bot.reply(message, { attachments: [{ text: JSON.stringify(error, null, 2), color: 'danger' }] });
    });
});

// Get current sprint info
controller.hears(['^issues of (.*)','^issues (.*)','^open issues of (.*)','^my issues','^my open issues'], 'ambient,direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var slackUserId = message.match[1]
    if (slackUserId == null || slackUserId === '')
        slackUserId = message.user
    else 
        slackUserId = message.match[1].replace('?','').replace('@','').replace('<','').replace('>','').trim()
    controller.storage.users.get(slackUserId, function (err, user) {
        // Jira user id found: call jira api with it
        if (user && user.jiraUserId) {
            var jira = getJiraClient();
            jira.getUsersIssues(user.jiraUserId,true).then(function (searchIssuesResult) {
                console.log(JSON.stringify(searchIssuesResult));

                // Build response message
                var attachments = [];
                var colorFlag = true
                searchIssuesResult.issues.forEach(item => {
                    console.log('STATUS: '+item.fields.status.name)
                    var fields = [
                        {
                            title: "Type",
                            value: item.fields.issuetype.name,
                            short: true
                        },
                        {
                            title: "Status",
                            value: item.fields.status.name,
                            short: true
                        },
                        {
                            title: "Priority",
                            value: item.fields.priority.name,
                            short: true
                        },
                        {
                            title: "Reporter",
                            value: item.fields.reporter.displayName,
                            short: true
                        }
                    ];
                    var attachment = {
                        title:  '['+item.key+'] '+item.fields.summary ,
                        title_link: 'https://' + process.env.JIRA_HOST + '/browse/' + item.key,
                        fields: fields,
                        color: (colorFlag)?'#76b3b8':'#646496'
                    };
                    attachments.push(attachment);
                    colorFlag = !colorFlag
                });
                bot.reply(message, { attachments: attachments });

            }).catch(function (error) {
                console.log(error);
                bot.reply(message, { attachments: [{ text: JSON.stringify(error, null, 2), color: 'danger' }] });
            });
        }
        else {
            // Ask the jira id of this user
            bot.startConversation(message, function (err, convo) {
                if (!err) {
                    convo.ask('What is the jira id of <@'+slackUserId+'> ?', function (response, convo) {
                        convo.ask('Do you confirm <@'+slackUserId+'> \'s jira id is `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function (response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function (response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function (response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, { 'key': 'jiraUserId' }); // store the results in a field called nickname

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {
                            controller.storage.users.get(slackUserId, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: slackUserId
                                    };
                                }
                                user.jiraUserId = convo.extractResponse('jiraUserId');
                                if (user.jiraUserId.includes('|'))
                                    user.jiraUserId = user.jiraUserId.substring(user.jiraUserId.indexOf('|')+1).replace('>','')
                                controller.storage.users.save(user, function (err, id) {
                                    if (err)
                                        console.error(err)
                                    else
                                        bot.reply(message, 'Saved  '+user.jiraUserId+' as jira login for <@'+slackUserId+'> :lelamanul: ');
                                });
                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});
