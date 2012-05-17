/**
 * Created by JetBrains WebStorm.
 * User: larrylefever
 * Date: 3/28/12
 * Time: 3:11 PM
 * To change this template use File | Settings | File Templates.
 */

var fs = require('fs');
var http = require('http');
var url  = require('url');
var util = require('util');

var querystring = require('querystring');
//var sandbox = require('sandbox'); // apparently doesn't allow complex params, e.g., Card
var vm = require('vm');
var buffer = require('buffer');
var faye = require('faye');
var path = require('path');

// includes, e.g., Card class, which is also included, as-is, on client-side,
// as part of custom JSON-based object-serialization scheme (accounting for private methods)
eval(fs.readFileSync('eleusis_common.js')+'');

var bayeux = new faye.NodeAdapter({mount: '/eleusisGames', timeout: 45});

var usersPath = null;
var rulesPath = null;

try {
    console.log("cmdln-args:");
    process.argv.forEach(function (val, index, array) {
        if(val == "-up") {
            usersPath = array[index+1];
            console.log("\t usersPath (-up): " + usersPath);
        }
        if(val == "-rp") {
            rulesPath = array[index+1];
            console.log("\t rulesPath (-rp): " + rulesPath);
        }
    });
} catch(err) {
    console.log(util.inspect(err, true));
    throw new Error("bad cmdln");
}

if(!usersPath) {
    throw new Error("usersPath (-up) not set!");
}

if(!rulesPath) {
    throw new Error("rulesPath (-rp) not set!");
}

//TODO: show usage when needed



function User(theUsername, thePwEncrypted, theEmail) {

    var username = theUsername;
    var pwEncrypted = thePwEncrypted;
    var email = theEmail; // especially for receiving invites
    var hand = {};
    /* TODO:
      - enable users to enter email of anybody else, to invite them to play the game with them
          at some designated time; maybe could eventually integrate with Facebook, to enable user
          to invite Facebook-friends to play (at least as exercise in Facebook-integration, specifically
          using Node.js
    */

    return {
        toJSON: function() {
            // per UserClientState
            var tmpHand = {};
            for(var mapKey in hand) {
                tmpHand[mapKey] = hand[mapKey].toJSON();
            }
            return {username: username, hand: tmpHand};
        },
        getUserName: function() {
            return username;
        },
        getPwEncrypted: function() { //TODO; actually free-text, for now
            return pwEncrypted;
        },
        setHand: function(theHand) { //TODO: bad idea?
            hand = theHand;
        },
        getHand: function() { //TODO: encapsulation-issue here
            return hand;
        },
        addCardToHand: function(card) {// expecting instance of Card
            hand[card.getMapKey()] = card;
        }
    };
}

function UserManager() {

    var users = {};

    function decodeToken(token) {
        var auth = buffer.Buffer(token, 'base64').toString();
        var parts = auth.split(/:/);
        var username = parts[0];
        var password = parts[1];
        //console.log("getLoginData: username: " + username + "; passEncrypted: " + password);
        //TODO: passEncrypted will be in clear-text here, for now
        return {token: token, username: username, passEncrypted: password};
    }

    return {

        LOGIN_COOKIE_NAME: 'lgn=',
        STATUS_UNKNOWN_USER: 'UNKNOWN_USER',
        STATUS_USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
        STATUS_USER_CREATED: 'USER_CREATED',
        STATUS_BAD_LOGIN: 'BAD_LOGIN',
        STATUS_LOGIN_SUCCESSFUL: "LOGIN_SUCCESSFUL",
        MSGS: {
           STATUS_UNKNOWN_USER: "Unknown user: '%s'. Please register.",
           STATUS_USER_ALREADY_EXISTS: "Username '%s' already in use.",
           STATUS_USER_CREATED: "User '%s' created. Please login.",
           STATUS_BAD_LOGIN: "Bad login.",
           STATUS_LOGIN_SUCCESSFUL: "Login successful."
        },

        getLoginData: function(req) {
            //from: http://stackoverflow.com/questions/5951552/basic-http-authentication-in-node-js
            var header = req.headers['authorization']||''; // get the header
            console.log("header: " + header);
            var token = header.split(/\s+/).pop()||''; // and the encoded auth token
            return decodeToken(token);
        },
        getUserByID: function(userID) {
            return users[userID];
        },
        getUserForToken: function(token) {
            var decoded = decodeToken(token);
            console.log("getUserForToken: decoded: " + util.inspect(decoded, true, null));
            return users[decoded.username];
        },
        handleLogin: function(cmd, req) {

            var loginResult = {};
            var loginData = this.getLoginData(req);
            var user = this.getUserByID(loginData.username);

            loginResult.userID = loginData.username;

            if(cmd == 'register') {
                console.log("UserManager: handling 'register' cmd");
                if(user) {
                    loginResult.status = this.STATUS_USER_ALREADY_EXISTS;
                    loginResult.msg = util.format(this.MSGS.STATUS_USER_ALREADY_EXISTS, loginData.username);
                } else {
                    var user = new User(loginData.username, loginData.passEncrypted, null);
                    users[loginData.username] = user;
                    loginResult.status = this.STATUS_USER_CREATED;
                    loginResult.msg = util.format(this.MSGS.STATUS_USER_CREATED, loginData.username);
                    loginResult.loginCookieVal = this.LOGIN_COOKIE_NAME + loginData.token;
                }
            } else {
                console.log("UserManager: handling 'login' cmd");

                if(!user) {
                    loginResult.status = this.STATUS_UNKNOWN_USER;
                    loginResult.msg = util.format(this.MSGS.STATUS_UNKNOWN_USER, loginData.username);
                } else if(user.getPwEncrypted() != loginData.passEncrypted) {
                    loginResult.status = this.STATUS_BAD_LOGIN;
                    loginResult.msg = this.MSGS.STATUS_BAD_LOGIN;
                } else {
                    loginResult.status = this.STATUS_LOGIN_SUCCESSFUL;
                    loginResult.msg = this.MSGS.STATUS_LOGIN_SUCCESSFUL;
                    //TODO: don't store token directly; generate an ID for it and set that instead
                    loginResult.loginCookieVal = this.LOGIN_COOKIE_NAME + loginData.token;
                    loginResult.redirectTarget = '/index.html';
                }
            }

            console.log("UserManager loginResult: " + util.inspect(loginResult, true, null));

            return {loginResult: loginResult, loginCookieVal: loginResult.loginCookieVal};
        },
        storeUsers: function(usersPath) {
            console.log("UserManager: storing Users ...");
            var data = [];
            for(var username in users) {
                var user = users[username];
                var pw = user.getPwEncrypted();
                data.push({username: username, pw: pw});
            }
            var dataStr = JSON.stringify(data);
            fs.writeFileSync(usersPath, dataStr);
            console.log("UserManager: all Users stored.");
        },
        loadUsers: function(usersPath) {
            console.log("UserManager: loading Users ...");
            if (path.existsSync(usersPath)) {
                var fileData = fs.readFileSync(usersPath);
                var userData = JSON.parse(fileData);
                console.log("userData: " + userData);
                for(var i = 0; i < userData.length; i++) {
                    var aUserData = userData[i];
                    console.log("username: " + aUserData.username);
                    console.log("pw: " + aUserData.pw);
                    users[aUserData.username] = new User(aUserData.username, aUserData.pw, null);
                    var user = users[aUserData.username];
                    console.log("loaded user: " + user.getUserName() + " " + user.getPwEncrypted());
                }
                console.log("UserManager: all Users loaded.");
            } else {
                console.log("UserManager: WARNING: usersPath '" + usersPath + "' not found");
            }
        }
    };
}

