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
    bot.startTyping(message, function () { });
    var jenkins = getJenkinsClient();
    jenkins.queue(function (err, data) {
        if (err) { return console.log(err); }
        console.log(data);
        bot.reply(message, JSON.stringify(data, null, 2));
    });
});

// List all jobs
controller.hears('^jobs', 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
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
                        callback_id: 'jenkins:job_build',
                        actions: [
                            {
                                "text": "Build",
                                "name": "build",
                                "value": JSON.stringify({jobName: item.name}),
                                "type": "button",
                                "confirm": {
                                    "text": `Are you sure you want to build job ${item.name} ?`,
                                    "ok_text": "Yes",
                                    "dismiss_text": "No"
                                }
                            }
                        ] ,   
                        color: color
                    };
                    attachments.push(attachment);
                    resolve()
                });
            });
        });
        Promise.all(promiseJobAll)
            .then(function () {
                bot.reply(message, { attachments: attachments });
            })
            .catch(console.error);
    });
});

// Launch a new job build
controller.hears(['^build (.*)'], 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var jenkins = getJenkinsClient();
    var jobName = message.match[1]
    jobBuild(bot,message,jobName)

});

// List running jobs
controller.hears(['^running jobs', '^current builds'], 'direct_message,mention,direct_mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var jenkins = getJenkinsClient();
    jenkins.all_jobs(function (err, jobs) {
        if (err) { return console.log(err); }
        console.log(jobs)
        var runningJobs = []
        jobs.forEach(job => {
            if (job.color != null && (job.color === 'blue_anime' || job.color === 'red_anime'))
                runningJobs.push(job)
        });
        var attachments = []
        var promiseJobAll = runningJobs.map(function (item) {
            return new Promise(function (resolve, reject) {
                jenkins.last_build_info(item.name, function (err2, buildInfo) {
                    if (err2) { return console.log(err2); }
                    console.log('\n\n\n')
                    console.log(JSON.stringify(buildInfo, null, 2))

                    var attachment = {
                        title: buildInfo.fullDisplayName,
                        title_link: buildInfo.url,
                        callback_id: 'jenkins:stop_build',
                        actions: [
                            {
                                "text": "Cancel",
                                "name": "cancel",
                                "value": JSON.stringify({jobName: item.name,buildId: buildInfo.id }),
                                "style": "danger",
                                "type": "button",
                                "confirm": {
                                    "text": `Are you sure you want to stop job ${buildInfo.fullDisplayName} ?`,
                                    "ok_text": "Yes",
                                    "dismiss_text": "No"
                                }
                            }
                        ]
                    };
                    attachments.push(attachment);
                    resolve()
                });
            });
        });

        Promise.all(promiseJobAll)
            .then(function () {
                if (attachments.length > 0)
                    bot.reply(message, { attachments: attachments });
                else
                    bot.reply(message, { text: 'There are not jobs currently building' });
            })
            .catch(console.error);
    });
});

////////////////// Interactive functions ////////////////////

// Build job button
global.interactive_jenkins_job_build = function interactive_jenkins_job_build(bot,message) {
    bot.startTyping(message, function () { });
    var value = JSON.parse(message.actions[0].value)
    var jobName = value.jobName
    jobBuild(bot,message,jobName)
}

// Cancel build button
global.interactive_jenkins_stop_build = function interactive_jenkins_stop_build(bot,message) {
    bot.startTyping(message, function () { });
    var value = JSON.parse(message.actions[0].value)
    var jobName = value.jobName
    var buildId = value.buildId
    stopBuild(bot,message,jobName,buildId)
}

/////////////////// Common functions ////////////////////////

// New build
function jobBuild(bot,message,jobName) {
    var jenkins = getJenkinsClient();
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
}

// Stop build
function stopBuild(bot,message,jobName,buildId) {
    var jenkins = getJenkinsClient();
    console.log('STOPPING JENKINS BUILD '+ jobName + ' #'+buildId)
    jenkins.stop_build(jobName,buildId, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
        var stoppedBuildMsg
        var color = 'danger'
        if (data.statusCode === 200) {
            stoppedBuildMsg = 'I stopped build ' + jobName + ' #'+buildId;
            color = 'good'
        }
        else {
            stoppedBuildMsg = 'Error while stopping build ' + jobName + ' #'+buildId
        }
        bot.reply(message, { attachments: [{ text: stoppedBuildMsg, color: color }] });
    });
}