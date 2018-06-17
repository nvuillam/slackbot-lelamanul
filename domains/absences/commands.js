// Constants
const ABSENCES_TEAM_ID = 'absences'
const ABSENCES_TRIGGER_WORDS = ['^vacations(.*)', '^absences(.*)', '^out of office(.*)', '^vacances(.*)', '^congés(.*)'];
const PAST_ABSENCES_TRIGGER_WORDS = ['^past vacations(.*)', '^past absences(.*)', '^past out of office(.*)', '^vacances passées(.*)', '^congés passés(.*)'];
const MY_ABSENCES_TRIGGER_WORDS = ['^my vacations', '^my absences', '^my out of office', '^mes vacances', '^mes congés'];
const MY_PAST_ABSENCES_TRIGGER_WORDS = ['^my past vacations', '^my past absences', '^my past out of office', '^mes vacances passées', '^mes congés passés'];
const SET_ABSENCES_VALIDATOR_WORDS = ['^add vacations validator (.*)', '^set vacations validator (.*)', '^add absences validator (.*)', '^set absences validator (.*)']
const REMOVE_ABSENCES_VALIDATOR_WORDS = ['^remove vacations validator (.*)', '^remove absences validator (.*)']

const ABSENCE_REASONS = [
    { label: 'Vacation', value: 'Vacation' },
    { label: 'Sickness', value: 'Sickness' }
];
const ABSENCE_START_DAY_TIMES = [
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' }
];
const ABSENCE_END_DAY_TIMES = [
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' }
];
const DEFAULT_ABSENCE_START_DAY_TIME = 'Morning'
const DEFAULT_ABSENCE_END_DAY_TIME = 'Afternoon'
const COLOR_ABSENCE_ATTACHMENT_MENU = '#1c1b17'
const ABSENCE_MOMENT_DATE_DISPLAY = "dddd D MMMM"
const ABSENCE_MOMENT_DATE_INPUT_FORMAT = 'DD/MM/YYYY'

// Variables
var currentlyEditedAbsences = {}
var validatorUsers = listValidators(null, null, {}) // Initialize at startup, then update when database is updated

// Libs
var uuidv4Absences = require('uuid/v4');
var momentAbsences = require('moment');
var arrayToolsAbsences = require("array-tools");

////////////////////// Hears //////////////////

// List absences for @User
controller.hears(ABSENCES_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var slackUserId = message.match[1]
    if (slackUserId == null || slackUserId === '')
        slackUserId = null
    else
        slackUserId = message.match[1].replace('?', '').replace('@', '').replace('<', '').replace('>', '').trim()

    listAbsences(bot, message, { user: slackUserId, timeframes: ['current', 'future'], order: 'asc' }, function (absences, absencesMessage) {
        bot.reply(message, absencesMessage);
    })
});

// List past absences for @User
controller.hears(PAST_ABSENCES_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var slackUserId = message.match[1]
    if (slackUserId == null || slackUserId === '')
        slackUserId = message.user
    else
        slackUserId = message.match[1].replace('?', '').replace('@', '').replace('<', '').replace('>', '').trim()

    listAbsences(bot, message, { user: slackUserId, timeframes: ['past'], order: 'desc' }, function (absences, absencesMessage) {
        bot.reply(message, absencesMessage);
    })
});

// List absences for current user
controller.hears(MY_ABSENCES_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    listAbsences(bot, message, {
        user: message.user,
        timeframes: ['current', 'future'],
        order: 'asc',
        allowUpdate: true,
        allowCancel: true
    }, function (absences, absencesMessage) {
        bot.reply(message, absencesMessage);
    })
});

// List past absences for current user
controller.hears(MY_PAST_ABSENCES_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    listAbsences(bot, message, { user: message.user, timeframes: ['past'], order: 'desc' }, function (absences, absencesMessage) {
        bot.reply(message, absencesMessage);
    })
});

// Add validator user
controller.hears(SET_ABSENCES_VALIDATOR_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var slackUserId = message.match[1].replace('?', '').replace('@', '').replace('<', '').replace('>', '').trim()
    manageAbsenceValidators(bot, message, slackUserId, 'add')
});

// Remove validator user
controller.hears(REMOVE_ABSENCES_VALIDATOR_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    bot.startTyping(message, function () { });
    var slackUserId = message.match[1].replace('?', '').replace('@', '').replace('<', '').replace('>', '').trim()
    manageAbsenceValidators(bot, message, slackUserId, 'remove')
});

//////////////////////////////// Interactive functions ////////////////////