var userMgr = new UserManager();
userMgr.loadUsers(usersPath);

function RuleManager() {

    // loaded via loadRules(), on startup;
    // "ruleAsString" must be executed using "vm.runInNewContext()" or the equivalent
    var rules = {
        /*
        greaterThan: {
            name: 'greaterThan',
            descr: "A given card's ordinal-value is greater than that of the preceding one.",
            ruleAsString: "..."
        }
        */
    };

    var ruleKeys = []; // for random selection of rule by key

    return {
        loadRules: function(rulesPath) {

            console.log("RuleManager: loadRules ...");
            if (path.existsSync(rulesPath)) {

                var fileData = fs.readFileSync(rulesPath);
                if(fileData) {
                    //console.log("RuleManager: loadRules: fileData: " + util.inspect(fileData.toString(), true));
                    var ruleData = JSON.parse(fileData.toString());

                    for(var key in ruleData) {
                        var aRuleData = ruleData[key];
                        rules[key] = aRuleData;
                        ruleKeys.push(key);
                        console.log("loaded " + key + " as: " + util.inspect(rules[key], true));
                    }
                    console.log("RuleManager: all Rules loaded.");
                } else {
                    console.log("RuleManager: loadRules: file empty: " + rulesPath);
                }

            } else {
                console.log("RuleManager: WARNING: rules-file not found: " + rulesPath);
            }
        },
        storeRules: function(rulesPath) {
            console.log("RuleManager: storing Rules ...");
            var dataStr = JSON.stringify(rules);
            console.log("RuleManager: storeRules: dataStr: " + dataStr);
            fs.writeFileSync(rulesPath, dataStr);
            console.log("RuleManager: all Rules stored.");
        },
        chooseRule: function(ruleName) {
            ruleName = (typeof ruleName == 'undefined' ) ? null : ruleName;
            var chosenRule = rules[ruleKeys[Math.floor(Math.random() * ruleKeys.length)]];
            console.log("RuleManager: chooseRule: chosenRule: " + chosenRule.name);
            return chosenRule;
        },
        assertRule: function(chosenRule, card1, card2) {
            if(chosenRule.ruleAsString) {
                //console.log("assertRule: chosenRule: " + chosenRule.name);
                //console.log("assertRule: card1: " + card1.getOrdinal());
                //console.log("assertRule: card2: " + card2.getOrdinal());
                var context = {card1: card1, card2: card2};
                //TODO: this approach is unsafe!
                var result = vm.runInNewContext("(function(){" + chosenRule.ruleAsString + "})()", context);
                //console.log("RuleManager assertRule (asString): vm-result: " + util.inspect(result, true, null));
                return result;
            } else {
                var result = chosenRule.rule(card1, card2);
                //console.log("RuleManager assertRule: direct result: " + result);
                return result;
            }
        },
        checkRuleGuess: function(guessContent, context) {
            //TODO: this approach is unsafe!
            var result = vm.runInNewContext("(function(){" + guessContent + "})()", context);
            //console.log("RuleManager checkRuleGuess: vm-result: " + util.inspect(result, true, null));
            return result;
        },
        getRules: function() {
            var rulesAsStrings = [];
            for(var ruleID in rules) {
                var rule = rules[ruleID];
                var ruleAsString = null;
                if(rule.ruleAsString) {
                    ruleAsString = rule.ruleAsString;
                } else {
                    ruleAsString = rule.rule.toString();
                }
                var ruleDescr = {
                    ruleName: ruleID,
                    descr: rule.descr,
                    ruleAsString: ruleAsString
                };
                rulesAsStrings.push(ruleDescr);
            }
            return rulesAsStrings;
        },
        addRule: function(name, descr, ruleAsString) {
            rules[name] = {
                name: name,
                descr: descr,
                ruleAsString: ruleAsString
            };
            console.log("RuleManager: addRule: added rule " + name + " as: " + util.inspect(rules[name], true));
        }
    };
}

var ruleMgr = new RuleManager();
ruleMgr.loadRules(rulesPath);


