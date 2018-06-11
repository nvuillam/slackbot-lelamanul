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
controller.hears('^search code', 'direct_message,mention,direct_mention', function (bot, message) {
    var key = 'search code'
    var client = getGithubClient();
    var queryToken = message.text.substring(message.text.indexOf(key) + (key.length + 1)).trim() + ' repo:' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO;
    var query = '/search/code' //'/search/code?q=' + queryToken.trim();
    client.get(query, { q: queryToken }, function (err, status, result, headers) {
        console.log(err);
        console.log(status);
        console.log(headers);
        console.log(result); //json object

        var text = 'Search results in '+process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO+': *' + result.total_count + '*';

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
controller.hears('^search doc', 'direct_message,mention,direct_mention', function (bot, message) {
    var key = 'search doc'
    var queryToken = encodeURIComponent(message.text.substring(message.text.indexOf(key) + (key.length + 1)).trim());
    var searchWikiUrl = 'https://'+process.env.GIT_HOSTNAME.replace('/api/v3','')+'/search?q=org%3A'+process.env.GIT_ORG+'+'+queryToken+'&type=Wikis'
    bot.reply(message, { attachments: [{ text: searchWikiUrl }] });
});

// List members of default github org
controller.hears('^pull requests', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/repos/' + process.env.GIT_ORG + '/' + process.env.GIT_MAIN_REPO + '/pulls', {per_page:100}, function (err, status, pullRequests, headers) {
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
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/teams', {per_page:100}, function (err, status, teams, headers) {
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
controller.hears('^members', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/members', { per_page: 100 }, function (err, status, members, headers) {
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
controller.hears('^repos', 'direct_message,mention,direct_mention', function (bot, message) {
    var client = getGithubClient();
    client.get('/orgs/' + process.env.GIT_ORG + '/repos', {per_page:100}, function (err, status, repos, headers) {
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
controller.hears('^githubme', 'direct_message,mention,direct_mention', function (bot, message) {

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