/**
 * Created by JetBrains WebStorm.
 * User: larrylefever
 * Date: 4/5/12
 * Time: 2:20 PM
 * To change this template use File | Settings | File Templates.
 */


function EleusisRuleAdmin() {

    function log(msg) {
        if(window.console) {
            console.log(msg);
        }
    }

    var cmds = {
        getRules: handleGetRules,
        addRule: handleAddRule
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

    function handleGetRules(data) {

        var rules = data.result.getRulesResult.rules;
        $('#ruleList').empty();

        for(var i = rules.length-1; i >= 0; i--) {

            var rule = rules[i];

            var ruleName = rule.ruleName;
            log("handleGetRules: ruleName: " + ruleName);

            var ruleAsString = rule.ruleAsString;
            log("handleGetRules: ruleAsString: " + ruleAsString);

            var ruleDescr = rule.descr;
            log("handleGetRules: ruleDescr: " + ruleDescr);

            var newDiv = $('<div/>');

            var ruleNameDiv = $('<div/>');
            ruleNameDiv.html("<b>Rule Name:</b> " + ruleName);
            ruleNameDiv.appendTo(newDiv);

            var ruleDescrDiv = $('<div/>');
            ruleDescrDiv.html("<b>Rule Description:</b><br/>" + ruleDescr);
            ruleDescrDiv.appendTo(newDiv);

            var ruleArea = $('<textarea rows="5" cols="75"></textarea>');
            ruleArea.attr('id', ruleName);
            ruleArea.text(ruleAsString);
            ruleArea.appendTo(newDiv);

            newDiv.appendTo('#ruleList');

            $('#ruleName').val('');
            $('#ruleDescr').val('');
            $('#ruleContent').val('');
        }
    }

    function handleAddRule() {
        //NOTE: nothing to do
    }

    return {
        fillGamesList: function() {
            invoke('getGames', null);
        },
        getRules: function() {
            log("EleusisRuleAdmin: getRules");
            invoke('getRules', {});
        },
        addRule: function(name, ruleDescr, ruleAsString) {
            var dataToPost = {
                name: name,
                ruleDescr: ruleDescr,
                ruleContent: ruleAsString
            };
            invoke('addRule', dataToPost);
        }
    }
}