/* Jison generated parser */
var ruleGuessParser = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"ruleGuess":3,"clauses":4,"EOF":5,"clause":6,"BINARY_BOOLEAN":7,"cardPhrase":8,"verbPhrase":9,"RELATIONAL":10,"CARD":11,"BY":12,"NUMBER_TRAIT":13,"INCREMENTAL_TERM":14,"THEIR":15,"CARD_TRAIT_NUMERIC_PLURAL":16,"verbPhrasePlural":17,"CARD_TRAIT_STRING_PLURAL":18,"ARITHMETIC":19,"numericCardPhrase":20,"IS":21,"NOT":22,"ARE":23,"stringCardPhrase":24,"CARD_TRAIT_NUMERIC":25,"CARD_TRAIT_STRING":26,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",7:"BINARY_BOOLEAN",10:"RELATIONAL",11:"CARD",12:"BY",13:"NUMBER_TRAIT",14:"INCREMENTAL_TERM",15:"THEIR",16:"CARD_TRAIT_NUMERIC_PLURAL",18:"CARD_TRAIT_STRING_PLURAL",19:"ARITHMETIC",21:"IS",22:"NOT",23:"ARE",25:"CARD_TRAIT_NUMERIC",26:"CARD_TRAIT_STRING"},
productions_: [0,[3,2],[4,1],[4,3],[6,4],[6,4],[6,7],[6,4],[6,4],[6,5],[9,1],[9,2],[17,1],[17,2],[8,1],[8,1],[20,2],[24,2]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1:
            return "return " + $$[$0-1] + ";";
        
break;
case 3:
            this.$ = '(' + $$[$0-2] + ')' + yy.parserHelper.getBinaryBooleanSymbol($$[$0-1]) + '(' + $$[$0] + ')';
        
break;
case 4:
            this.$ = $$[$0-3] + " " + yy.parserHelper.getRelationalSymbol($$[$0-2], $$[$0-1]) + $$[$0];
        
break;
case 5:
            var latterCard = $$[$0].substring(0, $$[$0].indexOf("'s"));
            this.$ = $$[$0-3] + " " + yy.parserHelper.getRelationalSymbol($$[$0-2], $$[$0-1]) + latterCard + yy.cardTrait;
        
break;
case 6:
            if($$[$0-4] == 'equal' || $$[$0-4] == 'same') {
                this.$ = "ERROR: non-sensical: if the traits are equal, then they don't differ 'by' any amount";
            } else {
                var latterCard = $$[$0-3].substring(0, $$[$0-3].indexOf("'s"));
                /* TODO: inside this assert-method, need to use Math.abs() first */
                latterCard = latterCard + yy.cardTrait;
                this.$ = "NumberTrait.forSymbol('" + $$[$0-1] + "').assert(" + $$[$0-6] + " - " + latterCard + ")";
            }
        
break;
case 7:
            this.$ = "card1.getOrdinal()" + " " + yy.parserHelper.getRelationalSymbol($$[$0-1], $$[$0]) + "card2.getOrdinal()";
        
break;
case 8:
            var method = yy.parserHelper.getMethodForCardTraitStringPlural($$[$0-2]);
            this.$ = "card1" + method + " " + yy.parserHelper.getRelationalSymbol($$[$0-1], $$[$0]) + "card2" + method;
        
break;
case 9:
            this.$ = "NumberTrait.forSymbol('" + $$[$0] + "').assert(" + $$[$0-3] + yy.parserHelper.getArithmeticSymbol($$[$0-4]) + $$[$0-2] + ")";
        
break;
case 10:
            this.$ = "=";
        
break;
case 11:
            this.$ = "!";
        
break;
case 12:
            this.$ = "=";
        
break;
case 13:
            this.$ = "!";
        
break;
case 16:
            this.$ = yy.parserHelper.handleNumericCardPhrase(yy, $$[$0-1], $$[$0]);
        
break;
case 17:
            this.$ = yy.parserHelper.handleStringCardPhrase(yy, $$[$0-1], $$[$0]);
        
break;
}
},
table: [{3:1,4:2,6:3,8:4,11:[1,9],15:[1,5],19:[1,6],20:7,24:8},{1:[3]},{5:[1,10],7:[1,11]},{5:[2,2],7:[2,2]},{9:12,21:[1,13]},{16:[1,14],18:[1,15]},{11:[1,17],20:16},{5:[2,14],7:[2,14],21:[2,14]},{5:[2,15],7:[2,15],21:[2,15]},{25:[1,18],26:[1,19]},{1:[2,1]},{6:20,8:4,11:[1,9],15:[1,5],19:[1,6],20:7,24:8},{10:[1,21]},{10:[2,10],13:[2,10],22:[1,22]},{17:23,23:[1,24]},{17:25,23:[1,24]},{11:[1,17],20:26},{25:[1,18]},{5:[2,16],7:[2,16],11:[2,16],21:[2,16]},{5:[2,17],7:[2,17],21:[2,17]},{5:[2,3],7:[2,3]},{8:27,11:[1,28],20:7,24:8},{10:[2,11],13:[2,11]},{10:[1,29]},{10:[2,12],22:[1,30]},{10:[1,31]},{9:32,21:[1,13]},{5:[2,4],7:[2,4]},{5:[2,5],7:[2,5],12:[1,33],25:[1,18],26:[1,19]},{5:[2,7],7:[2,7]},{10:[2,13]},{5:[2,8],7:[2,8]},{13:[1,34]},{13:[1,35]},{5:[2,9],7:[2,9]},{14:[1,36]},{5:[2,6],7:[2,6]}],
defaultActions: {10:[2,1],30:[2,13]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};
/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:
                          this.begin('arithmetic');
                          //yy.parserHelper.onArithmetic("sum");
                          return 19;
                      
