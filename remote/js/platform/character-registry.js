/*
 * CharacterRegistry — thin accessor over config.json's `characters[]`
 * (id/name/theme). Adding a character is: drop its folder under
 * assets/characters/<id>/, add one entry here (in config.json), done — no
 * character-specific conditionals anywhere else in the app.
 */

var CharacterRegistry = (function () {
  'use strict';

  var characters = [];

  function init(list) {
    characters = list || [];
  }

  function all() {
    return characters;
  }

  function findById(id) {
    for (var i = 0; i < characters.length; i++) {
      if (characters[i].id === id) return characters[i];
    }
    return null;
  }

  return { init: init, all: all, findById: findById };
})();

if (typeof window !== 'undefined') {
  window.CharacterRegistry = CharacterRegistry;
}