function BruteForceFuncEquivChecker(theRuleMgr) {

    //NOTE: this class is not meant to be used unless the basic guess-against-card-sequence succeeds,
    //       in which case this class is meant to be used to try to check if the mystery rule ("chosenRule")
    //       is actually more complex than the rule-guess; hence this defaultStatusMsg

    var defaultStatuMsg = "Your Rule-Guess satisfies the current card-sequence";
    var MAX_DECKS = 1; //TODO: no longer in use
    var MAX_CARD_IDX = 51;
    var ruleMgr = theRuleMgr;
    var gameMgr = null; // set through a setter


    function checkWithDeck(deck, card1Idx, guessContent, deckCount, result, game, callback) {

        if(card1Idx >= MAX_CARD_IDX || result.status == "FAILED") {
            if(result['status'] == 'SUCCEEDED') {
                result['ruleDescr'] = game.getChosenRule().descr;
            }
            callback(result);
        } else {
            process.nextTick(function() { //TODO: is this "outer" process.nextTick() superfluous/unnecessary?

                var itrCount = 0;
                var card1 = deck[card1Idx % deck.length];
                var card2Idx = (card1Idx + 1) % deck.length;
                //console.log("BruteForceFuncEquivChecker: checkGuess: proceeding: card1Idx: " +
                //    (card1Idx % deck.length) + "; card2Idx: " + card2Idx);

                for(var i = card2Idx; itrCount < deck.length; itrCount++) {

                    var card2 = deck[i];

                    var compResult = compareRules(game.getChosenRule(), card1, card2, guessContent);
                    if(compResult.mismatch) break;

                    // reversing order here, because need to check all sequences, not just all combinations
                    compResult = compareRules(game.getChosenRule(), card2, card1, guessContent);
                    if(compResult.mismatch) break;

                    i = ++i % deck.length;
                }

                if(compResult.mismatch) {

                    var failedCard1 = compResult.mismatch.cardSeq[0];
                    var failedCard2 = compResult.mismatch.cardSeq[1];

                    result['status'] = "FAILED";
                    result['statusMsg'] = defaultStatuMsg + ", " +
                        "but it fails for the following tested hypothetical card-sequence: [" +
                        failedCard1.getMapKey() + ", " +
                        failedCard2.getMapKey() +
                        "]";
                    result['cardSeq'] = [
                        failedCard1.toJSON(),
                        failedCard2.toJSON()
                    ];
                    result['mysteryRuleAccepts'] = compResult.mismatch.mysteryRuleAccepts;

                    process.nextTick(function(){
                        checkWithDeck(deck, ++card1Idx, guessContent, ++deckCount, result, game, callback);
                    });

                } else {

                    //console.log("BruteForceFuncEquivChecker: checkGuess: rule-check succeeded");

                    if(result['status'] == 'STARTED') {
                        result['status'] = 'SUCCEEDED';
                        result['statusMsg'] = defaultStatuMsg + ", " +
                            "and it appears to be equivalent to the mystery rule, so you've won!"
                    }

                    process.nextTick(function(){
                        checkWithDeck(deck, ++card1Idx, guessContent, ++deckCount, result, game, callback);
                    });
                }
            });
        }
    }

    function compareRules(rule, card1, card2, guessContent) {

        var result = {};
        var chosenRuleResult = ruleMgr.assertRule(rule, card1, card2);
        var context = {card1: card1, card2: card2};
        var ruleGuessResult = ruleMgr.checkRuleGuess(guessContent, context);

        if(ruleGuessResult !== chosenRuleResult) {
            console.log("BruteForceFuncEquivChecker: checkGuess compareRules: result-mismatch for " +
                card1.getMapKey() + " and " + card2.getMapKey());
            result.mismatch = {
                cardSeq: [card1, card2],
                mysteryRuleAccepts: chosenRuleResult
            };
        }
        return result;
    }

    function checkGuessCallback(result) {
        publishEvent(result);
    }

    return {
        setGameManager: function(theGameMgr) {
            gameMgr = theGameMgr;
        },
        checkGuess: function(gameID, callerUname, guessContent) {
            var result = {
                status: "STARTED",
                gameID: gameID,
                callerUname: callerUname,
                handler: 'playerGuessCheckAsync'
            };

            var game = gameMgr.getGameById(gameID);
            console.log("BruteForceFuncEquivChecker: checkGuess: game: " + util.inspect(game, true));
            var deck = Game.loadDeck([]);

            //TODO: deckCount no longer in use
            checkWithDeck(deck, 0, guessContent, 0, result, game, checkGuessCallback);
        }
    };
}


