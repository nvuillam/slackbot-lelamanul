// Constants
const BUTTON_STYLE_ANSWER_SELECTED = '#234287'
const BUTTON_STYLE_ANSWER_CORRECT = 'primary'
const BUTTON_STYLE_ANSWER_INCORRECT = 'danger'
const ATTACHMENT_COLOR_QUESTION_AVAILABLE = '#4286f4'
const ATTACHMENT_COLOR_QUESTION_WAITING = '#d8a23c'
const ATTACHMENT_COLOR_QUESTION_CORRECT = '#3ea832'
const ATTACHMENT_COLOR_QUESTION_INCORRECT = '#e51c0d'

const ANSWER_VALIDATION_TIME_MS = 3000
const ANSWER_QUIZZ_MAX_TIME_MS = 20000
const ANSWER_TEXT_MAX_TIME_MS = 30000
const TIME_BETWEEN_QUESTIONS_MS = 2000
const MAX_UNANSWERED_QUESTIONS_BEFORE_STOP = 5

const EMOJI_ANSWER_SELECTED = ' :lock:'
const EMOJI_ANSWER_OK = ' :heavy_check_mark:'
const EMOJI_ANSWER_KO = ' :x:'
const DEFAULT_SCORE_FOR_WIN_QUIZZ = 5
const DEFAULT_SCORE_FOR_WIN_TRIVIA = 5000

const COMPARE_STRING_SIMILARITY_VALIDITY = 0.8

// Variables
var currentQuizzSessions = {}

// User requests a quizz
controller.hears(['^start quizz', '^start quizz (.*)', '^start trivia'], 'ambient,direct_message,direct_mention,mention', function (bot, message) {

    if (currentQuizzSessions[message.channel] != null) {
        bot.reply(message, 'There is already a current quizz !\nSay *stop quizz* to stop it');
        return
    }

    // Quizz mode ( multichoice responses )
    if (message.text.includes('quizz')) {
        // Request session token
        request.get('https://opentdb.com/api_token.php?command=request', function (error, response, body) {
            if (error)
                console.error(error)
            body = JSON.parse(body)
            console.log('Quizz token: ' + body.token)
            var difficulty = message.match[1];

            // Create quizz for channel and store it in global variable currentQuizzSessions
            currentQuizzSessions[message.channel] = {
                token: body.token,
                difficulty: difficulty,
                scoreForWin: DEFAULT_SCORE_FOR_WIN_QUIZZ,
                starterUser: message.user,
                scores: {},
                quizzType: 'quizz'
            }
            manageAddPlayer(message, message.user)

            bot.reply(message, { text: ':loudspeaker: Let\'s play ! The first with ' + currentQuizzSessions[message.channel].scoreForWin + ' points will win :gift: ' });

            // Ask first question
            requestNextQuestion(bot, message, difficulty)
        })
    }
    // Trivia mode text input responses
    else {
        // Create quizz for channel and store it in global variable currentQuizzSessions
        currentQuizzSessions[message.channel] = {
            scoreForWin: DEFAULT_SCORE_FOR_WIN_TRIVIA,
            starterUser: message.user,
            scores: {},
            quizzType: 'trivia'
        }
        manageAddPlayer(message, message.user)

        bot.reply(message, { text: ':loudspeaker: Let\'s play ! The first with ' + currentQuizzSessions[message.channel].scoreForWin + ' points will win :gift: ' });

        // Ask first question
        requestNextQuestion(bot, message)
    }
});

// User requests a quizz
controller.hears(['^stop quizz','^stop trivia'], 'ambient,direct_message,direct_mention,mention', function (bot, message) {
    if (currentQuizzSessions[message.channel] != null && message.user === currentQuizzSessions[message.channel].starterUser) {
        bot.reply(message, { text: 'Omar a tuer le quizz' });
        delete currentQuizzSessions[message.channel]
    }
    else if (currentQuizzSessions[message.channel] != null) {
        bot.reply(message, { text: '<@' + currentQuizzSessions[message.channel].starterUser + '> started the quizz, only him/her can stop it' });
    }
    else {
        bot.reply(message, { text: 'There is no current quizz, dummy !' });
    }
})



////////////////// Interactive functions ////////////////////

