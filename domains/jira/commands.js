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
controller.hears('^jirame', 'direct_message,mention,direct_mention', function (bot, message) {
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
controller.hears('^current sprint', 'direct_message,mention,direct_mention', function (bot, message) {
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
                            title: "Status",
                            value: item.status.name,
                            short: true
                        },
                        {
                            title: "Assignee",
                            value: item.assigneeName,
                            short: true
                        }
                    ];
                    var attachment = {
                        title: item.key,
                        title_link: 'https://' + process.env.JIRA_HOST + '/browse/' + item.key,
                        text: item.summary,
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