// Constants
var SCORES_ACTIVE_TRACKING_INTERVAL = 60000  // 1 mn
var SCORES_PASSIVE_TRACKING_INTERVAL = 900000 //15 mn
var SCORES_START_TRIGGER_WORDS = [
    '^start scores',
    '^donne nous les scores',
    '^c\'est quoi les scores ?',
    '^c\'est quoi le score ?']
var SCORES_STOP_TRIGGER_WORDS = [
    '^stop scores',
    '^arrete les scores']

var API_FOOTBALL_DATA_TOKEN = process.env.API_FOOTBALL_DATA_TOKEN

// Variables
var defaultTrackedCompetitions = ["467"] // Set it as variable not constant, for future evolutivity
var currentTrackingChannels = {}
var currentTrackedCompetitionsIds = []
var currentTrackedCompetitions = {}

var activeIntervalId = null
var passiveIntervalId = null

// Libs
var requestScores = require('request')
var isJsonScores = require('is-json');

//////////////// Hears ////////////////

// Start tracking scores
controller.hears(SCORES_START_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    subscribeChannel(bot, message, message.channel)
})

// Stop tracking scores
controller.hears(SCORES_STOP_TRIGGER_WORDS, 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    unsusbscribeChannel(bot, message, message.channel)
})
//////////////// Functions /////////////

// Start tracking
function startTracking(bot) {
    console.log('SCORES: Start tracking')
    refreshLiveScores(bot, { checkInactive: true })
    if (passiveIntervalId == null) {
        passiveIntervalId = setInterval(function () {
            refreshLiveScores(bot, { checkInactive: true })
        }, SCORES_PASSIVE_TRACKING_INTERVAL)
    }
}

// Stop tracking
function stopTracking(bot) {
    if (activeIntervalId != null) {
        clearInterval(activeIntervalId)
        activeIntervalId = null
        console.log('Scores: Deactivated active tracking')
    }
    if (passiveIntervalId != null) {
        clearInterval(passiveIntervalId)
        passiveIntervalId = null
        console.log('Scores: Deactivated passive tracking')
    }
}

// Add competitions in global variable if necessary
function trackCompetitions(competitionIds) {
    competitionIds.forEach(competitionId => {
        if (!currentTrackedCompetitionsIds.includes(competitionId)) {
            currentTrackedCompetitionsIds.push(competitionId)
            console.log('Added tracked competition: ' + competitionId)
        }
    })
}

function subscribeChannel(bot, message, channel) {
    bot.startTyping(message, function () { });
    bot.reply(message, { text: 'Let\'s start tracking scores :soccer: ( while hardworking of course ! )' });
    // Add channel in subscribers
    var prevSubscriberNb = Object.keys(currentTrackingChannels).length
    currentTrackingChannels[channel] = { competitionIds: defaultTrackedCompetitions }
    trackCompetitions(currentTrackingChannels[channel].competitionIds)
    // Start tracking if it is the first subscriber
    if (prevSubscriberNb === 0)
        startTracking(bot)
}

function unsusbscribeChannel(bot, message, channel) {
    bot.startTyping(message, function () { });
    bot.reply(message, { text: 'Ok, I stop tracking scores :soccer:' });

    // Remove competition from currentTrackedCompetitionsIds if this channel was the only one to follow it
    var competitionsFollowedByOtherChannels = []
    Object.keys(currentTrackingChannels).forEach(trackingChannel => {
        if (trackingChannel !== channel) {
            competitionsFollowedByOtherChannels = competitionsFollowedByOtherChannels.concat(currentTrackingChannels[trackingChannel].competitionIds)
        }
    })
    currentTrackedCompetitionsIds = competitionsFollowedByOtherChannels

    // Remove channel from subscribers
    delete currentTrackingChannels[message.channel]

    // Stop tracking if it was the last subscriber
    if (Object.keys(currentTrackingChannels).length === 0 || currentTrackedCompetitionsIds.length === 0)
        stopTracking(bot)
}

// Set tracking active ( refresh frequently )
function setTrackingActive() {
    if (activeIntervalId === null) {
        console.log('SCORES: Tracking set to active')
        activeIntervalId = setInterval(function () {
            refreshLiveScores(bot)
        }, SCORES_ACTIVE_TRACKING_INTERVAL)
    }
}

// Refresh & send notifs if requested
function refreshLiveScores(bot, params = {}) {
    // Make promises for all competitions
    var promiseJobAll = currentTrackedCompetitionsIds.map(function (competitionId) {
        return new Promise(function (resolve, reject) {
            // Request all games for competition
            requestApiScores(competitionId, function (allGames) {
                // Set competition in memory variable if not there yet            
                if (currentTrackedCompetitions[competitionId] == null)
                    currentTrackedCompetitions[competitionId] = { active_games: {} }
                if (allGames != null) {
                    // Store competition games in local variable
                    currentTrackedCompetitions[competitionId].all_games = allGames
                    // Set active tracking if there is a current game
                    storeAndDetectEvents(bot, competitionId)
                }
                resolve()
            })
        })
    })
    // When all competitions are managed, check if there is still one active game ( switch to passive refresh if not)
    Promise.all(promiseJobAll).then(function () {
        if (params.checkInactive === true) {
            var isActive = false
            Object.keys(currentTrackedCompetitions).forEach(competitionId => {
                if (currentTrackedCompetitions[competitionId].active_games != null &&
                    Object.keys(currentTrackedCompetitions[competitionId].active_games).length > 0)
                    isActive = true
            })
            if (isActive === false && activeIntervalId != null) {
                clearInterval(activeIntervalId)
                activeIntervalId = null
                console.log('Scores: Deactivated active tracking')
            }
        }

    }).catch(console.error);
}

