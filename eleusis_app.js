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




    function RuleGuessParserHelper() {

        this.binaryBooleans = {
            and: " && ",
            "while": " && ",
            but: " && ",
            or: " || "
        };

        this.relationals = {
            equal: "= ",
            same: "= ",
            greater: "> ",
            less: "< ",
            different: "!= "
        };

        this.arithmetics = {
            sum: " + ",
            product: " * "
        };
    }

    RuleGuessParserHelper.prototype.handleNumericCardPhrase = function(yy, card, cardTraitNumeric) {
        //console.log("yy.foo: " + yy.foo);
        var card = card.substring(0, card.indexOf("'"));
        var trait = '.getOrdinal()';
        yy.cardTrait = trait;
        //console.log("cardTrait: " + yy.cardTrait);
        return card + trait;
    };


    RuleGuessParserHelper.prototype.handleStringCardPhrase = function(yy, card, cardTraitString) {
        var card = card.substring(0, card.indexOf("'"));
        var trait = cardTraitString;
        //console.log("cardTrait: " + yy.cardTrait);
        trait = '.get' + trait.charAt(0).toUpperCase() + trait.substring(1) + '()';
        yy.cardTrait = trait;
        return card + trait;
    };

    RuleGuessParserHelper.prototype.getBinaryBooleanSymbol = function(r) {
        return this.binaryBooleans[r];
    };

    RuleGuessParserHelper.prototype.getRelationalSymbol = function(verbPhrase, r) {
        if(r == 'different') {
            return this.relationals['different'];
        }
        if(r == 'greater' || r == 'less') {
            return this.relationals[r];
        }
        if(verbPhrase == '=' || verbPhrase == '!') {
            return verbPhrase + this.relationals['equal'];
        }

        //TODO: handle "not greater than", "not less than" ?

        return this.relationals[r];
    };

    RuleGuessParserHelper.prototype.getArithmeticSymbol = function(a) {
        return this.arithmetics[a];
    };

    RuleGuessParserHelper.prototype.getMethodForCardTraitStringPlural = function(p) {
        if(p == "suitColors") {
            return ".getSuitColor()";
        } else if(p == "suitNames") {
            return ".getSuitName()";
        } else {
            return "unknownMethod()";
        }
    };


/////////////////////////////////////////////////////////

    ruleGuessParser.yy.parserHelper = new RuleGuessParserHelper();

    var eleusis = new EleusisClient($(location).attr('host'), ruleGuessParser);

    $.ajaxSetup({
        cache: false
    });

    //TODO: in case of browser-reload, execRemote to check for current User in any Game and init accordingly;
    //TODO:   however, once page reloaded, won't have any variables set anymore at this point; so, would need
    //TODO:   to get current User's identity from cookie (via client-side JS)

    $('#newGameName').val(''); // partly to address FireFox bug putting (or leaving) some other value in here

    $('#currGameName').empty();

    $('#guessResult').empty();
    $('#guessedRuleDescr').empty();
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
        width: 600,
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
        var guessContent = $('#guessContent').val();
        guessContent = {
            guessContent: guessContent,
            gameID: eleusis.getGameID()
        };
        eleusis.guessRule(guessContent);
    });


    $('#viewJSBtn').click(function() {
        $('#guessContentEngDiv').css('display', 'none');
        $('#guessContentDiv').css('display', 'block');

        eleusis.englishToJS($('#guessContentEng').val());
    });

    $('#viewEngBtn').click(function() {
        $('#guessContentEngDiv').css('display', 'block');
        $('#guessContentDiv').css('display', 'none');
    });


    $('#ruleGuessBtn').click(function() {
//        if(eleusis.assertShowModal('#guessRuleModal')) {
            $('#guessRuleModal').dialog('open');
//        }
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

    eleusis.fillGamesList();
});
