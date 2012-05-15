/**
 * Created by JetBrains WebStorm.
 * User: larrylefever
 * Date: 4/2/12
 * Time: 2:23 PM
 * To change this template use File | Settings | File Templates.
 */

var CHANNEL_NAME_ADMIN = 'channel-admin'; // for messages from server to ALL clients whether or not in any Game

var SUITS = {
    club: {id: 0, name: 'clubs', color: 'black'},
    spade : {id: 1, name: 'spades', color: 'black'},
    heart: {id: 2, name: 'hearts', color: 'red'},
    diamond: {id: 3, name: 'diamonds', color: 'red'}
};

var ORDINAL_NAMES = [
    'ace-of-', 'two-of-', 'three-of-',
    'four-of-', 'five-of-', 'six-of-',
    'seven-of-', 'eight-of-', 'nine-of-',
    'ten-of-', 'jack-of-', 'queen-of-', 'king-of-'
];

//TODO: REFACTOR these classes (and also Game, within eleusis_server) to avoid unnecessary memory-usage,
//TODO:   thanks to this OOP-strategy apparently causing copying of method-implementations per instance,
//TODO:   rather than their being shared via the "prototype"

function Card(ord, suit) {

    var ordinal = parseInt(ord);
    var suitID = parseInt(suit);
    var suit = getSuitByID(suitID);
    var mapKey = ORDINAL_NAMES[ordinal-1] + suit.name;

    function getSuitByID(suitID) {
        for(var key in SUITS) {
            if(SUITS[key].id == suitID) return SUITS[key];
        }
        return null;
    }

    return {
        getOrdinal: function() {
            return ordinal;
        },
        getSuitID: function() {
            return suitID;
        },
        getSuitName: function() {
            return suit.name;
        },
        getSuitColor: function() {
            return suit.color;
        },
        getMapKey: function() {
            return mapKey;
        },
        toJSON: function() {
            return {ordinal: ordinal, suitID: suitID};
        }
    };

} // end Card


function UserClientState(theName, theHand) {

    var username = null;
    var hand =  null;
    var handLoc = null; // set only upon game-creation (as firstPlayer) or upon game-entrance

    if(arguments.length == 1) { // assuming unmarshalling
        var playerData = arguments[0];
        username = playerData.username;
        var tmpHand = playerData.hand;
        handDataToHand(tmpHand);
    } else {
        username = theName;
        handDataToHand(theHand);
    }

    function handDataToHand(handData) {
        var handAry = {};
        for(var mapKey in handData) {
            handAry[mapKey] = new Card(handData[mapKey].ordinal, handData[mapKey].suitID);
        }
        hand = handAry;
    }

    return {
        toJSON: function() {
            var handAry = {};
            for(var mapKey in hand) {
                handAry[mapKey] = hand[mapKey].toJSON();
            }
            return {username: username, hand: handAry};
        },
        getUserName: function() {
            return username;
        },
        getHand: function() {
            return hand;
        },
        removeFromHand: function(card) {

        },
        addToHand: function(card) {
            hand[card.getMapKey()] = card;
        },
        setHandLoc: function(theHandLoc) {
            handLoc = theHandLoc;
        },
        getHandLoc: function() {
            return handLoc;
        }
    };
}

function TurnQueue() {

    var players = [];
    var currTurnPlayerIdx = 0;
    var gameOver = false;

    return {
        addPlayer: function(player) {
            players.push(player);
        },
        removePlayer: function(player) {
            var tmpPlayers = [];
            for(var i = 0; i < players.length; i++) {
                if(players[i].getUserName() == player.getUserName()) continue;
                tmpPlayers.push(players[i]);
            }
            players = tmpPlayers;
        },
        getCurrTurnPlayer: function() {
            return players[currTurnPlayerIdx];
        },
        nextTurn: function() {
            currTurnPlayerIdx = (currTurnPlayerIdx + 1) % players.length;
        },
        setGameOver: function() {
            gameOver = true;
        },
        isGameOver: function() {
            return gameOver;
        }
    };
}

function GameClientState(gameID, theName, theCommon, thePlayers) {

    var id = null;
    var name = null;
    var common = null;
    var players = {}; // hash-table of UserClientState
    var turnQ = new TurnQueue();


    if(arguments.length == 1) { // assuming unmarshalling
        var gameData = arguments[0];
        id = gameData.id;
        name = gameData.name;

        var commonData = gameData.common;
        var commonAry = [];
        for(var i in commonData) {
            commonAry.push(new Card(commonData[i].ordinal, commonData[i].suitID));
        }
        common = commonAry;

        var playerDatas = gameData.players;
        var playerMap = {};
        for(var username in playerDatas) {
            var playerData = playerDatas[username];
            var player = new UserClientState(playerData);
            playerMap[username] = player;
            turnQ.addPlayer(player);
        }
        players = playerMap;

    } else {
        id = gameID;
        name = theName;
        common = theCommon;
        players = thePlayers; // hash-table
        var player = null;
        for(var username in players) {
            player = players[username];
        }
        turnQ.addPlayer(player);
    }

    return {
        toJSON: function() {
            return {id: id, name: name, common: common, players: players};
        },
        getId: function() {
            return id;
        },
        getName: function() {
            return name;
        },
        getCommon: function() {
            return common;
        },
        getPlayers: function() {
            return players;
        },
        addToCommon: function() {
            //TODO: using getCommon() instead
        },
        addPlayer: function(user) {
            players[user.getUserName()] = user;
            turnQ.addPlayer(user);
        },
        removePlayer: function() {
            //TODO: implement!
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
        }
    };
}