function Game(gameID, gameName, ruleManager, theBruteForceFuncEquivChecker, firstPlayer) {

    var MAX_ORD = 13;

    var id = gameID;
    var name = gameName;
    var deck = []; // array of Card
    var common = [];
    var ruleMgr = ruleManager;
    var turnQ = new TurnQueue();
    var bruteForceFuncEquivChecker = theBruteForceFuncEquivChecker;
    var rule = null;
    var players = {};
    players[firstPlayer.getUserName()] = firstPlayer;
    turnQ.addPlayer(firstPlayer);


    function inspect(obj) {
        if(util.inspect) {
            return util.inspect(obj, true, null);
        }
        return obj;
    }

    function log(msg) {
        if(console.log) {
            console.log(msg);
        }
    }

    deck = Game.loadDeck(deck);

    rule = ruleMgr.chooseRule();
    console.log("Game [" + name + "]: rule: " + rule.name);

    return {
        toJSON: function() {
            // per GameClientState
            var commonAry = [];
            for(var i = 0; i < common.length; i++) {
                commonAry.push(common[i].toJSON());
            }
            var playersMap = {};
            for(var username in players) {
                var player = players[username];
                playersMap[username] = player.toJSON(); // effectively returns UserClientState
            }
            var result = {
                id: id,
                name: name,
                common: commonAry,
                players: playersMap
            };
            console.log("Game.toJSON returning: " + util.inspect(result, true, null));
            return result;
        },
        getId: function() {
            return id;
        },
        getName: function() {
            return name;
        },
        getCommon: function() {
            return common; //TODO: clone? encapsulation-issue!
        },
        getPlayers: function() {
            return players; //TODO: clone? encapsulation-issue!
        },
        joinGame: function(user) {
            players[user.getUserName()] = user;
            turnQ.addPlayer(user);
        },
        removePlayer: function(user) {
            delete players[user.getUserName()];
            turnQ.removePlayer(user);
            user.setHand({});
            console.log("Game: removePlayer: removed " + user.getUserName() +
                " from [" + name + "]; player-count: " + Object.keys(players).length);
        },
        getCurrTurnPlayer: function() {
            return turnQ.getCurrTurnPlayer();
        },
        nextTurn: function() {
            turnQ.nextTurn();
        },
        setGameOver: function() {
            turnQ.setGameOver();
        },
        isGameOver: function() {
            return turnQ.isGameOver();
        },
        drawCard: function() {
            return deck.pop();
        },
        playOrDrawCardForPlayer: function(user) {
            var result = {
                callerUname: user.getUserName()
            };
            var hand = user.getHand();
            var card = null;

            for(var mapKey in hand) {
                var tmpCard = hand[mapKey];
                if(!tmpCard) {
                    continue; //TODO: should be superfluous now that card-removal done properly
                }
                var ruleResult = this.assertRule(tmpCard);
                if(ruleResult.status == "OK") {
                    card = tmpCard;
                    break;
                }
            }

            if(card) {
                delete hand[card.getMapKey()];
                common.push(card);
            } else {
                //TODO: could be out of cards already!
                card = this.drawCard();
                hand[card.getMapKey()] = card;
                result.drawn = 'true';
            }

            result.card = card;
            return result;
        },
        drawFirstCard: function() {
            var firstCard = this.drawCard();
            common.push(firstCard);
            return firstCard;
        },
        assertRule: function(card) {
            var commonCard = common[common.length-1];
            var result = ruleMgr.assertRule(rule, commonCard, card);
            if(result === true) {
                return {status: 'OK', reason: 'Rule Satisfied'};
            } else {
                return {
                    status: 'REJECTED',
                    reason: 'Rule NOT Satisfied',
                    cardSeq: [commonCard.toJSON(), card.toJSON()]
                };
            }
        },
        addCardToCommon: function(card) {
            common.push(card);
        },
        checkRuleGuess: function(callerUname, guessContent) {

            var result = true;
            log("Game checkRuleGuess: common.length: " + common.length);

            try {
                for(var i = 1; i < common.length; i++) {

                    var context = {card1: common[i-1], card2: common[i]};
                    result = ruleMgr.checkRuleGuess(guessContent, context);

                    if(!result) {
                        console.log("Game checkRuleGuess context: card1: " +
                            util.inspect(context.card1.toJSON(), true, null));
                        console.log("Game checkRuleGuess context: card2: " +
                            util.inspect(context.card2.toJSON(), true, null));
                        break;
                    }
                }
            } catch(error) {
                return {
                    status: "ERROR",
                    statusMsg: 'ERROR: ' + error.type + ': ' + error.message
                };
            }

            if(result === true) {
                bruteForceFuncEquivChecker.checkGuess(id, callerUname, guessContent);
                return {
                    status: "PENDING",
                    statusMsg: "Checking submitted Rule-Guess ..."
                };
            } else {
                var penaltyCard = this.drawCard(); //TODO: remove this
                return {
                    status: "WRONG",
                    statusMsg: "Your Rule-Guess does not satisfy the displayed card-sequence.",
                    penaltyCard: penaltyCard
                };
            }
        },
        getRules: function() {
            return ruleMgr.getRules();
        },
        addRule: function(name, ruleAsString) {
            ruleMgr.addRule(name, ruleAsString);
        },
        chooseRule: function(name) {
            ruleMgr.chooseRule(name);
        },
        getChosenRule: function() {
            return rule;
        }
    };

} // end Game


// Game public-statics, especially for access from BruteForceFuncEquivChecker

Game.MAX_ORD = 13;
Game.MAX_PLAYERS = 2;

Game.shuffle = function(array) {
    var tmp, current, top = array.length;
    if(top) while(--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }
    return array;
};

Game.loadDeck = function(deck) {
    console.log("loadDeck Card.SUITS: " + util.inspect(SUITS, true, null));
    for(var i = 1; i <= Game.MAX_ORD; i++) {
        for(var key in SUITS) {
            deck.push(new Card(i, SUITS[key].id));
        }
    }
    deck = Game.shuffle(deck);
    return deck;
};



