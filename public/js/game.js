/* game .js

- Interfaces with server.js

- Implements game date and interest rates and exposes :-
- initialise
- start - to start the whole game
- processEndOfDay
- 
*/
const INITIAL_INTEREST_RATE=3.5;

const RATE_ADJUST_INCREMENT = .1; // How quickly Interest rates fluctuate
const MAX_RATE = 7; // Max Interest rate
const MIN_RATE=1;

var interestRate;
var rateTrend;
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
  rateTrend=getRandomTrend();
}

exports.gameCompleted = function()
{
  return gameDate >= gameEndDate;
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

exports.getInterestRate=function()
{
  return interestRate;
}

adjustRates=function()
{
  // On the first of each month, the rate trend can flip
  if (gameDate.getDate() ==0) 
    rateTrend=getRandomTrend();

  interestRate+=(rateTrend*Math.random()*RATE_ADJUST_INCREMENT);
  interestRate=clamp(interestRate,MIN_RATE,MAX_RATE);
}

function getRandomTrend()
{
  if (Math.random() >= .5)
    return 1;
  else
    return -1;
}

clamp =function(val, min, max) 
{
  return val > max ? max : val < min ? min : val;
}