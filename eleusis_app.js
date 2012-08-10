/**
 * Created by JetBrains WebStorm.
 * User: larrylefever
 * Date: 4/4/12
 * Time: 2:48 PM
 * To change this template use File | Settings | File Templates.
 */

/*
  NOTE: here, could have some programmatic mapping indicating the particular IDs
  of the elements in the HTML-page to be referenced by code in EleusisClient,
  as a kind of Config object for it
*/

$(document).ready(function() {

    function log(m) {
        if(console && console.log) {
            console.log(m);
        }
    }

    var eleusis = new EleusisClient($(location).attr('host'));

    $.ajaxSetup({
        cache: false
    });

    //TODO: in case of browser-reload, execRemote to check for current User in any Game and init accordingly;
    //TODO:   however, once page reloaded, won't have any variables set anymore at this point; so, would need
    //TODO:   to get current User's identity from cookie (via client-side JS)

    $('#newGameName').val(''); // partly to address FireFox bug putting (or leaving) some other value in here

    $('#currGameName').empty();

    $('#guessResult').val('(no result yet)');
    $('#guessedRuleDescr').val('(still unknown)');
    $('#guessContent').val('');

    $('#guesses').empty();

    $('#ruleDescription').empty();
    $('#ruleContent').val('');

    $('#failedSequences').empty();

    $('#hyposAccepted').empty();
    $('#hyposRejected').empty();

    $('#chatMsg').val('Enter Chat Message'); // partly to address FireFox bug putting some other value in here
    $('#chatMsg').focus(function(){
        $(this).val('');
    });
    $('#chatMsg').keydown(function(e) {
        if(e.keyCode == 13) {
            if(!eleusis.getGameID()) {
                alert("ERROR: You must be in a Game to use the Chat-feature.");
                return;
            }
            var dataToPost = {
                gameID: eleusis.getGameID(),
                msg: $(this).val()
            };
            eleusis.sendChatMsg(dataToPost);
            $(this).val('');
        }
    });

    $('#guessRuleModal').dialog({
        autoOpen: false,
        width: 650,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });
    $('#showRuleModal').dialog({
        autoOpen: false,
        width: 600,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });
    $('#showGuessesModal').dialog({
        autoOpen: false,
        width: 690,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });

    $('#failedSequencesModal').dialog({
        autoOpen: false,
        width: 300,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });

    $('#hyposModal').dialog({
        autoOpen: false,
        width: 300,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });

    $('#helpModal').dialog({
        autoOpen: false,
        width: 700,
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });



    $("#gameChoices").change(function() {
        $("select option:selected").each(function() {
            var gameID = $(this).val();
            var dataToPost = {gameID: gameID};
            eleusis.joinGame(dataToPost);
        });
    });
    $('#startGameBtn').click(function() {
        var newGameName = $('#newGameName').val();
        if(!newGameName) {
            eleusis.setMsg("ERROR: New Game's name is required when creating a Game!");
            return;
        }
        //TODO: here and elsewhere provide some kind of 'processing-mode' to prevent double-executions
        eleusis.setMsg("local-message: starting game '" + newGameName + "' ...");
        var dataToPost = {gameName: newGameName};
        eleusis.startGame(dataToPost);
        eleusis.fillGamesList();
    });
    $('#claimNoPlayBtn').click(function() {
        eleusis.setMsg("local-message: claiming 'no play' ...");
        var dataToPost = {gameID: eleusis.getGameID()};
        eleusis.claimNoPlay(dataToPost);
    });

    $('#guessBtn').click(function() {
        log("guessBtn clicked");
        eleusis.initRuleGuess($('#ruleGuessBuilder'));
        eleusis.showRuleGuess();
        eleusis.guessRule();
    });

    $('#ruleGuessBtn').click(function() {
        if(eleusis.assertShowModal('#guessRuleModal')) {
            $('#guessRuleModal').dialog('open');
        }
        return false;
    });
    $('#showRuleBtn').click(function() {
        if(eleusis.assertShowModal('#showRuleModal')) {
            $('#showRuleModal').dialog('open');
            eleusis.getChosenRule();
        }
        return false;
    });
    $('#showGuessesBtn').click(function() {
        if(eleusis.assertShowModal('#showGuessesModal')) {
            $('#showGuessesModal').dialog('open');
        }
        return false;
    });
    $('#showRegectedsBtn').click(function() {
        $('#failedSequencesModal').dialog('open');
        return false;
    });
    $('#showHyposBtn').click(function() {
        $('#hyposModal').dialog('open');
        return false;
    });
    $('#showHelpBtn').click(function() {
        $('#helpModal').dialog('open');
        return false;
    });

    var rulePieceCounter = 1;

    $('#addRulePiece').click(function() {

        var $boolDivClone,
            $clauseClone;

        $boolDivClone = $("#boolDiv-1").clone(false);
        $boolDivClone.css('display', 'block');
        $boolDivClone.find("*[id]").andSelf().each(function() {
                $(this).attr('id',function(i,id) {
                    log("id: " + id);
                    var suffix, uscoreIdx;
                    if((uscoreIdx = id.lastIndexOf('-')) != -1) {
                        log("uscoreIdx: " + uscoreIdx);
                        suffix = id.substring(uscoreIdx+1);
                        if($.isNumeric(suffix)) {
                            log("isNumeric: suffix: " + suffix);
                            id = id.substring(0, uscoreIdx+1) + (parseInt(suffix) + rulePieceCounter);
                        }
                    }
                    log("new id: " + id);
                    return id;
                })
            }
        );

        $clauseClone = $("#clause-1").clone(false);
        $clauseClone.find("*[id]").andSelf().each(function() {
                $(this).attr('id',function(i,id) {
                    log("id: " + id);
                    var suffix, uscoreIdx;
                    if((uscoreIdx = id.lastIndexOf('-')) != -1) {
                        suffix = id.substring(uscoreIdx+1);
                        if($.isNumeric(suffix)) {
                            log("isNumeric");
                            id = id.substring(0, uscoreIdx+1) + (parseInt(suffix) + rulePieceCounter);
                        }
                    }
                    log("new id: " + id);
                    return id;
                })
            }
        );

        rulePieceCounter++; //TODO: be sure to decrement when removing a 'row'

        var $groupDiv;

        if(rulePieceCounter % 2 == 0) { // dealing with second of a pair, of possibly multiple pairs)
            $groupDiv = $('<div/>', {
                id: ("group-" + (rulePieceCounter / 2)),
                style: "width: 623px; border-left-width: 5px;" +
                        "border-right-width: 5px;" +
                        "border-left-style: solid;" +
                        "border-right-style: solid;" +
                        "border-left-color: #FF0000;" +
                        "border-right-color: #FF0000;"
            });
        }

        if($groupDiv) {
            // get most recent 'row' and put it into this new group
            $('#clause-' + (rulePieceCounter-1)).detach().appendTo($groupDiv);
            $boolDivClone.appendTo($groupDiv);
            $clauseClone.appendTo($groupDiv);
            $groupDiv.insertBefore('#addRulePieceDiv');
        } else {
            $boolDivClone.insertBefore('#addRulePieceDiv');
            $clauseClone.insertBefore('#addRulePieceDiv');
        }

        $('#delete-clause-' + (rulePieceCounter-1)).css('visibility', 'hidden');
        $('#delete-clause-' + rulePieceCounter).css('visibility', 'visible');
        $('#num-trait-span-clause-' + rulePieceCounter).show();

    });

    $(document).on('change', "select[id|='op-clause']", function() {
        log("change");
        $("option:selected", this).each(function() {
            log("this.val: " + $(this).val());
            if($(this).val() == "+" || $(this).val() == "-" || $(this).val() == "*") {
                log($(this));
                $(this).parent().siblings("span[id|='num-trait-span']").show();
            } else {
                log($(this));
                $(this).parent().siblings("span[id|='num-trait-span']").hide();
            }
        });
    });

    $(document).on('click', "button[id|='delete-clause']", function() {
        var id = $(this).attr('id');
        id = id.substring(id.lastIndexOf('-')+1);
        log("click on delete: " + id);

        var prevId = parseInt(id) - 1;

        if(prevId > 1) {
            $('#delete-clause-' + prevId).css('visibility', 'visible');
        }
        $('#delete-clause-' + id).css('visibility', 'hidden');

        if($('#boolDiv-' + id).length > 0){
            log("found boolDiv: " + id);
            $('#boolDiv-' + id).remove();
        }

        var $currGroup = $(this).parent().parent().parent();

        $(this).parent().parent().remove();

        if($currGroup) {
            if($currGroup.children().length == 0) {
                $currGroup.remove();
            } else if($currGroup.children().length == 1) {
                var clause = $currGroup.children()[0];
                log(clause);
                $(clause).detach().insertBefore('#addRulePieceDiv');
                $currGroup.remove();
            }
        }

        --rulePieceCounter;
    });


    eleusis.fillGamesList();
});