function GameManager(ruleManager, theBruteForceFuncEquivChecker) {

    var GAME_ID_PREFIX = "g_";
    var DEFAULT_GAME_ID = "g_username_" + new Date().getTime();
    var HAND_START_SIZE = 5;

    var ruleMgr = ruleManager;
    var bruteForceFuncEquivChecker = theBruteForceFuncEquivChecker;
    var gamesByID = {};
    var gamesByName = {}; // poor man's "index on name"

    return {
        joinGame: function(gameID, user) {
            var game = gamesByID[gameID];
            game.joinGame(user);
            //TODO: encapsulation-issue: maybe better to wrap in GameClientState in here,
            //TODO:   rather than in CommandManager
            return game;
        },
        createGame: function(gameName, firstPlayer) {
            if(this.getGameByName(gameName)) {
                throw new Error("game-name '" + gameName + "' already in use");
            }
            var gameID = GAME_ID_PREFIX + new Date().getTime();
            var game = new Game(gameID, gameName, ruleMgr, bruteForceFuncEquivChecker, firstPlayer);
            gamesByID[gameID] = game;
            gamesByName[gameName] = game;
            return game;
        },
        getGameByName: function(gameName) {
            return gamesByName[gameName];
        },
        getGameById: function(gameId) {
            return gamesByID[gameId];
        },
        dealHand: function(game, user) {
            console.log("dealing hand for game: " + game.getId() + " to user " + user.getUserName());
            var game = gamesByID[game.getId()];
            var hand = user.getHand();
            for(var i = 0; i < HAND_START_SIZE; i++) {
                var drawnCard = game.drawCard();
                //console.log("GameManager dealHand: drawnCard: " + util.inspect(drawnCard, true, null));
                hand[drawnCard.getMapKey()] = drawnCard;
            }
            //console.log("GameManager hand: " + util.inspect(hand, true, null));
        },
        drawFirstCard: function(game) { // i.e., first common card for game
            var game = gamesByID[game.getId()];
            return game.drawFirstCard();
        },
        drawCard: function(gameID) {
            var game = gamesByID[gameID];
            return game.drawCard();
        },
        playOrDrawCardForPlayer: function(gameID, user) {
            var game = gamesByID[gameID];
            return game.playOrDrawCardForPlayer(user);
        },
        nextTurn: function(gameID, gameOver) {
            var game = gamesByID[gameID];
            if(gameOver) {
                game.setGameOver();
                console.log("GameManager: nextTurn: game " +
                    game.getId() + " is over; the winner is: " + game.getCurrTurnPlayer().getUserName());
            } else {
                game.nextTurn();
                console.log("GameManager: nextTurn: game " +
                    game.getId() + "'s currTurnPlayer now: " + game.getCurrTurnPlayer().getUserName());
            }
            return {status: 'OK'};
        },
        assertRule: function(gameID, card) {
            var game = gamesByID[gameID];
            return game.assertRule(card);
        },
        addCardToCommon: function(gameID, card) {
            var game = gamesByID[gameID];
            game.addCardToCommon(card);
        },
        removeCardFromHand: function(gameID, card, username) {
            var game = gamesByID[gameID];
            var hand = game.getPlayers()[username].getHand();
            var cardToRemove = hand[card.getMapKey()];
            delete hand[card.getMapKey()];
            console.log("GameManager: removeCardFromHand: removed card: " +
                cardToRemove.getMapKey() + " from hand of " + username + " in game " + gameID);
        },
        getLatestCommon: function(gameID) {
            var game = gamesByID[gameID];
            var common = game.getCommon();
            return common[common.length -1];
        },
        checkRuleGuess: function(gameID, callerUname, guessContent) {
            var game = gamesByID[gameID];
            console.log("GameManager checkRuleGuess: guessContent= " + guessContent);
            return game.checkRuleGuess(callerUname, guessContent);
        },
        getGames: function() {
            var games = {};
            for(var id in gamesByID) {
                var game = gamesByID[id];
                if(Object.keys(game.getPlayers()).length == Game.MAX_PLAYERS) continue;
                var gameData = {id: id, name: game.getName()};
                games[id] = gameData;
            }
            return games;
        },
        getRules: function(gameID) {
            var game = gamesByID[gameID];
            return game.getRules();
        },
        addRule: function(gameID, name, ruleAsString) {
            var game = gamesByID[gameID];
            game.addRule(name, ruleAsString);
        },
        chooseRule: function(gameID, name) {
            var game = gamesByID[gameID];
            game.chooseRule(name);
        },
        getChosenRule: function(gameID) {
            var game = gamesByID[gameID];
            return game.getChosenRule();
        },
        ensureUserNotInAnyGame: function(user) {

            var removedFromGameID = null;

            for(var gameID in gamesByID) {

                var game = gamesByID[gameID];
                var players = game.getPlayers(); //TODO; encapsulation-issue!

                for(var username in players){

                    if(username == user.getUserName()) {

                        var player = players[username];
                        game.removePlayer(player);

                        removedFromGameID = gameID;
                        var gameDeleted = null;

                        if(Object.keys(players).length == 0) {
                            delete gamesByID[gameID];
                            delete gamesByName[game.getName()];
                            console.log("GameManager: ensureUserNotInAnyGame: game [" +
                                game.getName() + "] deleted; game-count: " + Object.keys(gamesByID).length);
                            gameDeleted = game.getName();
                        }

                        var result = {
                            status: 'OK',
                            evt: {
                                handler: 'playerLeftGame',
                                callerUname: username,
                                gameID: gameID,
                                msg: username + ' left the game'
                            }
                        };

                        if(gameDeleted) {
                            result.moreEvts = {
                                afterEvts: [
                                    {
                                        handler: 'gameDeleted',
                                        callerUname: username,
                                        channelName: CHANNEL_NAME_ADMIN,
                                        msg: "[" + gameDeleted + "] deleted because empty of players"
                                    }
                                ]
                            };
                        }

                        return result;
                    }
                }
            }

            return {status: 'OK'};
        }
        /*
          invitePlayers: ...
            use node_mailer to send (for now, from verizon.net account) to other players
        */
    };
}

var bruteForceFuncEquivChecker = new BruteForceFuncEquivChecker(ruleMgr);
var gameMgr = new GameManager(ruleMgr, bruteForceFuncEquivChecker);
bruteForceFuncEquivChecker.setGameManager(gameMgr);


