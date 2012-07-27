
var parser = require("./ruleGuessParser").parser;

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

RuleGuessParserHelper.prototype.onArithmetic = function(token) {
    console.log("got token: " + token);
};

RuleGuessParserHelper.prototype.onCard = function(token) {
    console.log("onCard: token: " + token);
    alert("card-traits: \n\tnumber\n\tsuit-color\n\tsuit-name");
};

var transPairs = [
    {
        eng: "the product of card1's number and card2's number is prime and their suitColors are the same",
        js: "return (NumberTrait.forSymbol('prime').assert(card1.getOrdinal() * card2.getOrdinal())) && (card1.getSuitColor() == card2.getSuitColor());"
    },
    {
        eng: "card1's number is greater than card2's number and their suitColors are different",
        js: "return (card1.getOrdinal() > card2.getOrdinal()) && (card1.getSuitColor() != card2.getSuitColor());"
    },
    {
        eng: "card2's number is greater than card1's",
        js: "return card2.getOrdinal() > card1.getOrdinal();"
    },
    {
        eng: "card2's number is greater than card1's and their suitColors are different",
        js: "return (card2.getOrdinal() > card1.getOrdinal()) && (card1.getSuitColor() != card2.getSuitColor());"
    },
    {
        eng: "card1's number is greater than card2's by an even number",
        js: "return NumberTrait.forSymbol('even').assert(card1.getOrdinal() - card2.getOrdinal());"
    },
    {
        eng: "card1's number is less than card2's by a prime number",
        js: "return NumberTrait.forSymbol('prime').assert(card1.getOrdinal() - card2.getOrdinal());"
    },
    {
        eng: "card1's number is less than card2's by a prime number and their suitColors are different",
        js: "return (NumberTrait.forSymbol('prime').assert(card1.getOrdinal() - card2.getOrdinal())) && (card1.getSuitColor() != card2.getSuitColor());"
    },
    {
        eng: "the difference between",
        js: "ERROR"
    }
];

parser.yy.parserHelper = new RuleGuessParserHelper();

(function testTranslations(transPairs) {
    console.log();
    for(var i = 0; i < transPairs.length; i++) {
        var transPair = transPairs[i];
        try {
            console.log(transPair.eng);
            var result = parser.parse(transPair.eng);
            if(result !== transPair.js) {
                console.log("\tNO MATCH: " + result);
            } else {
                console.log("\tMATCH: " + result);
            }
        } catch(err) {
            if(transPair.js !== "ERROR") {
                console.log("UNEXPECTED PARSE-ERROR:");
            }
            console.log(err);
            if(err.toString().indexOf("Unrecognized text") != -1) {
                if(err.toString().indexOf("difference") != -1) {
                    console.log("HINT: for 'difference between', try instead a relational approach: 'foo is greater than bar by ...'");
                }
            }
        }
        console.log();
    }
})(transPairs);