// Handle buzzer click
global.interactive_quizz_buzzer = function interactive_quizz_buzzer(bot, message) {
    if (checkBuzzerValidity(bot, message)) {
        currentQuizzSessions[message.channel].currentQuestion.processingAnswer = true // Lock question before replying msg
        var dialog = bot.createDialog(
            'Buzzer',
            'quizz:buzzer_response',
            'Submit'
        ).addText('Answer', 'answer_text', '')
        bot.replyWithDialog(message, dialog.asObject());
        lockQuestionForUser(bot, message)
    }
}

global.dialog_quizz_buzzer_response = function dialog_quizz_buzzer_response(bot, message) {
    bot.dialogOk();
    handleQuizzResponse(bot, message)
}

// handle question answer
global.interactive_quizz_question = function interactive_quizz_question(bot, message) {
    var buzzerIsValid = checkBuzzerValidity(bot, message)
    if (buzzerIsValid) {
        lockQuestionForUser(bot, message)
        handleQuizzResponse(bot, message)
    }
}

// Functions

// Request next question
function requestNextQuestion(bot, message) {
    var isFinished = checkGameFinished(bot, message)
    if (isFinished)
        return

    if (currentQuizzSessions[message.channel].quizzType === 'quizz') {
        requestNextQuizzQuestion(bot, message)
    }
    else if (currentQuizzSessions[message.channel].quizzType === 'trivia') {
        requestNextTriviaQuestion(bot, message)
    }
}

// Request trivia questions 
function requestNextTriviaQuestion(bot, message) {
    // Get a question
    var qstnUrl = 'http://jservice.io/api/random'
    console.log('Requesting new question to url: ' + qstnUrl)
    request.get(qstnUrl, function (error, response, body) {
        if (error)
            console.error(error)
        console.log('Trivia API response: ' + body)
        body = JSON.parse(body)

        // Store current question
        currentQuizzSessions[message.channel].currentQuestion = body[0]
        currentQuizzSessions[message.channel].currentQuestion.excludedUsers = []
        currentQuizzSessions[message.channel].currentQuestion.answerFound = false
        currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber = 10
        currentQuizzSessions[message.channel].currentQuestion.processingAnswer = false
        currentQuizzSessions[message.channel].currentQuestion.correct_answer = body[0].answer

        // Build slack message
        var actions = []
        actions.push({
            name: 'triviaAnswer',
            type: "button",
            text: 'I know the answer !',
            style: "primary"
        })

        var attachment = {
            callback_id: 'quizz:buzzer',
            color: ATTACHMENT_COLOR_QUESTION_AVAILABLE,
            title: body[0].question,
            actions: actions
        }

        var qstnMessage = {
            text: '_Category: ' + body[0].category.title + '_',
            attachments: [attachment]
        }
        bot.reply(message, qstnMessage);
        message.original_message = qstnMessage

        setQuestionTimeout(bot, message, JSON.parse(JSON.stringify(currentQuizzSessions[message.channel].currentQuestion)));
    });
}

// Request quizz question
function requestNextQuizzQuestion(bot, message) {
    var difficultyQuery = ''
    if (currentQuizzSessions[message.channel].difficulty != null && currentQuizzSessions[message.channel].difficulty != '')
        difficultyQuery = '&difficulty=' + difficulty

    // Get a question
    var qstnUrl = 'https://opentdb.com/api.php?amount=1&token=' + currentQuizzSessions[message.channel].token + difficultyQuery
    console.log('Requesting new question to url: ' + qstnUrl)
    request.get(qstnUrl, function (error, response, body) {
        if (error)
            console.error(error)
        console.log('Quizz API response: ' + body)
        body = JSON.parse(body)

        // Store current question
        currentQuizzSessions[message.channel].currentQuestion = body.results[0]
        currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber = body.results[0].incorrect_answers.length + 1
        currentQuizzSessions[message.channel].currentQuestion.processingAnswer = false
        currentQuizzSessions[message.channel].currentQuestion.excludedUsers = []
        currentQuizzSessions[message.channel].currentQuestion.answerFound = false

        // Build slack message
        var actions = []
        actions.push({
            name: body.results[0].correct_answer,
            type: "button",
            text: htmlEntities.decode(body.results[0].correct_answer),
            style: "default",
            value: 'correct'
        })

        body.results[0].incorrect_answers.forEach(incorrectAnswer => {
            actions.push({
                name: htmlEntities.decode(incorrectAnswer),
                type: "button",
                text: htmlEntities.decode(incorrectAnswer),
                style: "default",
                value: 'incorrect'
            })
        });

        var attachment = {
            color: ATTACHMENT_COLOR_QUESTION_AVAILABLE,
            title: htmlEntities.decode(body.results[0].question),
            callback_id: 'quizz:question',
            actions: shuffleArray(actions)
        }

        var qstnMessage = {
            text: '_Category: ' + htmlEntities.decode(body.results[0].category) + '_',
            attachments: [attachment]
        }
        bot.reply(message, qstnMessage);
        message.original_message = qstnMessage
        setQuestionTimeout(bot, message, JSON.parse(JSON.stringify(currentQuizzSessions[message.channel].currentQuestion)));

    });

}