// Request absence form
global.interactive_absence_menu = function interactive_absence_menu(bot, message) {

    var slctdAction = message.actions[0].name
    // New absence
    if (slctdAction === 'new') {
        initializeNewAbsence(bot, message)
    }
}

// Update absence form
global.interactive_absence_update = function interactive_absence_update(bot, message) {

    var slctdAction = message.actions[0].name
    // New absence button / Update absence button
    if (slctdAction === 'update') {
        loadAbsenceFromDb(bot, message, function () {
            if (checkUpdateAbsenceAllowed(bot, message, message.user)) {
                replyAbsenceDialog(bot, message, currentlyEditedAbsences[message.user])
            }
        })

    }
    // Cancel absence button
    else if (slctdAction === 'cancel') {
        loadAbsenceFromDb(bot, message, function () {
            if (checkUpdateAbsenceAllowed(bot, message, message.user)) {
                currentlyEditedAbsences[message.user].status = 'Cancelled'
                storeAbsence(bot, message)
            }
        })
    }
    // Accept absence button
    else if (slctdAction === 'accept') {
        if (checkUserIsValidator(bot, message, message.user, { angry: true })) {
            loadAbsenceFromDb(bot, message, function () {
                currentlyEditedAbsences[message.user].status = 'Accepted'
                currentlyEditedAbsences[message.user].validator_user = message.user
                storeAbsence(bot, message)
            })
        }
    }
    // Reject absence button
    else if (slctdAction === 'reject') {
        if (checkUserIsValidator(bot, message, message.user, { angry: true })) {
            loadAbsenceFromDb(bot, message, function () {
                currentlyEditedAbsences[message.user].status = 'Rejected'
                currentlyEditedAbsences[message.user].validator_user = message.user
                storeAbsence(bot, message)
            })
        }
    }
}

// Handle absence form
global.dialog_absence_update = function dialog_absence_update(bot, message) {
    console.log('Receiving absence dialog response ' + message.submission)
    updateEditedAbsenceVar(message)
    if (checkAbsenceValidity(bot, message)) {
        bot.dialogOk()
        storeAbsence(bot, message)
    }
    else {
        bot.dialogError({
            "name":"absence_input_error",
            "error":"Input data is incorrect"
            })
    }
}


/////////////////////////////////// Functions /////////////////////////////

// Initialize new absence
function initializeNewAbsence(bot, message) {
    console.log('New absence request: reply dialog')
    var absence = {
        id: uuidv4Absences(),
        start_date: null,
        start_date_time: DEFAULT_ABSENCE_START_DAY_TIME,
        end_date: null,
        end_date_time: DEFAULT_ABSENCE_END_DAY_TIME,
        reason: null,
        reasonText: '',
        user: message.user,
        last_update_user: message.user,
        status: 'Awaiting validation'
    }
    currentlyEditedAbsences[message.user] = absence
    replyAbsenceDialog(bot, message, absence)
}

// Initialize update absence
function loadAbsenceFromDb(bot, message, cb) {
    console.log('Update absence request: reply dialog')
    var slctdAbsence = message.actions[0].value
    controller.storage.teams.get(ABSENCES_TEAM_ID, function (err, team) {
        currentlyEditedAbsences[message.user] = team.absences[slctdAbsence]
        if (cb)
            cb()
    })
}



// List absences

// Reply absence dialog after buttton click
function replyAbsenceDialog(bot, message, absence) {
    var startDate = null
    if (absence.start_date != null)
        startDate = momentAbsences(absence.start_date).format(ABSENCE_MOMENT_DATE_INPUT_FORMAT)
    var endDate = null
    if (absence.end_date != null)
        endDate = momentAbsences(absence.end_date).format(ABSENCE_MOMENT_DATE_INPUT_FORMAT)
    var dialog = bot.createDialog(
        'Absence request',
        'absence:update',
        'Submit'
    ).addText('Absence start', 'start_date', startDate, { placeholder: 'DD/MM/YYYY' })
        .addSelect('Time of day', 'start_date_time', absence.start_date_time, ABSENCE_START_DAY_TIMES)
        .addText('Absence end (included)', 'end_date', endDate, { placeholder: 'DD/MM/YYYY' })
        .addSelect('Time of day', 'end_date_time', absence.end_date_time, ABSENCE_END_DAY_TIMES)
        .addSelect('Reason', 'reason', absence.reason, ABSENCE_REASONS, { placeholder: 'Select an absence reason' })
    bot.replyWithDialog(message, dialog.asObject());
}

