//////////// JENKINS ///////////////

var jenkinsapi = require('jenkins-api');

// Get jenkins client
function getJenkinsClient() {
    console.log("http://" + process.env.JENKINS_USERNAME + ":" + process.env.JENKINS_PASSWORD + "@" + process.env.JENKINS_HOST)
    var jenkins = jenkinsapi.init("http://" + process.env.JENKINS_USERNAME + ":" + process.env.JENKINS_PASSWORD + "@" + process.env.JENKINS_HOST);
    return jenkins;
}

// Get current queue
controller.hears('^queue', 'direct_message,mention,direct_mention', function (bot, message) {
    var jenkins = getJenkinsClient();
    jenkins.queue(function (err, data) {
        if (err) { return console.log(err); }
        console.log(data);
        bot.reply(message, JSON.stringify(data, null, 2));
    });
});

// List all jobs
controller.hears('^jobs', 'direct_message,mention,direct_mention', function (bot, message) {
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

// Launch a new job build
controller.hears('^build', 'direct_message,mention,direct_mention', function (bot, message) {
    var jenkins = getJenkinsClient();
    var keyWord = 'build'
    var jobName = message.text.substring(message.text.indexOf(keyWord) + (keyWord.length + 1));
    jenkins.build(jobName, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
        var launchedBuildMsg
        var color = 'danger'
        if (data.statusCode === 201) {
            launchedBuildMsg = 'I launched a build for ' + jobName;
            color = 'good'
        }
        else {
            launchedBuildMsg = 'Error while launching build for' + jobName
        }
        bot.reply(message, { attachments: [{ text: launchedBuildMsg, color: color }] });
    });

});