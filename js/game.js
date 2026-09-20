/* global window, Questions */
(function (global) {
  'use strict';

  var TOTAL_QUESTIONS = 10;
  var MILESTONES = [3, 6, 9];

  function GameSession(operations, range) {
    this.range = range;
    this.operations = operations;
    this.exercises = Questions.generateGame(operations, range, TOTAL_QUESTIONS);
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.firstAttemptCorrectCount = 0;
    this.currentQuestionAttempted = false;
  }

  GameSession.prototype.currentExercise = function () {
    return this.exercises[this.currentIndex];
  };

  GameSession.prototype.isLastQuestion = function () {
    return this.currentIndex === TOTAL_QUESTIONS - 1;
  };

  GameSession.prototype.progress = function () {
    return { current: this.currentIndex, total: TOTAL_QUESTIONS };
  };

  // Returns a result object describing what happened, so the UI layer can
  // react (animations, sounds, score deltas) without duplicating rules.
  GameSession.prototype.submitAnswer = function (value) {
    var exercise = this.currentExercise();
    var correct = value === exercise.answer;

    if (correct) {
      var pointsGained = 2;
      if (!this.currentQuestionAttempted) {
        this.firstAttemptCorrectCount++;
      }
      this.correctCount++;

      var milestone = MILESTONES.indexOf(this.correctCount) !== -1 ? this.correctCount : null;
      if (milestone) {
        pointsGained += 2;
      }

      this.score += pointsGained;

      var finished = this.currentIndex >= TOTAL_QUESTIONS - 1;
      if (!finished) {
        this.currentIndex++;
        this.currentQuestionAttempted = false;
      }

      return {
        correct: true,
        pointsGained: pointsGained,
        milestone: milestone,
        finished: finished,
        score: this.score
      };
    }

    this.currentQuestionAttempted = true;
    this.score = Math.max(0, this.score - 1);

    return {
      correct: false,
      pointsGained: -1,
      milestone: null,
      finished: false,
      score: this.score
    };
  };

  global.GameSession = GameSession;
  global.GAME_TOTAL_QUESTIONS = TOTAL_QUESTIONS;
})(window);
