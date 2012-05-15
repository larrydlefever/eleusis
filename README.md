eleusis
=======

Robert Abbot's educational card-game of inductive reasoning, implemented as a "JavaScript end-to-end" multi-player
web-app.

* Node.js on the server-side
* JQuery on the client-side
* Faye pub/sub framework for messaging amongst the "dealer" (game-app) and the players within a given Game instance,
  and also, in a separate channel, for general admin-messages
* A "mystery rule" determines which cards may be played (laid down in the "common area") by players
* The object of the game is to guess that rule, after having gotten hints about it via playing of one's cards
* One implements one's rule in JavaScript on the client-side, which is submitted to Node, which compares it with
  the "mystery rule"