function setQuestionTimeout(bot, message, question) {
    // Skip question if max time is not reached
    setTimeoutPromise((question.quizzType === 'trivia') ? ANSWER_TEXT_MAX_TIME_MS : ANSWER_QUIZZ_MAX_TIME_MS).then((value3) => {
        if (currentQuizzSessions[message.channel] != null &&
            currentQuizzSessions[message.channel].currentQuestion != null &&
            currentQuizzSessions[message.channel].currentQuestion.processingAnswer === false &&
            currentQuizzSessions[message.channel].currentQuestion.question === question.question &&
            currentQuizzSessions[message.channel].currentQuestion.remainingAvailableAnswerNumber === question.remainingAvailableAnswerNumber &&
            currentQuizzSessions[message.channel].currentQuestion.answerFound === false
        ) {

            // Set question in red
            if (currentQuizzSessions[message.channel].currentInteractiveMessage != null) {
                var origMsgAttch = currentQuizzSessions[message.channel].currentInteractiveMessage.original_message.attachments[0]
                origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_INCORRECT
                bot.replyInteractive(currentQuizzSessions[message.channel].currentInteractiveMessage, {
                    text: currentQuizzSessions[message.channel].currentInteractiveMessage.original_message.text,
                    attachments: [origMsgAttch]
                });
            }
            bot.reply(message, {
                text: ':turtle: :turtle: Nobody answered in given time :snail: :snail: The answer was *' + htmlEntities.decode(currentQuizzSessions[message.channel].currentQuestion.correct_answer) + '*'
            });

            // Skip question
            currentQuizzSessions[message.channel].currentQuestion = null

            // Check if people are still playing
            if (currentQuizzSessions[message.channel].unansweredQuestionNumber == null)
                currentQuizzSessions[message.channel].unansweredQuestionNumber = 0
            currentQuizzSessions[message.channel].unansweredQuestionNumber = currentQuizzSessions[message.channel].unansweredQuestionNumber + 1
            console.log('On a row not replied questions: ' + currentQuizzSessions[message.channel].unansweredQuestionNumber)
            // There may be still people playing: go ahead with next question
            if (currentQuizzSessions[message.channel].unansweredQuestionNumber < MAX_UNANSWERED_QUESTIONS_BEFORE_STOP) {
                requestNextQuestion(bot, message)
            }
            else {
                // Stop the game if no players anymore for the N last questions
                setTimeoutPromise(3000).then((value3) => {
                    delete currentQuizzSessions[message.channel]
                    bot.reply(message, {
                        text: 'It seems nobody is playing anymore :cry: See you later !'
                    });
                })
            }

        }

    }).catch(function (err) {
        console.log(err)
    })
}

