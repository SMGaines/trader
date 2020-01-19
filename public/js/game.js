/* game .js

- Relies on: 
- Interfaces with server.js, mkt.js and players.js

- Implements a number of game functions(e.g. news events, interest/inflation rates, lottery) and exposes :-
- initialise
- start - to start the whole game
- processEndOfDay
- 
*/
const INITIAL_INTEREST_RATE=5;
const INITIAL_INFLATION_RATE=5;

const BASE_LOTTERY_WIN = 50000;

const RATE_ADJUST_INCREMENT = .1; // How quickly Interest and Inflation rates fluctuate
const MAX_RATE = 7; // MAx Interest or Inflation rate
const MIN_RATE=3;

var msgs = require("./messages.js");

var interestRate;
var inflationRate;
var gameDate;
var gameEndDate;

exports.initialise = function(gameDurationInMonths,gameLang)
{
  gameDate = new Date("January 1 2020 00:00:00");
  gameEndDate=new Date(gameDate);
  gameEndDate.setMonth(gameDate.getMonth()+gameDurationInMonths);
  log("Game ends on: "+gameEndDate);
}

exports.start =function()
{
  interestRate=INITIAL_INTEREST_RATE;
  inflationRate=INITIAL_INFLATION_RATE;
}

exports.getDate = function()
{
  return gameDate;
}

exports.processDay = function()
{
  gameDate.setDate(gameDate.getDate() + 1);
  adjustRates();
}

exports.getGameInfo=function()
{
  return new RatesInfo(interestRate,inflationRate)
}

RatesInfo = function(interestRate,inflationRate)
{
  this.interestRate=interestRate;
  this.inflationRate=inflationRate;
}

adjustRates=function()
{
  interestRate+=(-RATE_ADJUST_INCREMENT+Math.random()*2*RATE_ADJUST_INCREMENT);
  if (interestRate < MIN_RATE)
    interestRate=MIN_RATE;
  if (interestRate > MAX_RATE)
    interestRate=MAX_RATE;

  inflationRate+=(-RATE_ADJUST_INCREMENT+Math.random()*2*RATE_ADJUST_INCREMENT);
  if (inflationRate < MIN_RATE)
    inflationRate=MIN_RATE;
  if (inflationRate > MAX_RATE)
    inflationRate=MAX_RATE;
}

gameOver = function()
{
  return gameDate >= gameEndDate || instantWinner;
}
exports.gameOver = gameOver;

exports.getEndOfGameEvent=function()
{
  var endEvent =events.getEndOfGameEvent();
  var winner=players.findWinner();
  endEvent.headLine = endEvent.headLine.replace("$name",winner.name);
  winner.status = getPlayerStatusMsg(MSG_WINNER,winner.lang);
  log("getEndOfGameEvent: "+endEvent.headLine);
  return endEvent;
}

processLottery=function()
{
  // Need to generate a random winner and update the text
  if (players.allPlayersBankrupt())
  {
    newsEvent.headLine = newsEvent.headLine=getPlayerStatusMsg(MSG_NEWS_HEAD_NO_LOTTERY_WINNER);
    newsEvent.headLine = newsEvent.tagLine=getPlayerStatusMsg(MSG_NEWS_SUB_NO_LOTTERY_WINNER);
  }
  var lotteryWinner=players.getLotteryWinner();
  var win = BASE_LOTTERY_WIN+10000*Math.floor(Math.random()*5);
  lotteryWinner.credit(win);
}