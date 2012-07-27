/* description:
    parses Eleusis Rule-Guess expressions and translates them into JavaScript.
*/

/* lexical grammar */
%lex

%s arithmetic
%s incremental

%%
"sum"                 {
                          this.begin('arithmetic');
                          yy.parserHelper.onArithmetic("sum");
                          return 'ARITHMETIC';
                      }
"product"             {
                          this.begin('arithmetic');
                          yy.parserHelper.onArithmetic("product");
                          return 'ARITHMETIC';
                      }

"of"                  /* skip arithmetic auxiliary */
\s+                   /* skip whitespace */
"the"                 /* skip articles */
"a"                   /* skip articles */
"an"                  /* skip articles */
"their"               return 'THEIR';
"card1's"             {
                          yy.parserHelper.onCard("card1's");
                          return 'CARD';
                      }
"card2's"             {
                          yy.parserHelper.onCard("card2's");
                          return 'CARD';
                      }
"by"                  {
                          this.begin('incremental');
                          return 'BY';
                      }

<incremental>"number" {this.begin('INITIAL'); return 'INCREMENTAL_TERM';}
"number"              return 'CARD_TRAIT_NUMERIC';
"numbers"             return 'CARD_TRAIT_NUMERIC_PLURAL';
"ordinal"             return 'CARD_TRAIT_NUMERIC';
"ordinals"            return 'CARD_TRAIT_NUMERIC_PLURAL';
"suitColor"           return 'CARD_TRAIT_STRING';
"suitColors"          return 'CARD_TRAIT_STRING_PLURAL';
"suitName"            return 'CARD_TRAIT_STRING';
"suitNames"           return 'CARD_TRAIT_STRING_PLURAL';
"is"                  {
                        this.begin('INITIAL');
                        return 'IS';
                      }
"are"                 return 'ARE';
"not"                 return 'NOT';
"equal"               return 'RELATIONAL';
"to"                  /* skip relational auxiliaries */
"same"                return 'RELATIONAL';
"as"                  /* skip relational auxiliaries */
"greater"             return 'RELATIONAL';
"less"                return 'RELATIONAL';
"different"           return 'RELATIONAL';

"amount"              /* skip incremental auxiliary */
"than"                /* skip relational auxiliary */
<arithmetic>"and"     /* skip arithmetic auxiliary */
"and"                 return 'BINARY_BOOLEAN';
"while"               return 'BINARY_BOOLEAN';
"but"                 return 'BINARY_BOOLEAN';
"or"                  return 'BINARY_BOOLEAN';

"odd"                 return 'NUMBER_TRAIT';
"even"                return 'NUMBER_TRAIT';
"prime"               return 'NUMBER_TRAIT';
"round-binary"        return 'NUMBER_TRAIT';

<<EOF>>               return 'EOF';

/lex



%start ruleGuess

%% /* language grammar */

ruleGuess
    : clauses EOF
        {
            return "return " + $1 + ";";
        }
    ;

clauses
    : clause
    | clauses BINARY_BOOLEAN clause
        {
            $$ = '(' + $1 + ')' + yy.parserHelper.getBinaryBooleanSymbol($2) + '(' + $3 + ')';
        }
    ;

clause
    : cardPhrase verbPhrase RELATIONAL cardPhrase
        {
            $$ = $1 + " " + yy.parserHelper.getRelationalSymbol($2, $3) + $4;
        }
    | cardPhrase verbPhrase RELATIONAL CARD
        {
            var latterCard = $4.substring(0, $4.indexOf("'s"));
            $$ = $1 + " " + yy.parserHelper.getRelationalSymbol($2, $3) + latterCard + yy.cardTrait;
        }
    | cardPhrase verbPhrase RELATIONAL CARD BY NUMBER_TRAIT INCREMENTAL_TERM
        {
            if($3 == 'equal' || $3 == 'same') {
                $$ = "ERROR: non-sensical: if the traits are equal, then they don't differ 'by' any amount";
            } else {
                var latterCard = $4.substring(0, $4.indexOf("'s"));
                /* TODO: inside this assert-method, need to use Math.abs() first */
                latterCard = latterCard + yy.cardTrait;
                $$ = "NumberTrait.forSymbol('" + $6 + "').assert(" + $1 + " - " + latterCard + ")";
            }
        }
    | THEIR CARD_TRAIT_NUMERIC_PLURAL verbPhrasePlural RELATIONAL
        {
            $$ = "card1.getOrdinal()" + " " + yy.parserHelper.getRelationalSymbol($3, $4) + "card2.getOrdinal()";
        }
    | THEIR CARD_TRAIT_STRING_PLURAL verbPhrasePlural RELATIONAL
        {
            var method = yy.parserHelper.getMethodForCardTraitStringPlural($2);
            $$ = "card1" + method + " " + yy.parserHelper.getRelationalSymbol($3, $4) + "card2" + method;
        }
    | ARITHMETIC numericCardPhrase numericCardPhrase verbPhrase NUMBER_TRAIT
        {
            $$ = "NumberTrait.forSymbol('" + $5 + "').assert(" + $2 + yy.parserHelper.getArithmeticSymbol($1) + $3 + ")";
        }
    ;

verbPhrase
    : IS
        {
            $$ = "=";
        }
    | IS NOT
        {
            $$ = "!";
        }
    ;

verbPhrasePlural
    : ARE
        {
            $$ = "=";
        }
    | ARE NOT
        {
            $$ = "!";
        }
    ;

cardPhrase
    : numericCardPhrase
    | stringCardPhrase
    ;

numericCardPhrase
    : CARD CARD_TRAIT_NUMERIC
        {
            $$ = yy.parserHelper.handleNumericCardPhrase(yy, $1, $2);
        }
    ;

stringCardPhrase
    : CARD CARD_TRAIT_STRING
        {
            $$ = yy.parserHelper.handleStringCardPhrase(yy, $1, $2);
        }
    ;