break;
case 1:
                          this.begin('arithmetic');
                          //yy.parserHelper.onArithmetic("product");
                          return 19;
                      
break;
case 2:/* skip arithmetic auxiliary */
break;
case 3:/* skip whitespace */
break;
case 4:/* skip articles */
break;
case 5:/* skip articles */
break;
case 6:/* skip articles */
break;
case 7:return 15;
break;
case 8:
                          //yy.parserHelper.onCard("card1's");
                          return 11;
                      
break;
case 9:
                          //yy.parserHelper.onCard("card2's");
                          return 11;
                      
break;
case 10:
                          this.begin('incremental');
                          return 12;
                      
break;
case 11:this.begin('INITIAL'); return 14;
break;
case 12:return 25;
break;
case 13:return 16;
break;
case 14:return 25;
break;
case 15:return 16;
break;
case 16:return 26;
break;
case 17:return 18;
break;
case 18:return 26;
break;
case 19:return 18;
break;
case 20:
                        this.begin('INITIAL');
                        return 21;
                      
break;
case 21:return 23;
break;
case 22:return 22;
break;
case 23:return 10;
break;
case 24:/* skip relational auxiliaries */
break;
case 25:return 10;
break;
case 26:/* skip relational auxiliaries */
break;
case 27:return 10;
break;
case 28:return 10;
break;
case 29:return 10;
break;
case 30:/* skip incremental auxiliary */
break;
case 31:/* skip relational auxiliary */
break;
case 32:/* skip arithmetic auxiliary */
break;
case 33:return 7;
break;
case 34:return 7;
break;
case 35:return 7;
break;
case 36:return 7;
break;
case 37:return 13;
break;
case 38:return 13;
break;
case 39:return 13;
break;
case 40:return 13;
break;
case 41:return 5;
break;
}
};
lexer.rules = [/^(?:sum\b)/,/^(?:product\b)/,/^(?:of\b)/,/^(?:\s+)/,/^(?:the\b)/,/^(?:a\b)/,/^(?:an\b)/,/^(?:their\b)/,/^(?:card1's\b)/,/^(?:card2's\b)/,/^(?:by\b)/,/^(?:number\b)/,/^(?:number\b)/,/^(?:numbers\b)/,/^(?:ordinal\b)/,/^(?:ordinals\b)/,/^(?:suitColor\b)/,/^(?:suitColors\b)/,/^(?:suitName\b)/,/^(?:suitNames\b)/,/^(?:is\b)/,/^(?:are\b)/,/^(?:not\b)/,/^(?:equal\b)/,/^(?:to\b)/,/^(?:same\b)/,/^(?:as\b)/,/^(?:greater\b)/,/^(?:less\b)/,/^(?:different\b)/,/^(?:amount\b)/,/^(?:than\b)/,/^(?:and\b)/,/^(?:and\b)/,/^(?:while\b)/,/^(?:but\b)/,/^(?:or\b)/,/^(?:odd\b)/,/^(?:even\b)/,/^(?:prime\b)/,/^(?:round-binary\b)/,/^(?:$)/];
lexer.conditions = {"incremental":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33,34,35,36,37,38,39,40,41],"inclusive":true},"arithmetic":{"rules":[0,1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41],"inclusive":true},"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33,34,35,36,37,38,39,40,41],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();
if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = ruleGuessParser;
exports.Parser = ruleGuessParser.Parser;
exports.parse = function () { return ruleGuessParser.parse.apply(ruleGuessParser, arguments); }
exports.main = function commonjsMain(args) {
    if (!args[1])
        throw new Error('Usage: '+args[0]+' FILE');
    var source, cwd;
    if (typeof process !== 'undefined') {
        source = require('fs').readFileSync(require('path').resolve(args[1]), "utf8");
    } else {
        source = require("file").path(require("file").cwd()).join(args[1]).read({charset: "utf-8"});
    }
    return exports.parser.parse(source);
}
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(typeof process !== 'undefined' ? process.argv.slice(1) : require("system").args);
}
}