// Handles quiz response
function handleQuizzResponse(bot, message) {

    // Check if response if right
    setTimeoutPromise(ANSWER_VALIDATION_TIME_MS).then((value) => {
        var stillAllowReplies = false
        if (currentQuizzSessions[message.channel].quizzType === 'quizz') {
            stillAllowReplies = manageMultipleChoiceAnswerValidity(bot, message)
        }
        else {
            stillAllowReplies = manageTextChoiceAnswerValidity(bot, message)
        }
        console.log('Users can still answer: '+stillAllowReplies)

        // Unlock question
        currentQuizzSessions[message.channel].currentQuestion.processingAnswer = false
        currentQuizzSessions[message.channel].currentQuestion.processingAnswerUser = null

        // Depending if answer is found, trigger appropriate action
        if (currentQuizzSessions[message.channel].currentQuestion.answerFound === true) {
            console.log('ANSWER: Good answer has been found')
            displayCurrentQuizzScores(bot, message)
            // If good response is found, ask a new question
            setTimeoutPromise(TIME_BETWEEN_QUESTIONS_MS).then((value2) => {
                requestNextQuestion(bot, message)
            }).catch(function (err) {
                console.log(err)
            })
        } else if (stillAllowReplies === true) {
            console.log('ANSWER: Let other players try to find the good answer')
            // Set max wait time for same question
            setQuestionTimeout(bot, message, JSON.parse(JSON.stringify(currentQuizzSessions[message.channel].currentQuestion)));
        } else {
            // Kill current question as nobody was able to reply to it
            console.log('ANSWER: Nobody found it: skip to next question')
            origMsgAttch.footer = 'Nobody found the good answer'
            origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_INCORRECT
            bot.replyInteractive(message, { text: message.original_message.text, attachments: [origMsgAttch] });

            displayCurrentQuizzScores(bot, message)
            setTimeoutPromise(TIME_BETWEEN_QUESTIONS_MS).then((value8) => {
                requestNextQuestion(bot, message)
            }).catch(function (err) {
                console.log(err)
            })
        }

    }).catch(function (err) {
        console.log(err)
    })
}

// Manage text question validity
function manageTextChoiceAnswerValidity(bot, message) {
    var answerTextUser = message.submission.answer_text
    var answerTextToFind = currentQuizzSessions[message.channel].currentQuestion.correct_answer
    var origMsgAttch = currentQuizzSessions[message.channel].currentInteractiveMessage.original_message.attachments[0]

    // Check answer compared to expected one
    var similarity = stringSimilarity.compareTwoStrings(answerTextToFind, answerTextUser); 
    var replyUserText
    if (similarity >= COMPARE_STRING_SIMILARITY_VALIDITY) {
        replyUserText = '<@' + message.user + '> was *right* with *' + answerTextUser + '* :sunglasses:'
        origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_CORRECT
        currentQuizzSessions[message.channel].currentQuestion.answerFound = true
        addPointsToUser(message, message.user,currentQuizzSessions[message.channel].currentQuestion.value)
    }
    else {
        replyUserText = '<@' + message.user + '> was *wrong* with *' + answerTextUser + '* :poop:'
        // Decrement number of available answers
        currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber = currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber - 1
        console.log('Remaining solutions: ' + currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber)
        // Add user who answered wrong in excludedUsers for this question so he can not answer again
        currentQuizzSessions[message.channel].currentQuestion.excludedUsers.push(message.user)
    }

    // Show response if no possible to try again
    var stillAllowReplies = true
    if (currentQuizzSessions[message.channel].currentQuestion.answerFound === false &&
        currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber === 0) {
        stillAllowReplies = false
    }

    // Reply new message containing question answer if found, or allowing other players to try to find the good answer
    origMsgAttch.footer = replyUserText
    if (stillAllowReplies && currentQuizzSessions[message.channel].currentQuestion.answerFound === false) {
        origMsgAttch.footer = origMsgAttch.footer + ' Try again :smile:'
        origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_AVAILABLE
    }

    bot.replyInteractive(currentQuizzSessions[message.channel].currentInteractiveMessage,
        {
            text: currentQuizzSessions[message.channel].currentInteractiveMessage.original_message.text,
            attachments: [origMsgAttch]
        });

    return stillAllowReplies
}