function CommandManager() {

    var cmds = {
        joinGame:
            {cmd: joinGameCmd, loggedInOnly: true},
        startGame:
            {cmd: startGameCmd, loggedInOnly: true},
        playCard:
            {cmd: playCardCmd, loggedInOnly: true},
        guessRule:
            {cmd: guessRuleCmd, loggedInOnly: true},
        getGames:
            {cmd: getGamesCmd, loggedInOnly: true},
        getRules:
            {cmd: getRulesCmd, loggedInOnly: true},
        addRule:
            {cmd: addRuleCmd, loggedInOnly: true},
        marshal:
            {cmd: marshalCmd, loggedInOnly: true},
        getChosenRule:
            {cmd: getChosenRuleCmd, loggedInOnly: true},
        sendChatMsg:
            {cmd: sendChatMsgCmd, loggedInOnly: true},
        claimNoPlay:
            {cmd: claimNoPlayCmd, loggedInOnly: true},
        nextTurn:
            {cmd: nextTurnCmd, loggedInOnly: true}
    };



    function nextTurnCmd(decodedBody) {
        var dataPosted = decodedBody.dataPosted;
        console.log("dataPosted: " + util.inspect(dataPosted, true, null));
        var userName = decodedBody.user.getUserName();
        var gameID = dataPosted.gameID;
        var gameOver = dataPosted.gameOver;
        var nextTurnResult = gameMgr.nextTurn(gameID, gameOver);
        return {
            playerReleasedTurnResult: nextTurnResult,
            evt: {
                handler: 'playerReleasedTurn',
                callerUname: userName,
                gameID: gameID,
                gameOver: gameOver
            }
        };
    }

    function sendChatMsgCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("dataPosted: " + util.inspect(dataPosted, true, null));

        var userName = decodedBody.user.getUserName();
        var gameID = dataPosted.gameID;
        var msg = dataPosted.msg;

        return {
            evt: {
                handler: 'playerSentChatMsg',
                gameID: gameID,
                msg: userName + ": " + msg
            }
        };
    }

    function getChosenRuleCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("dataPosted: " + util.inspect(dataPosted, true, null));

        var gameID = dataPosted.gameID;
        var callerUname = dataPosted.callerUname;

        var chosenRule = gameMgr.getChosenRule(gameID);
        var ruleStr = chosenRule['ruleAsString'] ?
            chosenRule['ruleAsString'] : chosenRule['rule'].toString();

        var actionMsg = callerUname + " asks to see the rule";

        return {
            getChosenRuleResult: {
                rule: ruleStr,
                ruleDescr: chosenRule.descr,
                actionMsg: actionMsg
            },
            evt: {
                handler: 'playerSeesRule',
                callerUname: callerUname,
                gameID: gameID,
                msg: actionMsg
            }
        };
    }

    function marshalCmd(decodedBody) {

        console.log("marshalCmd: decodedBody: " + util.inspect(decodedBody, true, null));
        var gameData = decodedBody.dataPosted;

        console.log("gameData.common[1].suitID: " + gameData.common[1].suitID);

        var player1 = new User('player-1', 'player-1-pw', null);
        player1.addCardToHand(new Card(1,2));
        player1.addCardToHand(new Card(2,3));

        var player2 = new User('player-2', 'player-2-pw', null);
        player2.addCardToHand(new Card(4,5));
        player2.addCardToHand(new Card(6,7));


        var game = new Game('test-game-ID','test-game-name', ruleMgr, player1);
        game.joinGame(player2);
        game.drawFirstCard();

        return {marshalResult: {game: game.toJSON()}};
    }

    function joinGameCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("dataPosted: " + util.inspect(dataPosted, true, null));

        var gameID = dataPosted.gameID;

        var user = decodedBody['user'];
        console.log("joinGameCmd: user: " + util.inspect(user, true, null));
        var username = user.getUserName();

        var removalResult = gameMgr.ensureUserNotInAnyGame(user);
        var removedEvt = removalResult.evt ? removalResult.evt : null;
        var moreEvts = removalResult.moreEvts ? removalResult.moreEvts : null;

        var game = gameMgr.joinGame(gameID, user);
        gameMgr.dealHand(game, user);

        var gameClientState = game.toJSON();

        var result = {joinGameResult: {
            callerUname: user.getUserName(),
            game: gameClientState
            },
            evt: {
                handler: 'playerJoinedGame',
                player: user.toJSON(),
                gameID: gameID,
                msg: username + " joined the game"
            }
        };

        if(moreEvts) {
            result.moreEvts = moreEvts;
        }

        if(removedEvt) {
            result.moreEvts = result.moreEvts ? result.moreEvts : {};
            result.moreEvts.beforeEvts = [removedEvt];
        }

        return result;
    }

    function startGameCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("dataPosted: " + util.inspect(dataPosted, true, null));

        var gameName = dataPosted.gameName;

        var user = decodedBody['user'];
        console.log("user: " + util.inspect(user, true, null));

        var result = null;

        if(gameMgr.getGameByName(gameName)) {

            result = {
                startGameResult: {
                    status: "ERROR",
                    msg: "Game '" + gameName + "' already exists",
                    callerUname: user.getUserName()
                }
            };

        } else {

            var removalResult = gameMgr.ensureUserNotInAnyGame(user);
            var removedEvt = removalResult.evt ? removalResult.evt : null;
            var moreEvts = removalResult.moreEvts ? removalResult.moreEvts : null;

            var game = gameMgr.createGame(gameName, user);
            gameMgr.dealHand(game, user);
            gameMgr.drawFirstCard(game); // this returns drawnCard, but don't need it here

            var gameClientState = game.toJSON();

            result = {
                startGameResult: {
                    status: "OK",
                    msg: "Game '" + game.getName() + "' created and started",
                    callerUname: user.getUserName(),
                    game: gameClientState
                },
                evt: {//NOTE: this evt seems to be required, to create the Game's channel
                    id: 'gameCreated',
                    gameID: game.getId()
                }
            };

            result.moreEvts = moreEvts ? moreEvts : {};

            if(removedEvt) {
                result.moreEvts.beforeEvts = [removedEvt];
            }

            result.moreEvts.afterEvts = [
                {
                    handler: 'playerCreatedGame',
                    channelName: CHANNEL_NAME_ADMIN, // i.e., send to ALL players, esp. for update of games-list
                    gameData: {
                        id: game.getId(),
                        name: game.getName()
                    },
                    callerUname: user.getUserName(),
                    msg: user.getUserName() + " created game " + game.getName()
                }
            ];
        }

        console.log("CommandManager result: " + util.inspect(result, true, null));

        return result;
    }

    function playCardCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("in playCardCmd: dataPosted: " + util.inspect(dataPosted, true, null));

        var cardData = dataPosted.playedCard;
        console.log("in playCardCmd: cardData: " + util.inspect(cardData, true, null));
        var card = new Card(cardData.ordinal, cardData.suitID);

        var gameID = dataPosted.gameID;
        console.log("in playCardCmd: gameID: " + util.inspect(gameID, true, null));

        var callerUname = dataPosted.callerUname;
        console.log("in playCardCmd: callerUname: " + util.inspect(callerUname, true, null));

        var ruleResult = gameMgr.assertRule(gameID, card);
        var lastestCommon = gameMgr.getLatestCommon(gameID);

        if(ruleResult.status == 'OK') {
            gameMgr.addCardToCommon(gameID, card);
            gameMgr.removeCardFromHand(gameID, card, callerUname);
        }

        var actionMsg = callerUname + " plays " + card.getMapKey() + " on " + lastestCommon.getMapKey();

        var cardSeq = [lastestCommon.toJSON(), cardData];

        ruleResult['playedCard'] = cardData;
        ruleResult['actionMsg'] = actionMsg; //TODO: redundant? (since will be pub/sub'd via 'evt', below)

        return {
            playCardResult: ruleResult,
            evt: {
                handler: 'playerPlayedCard',
                status: ruleResult.status,
                reason: ruleResult.reason,
                callerUname: callerUname,
                card: cardData, // TODO: redundant now (?)
                gameID: gameID, // needed so publishEvent knows which game-channel to publish to
                msg: actionMsg,
                cardSeq: cardSeq
            }
        };
    }

    function claimNoPlayCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("in claimNoPlayCmd: dataPosted: " + util.inspect(dataPosted, true, null));

        var gameID = dataPosted.gameID;
        console.log("in claimNoPlayCmd: gameID: " + util.inspect(gameID, true, null));

        var user = decodedBody['user'];
        console.log("user: " + util.inspect(user, true, null));

        var drawOrPlayResult = gameMgr.playOrDrawCardForPlayer(gameID, user);
        var eleusisResp = drawOrPlayResult.drawn ?
            "You're right. You had no play, so I've drawn a card for you: " +
                drawOrPlayResult.card.getMapKey() :
            "Wrong. I've played for you the first of your cards I found to be playable: " +
                drawOrPlayResult.card.getMapKey();

        var actionMsg = user.getUserName() + " claimed no play; eleusis-response: " + eleusisResp;

        drawOrPlayResult.card = drawOrPlayResult.card.toJSON();

        return {
            playOrDrawCardForPlayerResult: drawOrPlayResult, //TODO: superfluous, because now all handled as evt
            evt: {
                handler: 'playerClaimedNoPlay',
                callerUname: user.getUserName(),
                gameID: gameID,
                msg: actionMsg,
                drawOrPlayResult: drawOrPlayResult
            }
        };
    }

    function guessRuleCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("in guessRuleCmd: dataPosted: " + util.inspect(dataPosted, true, null));

        var gameID = dataPosted.gameID;
        console.log("in guessRuleCmd: gameID: " + util.inspect(gameID, true, null));

        var guessContent = dataPosted.guessContent;
        console.log("in guessRuleCmd: guessContent: " + util.inspect(guessContent, true, null));

        var callerUname = dataPosted.callerUname;
        console.log("in guessRuleCmd: callerUname: " + util.inspect(callerUname, true, null));

        var guessResult = gameMgr.checkRuleGuess(gameID, callerUname, guessContent);

        var actionMsg = callerUname + " guesses rule";
        guessResult['actionMsg'] = actionMsg;

        return {
            guessRuleResult: guessResult,
            evt: {
                handler: 'playerGuessedRule',
                status: guessResult.status,
                statusMsg: guessResult.statusMsg,
                callerUname: callerUname,
                gameID: gameID,
                msg: actionMsg
            }
        };
    }

    function getGamesCmd() {
        var games = gameMgr.getGames();
        return {getGamesResult: {games: games}}
    }

    function getRulesCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("in getRulesCmd: dataPosted: " + util.inspect(dataPosted, true, null));

        var rules = ruleMgr.getRules();

        return {getRulesResult: {rules: rules}};
    }

    function addRuleCmd(decodedBody) {

        var dataPosted = decodedBody.dataPosted;
        console.log("in addRuleCmd: dataPosted: " + util.inspect(dataPosted, true, null));

        var ruleName = dataPosted.name;
        console.log("addRuleCmd: ruleName: " + util.inspect(ruleName, true, null));

        var ruleDescr = dataPosted.ruleDescr;
        console.log("addRuleCmd: ruleDescr: " + util.inspect(ruleDescr, true, null));

        var ruleAsString = dataPosted.ruleContent;
        console.log("addRuleCmd: ruleAsString: " + util.inspect(ruleAsString, true, null));

        ruleMgr.addRule(ruleName, ruleDescr, ruleAsString);

        return {addRuleCmdResult: {status: 'OK'}};
    }

    // public methods
    return  {
        invoke: function(cmdName, decodedBody) {
            return cmds[cmdName].cmd(decodedBody);
        }
    };

} // end CommandManager

