//////////// GITHUB ////////////

// Login to github
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
        username: process.env.GIT_USERNAME,
        password: process.env.GIT_PASSWORD
    }, {
            hostname: process.env.GIT_HOSTNAME
        });

    return client;
}

// Search in github code 
controller.hears(['^search code (.*)'], 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var key = message.match[1].trim();
    var client = getGithubClient();
    var queryToken = key + ' repo:' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO;
    var query = '/search/code'
    client.get(query, { q: queryToken }, function (err, status, result, headers) {
        console.log(err);
        console.log(status);
        console.log(headers);
        console.log(result); //json object

        var text = 'Search results in ' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO + ': *' + result.total_count + '*';

        // Build response message
        var attachments = [];
        result.items.forEach(item => {
            var attachment = {
                title: item.name,
                title_link: item.html_url,
                text: item.path
            };
            attachments.push(attachment);
        });

        bot.reply(message, { text: text, attachments: attachments });

    });
});

// Search in github wikis (just provide link, search in wikis is not provided yet by github api)
controller.hears(['^search doc (.*)', '^search wiki (.*)'], 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var queryToken = encodeURIComponent(message.match[1].trim());
    var searchWikiUrl = 'https://' + process.env.GIT_HOSTNAME.replace('/api/v3', '') + '/search?q=org%3A' + process.env.GIT_ORG + '+' + queryToken + '&type=Wikis'
    bot.reply(message, { attachments: [{ text: searchWikiUrl }] });
});

// List members of default github org
controller.hears('^pull requests', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    client.get('/repos/' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO + '/pulls', { per_page: 100 }, function (err, status, pullRequests, headers) {
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
controller.hears('^teams', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/teams', { per_page: 100 }, function (err, status, teams, headers) {
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
                callback_id: 'github:team_list',
                actions: [
                    {
                        name: "members",
                        type: "button",
                        text: "Members",
                        value: JSON.stringify({ teamMembersUri: team.members_url.substring(0,team.members_url.indexOf('{')) })
                    },
                    {
                        name: "repositories",
                        type: "button",
                        text: "Repos",
                        value: JSON.stringify({ teamReposUri: team.repositories_url })
                    }
                ]
            }
            attachments.push(attachment);


        });
        bot.reply(message, { text: text, attachments: attachments });
    });

});

// List members of default github org
controller.hears('^members', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/members', { per_page: 100 }, function (err, status, members, headers) {
        console.log(headers);
        console.log(members); //json object

        var memberListStr = 'Organization *' + process.env.GIT_ORG + '* contains *' + members.length + '* member(s)\n';
        members.forEach(member => {
            memberListStr += '<' + encodeURI(member.html_url) + '|' + member.login + "> ";
        });
        console.log('Formatted member list \n' + memberListStr);
        bot.reply(message, { attachments: [{ text: memberListStr }] });
    });

});

// List default org repositories
controller.hears('^repos', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/repos', { per_page: 100 }, function (err, status, repos, headers) {
        console.log(headers);
        console.log(repos); //json object
        var text = 'Organization *' + process.env.GIT_ORG + '* contains *' + repos.length + '* repositories \n';
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
controller.hears('^githubme', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
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

////////////////// Interactive functions ////////////////////

// Build job button
global.interactive_github_team_list = function interactive_github_team_list(bot, message) {
    bot.startTyping(message, function () { });
    var value = JSON.parse(message.actions[0].value)
    var actionValue = JSON.parse(message.actions[0].value)
    switch(message.actions[0].name) {
        case 'members' : listTeamMembers(bot,message,actionValue) ; break ;
        case 'repositories' : listTeamRepos(bot,message,actionValue) ; break ;
    }
}

//////////////////// Common functions ///////////////////////

// List team members
function listTeamMembers(bot, message, actionValue) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    console.log('TEAM MEMBER URI '+actionValue.teamMembersUri)
    client.get(actionValue.teamMembersUri, { per_page: 100 }, function (err, status, members, headers) {
        console.log(headers);
        console.log(members); //json object
        var attachments = [];
        members.forEach(member => {
            var fields = [];
            var attachment = {
                title: member.login,
                title_link: member.html_url,
                fields: fields,
                color: 'good'
            };
            attachments.push(attachment);
        });
        bot.replyInteractive(message, { attachments: attachments });
    });
}

// List team repos 
function listTeamRepos(bot, message, actionValue) {
    bot.startTyping(message, function () { });
    var client = getGithubClient();
    client.get(actionValue.teamReposUri, { per_page: 100 }, function (err, status, repos, headers) {
        console.log(headers);
        console.log(repos); //json object
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
        bot.replyInteractive(message, { attachments: attachments });
    });

}