// Manage multiple choice question validity
function manageMultipleChoiceAnswerValidity(bot, message) {
    var slctdName = message.actions[0].name
    var origMsgAttch = message.original_message.attachments[0]
    var replyUserText = '<@' + message.user + '> was *right* :sunglasses:'
    for (var i = 0; i < origMsgAttch.actions.length; i++) {
        if (origMsgAttch.actions[i].name === slctdName) {
            if (origMsgAttch.actions[i].value === 'incorrect') {
                origMsgAttch.actions[i].style = BUTTON_STYLE_ANSWER_INCORRECT
                origMsgAttch.actions[i].text = origMsgAttch.actions[i].text.replace(EMOJI_ANSWER_SELECTED, '') + EMOJI_ANSWER_KO
                replyUserText = '<@' + message.user + '> was *wrong* :poop:'
                origMsgAttch.actions[i].value = 'unavailable'
                // Decrement number of available answers
                currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber = currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber - 1
                console.log('Remaining solutions: ' + currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber)
                // Add user who answered wrong in excludedUsers for this question so he can not answer again
                currentQuizzSessions[message.channel].currentQuestion.excludedUsers.push(message.user)
            }
            else if (origMsgAttch.actions[i].value === 'correct') {
                origMsgAttch.actions[i].text = origMsgAttch.actions[i].text.replace(EMOJI_ANSWER_SELECTED, '') + EMOJI_ANSWER_OK
                origMsgAttch.actions[i].style = BUTTON_STYLE_ANSWER_CORRECT
                origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_CORRECT
                currentQuizzSessions[message.channel].currentQuestion.answerFound = true
                addPointsToUser(message, message.user)
            }
        }
    }
    // Show response if no possible to try again
    var stillAllowReplies = true
    if (currentQuizzSessions[message.channel].currentQuestion.answerFound === false &&
        currentQuizzSessions[message.channel].currentQuestion.remainingAnswersNumber < 2) {
        stillAllowReplies = false
        for (var i = 0; i < origMsgAttch.actions.length; i++) {
            if (origMsgAttch.actions[i].value === 'correct') {
                origMsgAttch.actions[i].style = BUTTON_STYLE_ANSWER_CORRECT
            }
        }
    }

    // Reply new message containing question answer if found, or allowing other players to try to find the good answer
    origMsgAttch.footer = replyUserText
    if (stillAllowReplies && currentQuizzSessions[message.channel].currentQuestion.answerFound === false) {
        origMsgAttch.footer = origMsgAttch.footer + ' Try again :smile:'
        origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_AVAILABLE
    }

    bot.replyInteractive(message, { text: message.original_message.text, attachments: [origMsgAttch] });

    return stillAllowReplies
}

// Check buzzer validity 
function checkBuzzerValidity(bot, message) {
    var isBuzzerValid = true

    if (currentQuizzSessions[message.channel] == null) {
        console.log('There is no current quizz')
        bot.whisper(message,{text: 'Let go dude, the quizz has ended !'})
        isBuzzerValid = false
    }

    // Add player in player list of not registered yet
    manageAddPlayer(message, message.user)

    var origMsgAttch = message.original_message.attachments[0]

    // Prevent past question to be clicked
    if (isBuzzerValid && htmlEntities.decode(origMsgAttch.title) !== htmlEntities.decode(currentQuizzSessions[message.channel].currentQuestion.question)) {
        console.log('This click is not for the current question :\nClick: ' + htmlEntities.decode(origMsgAttch.title) + '\n' + 'Current: ' + htmlEntities.decode(currentQuizzSessions[message.channel].currentQuestion.question))
        bot.whisper(message,{text: 'This is not the current question. Don\'t you have nother better to do ? :unamused:'})
        isBuzzerValid = false
    }

    // Prevent already tried wrong answer to be clicked
    var slctdValue = message.actions[0].value
    if (isBuzzerValid && slctdValue === 'unavailable') {
        console.log('Answered already clicked, and incorrect')
        bot.whisper(message,{text: 'You can not select an answer which you know is already wrong, get a brain :unamused:'})
        isBuzzerValid = false
    }

    // Prevent past question to be clicked
    if (isBuzzerValid && currentQuizzSessions[message.channel].currentQuestion.excludedUsers.includes(message.user)) {
        console.log('This user is excluded, can not answer before next question ^^')
        bot.whisper(message,{text: 'You already FAILED :hammer: . Wait quietly for the next question ! :new_moon_with_face: '})
        isBuzzerValid = false
    }

    // Process only one answer attempt at a time
    if (isBuzzerValid && currentQuizzSessions[message.channel].currentQuestion.processingAnswer === true) {
        console.log('There is already an answer being processed')
        bot.whisper(message,{text: '<@' + currentQuizzSessions[message.channel].currentQuestion.processingAnswerUser + '> has been faster than you :joy:'})
        isBuzzerValid = false
    }

    return isBuzzerValid
}