var cmdMgr = new CommandManager();


////////////////////////////////////////////////////////////////


function getCookies(req) {
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
    });
    console.log("cookies: " + util.inspect(cookies, true, null));
    return cookies;
}

//TODO: put this into UserManager?
function getLoginTokenFromCookie(req) {
    var cookies = getCookies(req);
    return cookies['lgn']; //TODO: bare literal!
}

function isFileRequest(req) {
    var result = req.url.match(/.*(\.html)|(\.js)|(\.css)|(\.png)|(\.jpg)|(\.ico).*/);
    if(result) {
        console.log("handling file-request: " + req.url);
    }
    return result;
}

function getCommandData(req, decodedBody) {

    var cmdData = {};

    if(req.method == 'POST') {
        console.log("handling POST");
        console.log("decodedBody: " + util.inspect(decodedBody, true, null));
        cmdData.cmd = decodedBody.cmd;
        cmdData.decodedBody = decodedBody;
    } else {
        console.log("handling GET: " + req.url);
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        console.log("query: " + util.inspect(query, true, null));
        cmdData.cmd = query.cmd;
        cmdData.decodedBody = decodedBody; // always present, provided logged in (tho might contain only current user)
    }

    console.log("cmdData: " + util.inspect(cmdData, true, null));

    return cmdData;
}

function returnFile(fileName, req, res) {

    console.log("returning file: " + __dirname + fileName);
    fs.readFile(__dirname + fileName, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }

        var mimeType = "text/html";
        if(req.url.indexOf(".png") != -1) {
            mimeType = "image/png";
        } else if(req.url.indexOf(".jpg") != -1) {
            mimeType = "image/jpg";
        } else if(req.url.indexOf(".js") != -1) {
            mimeType = "application/javascript";
        } else if(req.url.indexOf(".css") != -1) {
            mimeType = "text/css";
        }

        var head = {"Content-Type": mimeType};
        res.writeHead(200, head);

        res.end(data);
    });
}