// Request scores for a competition
function requestApiScores(competitionId, cb) {
    var gamesUri = 'http://api.football-data.org/v1/competitions/' + competitionId + '/fixtures'

    var getRequest = {
        url: gamesUri,
        headers: {
            'X-Auth-Token': API_FOOTBALL_DATA_TOKEN
        },
    };

    requestScores.get(getRequest, function (error, response, body) {
        if (error) {
            console.error(error)
            if (body == null)
                body = {}
        }
        else {
            if (body != null && isJsonScores(body))
                body = JSON.parse(body)
            else {
                console.error('SCORES ERROR BODY: ' + body)
                body = {}
            }
        }
        cb(body.fixtures, body)
    })
}

// Check if there is an active game in the followed competition
// If yes, set tracking mode to active ( refresh every minute )
function storeAndDetectEvents(bot, competitionId) {
    console.log('SCORES: storeAndDetectEvents for ' + competitionId)
    currentTrackedCompetitions[competitionId].all_games.forEach(game => {
        if (game.status === 'IN_PLAY') {
            // Set tracking mode active while there is at least one active game
            setTrackingActive()
            // If game was already tracked, check if the score changed
            checkUpdatedGame(bot, currentTrackedCompetitions[competitionId].active_games[game._links.self.href], game)
            // Update local storage off tracked game
            currentTrackedCompetitions[competitionId].active_games[game._links.self.href] = game
        }
        else if (currentTrackedCompetitions[competitionId].active_games[game._links.self.href] != null) {
            // Game was previously tracked: it just finished
            checkUpdatedGame(bot, currentTrackedCompetitions[competitionId].active_games[game._links.self.href], game)
            delete currentTrackedCompetitions[competitionId].active_games[game._links.self.href]
        }

    })
}

// Compare 2 game states & send notifs if changed
function checkUpdatedGame(bot, prevGameState, newGameState) {
    // Game just started
    if (prevGameState == null) {
        console.log('Scores: start game ' + newGameState.homeTeamName + ' vs ' + newGameState.awayTeamName)
        notify(bot, newGameState, { event: 'start_game' })
    }
    // Same state
    else if (JSON.stringify(prevGameState) === JSON.stringify(newGameState))
        return

    // Goal for first team
    if (prevGameState != null && prevGameState.goalsHomeTeam !== newGameState.goalsHomeTeam) {
        console.log('Scores: goal for ' + newGameState.homeTeamName)
        notify(bot, newGameState, { event: 'goal', scorerTeam: newGameState.homeTeamName })
    }
    // Goal for second team
    if (prevGameState != null && prevGameState.goalsAwayTeam !== newGameState.goalsAwayTeam) {
        console.log('Scores: goal for ' + newGameState.awayTeamName)
        notify(bot, newGameState, { event: 'goal', scorerTeam: newGameState.awayTeamName })
    }

    // Game is completed
    if (prevGameState != null && prevGameState.status === 'IN_PLAY' && newGameState.status === 'FINISHED') {
        console.log('Scores: end of game ' + newGameState.homeTeamName + ' vs ' + newGameState.awayTeamName)
        notify(bot, newGameState, { event: 'end_game' })
    }
}

function notify(bot, game, params) {
    // Build message
    var messageText = ':soccer: '
    if (params.event === 'start_game') {
        messageText += 'Game started between ' + game.homeTeamName + ' and ' + game.awayTeamName
    }
    else if (params.event === 'end_game') {
        messageText += 'Game is finished between ' + game.homeTeamName + ' and ' + game.awayTeamName
    }
    else if (params.event === 'goal') {
        messageText += scorerTeam + ' scored ! :tada:'
    }
    // Build game attachment
    var fields = []
    fields.push({
        "title": game.homeTeamName,
        "value": game.result.goalsHomeTeam,
        "short": true
    })
    fields.push({
        "title": game.awayTeamName,
        "value": game.result.goalsAwayTeam,
        "short": true
    })
    // Penalties
    if (game.result.penaltyShootout != null && game.result.penaltyShootout.goalsHomeTeam != null && game.result.penaltyShootout.goalsHomeTeam > 0 &&
        game.result.penaltyShootout.goalsAwayTeam != null && game.result.penaltyShootout.goalsAwayTeam > 0) {
        fields.push({
            "title": game.homeTeamName + ' Penalty score',
            "value": game.result.penaltyShootout.goalsHomeTeam,
            "short": true
        })
        fields.push({
            "title": game.awayTeamName + ' Penalty score',
            "value": game.result.penaltyShootout.goalsAwayTeam,
            "short": true
        })
    }
    // Status
    fields.push({
        "title": "Status",
        "value": game.status,
        "short": true
    })
    // Attachment
    var attachments = [{
        color: 'good',
        title: '',//game.homeTeamName + ' vs ' + game.awayTeamName,
        fields: fields
    }]
    // Send messageto each tracking channel
    Object.keys(currentTrackingChannels).forEach(channel => {
        var message = { text: messageText, channel: channel, attachments: attachments }
        bot.say(message)
    })

}