// Lock question for user
function lockQuestionForUser(bot, message) {
    // Lock current question for this current answer attempt
    currentQuizzSessions[message.channel].currentInteractiveMessage = message
    currentQuizzSessions[message.channel].currentQuestion.processingAnswer = true
    currentQuizzSessions[message.channel].currentQuestion.processingAnswerUser = message.user
    currentQuizzSessions[message.channel].unansweredQuestionNumber = 0

    // highlight user selection
    var origMsgAttch = message.original_message.attachments[0]
    if (currentQuizzSessions[message.channel].quizzType === 'quizz') {
        var slctdName = message.actions[0].name
        var replyUserText = '<@' + message.user + '> answered'
        for (var i = 0; i < origMsgAttch.actions.length; i++) {
            if (origMsgAttch.actions[i].name === slctdName) {
                origMsgAttch.actions[i].style = BUTTON_STYLE_ANSWER_SELECTED
                origMsgAttch.actions[i].text = origMsgAttch.actions[i].text + EMOJI_ANSWER_SELECTED
                this.console.log(message.user + ' selected ' + slctdName)
            }
        }

    }
    else {
        var replyUserText = '<@' + message.user + '> buzzed first and is answering'
    }

    // Update message to show answer is currently analyzed
    origMsgAttch.footer = replyUserText
    origMsgAttch.color = ATTACHMENT_COLOR_QUESTION_WAITING
    bot.replyInteractive(message, { text: message.original_message.text, attachments: [origMsgAttch] });
}

// Add player in the current quizz
function manageAddPlayer(message, userId) {
    var currentUserScore = currentQuizzSessions[message.channel].scores[userId] || 0
    currentQuizzSessions[message.channel].scores[userId] = currentUserScore
}

// Add point to the user in the current channel quizz
function addPointsToUser(message, userId, points = 1) {
    var currentUserScore = currentQuizzSessions[message.channel].scores[userId] || 0
    currentQuizzSessions[message.channel].scores[userId] = currentUserScore + points
    console.log('New scores: ' + JSON.stringify(currentQuizzSessions[message.channel].scores))
}

// Display current quizz scores
function displayCurrentQuizzScores(bot, message) {
    var playingUsersWithScore = []
    Object.keys(currentQuizzSessions[message.channel].scores).forEach(usr => {
        playingUsersWithScore.push([currentQuizzSessions[message.channel].scores[usr], usr])
    })
    playingUsersWithScore.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1;
    });

    var sortedScoresStr = ''
    playingUsersWithScore.forEach(item => {
        sortedScoresStr += item[0] + ' - <@' + item[1] + '>\n'
    });
    bot.reply(message, { text: 'Scores\n' + sortedScoresStr });
}

function checkGameFinished(bot, message) {
    var isFinished = false
    Object.keys(currentQuizzSessions[message.channel].scores).forEach(usr => {
        if (currentQuizzSessions[message.channel].scores[usr] >= currentQuizzSessions[message.channel].scoreForWin) {
            isFinished = true
            delete currentQuizzSessions[message.channel]
            bot.reply(message, {
                text: ':star: :star: <@' + usr + '> WINS !!! :star: :star: Congratulations ! :tada: :tada:'
            });
            addUserQuizzWin(bot, message, usr)
        }
    })
    return isFinished
}

// Store a quizz win on external database
function addUserQuizzWin(bot, message, userId) {
    controller.storage.users.get(userId, function (err, user) {
        if (!user) {
            user = {
                id: userId
            };
        }
        if (!user.quizzWins)
            user.quizzWins = {}

        if (!user.quizzWins[message.channel])
            user.quizzWins[message.channel] = 0

        user.quizzWins[message.channel] = user.quizzWins[message.channel] + 1
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, '<@' + userId + '> has now ' + user.quizzWins[message.channel] + ' quizz wins on <#' + message.channel + '> :thumbsup:');
        });
    });
}

