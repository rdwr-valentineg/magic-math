/*
 * SessionManager — pure-logic, game-agnostic session progression: scoring,
 * streak, and "should the session keep going" for all three session modes
 * (questions / score / time). No DOM access anywhere in this file, so it is
 * Node-testable (see remote/tests/session-core.test.js) exactly like
 * js/core/math-core.js.
 *
 * Deliberately knows NOTHING about exercises/questions content — a game
 * module generates its own next question, calls recordAnswer(correct) once
 * the child answers, then checks isOver() at the next safe boundary (after
 * an answer's feedback animation has finished, never mid-interaction) to
 * decide whether to advance or go to Results. This is what keeps session
 * mode logic reusable across games with very different question shapes
 * (arithmetic exercises, letter choices, quantity choices) without any of
 * them re-implementing questions/score/time bookkeeping.
 *
 * `sessionConfig` = { mode: 'questions'|'score'|'time', value }.
 *   - questions: value = number of questions to complete.
 *   - score:     value = target score (score >= value ends the session).
 *   - time:      value = minutes to play (wall-clock from session start).
 * `options.scoring` = { correct, wrong } points per answer (wrong is
 * typically negative; score is always floored at 0).
 * `options.streak`  = { threshold, bonus } — same generalized rule as
 * MagicMathCore.GameSession: a streak event fires whenever the consecutive-
 * correct count becomes a positive multiple of `threshold`, awarding
 * `bonus` extra points. A wrong answer resets the streak immediately.
 */

var MagicMathSessionCore = (function () {
  'use strict';

  var DEFAULT_SCORING = { correct: 2, wrong: -1 };
  var DEFAULT_STREAK = { threshold: 3, bonus: 2 };
  var MINUTE_MS = 60000;

  function SessionManager(sessionConfig, options) {
    sessionConfig = sessionConfig || {};
    this.mode = sessionConfig.mode;
    this.value = sessionConfig.value;
    this.scoring = (options && options.scoring) || DEFAULT_SCORING;
    this.streak = (options && options.streak) || DEFAULT_STREAK;

    this.score = 0;
    this.correctStreak = 0;
    this.questionsCompleted = 0;
    this.startTime = (this.mode === 'time') ? Date.now() : null;
  }

  SessionManager.DEFAULT_SCORING = DEFAULT_SCORING;
  SessionManager.DEFAULT_STREAK = DEFAULT_STREAK;

  // Returns a result object describing what happened, mirroring
  // MagicMathCore.GameSession#submitAnswer's shape so game UI code that
  // already knows that pattern (Math) reads naturally here too.
  SessionManager.prototype.recordAnswer = function (correct) {
    var pointsGained;

    if (correct) {
      this.correctStreak += 1;
      var threshold = this.streak.threshold;
      var isStreakEvent = threshold > 0 && this.correctStreak % threshold === 0;

      pointsGained = this.scoring.correct + (isStreakEvent ? this.streak.bonus : 0);
      this.score += pointsGained;
      this.questionsCompleted += 1;

      return {
        correct: true,
        pointsGained: pointsGained,
        streakEvent: isStreakEvent,
        score: this.score,
        streak: this.correctStreak
      };
    }

    this.correctStreak = 0;
    pointsGained = this.scoring.wrong;
    this.score = Math.max(0, this.score + pointsGained);

    return {
      correct: false,
      pointsGained: pointsGained,
      streakEvent: false,
      score: this.score,
      streak: this.correctStreak
    };
  };

  // Checked only at a safe boundary (never mid-question) — see file header.
  SessionManager.prototype.isOver = function () {
    if (this.mode === 'questions') return this.questionsCompleted >= this.value;
    if (this.mode === 'score') return this.score >= this.value;
    if (this.mode === 'time') return (Date.now() - this.startTime) >= this.value * MINUTE_MS;
    return this.questionsCompleted >= this.value;
  };

  // 0..1, used to drive one shared progress-bar visual for all three modes
  // (see js/platform/session-ui.js) instead of each game inventing its own.
  SessionManager.prototype.progressFraction = function () {
    var fraction;
    if (this.mode === 'score') {
      fraction = this.value > 0 ? this.score / this.value : 1;
    } else if (this.mode === 'time') {
      fraction = this.value > 0 ? (Date.now() - this.startTime) / (this.value * MINUTE_MS) : 1;
    } else {
      fraction = this.value > 0 ? this.questionsCompleted / this.value : 1;
    }
    return Math.max(0, Math.min(1, fraction));
  };

  SessionManager.prototype.progressMeta = function () {
    return {
      mode: this.mode,
      value: this.value,
      score: this.score,
      questionsCompleted: this.questionsCompleted,
      fraction: this.progressFraction()
    };
  };

  return { SessionManager: SessionManager };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MagicMathSessionCore;
}
if (typeof window !== 'undefined') {
  window.MagicMathSessionCore = MagicMathSessionCore;
}