// Update currentlyEditedAbsences from form submission data
function updateEditedAbsenceVar(message) {
    var absence = currentlyEditedAbsences[message.user]
    // Start date
    absence.start_date_time = message.submission.start_date_time
    var startDate = parseAbsDate(message.submission.start_date)
    if (absence.start_date_time === 'Afternoon')
        absence.start_date = momentAbsences(startDate).add(13, 'hours').toDate();
    else
        absence.start_date = momentAbsences(startDate).add(8, 'hours').toDate();

    // End date
    absence.end_date_time = message.submission.end_date_time
    var endDate = parseAbsDate(message.submission.end_date)
    if (absence.end_date_time === 'Morning')
        absence.end_date = momentAbsences(endDate).add(12, 'hours').toDate();
    else
        absence.end_date = momentAbsences(endDate).add(18, 'hours').toDate();

    // Reason
    absence.reason = message.submission.reason
    absence.reasonText = message.submission.reasonText

    // Reset status to ask again for validation
    if (['Accepted', 'Rejected'].includes(absence.status))
        absence.status = 'Awaiting validation'

    currentlyEditedAbsences[message.user] = absence
}

// Check if absence data is valid
function checkAbsenceValidity(bot, message) {
    var absence = currentlyEditedAbsences[message.user]
    var result = true
    var momentStart = momentAbsences(absence.start_date)
    var momentEnd = momentAbsences(absence.end_date)
    // Time
    if (momentStart.isAfter(momentEnd))
        result = false
    return result
}

// Store absence in database
function storeAbsence(bot, message) {
    var absence = currentlyEditedAbsences[message.user]
    controller.storage.teams.get(ABSENCES_TEAM_ID, function (err, team) {
        if (!team)
            team = { id: ABSENCES_TEAM_ID, absences: {} }
        team.absences[absence.id] = absence
        controller.storage.teams.save(team, function (err) {
            if (err) {
                console.log('Error while saving absence ' + err.toString())
                bot.reply(message, 'Error: absence not stored :crocodile:');
            }
            else {
                var absAttchmnt = getAbsenceAttachment(message, absence)
                bot.reply(message, { text: 'Absence stored :hamster:', attachments: [absAttchmnt] });
                manageAbsenceNotification(bot, message, absence)
                currentlyEditedAbsences[message.user] = null
            }
        });
    });
}

function manageAbsenceNotification(bot, message, absence) {
    message.type = 'direct_message'
    var absAttchmnt = getAbsenceAttachment(message, absence)
    // Notify requester
    if (absence.validator_user != null && absence.user !== message.user ) {
        var requesterText = '<@' + absence.validator_user + '> updated your absence request'
        sendPrivateMessage(bot, absence.user, { text: requesterText, attachments: [absAttchmnt] })
    }
    // Notify validator of an update
    if (absence.validator_user != null && absence.validator_user !== message.user) {
        var validatorText = '<@' + absence.user + '> updated his absence request'
        sendPrivateMessage(bot, absence.validator_user, { text: validatorText, attachments: [absAttchmnt] })
    }
    // Notify all absence validators that there are new requests to validate
    if (absence.validator_user == null) {
        var validationRqstdText = 'There is a new absence request to validate for <@' + absence.user + '> '
        validatorUsers[ABSENCES_TEAM_ID].forEach(validatorUser => {
            sendPrivateMessage(bot, validatorUser, { text: validationRqstdText, attachments: [absAttchmnt] })
        })
    }
}

