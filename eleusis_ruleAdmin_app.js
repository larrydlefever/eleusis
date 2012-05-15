

var ruleAdmin = new EleusisRuleAdmin();

$(document).ready(function() {

    function log(msg) {
        if(window.console) {
            console.log(msg);
        }
    }

    $.ajaxSetup({
        cache: false
    });

    ruleAdmin.getRules();

    $('#addRuleBtn').click(function() {
        var name = $('#ruleName').val();
        var descr = $('#ruleDescr').val();
        var ruleContent = $('#ruleContent').val();
        ruleAdmin.addRule(name, descr, ruleContent);
        ruleAdmin.getRules();
    });

});