function publishEvent(evt) {
    var channel = evt.gameID ? evt.gameID : evt.channelName;
    console.log("publishing event to: " + channel);
    console.log("evt: " + util.inspect(evt, true, null));
    var publication = bayeux.getClient().publish('/eleusisGames/' + channel, evt);
    console.log("publishEvent: publication: " + util.inspect(publication, true, null));
}

function execCmd(cmdData) {

    console.log("executing cmd: " + cmdData.cmd);
    var cmdResult = cmdMgr.invoke(cmdData.cmd, cmdData.decodedBody);
    console.log("execCmd: cmdResult.evt: " + cmdResult.evt);

    if(cmdResult.evt) {
        if(cmdResult.moreEvts) {
            if(cmdResult.moreEvts.beforeEvts) {
                publishMoreEvents(cmdResult.moreEvts.beforeEvts);
            }
        }

        publishEvent(cmdResult.evt);

        if(cmdResult.moreEvts) {
            if(cmdResult.moreEvts.afterEvts) {
                publishMoreEvents(cmdResult.moreEvts.afterEvts);
            }
        }
    }
    return cmdResult;
}

function publishMoreEvents(evts) {
    for(var i = 0; i <  evts.length; i++) {
        publishEvent(evts[i]);
    }
}

function returnCmdResult(cmdResult, res) {

    var head = {"Content-Type": "application/json"};
    if(cmdResult && cmdResult.loginCookieVal) {
        head['Set-Cookie'] = cmdResult.loginCookieVal;
    }

    console.log("head: " + util.inspect(head, true, null));
    res.writeHead(200, head);

    var resultJSON = JSON.stringify({
        result: cmdResult
    });

    res.write(
        resultJSON
    );

    console.log("returning data.result: " + util.inspect(cmdResult, true, null));

    res.end();
}

function handleRequest(req, res, decodedBody) {

    var loginToken = getLoginTokenFromCookie(req);
    console.log("loginToken: " + loginToken);

    if(loginToken) {
        var user = userMgr.getUserForToken(loginToken);
        if(decodedBody) {
            decodedBody.user = user;
        } else {
            decodedBody = {user: user};
        }
        if(req.url == '/' || isFileRequest(req)) {
            console.log("req is root or file-request");
            var fileName = req.url == '/' ? '/index.html' : req.url;
            returnFile(fileName, req, res);
        } else {
            var cmdData = getCommandData(req, decodedBody);
            if(cmdData.cmd == 'login' || cmdData.cmd == 'register') {
                var cmdResult = {loginResult: {redirectTarget: '/index.html'}};
                returnCmdResult(cmdResult, res);
            } else {
                var cmdResult = execCmd(cmdData);
                returnCmdResult(cmdResult, res);
            }
        }
    } else {
        if(req.url == '/' || isFileRequest(req)) {
            console.log("req is root or file-request");
            if(req.url == '/' || req.url.indexOf('.html') != -1) {
                returnFile('/login.html', req, res);
            } else {
                // .js, .css, .png
                returnFile(req.url, req, res);
            }

        } else {
            var cmdData = getCommandData(req, decodedBody);
            if(!cmdData.cmd) {
                console.log("ERROR: cmd not found: " + req);
            } else {
                var cmdResult = null;
                if(cmdData.cmd == 'login' || cmdData.cmd == 'register') {
                    cmdResult = userMgr.handleLogin(cmdData.cmd, req);
                } else {
                    //TODO: which case is this for? the only cmds OK to exec while not logged in
                    //TODO:   are login and register
                    //cmdResult = execCmd(cmdData);
                }
                returnCmdResult(cmdResult, res);
            }
        }
    }
}

function returnForbidden(url, res) {
    res.writeHead(403, {});
    res.write(
        "<html><body><center><br/><br/>Really?<br/>Don't even <b>try</b> to go there, homey!</center></body></html>\n\n"
    );
    res.end();
}


var server = http.createServer(function(req, res) {

    console.log("req.url: " + req.url);

    if(req.url.substring(0,2) == '/.') { // attempt to get above web-root
        returnForbidden(req.url, res);
        return;
    }

    if(isFileRequest(req) && req.url.indexOf('eleusis_server.js') != -1) {
        returnForbidden(req.url, res);
        return;
    }

    if(req.method == 'POST') {
        var fullBody = '';
        req.on('data', function(chunk) {
            console.log("req.on: chunk = " + chunk);
            fullBody += chunk.toString();
            console.log("fullBody: " + fullBody);
        });
        req.on('end', function() {
            var decodedBody = JSON.parse(fullBody);
            console.log("decodedBody: " + util.inspect(decodedBody, true, null));
            handleRequest(req, res, decodedBody);
        });
    } else {
        handleRequest(req, res);
    }

}).listen(process.env.PORT || 8889, "0.0.0.0");
console.log("listening on port 8889");

bayeux.attach(server);
console.log("attached server to bayeux (pub-sub framework)");


publishEvent({//NOTE: this seems required, in order to create this channel
        channelName: CHANNEL_NAME_ADMIN,
        msg: 'eleusis_server initialized'
    }
);



var usersStored = false;
var rulesStored = false;

process.on('SIGINT', function() {
    console.log('\nAbout to exit (via control-C) ...');
    userMgr.storeUsers(usersPath);
    usersStored = true;
    ruleMgr.storeRules(rulesPath);
    rulesStored = true;
    process.exit();
});

process.on('exit', function() {
    console.log('exiting ...');
    if(!usersStored) {
        userMgr.storeUsers(usersPath);
        usersStored = true;
    }
    if(!rulesStored) {
        ruleMgr.storeRules(rulesPath);
        rulesStored = true;
    }
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    console.log(err.stack);
    if(!usersStored) {
        userMgr.storeUsers(usersPath);
    }
    if(!rulesStored) {
        ruleMgr.storeRules(rulesPath);
        rulesStored = true;
    }
});
