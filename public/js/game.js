global.EINSTEIN_PREFIX="EINSTEIN";
global.BOT_NAME_PREFIX="BOT";

const STATE_INITIALISING = 0;
const STATE_REGISTRATION = 1;
const STATE_STARTED = 2;
const STATE_FINISHED = 3;

const GAME_START_DATE = new Date("January 1 2020 00:00:00");

const SIMULATION_DAY_LENGTH=10; // in Milliseconds i.e. ultra-fast game

const DAY_REDUCTION_PER_DAY_IN_MS = 2; // Day in real time get shorter by DAY_REDUCTION_PER_DAY_IN_MS per day
const MIN_GAME_ID=10000;

var players=require("./Players.js");
var market=require("./stockmarket.js");
var broker=require("./broker.js");
var events = require('./events.js');

var gameDate,gameEndDate;
var dayDurationInSeconds,gameDurationInMonths;
var simulation;
var gameID;
var state;

exports.initialise=function(simul,gameDuration,dayLengthInSeconds,numBots,numEinsteins)
{
    console.log("Game: Initialising: "+gameID);
    state=STATE_INITIALISING;

    simulation=simul=="Yes";

    gameID=generateGameID();

    dayDurationInMS=dayLengthInSeconds*1000;
    gameDurationInMonths=gameDuration;

    gameDate = GAME_START_DATE;
    gameEndDate=new Date(gameDate);
    gameEndDate.setMonth(gameDate.getMonth()+gameDurationInMonths);

    startRegistration(numEinsteins,numBots);
}

startRegistration=function(numEinsteins,numBots)
{
  console.log("Game: Starting registration");
  state=STATE_REGISTRATION;
  registerBots(numEinsteins,numBots);
}

exports.start=function()
{
    console.log("Server: Starting game");
    state=STATE_STARTED;
    market.initialise(players.getNumPlayers());
    events.initialise(gameDate,gameDurationInMonths,market.getStocks()); 
}

exports.processDay = function()
{
  dayDurationInMS-=DAY_REDUCTION_PER_DAY_IN_MS;

  gameDate.setDate(gameDate.getDate() + 1);
  if (gameOver())
  {
    state=STATE_FINISHED;
    return events.getEndOfGameEvent(players.getWinnerName());
  }

  // Sometimes some post-processing is done on the event, hence it's passed back
  var newsEvent = events.getNewsEvent(gameDate);
  newsEvent=market.processDay(gameDate,newsEvent); 
  newsEvent=players.processDay(gameDate,newsEvent); 
  newsEvent=broker.processDay(gameDate,newsEvent); 
  return newsEvent;
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
  return gameDate >= gameEndDate || players.weHaveAMillionnaire();
}
exports.gameOver=gameOver;

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