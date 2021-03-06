global.EINSTEIN_PREFIX="EINSTEIN";
global.BOT_NAME_PREFIX="BOT";

global.MIN_INTEREST_RATE = 1;
global.MAX_INTEREST_RATE = 7;
global.STARTING_INTEREST_RATE=2;
global.INTEREST_RATE_INCREMENT=.02; // Interest rate change per day, up or down

const STATE_INITIALISING = 0;
const STATE_REGISTRATION = 1;
const STATE_STARTED = 2;
const STATE_FINISHED = 3;

const GAME_START_DATE = new Date("January 1 2021 00:00:00");
const GAME_OVER_WARNING_DAYS=10; // How many days 'game over' warning you get when one person gets to $1m
const SIMULATION_DAY_LENGTH=10; // in Milliseconds i.e. ultra-fast game

const MIN_GAME_ID=10000;

var players=require("./Players.js");
var market=require("./stockmarket.js");
var broker=require("./broker.js");
var events = require('./events.js');

var gameDate,gameEndDate;
var dayDurationInMS,gameDurationInMonths,perDayReductionInMS;
var simulation;
var gameID;
var state;
var setGameEndDate;
var interestRate;
var interestRateIncrement;

exports.initialise=function(simul,gameDuration,dayLengthStartInSeconds,dayLengthEndInSeconds,numBots,numEinsteins)
{
    console.log("Game: Initialising: "+gameID);
    state=STATE_INITIALISING;

    simulation=(simul=="Yes");

    gameID=generateGameID();

    dayDurationInMS=dayLengthStartInSeconds*1000;

    // Days in real-time get shorter by perDayReductionInMS per day
    perDayReductionInMS=1000*(dayLengthStartInSeconds-dayLengthEndInSeconds) / (gameDuration*30); // 30 is average number of days per month

    gameDurationInMonths=gameDuration;

    gameDate = GAME_START_DATE;
    gameEndDate=new Date(gameDate);
    gameEndDate.setMonth(gameDate.getMonth()+gameDurationInMonths);
    setGameEndDate=false;

    interestRate=STARTING_INTEREST_RATE;
    interestRateIncrement=INTEREST_RATE_INCREMENT;

    broker.clearAccounts();
    players.clearPlayers();
    startRegistration(numEinsteins,numBots);
    if (simulation)
      runSimulation();
}

startRegistration=function(numEinsteins,numBots)
{
  console.log("Game: Starting registration");
  state=STATE_REGISTRATION;
  registerBots(numEinsteins,numBots);
}

runSimulation=function()
{
  start();
  while (!gameOver())
  {
    var event=processDay();
    if (event !=null)
    {
      console.log("Event: "+event.type+"/"+event.stockName);
    }
  }
  console.log(gameDate.toLocaleDateString("en-UK")+" : Game over: "+players.getWinnerName()+" wins");
  process.exit();
}

start=function()
{
    console.log("Server: Starting game");
    state=STATE_STARTED;
    market.initialise(players.getNumPlayers());
    market.openMarket();
    events.initialise(gameDate,gameDurationInMonths,market.getStocks()); 
}
exports.start=start;

exports.getGameDaysLeft=function()
{
  return daysElapsed(gameEndDate,gameDate);
}

exports.getInterestRate=function()
{
  return interestRate;
}

processDay = function()
{
  dayDurationInMS-=perDayReductionInMS;

  gameDate.setDate(gameDate.getDate() + 1);

  // When someone reaches $1m, players have GAME_OVER_WARNING_DAYS until the game ends 
  // (assuming we're not already very near the end of the game)
  if (players.weHaveAMillionnaire() && !setGameEndDate && daysElapsed(gameEndDate,gameDate) > GAME_OVER_WARNING_DAYS)
  {
    setGameEndDate=true;
    gameEndDate=new Date(gameDate);
    gameEndDate.setDate(gameDate.getDate()+GAME_OVER_WARNING_DAYS);
    console.log("***** MILLIONNAIRE: Game end date now: "+gameEndDate);
  }

  // Sometimes some post-processing is done on the event, hence it's passed back
  var newsEvent = events.getNewsEvent(gameDate);
  newsEvent=market.processDay(gameDate,newsEvent); 
  newsEvent=players.processDay(gameDate,gameEndDate,newsEvent,interestRate); 
  newsEvent=broker.processDay(gameDate,newsEvent); 

  if (newsEvent!= null)
    modifyInterestRateDirection(newsEvent);

  updateInterestRate();

  if (gameOver())
  {
    state=STATE_FINISHED;
    players.payAccountDebts(); // Make sure debts in the account are paid off
    var endOfGameEvent=events.getEndOfGameEvent(players.getWinnerName());
    return endOfGameEvent;
  }
  else
    return newsEvent;
}
exports.processDay=processDay;

updateInterestRate=function()
{
  interestRate+=interestRateIncrement;
  if (interestRate > MAX_INTEREST_RATE)
    interestRate=MAX_INTEREST_RATE;
  if (interestRate < MIN_INTEREST_RATE)
    interestRate=MIN_INTEREST_RATE;
}

modifyInterestRateDirection=function(event)
{
  var positiveNews = events.isPositiveMarketMove(event);
  interestRateIncrement=positiveNews?-INTEREST_RATE_INCREMENT:INTEREST_RATE_INCREMENT;
}

exports.getDayDurationInMS=function()
{
  return simulation?SIMULATION_DAY_LENGTH:dayDurationInMS;
}

exports.isSimulation=function()
{
  return simulation;
}

exports.isInitialising=function()
{
  return state == STATE_INITIALISING;
}

exports.registrationOpen=function()
{
  return state == STATE_REGISTRATION;
}

exports.gameStarted=function()
{
  return state == STATE_STARTED;
}

gameOver = function()
{
  return gameDate >= gameEndDate;
}
exports.gameOver=gameOver;

exports.getDates = function()
{
  return new GameDates(gameDate,gameEndDate);
}

exports.getDate = function()
{
  return gameDate;
}

exports.validID=function(anID)
{
  return anID==gameID;
}

exports.getGameID=function()
{
  return gameID;
}

function generateGameID()
{
    return MIN_GAME_ID+9*Math.floor(MIN_GAME_ID*Math.random());
}

function registerBots(numEinsteins,numBots)
{
  for (var i=0;i<numEinsteins;i++)
  {
    players.registerPlayer(EINSTEIN_PREFIX+(i+1),PLAYER_EINSTEIN);
  }
  
  for (var i=0;i<numBots;i++)
  {
    players.registerPlayer(BOT_NAME_PREFIX+(i+1),PLAYER_BOT);
  }
}

GameDates = function (currentDate,endDate)
{
  this.currentDate=currentDate;
  this.endDate=endDate;
}