// List absences
function listAbsences(bot, message, params, cb) {
    // Get all absences
    controller.storage.teams.get(ABSENCES_TEAM_ID, function (err, team) {
        if (!team)
            team = { id: ABSENCES_TEAM_ID, absences: {} }
        if (!team.absences)
            team.absences = {}

        // List absences to display
        var isCurrentUserValidator = checkUserIsValidator(bot,message,message.user)
        var absencesToDisplay = []
        Object.keys(team.absences).forEach(absenceId => {
            var absence = team.absences[absenceId]
            var toAdd = true
            // Filter by user
            if (params.user != null && params.user !== absence.user) {
                toAdd = false
            }
            // Filter by time frame
            if (toAdd === true && params.timeframes != null) {
                var momentToday = momentAbsences(new Date())
                var momentStart = momentAbsences(absence.start_date)
                var momentEnd = momentAbsences(absence.end_date)
                var absenceTimeframe = ''
                if (momentStart.isAfter(momentToday))
                    absenceTimeframe = 'future'
                else if (momentStart.isBefore(momentToday) && momentEnd.isAfter(momentToday))
                    absenceTimeframe = 'current'
                else if (momentEnd.isBefore(momentToday))
                    absenceTimeframe = 'past'

                if (!params.timeframes.includes(absenceTimeframe))
                    toAdd = false

            }
            // Filter Rejected and cancelled if not current user request, or if user is not validator 
            if (toAdd === true && 
                isCurrentUserValidator === false &&
                ['Cancelled','Rejected'].includes(absence.status) &&
                absence.user !== message.user 
              ) {
                toAdd = false
            }
            if (toAdd === true) {
                absencesToDisplay.push(team.absences[absenceId])
            }
        })

        var order = params.order || 'asc'
        absencesToDisplay.sort(function (a, b) {
            if (order === 'asc')
                return a.start_date > b.start_date ? 1 : -1;
            else
                return a.start_date < b.start_date ? 1 : -1;
        });

        // Build message
        var text = absencesToDisplay.length + ' absences'
        var attachments = [];
        var bool = false
        absencesToDisplay.forEach(absence => {
            var attch = getAbsenceAttachment(message, absence, params)
            attachments.push(attch);
            bool = !bool
        });

        var attachmentMenuActions = {
            callback_id: 'absence:menu',
            title: 'Actions',
            color: COLOR_ABSENCE_ATTACHMENT_MENU,
            actions: [{
                name: 'new',
                type: "button",
                text: 'Request absence',
                style: 'default',
                value: 'new'
            }]
        }
        attachments.push(attachmentMenuActions);

        cb(absencesToDisplay, { text: text, attachments: attachments })

    })
}

function getAbsenceAttachment(message, absence, params = {}) {
    var momentToday = momentAbsences(new Date())
    var momentStart = momentAbsences(absence.start_date)
    var momentEnd = momentAbsences(absence.end_date)
    var momentAbsDuration = momentAbsences.duration(momentStart.diff(momentEnd))
    // User
    var text = '<@' + absence.user + '>'
    // Time
    if (momentStart.isAfter(momentToday))
        text += ' will be'
    else if (momentStart.isBefore(momentToday) && momentEnd.isAfter(momentToday))
        text += ' is'
    else if (momentEnd.isBefore(momentToday))
        text += ' has been'
    // Reason
    if (absence.reason === 'Sick')
        text += ' sick'
    else
        text += ' in vacation'
    // Status
    if (['Accepted', 'Rejected'].includes(absence.status))
        text += ' (*' + absence.status + '* by <@' + absence.validator_user + '>)'
    else
        text += ' (*' + absence.status + '*)'

    // From To
    var fromToStr = 'From *' + momentStart.locale('fr').format(ABSENCE_MOMENT_DATE_DISPLAY) + ' ' + absence.start_date_time + '*'
    fromToStr += ' to *' + momentEnd.locale('fr').format(ABSENCE_MOMENT_DATE_DISPLAY) + ' ' + absence.end_date_time + '* (included)'
    text += '\n' + fromToStr

    var durationText = 'Duration: ' + momentAbsDuration.locale('fr').humanize()

    // Color
    var attchColor = 'default'
    switch (absence.status) {
        case 'Accepted': attchColor = 'good'; break;
        case 'Cancelled': attchColor = 'default'; break;
        case 'Awaiting validation': attchColor = 'warning'; break;
        case 'Rejected': attchColor = 'danger'; break;
    }

    // Actions
    var actions = []

    var isPrivateConversation = false
    if (message.type === 'direct_message')
        isPrivateConversation = true

    if (isPrivateConversation && params.allowUpdate && absence.status !== 'Cancelled') {
        // Update
        actions.push({
            name: 'update',
            type: "button",
            text: 'Update',
            style: 'default',
            value: absence.id
        })
    }

    if (isPrivateConversation && params.allowCancel && absence.status !== 'Cancelled') {
        // Update
        actions.push({
            name: 'cancel',
            type: "button",
            text: 'Cancel',
            style: 'danger',
            value: absence.id,
            confirm: {
                title: "Confirmation required",
                text: "Are you sure you want to cancel absence: " + fromToStr + ' ?',
                ok_text: "Yes",
                dismiss_text: "No"
            }
        })
    }

    // Additional butttons for validators
    if (isPrivateConversation && checkUserIsValidator(bot, message, message.user)) {
        if (['Awaiting validation', 'Rejected'].includes(absence.status)) {
            // Accept button
            actions.push({
                name: 'accept',
                type: "button",
                text: 'Validate',
                style: 'primary',
                value: absence.id,
                confirm: {
                    title: "Confirmation required",
                    text: "Are you sure you want to validate absence: " + fromToStr + ' ?',
                    ok_text: "Yes",
                    dismiss_text: "No"
                }
            })
        }
        if (['Awaiting validation', 'Accepted'].includes(absence.status)) {
            // Reject button
            actions.push({
                name: 'reject',
                type: "button",
                text: 'Reject',
                style: 'danger',
                value: absence.id,
                confirm: {
                    title: "Confirmation required",
                    text: "Are you sure you want to reject absence:" + fromToStr + ' ?',
                    ok_text: "Yes",
                    dismiss_text: "No"
                }
            })
        }

    }

    var attachment = {
        callback_id: 'absence:update',
        text: text,
        footer: durationText,
        color: attchColor,
        actions: actions
    }
    return attachment
}

