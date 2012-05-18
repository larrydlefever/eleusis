/**
 * Created by JetBrains WebStorm.
 * User: larrylefever
 * Date: 4/4/12
 * Time: 2:30 PM
 * To change this template use File | Settings | File Templates.
 */

function EleusisClient(theHost) {

    //NOTE: assuming using cards.png
    var SPRITE_OFFSET_X_INCREMENT = '73';
    var SPRITE_OFFSET_Y_INCREMENT = '98';

    var host = theHost;
    var adminChannel = null;
    var currGame = null;
    var currGameChannel = null; //TODO: put this into currGame?
    var myUsername = null;


    function log(msg) {
        if(window.console) {
            console.log(msg);
        }
    }

    log("EleusisClient ctor: using host: " + host);

    var pubSubClient = new Faye.Client('http://' + host + '/eleusisGames', {
        retry: 5
    });

    (function subscribeToAdminChannel() {
        log("subscribeToAdminChannel ...");
        adminChannel = pubSubClient.subscribe(
            '/eleusisGames/' + CHANNEL_NAME_ADMIN,
            defaultGameChannelCallback //NOTE: using this one for now (same as for Games)
        );
        log(adminChannel);
        adminChannel.errback(function(error) {
            log("adminChannel: subscription-error:");
            log(error);
        });
    })(); // invoking immediately


    function subscribeToGameChannel(gameClientState) {
        log("subscribeToGameChannel: subscribing to: " + gameClientState.getId());
        currGameChannel = pubSubClient.subscribe(
            '/eleusisGames/' + gameClientState.getId(), defaultGameChannelCallback);
        log(currGameChannel);
        currGameChannel.errback(function(error) {
            log("currGameChannel: subscription-error:");
            log(error);
        });
    }

    function defaultGameChannelCallback(msg) {
        log("defaultGameChannelCallback ...");
        log(msg);
        evtHandlers[msg.handler](msg);
    }

///////////////////////// remote event-handlers //////////////////////////

    var evtHandlers = {
        playerJoinedGame: playerJoinedGame,
        playerPlayedCard: playerPlayedCard,
        playerGuessedRule: playerGuessedRule,
        playerSeesRule: playerSeesRule,
        playerSentChatMsg: playerSentChatMsg,
        playerLeftGame: playerLeftGame,
        playerCreatedGame: playerCreatedGame,
        playerClaimedNoPlay: playerClaimedNoPlay,
        playerGuessCheckAsync: playerGuessCheckAsync,
        playerReleasedTurn: playerReleasedTurn,
        gameDeleted: gameDeleted
    };


    function gameDeleted(msg) {
        setMsg("#serverMsgs", msg.msg);
        //TODO: calling like this (with invoke), because no access here to the "public" method fillGamesList()
        invoke('getGames', null); // to refresh the list
    }

    function playerReleasedTurn(msg) {
        if(msg.callerUname != myUsername) {
            if(msg.gameOver) {
                doSetGameOver();
            } else {
                doNextTurn();
            }
        }
    }

    function playerGuessCheckAsync(msg) {

        log("playerGuessCheckAsync: ...");
        log(msg);

        if(msg.callerUname == myUsername) {
            setMsg('#guessResult', msg.statusMsg, true);
        }

        if(msg.status == 'FAILED') {

            var seq = [
                new Card(msg.cardSeq[0].ordinal, msg.cardSeq[0].suitID),
                new Card(msg.cardSeq[1].ordinal, msg.cardSeq[1].suitID)
            ];

            if(msg.mysteryRuleAccepts === true) {
                updateSequencesUI('#hyposAccepted', seq);
            } else {
                updateSequencesUI('#hyposRejected', seq);
            }

            setMsg('#serverMsgs', "for " + msg.callerUname + "'s rule-guess: eleusis-response: " + msg.statusMsg);

            if(msg.callerUname == myUsername) {
                doNextTurnWithRemote();
            }
        } else {
            $('#guessedRuleDescr').html(msg.ruleDescr);
            setMsg('#serverMsgs', "for " + msg.callerUname + "'s rule-guess: eleusis-response: " + msg.statusMsg);
            doSetGameOverWithRemote(true);
        }
    }

    function playerCreatedGame(msg) {
        /*  TODO: myUsername not available yet here (because not in a Game yet);
            TODO:   would need to read cookie via client-side code
        var userMsg = (myUsername != msg.callerUname) ?
            (msg.msg + "; you may join it via the 'Join Game' list") : msg.msg;
        */
        setMsg('#serverMsgs', msg.msg);
        $('#gameChoices').append($("<option/>", {
            value: msg.gameData.id,
            text: msg.gameData.name
        }));
    }

    function clearGameUI() {

        $('div#cards-player-left > div[class |= "card"]').remove();
        closeOtherPlayer('player-left');

        $('#common').empty();

        $('div#cards-player-right > div[class |= "card"]').remove();
        closeOtherPlayer('player-right');

        $('#cards').empty();

        $('#guessResult').empty();
        $('#guessedRuleDescr').empty();
        $('#guessContent').val('');

        $('#guesses').empty();

        // in "Show Rule"
        $('#ruleDescription').empty();
        $('#ruleContent').val('');

        $('#failedSequences').empty();

        $('#hyposAccepted').empty();
        $('#hyposRejected').empty();
    }

    function playerLeftGame(msg) {
        if(msg.callerUname == myUsername) {
            currGameChannel.cancel(); // unsubscribe from current game's channel
            currGame = null; //TODO: possible race-condition with setting this; maybe guard with gameID-check
            clearGameUI();
        } else {
            setMsg('#serverMsgs', msg.msg);

            var players = currGame.getPlayers();
            var playerToRemove = players[msg.callerUname];
            currGame.removePlayer(playerToRemove);
            log("playerLeftGame: removed " + msg.callerUname + " from game " + currGame.getName());

            var handLoc = playerToRemove.getHandLoc();
            $('div#cards-' + handLoc + ' > div[class |= "card"]').remove();
            log("playerLeftGame: removed the cards of " + msg.callerUname + " from area: cards-" + handLoc);

            closeOtherPlayer(handLoc);
            log("playerLeftGame: closed " + msg.callerUname + "'s area");
        }
    }

    function playerSentChatMsg(msg) {
        setMsg('#serverMsgs', msg.msg);
    }

    function playerJoinedGame(msg) {

        log("playerJoinedGame: player " + msg.player.username + "; gameID: " + msg.gameID);
        log("playerJoinedGame: hand.length: " + Object.keys(msg.player.hand).length);

        var userClientState = new UserClientState(msg.player.username, msg.player.hand);
        currGame.addPlayer(userClientState);

        var numPlayers = currGame.getPlayers().length;

        var idx = numPlayers > 2 ? 1 : 0; // my own idx is zero, but this refers to which of the other two to use
        var handLoc = getHandLayoutLocForPlayerIdx(0, idx);

        userClientState.setHandLoc(handLoc);

        log("setting cards for " + msg.player.username + " at handLoc " + handLoc);

        var hand = userClientState.getHand();

        for(var mapKey in hand) {
            var card = hand[mapKey];
            setCardInHand(card, mapKey, handLoc);
        }

        openOtherPlayer(handLoc, msg.player.username);
        setMsg('#serverMsgs', msg.msg);
    }

    function playerPlayedCard(msg) {

        if(msg.callerUname != myUsername) {

            var card = new Card(msg.card.ordinal, msg.card.suitID);

            if(msg.status == 'OK') {
                var player = currGame.getPlayers()[msg.callerUname];
                var hand = player.getHand();
                var cardToRemove = hand[card.getMapKey()];
                delete hand[card.getMapKey()];
                removeCardFromHand(player.getHandLoc(), card);
                log("playerPlayedCard: removed " + cardToRemove.getMapKey() + " from hand of " + msg.callerUname);
                currGame.getCommon().push(card);
                addCardToCommon(card, true);
                log("playerPlayedCard: added " + card.getMapKey() + " to common");
            } else {
                var cards = [
                    new Card(msg.cardSeq[0].ordinal, msg.cardSeq[0].suitID),
                    new Card(msg.cardSeq[1].ordinal, msg.cardSeq[1].suitID)
                ];
                updateSequencesUI('#failedSequences', cards);
            }
        }

        setMsg('#serverMsgs', msg.msg + "; eleusis-response: " + msg.status + "; " + msg.reason);
    }

    function playerGuessedRule(msg) {
        setMsg('#serverMsgs', msg.msg + "; eleusis-response: " + msg.statusMsg);
        var ruleArea = $('<textarea rows="5" cols="75"></textarea>');
        ruleArea.text(msg.guessContent);
        ruleArea.prependTo('#guesses');
    }

    function playerSeesRule(msg) {
        setMsg('#serverMsgs', msg.msg);
        if(msg.callerUname == myUsername) {
            doSetGameOverWithRemote(false);
        } else {
            doSetGameOver(false);
        }
    }

    function playerClaimedNoPlay(msg) {

        log("playerClaimedNoPlay ...");
        var player = currGame.getPlayers()[msg.callerUname];
        var card = msg.drawOrPlayResult.card;
        card = new Card(card.ordinal, card.suitID);

        if(msg.drawOrPlayResult.drawn) {
            //TODO: albeit as a kludge, to help ensure no race-condition problems
            //TODO:  with out-of-turn updates (by others) to common, could pass back to here 'latestCommon', though
            //TODO:  that shouldn't be necessary, since remote nextTurn-call happens not until end of this method
            var latestCommon = currGame.getCommon()[currGame.getCommon().length-1];
            var hand = player.getHand();

            for(var key in hand) {
                var c = hand[key];
                var seq = [latestCommon, c];
                updateSequencesUI('#failedSequences', seq);
            }

            player.addToHand(card);
            setCardInHand(card, card.getMapKey(), player.getHandLoc());
        } else {
            doPlayCardForPlayer(player, card);
        }
        setMsg("#serverMsgs", msg.msg);

        if(msg.callerUname == myUsername) {
            doNextTurnWithRemote();
        }
    }

//////////////////////// end remote event-handlers ///////////////////////



    function getHandLayoutLocForPlayerIdx(myIdx, idx) {
        if(myIdx == 0) {
            if(idx == 0) return 'player-left';
            if(idx == 1) return 'player-right';
            log("ERROR: getHandLayoutLocForPlayerIdx: idx out of range: " + idx);
        } else {
            log("ERROR: getHandLayoutLocForPlayerIdx: myIdx out of range: " + myIdx);
        }
        return -1;
    }

    //TODO: where appropriate (which is in most cases), refactor away each of these "handle..." method
    //TODO:  counterparts of the "evt-handlers" above; these are mostly a remnant of version prior to
    //TODO:  use of Faye pub/sub framework

    var cmds = {
        getGames: handleGetGames,
        joinGame: handleJoinGame,
        startGame: handleStartGame,
        playCard: handlePlayCard,
        guessRule: handleGuess,
        marshal: handleMarshal,
        getChosenRule: handleGetChosenRule,
        sendChatMsg: handleSendChatMsg,
        claimNoPlay: handleClaimNoPlay,
        nextTurn: handleNextTurn
    };

    function invoke(cmd, dataToPOST) {
        var callback = cmds[cmd];
        execRemote(cmd, dataToPOST, callback);
    }

    function execRemote(cmd, dataToPOST, callback) {
        var data = {cmd: cmd, dataPosted: dataToPOST};
        var dataStr = dataToPOST != null ? JSON.stringify(data) : data;
        var httpMethod = dataToPOST != null ? "POST" : "GET";
        var contentTypeVal = dataToPOST != null ? 'text/json': 'application/x-www-form-urlencoded';
        $.ajax({
            type: httpMethod,
            url: "exec",
            data: dataStr,
            success: callback,
            contentType: contentTypeVal
        });
    }


    function internalDoNextTurn(withRemote, setGameOver, thereIsAWinner) {

        // withRemote should be true only for the player who's triggering the turn-change

        if(setGameOver) {
            if(!currGame.isGameOver()) {
                currGame.setGameOver();
                var msg = "GAME OVER: the winner is: " +
                    (thereIsAWinner ? currGame.getCurrTurnPlayer().getUserName() : "the dealer");
                log(msg);
                setMsg("#serverMsgs", msg);
            }
        } else {
            currGame.nextTurn();
            var msg = "it's now " + currGame.getCurrTurnPlayer().getUserName() + "'s turn";
            log(msg);
            setMsg("#serverMsgs", msg);
        }

        if(!currGame.isGameOver()) {
            if(withRemote) {
                var dataToPost = {
                    gameID: currGame.getId(),
                    gameOver: setGameOver
                };
                invoke('nextTurn', dataToPost);
            }
        }
    }

    function doNextTurn() {
        internalDoNextTurn(false);
    }

    function doNextTurnWithRemote() {
        internalDoNextTurn(true);
    }

    function doSetGameOver(thereIsAWinner) {
        internalDoNextTurn(false, true, thereIsAWinner);
    }

    function doSetGameOverWithRemote(thereIsAWinner) {
        internalDoNextTurn(true, true, thereIsAWinner);
    }

    function handleNextTurn(data) {
        log("handleNextTurn: (apparently) successful");
        //NOTE: these "handle" callbacks are gradually being superceded by their evt-handler counterparts;
        //  i.e., here we just confirm the round-trip of the call from the client-side; the 'handling' should
        //  generally happen in the evt-handler counterpart
    }

    function handleSendChatMsg(data) {
        log("handleSendChatMsg: (apparently) successful");
    }

    function handleGetChosenRule(data) {
        log("handleGetChosenRule ...");
        log(data);
        var rule = data.result.getChosenRuleResult.rule;
        var ruleDescr = data.result.getChosenRuleResult.ruleDescr;
        var actionMsg = data.result.getChosenRuleResult.actionMsg;
        $('#ruleDescription').html(ruleDescr);
        $('#ruleContent').val(rule);
    }

    function handleMarshal(data) {
        log("handleMarshal ...");
        var gameData = data.result.marshalResult.game;
        var gameClientState = new GameClientState(gameData);
        log("gameClientState.getCommon()[0].ordinal: " + gameClientState.getCommon()[0].getOrdinal());
        var player1 = gameClientState.getPlayers()['player-1'];
        log("player1.getUsername(): " + player1.getUserName());
    }

    function handleClaimNoPlay(data) {
        log("handleClaimNoPlay: (handled entirely in playerClaimedNoPlay)");
    }

    function handleGuess(data) {
        var statusMsg = data.result.guessRuleResult.statusMsg;
        var actionMsg = data.result.guessRuleResult.actionMsg;
        //NOTE: this is always just a "PENDING" message: purely messaging
        setMsg('#guessResult', statusMsg, true);
    }

    function doPlayCardForPlayer(user, playedCard) {
        var player = currGame.getPlayers()[user.getUserName()];
        var hand = player.getHand();
        log("doPlayCardForPlayer: hand:");
        log(hand);

        var cardToRemove = hand[playedCard.getMapKey()];
        delete hand[playedCard.getMapKey()];
        removeCardFromHand(player.getHandLoc(), playedCard);
        log("doPlayCardForPlayer: removed cardToRemove: " + cardToRemove.getMapKey());

        currGame.getCommon().push(playedCard);
        log("doPlayCardForPlayer: added to common: " + playedCard.getMapKey());
        addCardToCommon(playedCard, true);
    }

    function updateSequencesUI(seqID, cardSeq) {

        var card1 = cardSeq[0];
        var card2 = cardSeq[1];

        var rowID = seqID + "-row-" + card1.getMapKey() + "-" + card2.getMapKey();
        if($(seqID + ' > ' + rowID).length > 0) return;

        var nowTS = new Date().getTime();
        var dividerDiv = $('<div style="clear:both"/>').appendTo(seqID);
        var rowDiv = $('<div />', {id: rowID});
        rowDiv.appendTo(seqID);

        $('<div/>', {
            id: seqID + '-' + card1.getMapKey() + "-" + nowTS,
            class: 'card',
            style: getBgPosForCard(card1)
        }).appendTo(rowDiv);

        $('<div/>', {
            id: seqID + '-' + card2.getMapKey() + "-" + nowTS,
            class: 'card',
            style: getBgPosForCard(card2)
        }).appendTo(rowDiv);
    }

    function handlePlayCard(data) {
        log("handling playCard callback ...");
        var status = data.result.playCardResult.status;
        var reason = data.result.playCardResult.reason;
        var playedCard = data.result.playCardResult.playedCard;
        playedCard = new Card(playedCard.ordinal, playedCard.suitID);
        var actionMsg = data.result.playCardResult.actionMsg;

        if(status == 'OK') {
            log("playedCard: ordinal=" + playedCard.getOrdinal() + "; suitID=" + playedCard.getSuitID());
            var player = currGame.getPlayers()[myUsername];
            doPlayCardForPlayer(player, playedCard);
        } else {
            var rejectedSeq = data.result.playCardResult.cardSeq;
            var cards = [
                new Card(rejectedSeq[0].ordinal, rejectedSeq[0].suitID),
                new Card(rejectedSeq[1].ordinal, rejectedSeq[1].suitID)
            ];
            updateSequencesUI('#failedSequences', cards);
        }

        doNextTurnWithRemote();
    }

    function handleGetGames(data) {
        log("handleGetGames ...");
        var gameDatas = data.result.getGamesResult.games;
        $('#gameChoices').empty();
        $('#gameChoices').append($("<option/>", {
            value: '#',
            text: 'Join Game'
        }));
        $.each(gameDatas, function(key, gameData) {
            $('#gameChoices').append($("<option/>", {
                value: key,
                text: gameData.name
            }));
            log("added game-choice: " + gameData.name);
        });
    }

    function handleJoinGame(data) {

        var gameData = data.result.joinGameResult.game;
        log(gameData);

        var gameClientState = new GameClientState(gameData);
        log(gameClientState);

        currGame = gameClientState;

        var callerUname = data.result.joinGameResult.callerUname;
        log("handleJoinGame: callerUname: " + callerUname);
        myUsername = callerUname;

        var players = gameClientState.getPlayers();

        //NOTE: hack: falling back here on simpler way to manage this -- for now (see below)
        var idx = 0;

        for(var username in players) {

            var player = players[username];
            var hand = player.getHand();

            // if it's my own hand, then it goes in the main area; else in either
            // of the dynamically sizable areas to the left or to the right
            var handLoc = (username === callerUname) ? "" : getHandLayoutLocForPlayerIdx(0, idx);
            player.setHandLoc(handLoc);

            log("setting cards for " + username + " at handLoc " + handLoc);

            for(var mapKey in hand) {
                var card = hand[mapKey];
                setCardInHand(card, mapKey, handLoc);
            }

            if(username !== callerUname) {
                openOtherPlayer(handLoc, username);
                idx++;
            }
        }

        var common = gameClientState.getCommon();
        for(var i = 0; i < common.length; i++) {
            addCardToCommon(common[i]);
        }

        subscribeToGameChannel(gameClientState);

        setMsg("#currGameName", gameClientState.getName(), true);
    }

    function setFirstCommonCard(card) {
        log("setFirstCommonCard: firstCard: ordinal: " + card.getOrdinal() + "; suiteID: " + card.getSuitID());
        $('<div/>', {
            id: card.getMapKey(),
            class: 'card',
            style: getBgPosForCard(card)
        }).appendTo('#common');
    }

    function setCardInHand(card, index, handLoc) {

        var containerID = (handLoc) ? '#cards-' + handLoc : "#cards";
        log("setCardInHand: containerID: " + containerID);

        var cardID = card.getMapKey();
        log("setCardInHand: cardID: " + cardID);
        log(cardID + ": ordinal=" + card.getOrdinal() + "; suitID=" + card.getSuitID());

        var cardClass = handLoc ? ((handLoc == 'player-left') ? "card-left" : "card-right") : "card";

        $('<div/>', {
            id: cardID,
            class: cardClass,
            style: getBgPosForCard(card)
        }).appendTo(containerID);

        if(cardClass === 'card') {// only my cards are playable by me
            setPlayCardHdlr($('#' + cardID));
        }
    }

    function handleStartGame(data) {

        log("handleStartGame: handling startGame ...");

        log("startGameResult: status " +
            data.result.startGameResult.status +
            "; msg: " + data.result.startGameResult.msg +
            "; callerUname: " + data.result.startGameResult.callerUname
        );

        if(data.result.startGameResult.status == 'ERROR') {
            setMsg('#serverMsgs', data.result.startGameResult.msg);
            return;
        }

        var gameData = data.result.startGameResult.game;
        log(gameData);

        var gameClientState = new GameClientState(gameData);
        log(gameClientState);

        currGame = gameClientState;

        var callerUname = data.result.startGameResult.callerUname;
        myUsername = callerUname;

        var handLoc = ""; // default loc (bottom); TODO: should probably be explicit about this (i.e., "cards")
        var firstPlayer = gameClientState.getPlayers()[callerUname];
        firstPlayer.setHandLoc(handLoc);

        var hand = firstPlayer.getHand();

        for(var mapKey in hand) {
            var card = hand[mapKey];
            setCardInHand(card, mapKey, handLoc);
        }

        var firstCommonCard = gameClientState.getCommon()[0];
        setFirstCommonCard(firstCommonCard);

        subscribeToGameChannel(gameClientState);

        setMsg("#currGameName", gameClientState.getName(), true);
    }

    function getBgPosForCard(card) {
        var ordinal = card.getOrdinal() - 1;
        var ordOffset_x = ordinal * SPRITE_OFFSET_X_INCREMENT;
        log("ordOffset_x=" + ordOffset_x);
        var ordOffset_y = card.getSuitID() * SPRITE_OFFSET_Y_INCREMENT;
        log("ordOffset_y=" + ordOffset_y);
        var bgPos = 'background-position: -' + ordOffset_x + 'px -' + ordOffset_y + 'px';
        log("bgPos=" + bgPos);
        return bgPos;
    }

    //TODO: do this (possibly in only one or two lines) with JQuery.animate() ?
    function flashAMsg(divID) {
        log("flashAMsg for ID: " + divID);
        setTimeout(function(){
            var myDivID = divID;
            setMsgFlash(myDivID, 2);
        }, 250);
    }

    function setMsgFlash(divID, times) {
        divID = "#"+divID;
        $(divID).addClass('msgFlash');
        //log("setMsgFlash: div with id " + divID + " has msgFlash: " + $(divID).hasClass('msgFlash'));
        setTimeout(function(){
            var myDivID = divID;
            unsetMsgFlash(myDivID, 2);
        }, 1000);
    }

    function unsetMsgFlash(divID, times) {
        $(divID).removeClass('msgFlash');
    }

    function setMsg(id, msg, empty) {
        var hr = "<hr/>";
        if(empty) {
            $(id).empty();
            hr = "";
        }
        var newMsgDivID = 'msg_' + (new Date().getTime());
        var newMsgDiv = $('<div id="' + newMsgDivID + '">' + msg +  hr + '</div>', {});
        newMsgDiv.appendTo(id);
        $(id).animate({ scrollTop: $(id).prop("scrollHeight") }, 1000);
        flashAMsg(newMsgDivID);
    }

    function flashACard(card) {
        setTimeout(function(){
            var myCard = card;
            setCardFlash(myCard.getMapKey(), 4);
        }, 300);
    }

    function setCardFlash(divID, times) {
        $('#' + divID).addClass('cardFlash');
        if(times == 1) return;
        setTimeout(function(){
            var myDivID = divID;
            var myTimes = --times;
            unsetCardFlash(myDivID, myTimes);
        }, 300);
    }

    function unsetCardFlash(divID, times) {
        $('#' + divID).removeClass('cardFlash');
        if(times == 1) return;
        setTimeout(function(){
            var myDivID = divID;
            var myTimes = --times;
            setCardFlash(myDivID, myTimes);
        }, 300);
    }

    function setPlayCardHdlr(jqCard) {

        jqCard.click(function() {

            if(!assertIsMyTurn()) return;
            var idx = $(this).attr('id');
            var players = currGame.getPlayers();
            var player = players[myUsername];
            var playedCard = player.getHand()[idx]
            log("card-click: playedCard: " + playedCard.getMapKey());
            var latestCommon = currGame.getCommon()[currGame.getCommon().length-1];
            setMsg('#serverMsgs', "local-message: playing " +
                playedCard.getMapKey() + " on " + latestCommon.getMapKey() + " ...");

            //TODO: maybe send only mapKey?
            var dataToPost = {
                playedCard: playedCard.toJSON(),
                gameID: currGame.getId(),
                //TODO: FIXME: all this callerUname stuff (here and elsewhere) is redundant,
                //TODO:   thanks to server-side login-check, which makes calling-user available to all(?) commands
                callerUname: myUsername
            };
            invoke('playCard', dataToPost);
        });
    }

    function addCardToCommon(card, flashIt) {
        flashIt =  (typeof flashIt == 'undefined' ) ? false : ((flashIt === true) ? true : false);
        var cardID = card.getMapKey();
        $('<div/>', {
            id: cardID,
            class: 'card',
            style: getBgPosForCard(card)
        }).appendTo('#common');

        if(flashIt) flashACard(card);
    }

    function removeCardFromHand(handLoc, card) {
        var containerID = handLoc ?
            (handLoc == 'player-left' ? '#cards-player-left' : '#cards-player-right') : '#cards';
        log("removeCardFromHand: card.getMapKey(): " + card.getMapKey() + "; containerID: " + containerID);
        var cardID = "#" + card.getMapKey();
        $(containerID + " > " + cardID).remove();
    }

    function getPlayerAreaWidth(id) {
        var widthStr = $(id).css('width');
        var width = widthStr.substring(0, widthStr.indexOf('px'));
        return parseInt(width);
    }

    function updateDivWidth(id, delta, limit) {
        var width = getPlayerAreaWidth(id);
        width += delta;
        var widthStr = width + 'px';
        $(id).css('width', widthStr);

        if((delta < 0 && width > limit) || (delta > 0 && width < limit)) {
            setTimeout(function(){
                var myId = id;
                var myDelta = delta;
                var myLimit = limit;
                updateDivWidth(myId, myDelta, myLimit);
            }, 15);
        }
    }

    var PLAYER_AREA_OPEN_WIDTH = 125;
    var PLAYER_AREA_CLOSED_WIDTH = 1;

    function openPlayerLeft(username) {
        $('#player-left-uname').html(username);
        updateDivWidth('#cards-player-left', 2, PLAYER_AREA_OPEN_WIDTH);
        updateDivWidth('#common', -2, 660);
    }

    function closePlayerLeft() {
        var areaWidth = getPlayerAreaWidth('#cards-player-left');
        log("closePlayerLeft: areaWidth: " + areaWidth);
        //TODO: kludge! under-the-hood rounding-error?
        if((PLAYER_AREA_OPEN_WIDTH - areaWidth) > 5) {
            log("closePlayerLeft: already closed");
            return;
        }
        updateDivWidth('#cards-player-left', -2, PLAYER_AREA_CLOSED_WIDTH);
        updateDivWidth('#common', 2, 660);
    }

    function openPlayerRight(username) {
        //TODO: enable this
        //$('#player-right-uname').val(username);
        updateDivWidth('#cards-player-right', 2, PLAYER_AREA_OPEN_WIDTH);
        updateDivWidth('#common', -2, 535);
    }

    function closePlayerRight() {
        //TODO: kludge! under-the-hood rounding-error?
        if(PLAYER_AREA_OPEN_WIDTH - getPlayerAreaWidth('#cards-player-right') > 5) {
            log("closePlayerRight: already closed");
            return;
        }
        updateDivWidth('#cards-player-right', -2, PLAYER_AREA_CLOSED_WIDTH);
        updateDivWidth('#common', 2, 535);
    }

    var playerOpenfuncs = {'player-left': openPlayerLeft, 'player-right': openPlayerRight};
    var playerClosefuncs = {'player-left': closePlayerLeft, 'player-right': closePlayerRight};

    function openOtherPlayer(handLoc, username) {
        playerOpenfuncs[handLoc](username);
    }

    function closeOtherPlayer(handLoc) {
        playerClosefuncs[handLoc]();
    }

    function assertIsMyTurn() {
        if(currGame.getCurrTurnPlayer().getUserName() != myUsername) {
            setMsg("#serverMsgs", "it's not your turn; it's " +
                currGame.getCurrTurnPlayer().getUserName() + "'s turn");
            return false;
        }
        return true;
    }

    return {
        setMsg: function(msg) {
            setMsg('#serverMsgs', msg);
        },
        assertShowModal: function(modalName) {
            if(modalName == '#guessRuleModal') {
                if(!currGame) {
                    setMsg("#serverMsgs", "ERROR: There's nothing to guess, since you're not in a game yet.");
                    return false;
                }
                if(currGame.isGameOver()) {
                    setMsg("#serverMsgs",
                        "ERROR: The game is over. There's no use in guessing, " +
                            "because the rule has either already been guessed or has already been seen.");
                    return false;
                }
                if(!assertIsMyTurn()) return false;

                //TODO: maybe fix this so you can have a "Nothing-Goes" mystery-rule
                if(currGame.getCommon().length < 2) {
                    setMsg("#serverMsgs",
                        "ERROR: There's no basis for any guesses, because nobody has played any cards yet.");
                    return false;
                }
                return true;
            } else if(modalName == '#showRuleModal') {
                if(!currGame) {
                    setMsg("#serverMsgs", "ERROR: There's no rule yet, since you're not in a game yet.");
                    return false;
                }
                if(!currGame.isGameOver()) {
                    if(!assertIsMyTurn()) return false;
                    //NOTE: if game over, we let anybody view the rule, regardless of turn
                }
                return true;
            } else if(modalName == '#showGuessesModal') {
                if(!currGame) {
                    setMsg("#serverMsgs", "ERROR: There are no relevant guesses, since you're not in a game yet.");
                    return false;
                }
                return true;
            } else {
                return true; // we don't care which modal it is -- no constraints
            }
        },
        fillGamesList: function() {
            invoke('getGames', null);
        },
        joinGame: function(dataToPost) {
            invoke('joinGame', dataToPost);
        },
        startGame: function(dataToPost) {
            invoke('startGame', dataToPost);
        },
        claimNoPlay: function(dataToPost) {
            if(!currGame) {
                setMsg("#serverMsgs", "ERROR: You're not in a game yet.");
                return;
            }
            if(currGame.isGameOver()) {
                setMsg("#serverMsgs",
                    "ERROR: The game is over. You cannot play in this game anymore.");
                return;
            }
            if(!assertIsMyTurn()) return;
            invoke('claimNoPlay', dataToPost);
        },
        guessRule: function(guessContent) {
            //TODO: FIXME: all this callerUname stuff (here and elsewhere) is redundant,
            //TODO:   thanks to server-side login-check, which makes calling-user available to all(?) commands
            guessContent['callerUname'] = myUsername;
            guessContent['gameID'] = currGame.getId();
            invoke('guessRule', guessContent);
        },
        getGameID: function() {
            if(!currGame) return null;
            return currGame.getId();
        },
        getChosenRule: function() {
            var dataToPost = {
                gameID: currGame.getId(),
                callerUname: myUsername
            };
            invoke('getChosenRule', dataToPost);
        },
        sendChatMsg: function(dataToPost) {
            invoke('sendChatMsg', dataToPost);
        },
        testMarshal: function() {
            invoke('marshal', null);
        }
    };

} // end EleusisClient