// Set / Remove absence validator
function manageAbsenceValidators(bot, message, user, addOrRemove) {
    checkUserIsAdmin(message.user, function (isAdmin){
        if (isAdmin === false) {
            bot.reply(message, {attachments: [{text:'<@'+message.user+'> , you must be team admin to do that :closed_lock_with_key:',color:'danger'}]});
            return
        }
        controller.storage.teams.get(ABSENCES_TEAM_ID, function (err, team) {
            // Manage init if necessary
            if (!team)
                team = { id: ABSENCES_TEAM_ID, absences: {}, validator_users: [] }
            if (team.validator_users == null)
                team.validator_users = []
            // Add 
            if (addOrRemove === 'add') {
                team.validator_users.push(user)
                team.validator_users = arrayToolsAbsences.unique(team.validator_users)
            } // Or remove
            else if (addOrRemove === 'remove') {
                team.validator_users = arrayToolsAbsences.without(team.validator_users, user)
            }
            validatorUsers[ABSENCES_TEAM_ID] = team.validator_users
            controller.storage.teams.save(team, function (err) {
                if (err) {
                    console.log('Error while saving validators ' + err.toString())
                    bot.reply(message, 'Error :crocodile:');
                }
                else {
                    listValidators(bot, message, { forceRefresh: true, displayMessage: true })
                }
            });
        });
    })

}

function listValidators(bot, message, params = {}) {
    if (params.forceRefresh === true || validatorUsers == null || validatorUsers[ABSENCES_TEAM_ID] == null) {
        controller.storage.teams.get(ABSENCES_TEAM_ID, function (err, team) {
            // Manage init if necessary
            if (!team)
                team = { id: ABSENCES_TEAM_ID, absences: {}, validator_users: [] }
            if (team.validator_users == null)
                team.validator_users = []
            if (validatorUsers == null)
                validatorUsers = {}
            // Update memory variable
            validatorUsers[ABSENCES_TEAM_ID] = team.validator_users
            // Display message if necessary
            if (params.displayMessage === true) {
                var frmtdValidatorUsers = []
                validatorUsers[ABSENCES_TEAM_ID].forEach(user => {
                    frmtdValidatorUsers.push('<@' + user + '>')
                })
                var text = 'Absences validators are ' + frmtdValidatorUsers.join()
                bot.reply(message, { text: text });
            }
            else {
                console.log('LOADED ABSENCE VALIDATORS: ' + validatorUsers[ABSENCES_TEAM_ID].join())
            }
        });
    }
}

// Check user is admin
function checkUserIsAdmin(user, cb) {
    bot.api.users.info({ user: user }, function (err, info) {
        if (err)
            console.log('Error while fetching user info: ' + err)
        var isAdmin = false
        console.log('User info: ' + JSON.stringify(info))
        if (info != null && info.user != null && info.user.is_owner === true)
            isAdmin = true
        cb(isAdmin, info)
    })
}

// Check user is validator
function checkUserIsValidator(bot, message, user, params = {}) {
    var isValidator = false
    if (validatorUsers[ABSENCES_TEAM_ID].includes(user))
        isValidator = true
    if (!isValidator && params.angry === true) {
        bot.reply(message, { text: '<@' + user + '> , can\'t touch this ' });
    }
    return isValidator
}

// Check if update is allowed
function checkUpdateAbsenceAllowed(bot, message, user) {
    if (checkUserIsValidator(bot, message, user))
        return true
    else if (currentlyEditedAbsences[message.user].user === user)
        return true
    else {
        bot.reply(message, { text: '<@' + user + '> , can\'t touch this ' });
        return false
    }
}

// parseAbsDate
function parseAbsDate(dateString) {
    var dateParts = dateString.split("/");
    var dateObject = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    return dateObject
}

// Send private message
function sendPrivateMessage(bot, user, messageToSend) {
    bot.api.im.open({
        user: user
    }, (err, res) => {
        if (err) {
            bot.botkit.log('Failed to open IM with user', err)
        }
        messageToSend.channel = res.channel.id
        bot.say(messageToSend);
    })
}