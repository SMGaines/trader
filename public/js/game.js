const INITIAL_INTEREST_RATE=5;
const INITIAL_INFLATION_RATE=5;

const REG_PLAYER_OK = 0;
const REG_PLAYER_EXISTS=1;
const REG_PLAYER_ERROR = 2;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 8;

const HACKING_DURATION_DAYS = 45;
const HACKING_FEE = 5000;
const HACKING_FINE = 25000;
const HACKING_FRACTION = .3;
const MIN_HACKING_AMOUNT = 10000;
const HACKING_INCORRECT_SUSPICION_FINE = 10000;
const HACKING_PRISON_SENTENCE=30;
const INSIDER_FEE=5000;
const INSIDER_BASE_FINE = 10000;
const INSIDER_LOOKAHEAD_MONTHS = 3;

const BASE_XMAS_PRESENT = 10000;

const NO_PLAYER="NONE";

const PRISON_DAYS_INCREMENT = 10;
const CRIME_EXPIRY_DAYS = 60;

const BASE_LOTTERY_WIN = 50000;

const RATE_ADJUST_INCREMENT = .15; // How quickly Interest and Inflation rates fluctuate
const MAX_RATE = 8; // MAx Interest or Inflation rate
const MIN_RATE=2;
const TAX_PERCENTAGE=20;

var stk =require("./stock.js");
var player = require('./player.js');
var events = require('./events.js');
var msgs = require("./messages.js");
var utils = require("./utils.js");

var stocks = [];
var players=[];

var numBots;
var interestRate;
var inflationRate;
var gameDate;
var gameEndDate;
var instantWinner;
var numActiveStocks;

exports.init = function(gameDurationInMonths,gameLang)
{
  gameDate = new Date("January 1 2020 00:00:00");
  gameEndDate=new Date(gameDate);
  gameEndDate.setMonth(gameDate.getMonth()+gameDurationInMonths);
  log("Game ends on: "+gameEndDate);
  instantWinner=false;
  setupStock();
  events.setupEvents(gameDate,gameDurationInMonths,stocks,getLanguageIndex(gameLang)); // eg convert "EN" to a number (0)
  startRegistration();
}

startRegistration = function()
{
  numBots=0;
}

exports.start =function()
{
  interestRate=INITIAL_INTEREST_RATE;
  inflationRate=INITIAL_INFLATION_RATE;
  players.forEach(function(player)
  {
    player.status = getPlayerStatusMsg(MSG_GAME_STARTED,player.lang);
  });
}

exports.getDate = function()
{
  return gameDate;
}

isChristmas=function()
{
  return gameDate.getDate() == 23 && gameDate.getMonth()==11; // Celebrate on Dec 24th :)
}

exports.nextDay = function()
{
  var numSolvent=0;
  var solventIndex=-1;
  for (var i=0;i<players.length;i++)
  {
    players[i].status="";
    players[i].allStockSold=false;
    if (isChristmas() && players[i].cash >=0 && players[i].prisonDaysRemaining == 0)
    {
     var playerPresent=BASE_XMAS_PRESENT*(1+Math.random()*3);
     console.log("xmasPresent for "+players[i].name+" is "+formatMoney(playerPresent));
     addCash(players[i],playerPresent);
     players[i].status=getPlayerStatusMsg(MSG_HAPPY_XMAS,players[i].lang,formatMoney(playerPresent));
    }
    if (players[i].cash >=0)
    {
      numSolvent++;
      solventIndex=i;
    }
    if (players[i].netWorth > 1000000)
      instantWinner=true;
    if (players[i].prisonDaysRemaining > 0)
    {
      players[i].prisonDaysRemaining--;
      if (players[i].prisonDaysRemaining == 0)
        players[i].status = getPlayerStatusMsg(MSG_PRISON_RELEASE,players[i].lang);
    }
  }  

  if (numSolvent == 0)
  {
    // All lose
    console.log("ALL players lost");
    return;
  }
  if (numSolvent == 1)
  {
    console.log("One player left: "+players[solventIndex].name);
    instantWinner=true;
    return;
  }
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].suspensionDays > 0)
    {
      stocks[i].suspensionDays--;
      if (stocks[i].suspensionDays == 0)
      {
        log("nextDay: Suspension lifted for "+stocks[i].name);
        stocks[i].liftSuspension();
      }
    }
  }  
  gameDate.setDate(gameDate.getDate() + 1);
  adjustRates();
  checkHackers();
  checkInsiderTrading();
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
  var winner=findWinner();
  endEvent.headLine = endEvent.headLine.replace("$name",winner.name);
  winner.status = getPlayerStatusMsg(MSG_WINNER,winner.lang);
  log("getEndOfGameEvent: "+endEvent.headLine);
  return endEvent;
}

function findWinner()
{
  var bestPlayerIndex=-1;
  var bestScore = -1;
  for (var i=0;i<players.length;i++)
  {
    var playerNetWorth = players[i].calcNetWorth(stocks);
    if (playerNetWorth > bestScore)
    {
      bestScore=playerNetWorth;
      bestPlayerIndex=i;
    }
  }
  return players[bestPlayerIndex];
}

function setupStock()
{
  for (var i=0;i<NUM_INITIAL_STOCKS;i++)
  {
    stocks.push(new stk.Stock(STOCK_NAMES[i],STOCK_RISKINESS[i],STOCK_COLOURS[i]));
  }
  numActiveStocks=NUM_INITIAL_STOCKS;
}

function getStock(stockName)
{
    var selectedStock=null;
    stocks.forEach(function(stock)
    {
        if (stock.name == stockName)
            selectedStock = stock;
    });
    return selectedStock;
}

exports.getNewPrices=function()
{
  return new priceInfo(gameDate,getStockSummary(),interestRate,inflationRate);
}

priceInfo = function(date,stockSummary,interestRate,inflationRate)
{
  this.date=date;
  this.interestRate=interestRate;
  this.inflationRate=inflationRate;
  this.stockSummary=stockSummary;
}

getStockSummary = function ()
{
  var stockSummary=[];

  for (var i=0;i<stocks.length;i++)
  {
    stockSummary.push(stocks[i].getSummary());
  }
  return stockSummary;
}

exports.updatePrices = function()
{
  if (gameOver())
  {
    log("updatePrices ignored - game over");
    return;
  }

  stocks.forEach(function(stock)
  {
    if (stock.suspensionDays == 0)
    {
      var increase = STOCK_ADJUSTMENT_FACTOR*(stock.trend+getRandomFactor())*getRiskMultiplier(stock.riskiness);
      if ((increase > 0 && stock.price < STOCK_MAX_VALUE) || (increase <0 && stock.price > STOCK_MIN_VALUE))
        stock.price += increase;
      if (Math.abs(stock.trend) > 1)
        stock.trend*=STOCK_DAMPING_FACTOR;
    }
  });
}

exports.applyInterestAndInflation = function()
{
  if (gameOver())
  {
    log("updatePlayerCash ignored - game over");
    return;
  }

  players.forEach(function(player)
  {
    if (player.cash > 0)
    {
      player.cash*=(100-inflationRate/5)/100; 
      player.cash*=(100+interestRate/5)/100;
    // Below creates larger effect for small cash sums
    if (interestRate>inflationRate)
      addCash(player,100*(interestRate-inflationRate));
    else
      removeCash(player,100*(inflationRate-interestRate));
    }
  });
}

function removeCash(player,amount)
{
  player.cash-=amount;
  player.lastCashChange=-amount;
  //log("removeCash: "+player.name+": Cash change from "+ formatMoney(player.cash+amount)+" to "+formatMoney(player.cash));
  if (player.cash < 0)
  {
    sellAllPlayerStock(player);
    if (player.status == "") // Dont overwrite an existing status message
      player.status=getPlayerStatusMsg(MSG_ASSETS_SOLD,player.lang);
  }
}

function addCash(player,amount)
{
  if (player.cash < 0 && !player.hasStock()) // Once you're bankrupt, that's the end of your game - no recovery
    return;
  player.cash+=amount;
  player.lastCashChange=amount;
  //log("addCash: "+player.name+": Cash change from "+ formatMoney(player.cash-amount)+" to "+formatMoney(player.cash));
}

function sellAllPlayerStock(player)
{
  log("sellAllPlayerStock: "+player.name);
  player.stocks.forEach(function(stockHolding)
  {
    if (stockHolding.amount > 0)
    {
      player.allStockSold=true;
      var stock = getStock(stockHolding.name);
      var salePrice = stock.calculateSalePrice();
      addCash(player,salePrice*stockHolding.amount);
      log("sellAllPlayerStock: "+player.name+" sells "+stockHolding.amount+" of "+stockHolding.name+" at "+formatMoney(salePrice));
      stock.sell(stockHolding.amount);
      player.sellStock(stockHolding.name,stockHolding.amount);
    }
  });
}

sellStock = function(playerName,stockName,amount)
{
  if (gameOver())
  {
    log("sellStock ignored - game over");
    return;
  }
  var player = getPlayer(playerName);
  if (player == null)
  {
    console.log("sellStock: Unknown player '"+playerName+"' - ignoring");
    return;
  }
  
  if (player.prisonDaysRemaining > 0)
  {
    player.status=getPlayerStatusMsg(MSG_IN_PRISON,player.lang);
    return;
  }
  var stock = getStock(stockName);
  if (stock.suspensionDays > 0)
  {
    player.status=getPlayerStatusMsg(MSG_STOCK_SUSPENDED,player.lang);
    return;
  }
  var sellableAmount = Math.min(player.getStockHolding(stockName),amount);
  var salePrice = stock.calculateSalePrice();
  if (sellableAmount > 0)
  {
     player.sellStock(stockName,sellableAmount);
     log("sellStock: "+playerName+" sells "+sellableAmount+" of "+stockName+" at "+formatMoney(salePrice));
     addCash(player,salePrice*sellableAmount);
     stock.sell(sellableAmount);
     player.status = getPlayerStatusMsg(MSG_SHARE_SALE,player.lang,sellableAmount,stockName,formatMoney(salePrice));
  }
  else
     player.status = getPlayerStatusMsg(MSG_NO_STOCK,player.lang);
}
exports.sellStock = sellStock;

buyStock = function(playerName,stockName,amount)
{
  if (gameOver())
  {
    log("buyStock ignored - game over");
    return;
  }
  var player = getPlayer(playerName);
  if (player==null)
  {
    log("Unknown player: "+playerName);
    return;
  }
  if (player.prisonDaysRemaining > 0)
  {
    player.status=getPlayerStatusMsg(MSG_IN_PRISON,player.lang);
    return;
  }
  if (player.cash < 0)
  {
    player.status=getPlayerStatusMsg(MSG_BANKRUPT,player.lang);
    return;
  }
  var stock = getStock(stockName);
  if (stock==null)
  {
    log("Unknown stock: "+stockName);
    return;
  }
  if (stock.suspensionDays > 0)
  {
    player.status=getPlayerStatusMsg(MSG_STOCK_SUSPENDED,player.lang);
    return;
  }
  if (stock.available == 0)
  {
    player.status=getPlayerStatusMsg(MSG_NO_STOCK_AVAILABLE,player.lang);
    return;
  }

  if (amount > stock.available/2)
    amount = stock.available>MIN_STOCK_PURCHASE?roundStock(stock.available/2):MIN_STOCK_PURCHASE; // Cannot buy all available stock in one purchase - makes it fairer

  if (amount > stock.available)
  {
    amount=stock.available;
    player.status=getPlayerStatusMsg(MSG_INSUFFICIENT_STOCK,player.lang,stock.available);
  }
  
  var buyPrice = stock.calculateBuyPrice();
  var stockValue = buyPrice*amount;
  if (player.cash >= stockValue)
  {   
      player.buyStock(stockName,amount,buyPrice);
      log("buyStock: "+playerName+" buys "+amount+" of "+stockName+" at "+formatMoney(buyPrice));
      removeCash(player,stockValue);
      stock.buy(amount);
      player.status = getPlayerStatusMsg(MSG_SHARE_BUY,player.lang,amount,stockName,formatMoney(buyPrice));   
      log("buySTockDebug: "+player.status+"/"+player.cash);         
  }
  else
  {
    var affordableAmount = roundStock(player.cash/buyPrice);
    if (affordableAmount == 0)
    {
      player.status=getPlayerStatusMsg(MSG_INSUFFICIENT_FUNDS,player.lang);
      return;
    }
    player.buyStock(stockName,affordableAmount,buyPrice);
    log("buyStock(affordable): "+playerName+" buys "+affordableAmount+" of "+stockName+" at "+formatMoney(buyPrice));
    removeCash(player,affordableAmount*buyPrice);
    stock.buy(affordableAmount);
    player.status = getPlayerStatusMsg(MSG_SHARE_BUY,player.lang,affordableAmount,stockName,formatMoney(buyPrice));             
  }
}
exports.buyStock = buyStock;

exports.processNews = function()
{
  var newsEvent;
  if (gameOver())
  {
      return null;
  }
  newsEvent=events.getNewsEvent(gameDate);
  if (newsEvent != null)
  {
    log("processNews: "+newsEvent.headline+"/"+newsEvent.stockName);
    switch(newsEvent.type)
    {
      case EVENT_NONE:
        break;
      case EVENT_CRASH:
        var stock = getStock(newsEvent.stockName);
        stock.trend=-STOCK_MAX_TREND;
        break;
      case EVENT_BOOM:
        var stock = getStock(newsEvent.stockName);
        stock.trend=STOCK_MAX_TREND;
        break;
      case EVENT_CRASH_ALL_STOCKS:
        stocks.forEach(function(stock)
        {
          if (stock.riskiness != RISK_NONE)
            stock.trend=-STOCK_MAX_TREND;
        });
        break;
      case EVENT_BOOM_ALL_STOCKS:
        stocks.forEach(function(stock)
        {
          if (stock.riskiness != RISK_NONE)
            stock.trend=STOCK_MAX_TREND;
        });
        break;
      case EVENT_LOTTERY_WIN:
        // Need to generate a random winner and update the text
        var rndPlayerIndex=getLotteryWinnerIndex();
        if (rndPlayerIndex != -1)
        {
          var win = BASE_LOTTERY_WIN+10000*Math.floor(Math.random()*5);
          newsEvent.headLine = newsEvent.headLine.replace("$name",players[rndPlayerIndex].name);
          newsEvent.headLine = newsEvent.headLine.replace("$win",formatMoney(win));
          log("EVENT_LOTTERY_WIN: "+players[rndPlayerIndex].name+" wins "+formatMoney(win));
          addCash(players[rndPlayerIndex],win);
        }
        else
        {
          newsEvent.headLine = newsEvent.headLine=getPlayerStatusMsg(MSG_NEWS_HEAD_NO_LOTTERY_WINNER,player.lang);
          newsEvent.headLine = newsEvent.tagLine=getPlayerStatusMsg(MSG_NEWS_SUB_NO_LOTTERY_WINNER,player.lang);
        }
        break;
      case EVENT_STOCK_IPO:
        log("EVENT_STOCK_IPO");
        stocks.push(new stk.Stock(STOCK_NAMES[numActiveStocks],STOCK_RISKINESS[numActiveStocks],STOCK_COLOURS[numActiveStocks]));
        newsEvent.headLine = newsEvent.headLine.replace("$name",STOCK_NAMES[numActiveStocks]);
        numActiveStocks++;
        break;
      case EVENT_STOCK_RELEASE:
        log("EVENT_STOCK_RELEASE: "+newsEvent.stockName);
        getStock(newsEvent.stockName).available+=MIN_STOCK_RELEASE_AMOUNT+STOCK_INCREMENT*Math.floor(Math.random()*10);
        break;
      case EVENT_STOCK_DIVIDEND:
        log("EVENT_STOCK_DIVIDEND: "+newsEvent.stockName);
        players.forEach(function(player)
        {
          var playerStock = player.getStockHolding(newsEvent.stockName)
          if (playerStock > 0 && player.prisonDaysRemaining == 0) // Naughty players dont get stock
          {
            var dividendAmount = roundStock(playerStock*STOCK_DIVIDEND_RATIO);
            if (dividendAmount < STOCK_INCREMENT)
              dividendAmount = STOCK_INCREMENT;
            player.buyStock(newsEvent.stockName,dividendAmount,0);
            player.status= getPlayerStatusMsg(MSG_DIVIDEND,player.lang,dividendAmount,newsEvent.stockName);
          }
        });
        break;       
      case EVENT_STOCK_SUSPENDED:
        getStock(newsEvent.stockName).price=0;
        getStock(newsEvent.stockName).suspensionDays=30+Math.floor(Math.random()*30);
        log("EVENT_STOCK_SUSPENDED: "+newsEvent.stockName+" suspended for "+getStock(newsEvent.stockName).suspensionDays+" days");
        break;
      case EVENT_TAX_RETURN:
        log("EVENT_TAX_RETURN");
        players.forEach(function(player)
        {
          var totalTax=0;
          stocks.forEach(function(stock)
          {
            var playerStock = player.getStockHolding(stock.name);
            if (playerStock > 0)
            {
              var taxShares = playerStock*TAX_PERCENTAGE/100;
              totalTax+= taxShares*stock.price;
            }
          });
          player.taxBill=totalTax;
          log("Tax bill for "+player.name+" = "+formatMoney(player.taxBill));
          removeCash(player,totalTax);
          player.status= getPlayerStatusMsg(MSG_TAX,player.lang,formatMoney(totalTax));
        });
        break;
    }
  }
  return newsEvent;
}

getLotteryWinnerIndex=function()
{
  var best=0;
  var bestIndex=-1;
  for (var i=0;i<players.length;i++)
  {
    var playerNetWorth=players[i].calcNetWorth(stocks);
    if (playerNetWorth <=10000)
      playerNetWorth=10000; // Set minimum net worth for lottery purposes only
    var playerChance = Math.random()/playerNetWorth; // Lower net worth means higher chance of winning
    if (players[i].prisonDaysRemaining > 0 || players[i].cash < 0) // Cannot win the lottery if in prison or if bankrupt already
      playerChance=0;
    if (playerChance > best)
    {
      best=playerChance;
      bestIndex=i;
    }
  }
  return bestIndex;
}

setupHack = function(hackingPlayerName,hackedPlayerName)
{
  if (gameOver())
  {
    log("setupHack ignored - game over");
    return;
  }
  log("setupHack: "+hackingPlayerName+" is trying to hack "+hackedPlayerName);

  var hackedPlayer=getPlayer(hackedPlayerName);
  var hackingPlayer=getPlayer(hackingPlayerName);
  if (hackingPlayer.prisonDaysRemaining > 0)
  {
    hackingPlayer.status=getPlayerStatusMsg(MSG_IN_PRISON,hackingPlayer.lang);
    return;
  }
  if (hackingPlayer.cash < HACKING_FEE)
  {
    hackingPlayer.status = getPlayerStatusMsg(MSG_CANNOT_AFFORD_HACK,hackingPlayer.lang,formatMoney(HACKING_FEE));
    return;
  }
  if (hackingPlayer.hacking != NO_PLAYER)
  {
    hackingPlayer.status=getPlayerStatusMsg(MSG_ALREADY_HACKING,hackingPlayer.lang,hackedPlayerName);
    return;
  }
  if (hackedPlayer.beingHacked)
  {
    hackingPlayer.status=getPlayerStatusMsg(MSG_ALREADY_BEING_HACKED,hackingPlayer.lang,hackedPlayerName);
    return;
  }
  hackingPlayer.hacking=hackedPlayerName;
  removeCash(hackingPlayer,HACKING_FEE);
  hackingPlayer.status=getPlayerStatusMsg(MSG_HACK_INITIATED,hackingPlayer.lang,hackedPlayerName,formatMoney(HACKING_FEE));
  hackingPlayer.hackingCompletionDate=new Date(gameDate);
  hackingPlayer.hackingCompletionDate.setDate(gameDate.getDate() + HACKING_DURATION_DAYS);
  hackedPlayer.beingHacked=true;
}
exports.setupHack = setupHack;

suspectHacker = function(suspectingPlayerName,suspectedPlayerName)
{
  if (gameOver())
  {
    log("suspectHacker ignored - game over");
    return;
  }
  log("suspectHacker: "+suspectingPlayerName+" is suspecting "+suspectedPlayerName);

  var suspectingPlayer=getPlayer(suspectingPlayerName);
  if (suspectingPlayer.prisonDaysRemaining > 0)
  {
    suspectingPlayer.status=getPlayerStatusMsg(MSG_IN_PRISON,suspectingPlayer.lang);
    return;
  }
  if (!suspectingPlayer.beingHacked)
  {
    suspectingPlayer.status=getPlayerStatusMsg(MSG_SUSPICION_IGNORED,suspectingPlayer.lang);
    log("Game: suspectHacker: Suspicion ignored - player not being hacked");
    return;
  }

  var suspectedPlayer=getPlayer(suspectedPlayerName);
  if (suspectedPlayer.hacking==suspectingPlayerName)
  {
      var amount = HACKING_FINE;
      removeCash(suspectedPlayer,amount);
      addCash(suspectingPlayer,amount);
      log("suspectHacker: "+suspectedPlayer.name+" goes to prison for "+HACKING_PRISON_SENTENCE+" days");
      suspectedPlayer.prisonDaysRemaining=HACKING_PRISON_SENTENCE;
      suspectedPlayer.status = getPlayerStatusMsg(MSG_HACK_DETECTED,suspectedPlayer.lang,suspectingPlayerName,HACKING_FINE,suspectedPlayer.prisonDaysRemaining);
      suspectingPlayer.status = getPlayerStatusMsg(MSG_HACK_COMPENSATION,suspectingPlayer.lang,suspectedPlayer.name,formatMoney(amount));
      suspectedPlayer.hacking=NO_PLAYER;
      suspectingPlayer.beingHacked=false;
    }
  else
  {
      var amount = HACKING_INCORRECT_SUSPICION_FINE;
      removeCash(suspectingPlayer,amount);
      addCash(suspectedPlayer,amount);
      log("suspectHacker: "+suspectingPlayer.name+" incorrectly suspected "+suspectedPlayer.name+" and is fined "+formatMoney(HACKING_INCORRECT_SUSPICION_FINE));
      suspectedPlayer.status =  getPlayerStatusMsg(MSG_WRONG_SUSPICION,suspectedPlayer.lang,suspectingPlayer.name,formatMoney(amount));
      suspectingPlayer.status = getPlayerStatusMsg(MSG_NOT_HACKING,suspectingPlayer.lang,suspectedPlayer.name,formatMoney(amount));
      log("SUSPECTED: "+suspectedPlayer.status);
      log("SUSPECTING: "+suspectingPlayer.status);
   }
}
exports.suspectHacker = suspectHacker;

function checkHackers()
{
    players.forEach(function(player)
    {
        if (player.hacking != NO_PLAYER)
        {
          if (gameDate > player.hackingCompletionDate)
          {
            var hackedPlayer=getPlayer(player.hacking);
            if (hackedPlayer.cash <= 0)
            {
              player.status = getPlayerStatusMsg(MSG_SUCCESSFUL_HACK_NO_MONEY,player.lang,hackedPlayer.name);
            }
            else
            {
              var amount = Math.max(MIN_HACKING_AMOUNT,hackedPlayer.cash*HACKING_FRACTION);
              log("checkHackers: Successful hack("+formatMoney(amount)+") of "+hackedPlayer.name+" by "+player.name);
              removeCash(hackedPlayer,amount);
              addCash(player,amount);
              hackedPlayer.status = getPlayerStatusMsg(MSG_HACK_STEAL,hackedPlayer.lang,player.name,formatMoney(amount));
              hackedPlayer.beingHacked=false;
              player.status = getPlayerStatusMsg(MSG_SUCCESSFUL_HACK,player.lang,hackedPlayer.name,formatMoney(amount));
            }
            player.hacking=NO_PLAYER;
          }
        }
    });
}

setupInsider = function(insiderPlayerName)
{
  if (gameOver())
  {
    log("setupInsider ignored - game over");
    return;
  }
  log("setupInsider: "+insiderPlayerName+" asking for Insider information");
  var insiderPlayer=getPlayer(insiderPlayerName);
  if (insiderPlayer.prisonDaysRemaining > 0)
  {
    insiderPlayer.status=getPlayerStatusMsg(MSG_IN_PRISON,insiderPlayer.lang);
    return;
  }
  if (insiderPlayer.cash < INSIDER_FEE)
  {
    insiderPlayer.status = getPlayerStatusMsg(MSG_CANNOT_AFFORD_INSIDER,insiderPlayer.lang,formatMoney(INSIDER_FEE));
    return;
  }

  var upcomingEvent = events.findUpcomingEvent(gameDate,INSIDER_LOOKAHEAD_MONTHS);
  if (upcomingEvent == null)
  {
    insiderPlayer.status=getPlayerStatusMsg(MSG_NO_INTERESTING_EVENTS,insiderPlayer.lang);
    return;
  }
  insiderPlayer.status=getInsiderEventPlayerStatus(upcomingEvent,insiderPlayer.lang);
  
  log("setupInsider: "+insiderPlayer.status);
  removeCash(insiderPlayer,INSIDER_FEE);
  insiderPlayer.numInsiderDeals++;
  insiderPlayer.lastInsiderTradeDate=new Date(gameDate); 
}
exports.setupInsider = setupInsider;

function checkInsiderTrading()
{
  players.forEach(function(player)
  {
    if (player.prisonDaysRemaining==0 && playerConvicted(player))
    {
       // Player convicted of Insider Trading.
      var fine = INSIDER_BASE_FINE * player.numInsiderDeals;
      removeCash(player,fine);
      player.prisonReason="Insider Trading";
      player.prisonDaysRemaining = PRISON_DAYS_INCREMENT*(1+player.numInsiderDeals);
      log("checkInsiderTrading: "+player.name+" goes to prison for "+player.prisonDaysRemaining+" days");
      player.numInsiderDeals = 0;
      player.lastInsiderTradeDate=0;
      player.status=getPlayerStatusMsg(MSG_INSIDER_CONVICTED,player.prisonDaysRemaining);
    }
    else if (player.numInsiderDeals > 0)
    {
      var daysDiff = daysElapsed(gameDate,player.lastInsiderTradeDate); 
      //log("checkInsiderTrading: daysElapsed="+daysDiff);
      if (daysDiff > CRIME_EXPIRY_DAYS)
      {
        player.numInsiderDeals=0;
        player.lastInsiderTradeDate=0;
        log("checkInsiderTrading: Police have dropped their investigation into "+player.name);
        player.status=getPlayerStatusMsg(MSG_INSIDER_DROPPED,player.lang);
      }
    }
  });
}

function playerConvicted(player)
{
  return player.numInsiderDeals > 1 && Math.random() < player.numInsiderDeals/300;
}

exports.getPlayers=function()
{
  // Cannot send functions through the web socket so we calculate the net worth here before sending
  players.forEach(function(player)
  {
    player.netWorth=player.calcNetWorth(stocks);
  });
  return players;
}

getPlayer = function(playerName)
{
    var selectedPlayer=null;
    players.forEach(function(player)
    {
        if (player.name == playerName)
            selectedPlayer = player;
    });
    return selectedPlayer;
}
exports.getPlayer = getPlayer;

exports.registerPlayer = function(playerName,language)
{
  log("registerPlayer: Registering new player: "+playerName);
  players.push(new player.Player(playerName,getLanguageIndex(language)));
  getPlayer(playerName).status=getPlayerStatusMsg(MSG_REGISTERED,getLanguageIndex(language));
}

exports.validateNewPlayer=function(playerName)
{
  if (playerName.length >= MIN_USERNAME_LENGTH && playerName.length <= MAX_USERNAME_LENGTH && isAlphaNumeric(playerName))
  {
    return getPlayer(playerName) != null?REG_PLAYER_EXISTS:REG_PLAYER_OK;
  }
  return REG_PLAYER_ERROR;
}

exports.processBots=function()
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name == EINSTEIN)
      processEinstein();
    else if (players[i].name.startsWith(BOT_NAME_PREFIX))
      processBot(players[i]);
  }
}

processBot=function(bot)
{
  var rndAmount = MIN_STOCK_PURCHASE*(1+Math.floor(Math.random()*20));
  var rndStock=Math.floor(Math.random()*stocks.length);
  var stockName=stocks[rndStock].name;
  
  if (bot.getStockHolding(stockName) > 0 && stocks[rndStock].price > 50 && stocks[rndStock].trend < 0)
    sellStock(bot.name,stockName,rndAmount);
  else if (stocks[rndStock].trend > 0 || stocks[rndStock].price < 50)
    buyStock(bot.name,stockName,rndAmount);
  else if (Math.random() > .95 && bot.hacking==NO_PLAYER)
    setupHack(bot.name,chooseRandomPlayer(bot.name).name);
  else if (Math.random() > .95)
    setupInsider(bot.name);
  else if (bot.beingHacked)
    suspectHacker(bot.name,chooseRandomPlayer(bot.name).name);

  if (bot.status != "")
    log(bot.name+": "+getPlayer(bot.name).status);
}

processEinstein=function()
{
  var p = getPlayer(EINSTEIN);
  
  var worstPerformingStockIndex = findWorstPerformingStockIndex(p);
  if (p.beingHacked && p.cash > 20000)
    suspectHacker(EINSTEIN,chooseRandomPlayer(EINSTEIN).name);
  else if (worstPerformingStockIndex !=-1)
  {
    var worstStockName=stocks[worstPerformingStockIndex].name;
    sellStock(EINSTEIN,worstStockName,p.getStockHolding(worstStockName));
    log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
    return;
  }
  
  var bestPerformingStockIndex = findBestPerformingStockIndex(p);
  if (bestPerformingStockIndex !=-1)
  {
    buyStock(EINSTEIN,stocks[bestPerformingStockIndex].name,1000);
    log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
    return;
  }
  else if (p.cash < 20000 && p.hacking==NO_PLAYER)
  {
    var playerToHackIndex=choosePlayerToHack(EINSTEIN);
    if (playerToHackIndex !=-1)
      setupHack(EINSTEIN,players[playerToHackIndex].name);
  }
  else if (p.numInsiderDeals == 0)
    setupInsider(EINSTEIN);
}
    
findWorstPerformingStockIndex = function(p)
{
  var worstTrend = 100;
  var worstIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (p.getStockHolding(stocks[i].name) > 0 && stocks[i].trend < 0 && stocks[i].price > 50 && stocks[i].trend < worstTrend)
    {
      worstTrend=stocks[i].trend;
      worstIndex=i;
    }
  }
  return worstIndex;
}

findBestPerformingStockIndex = function(p)
{
  var bestTrend = -100;
  var bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].available > 0 && stocks[i].trend > 0 && stocks[i].price < 300 && stocks[i].trend > bestTrend)
    {
      bestTrend=stocks[i].trend;
      bestIndex=i;
    }
  }
  return bestIndex;
}

chooseRandomPlayer=function(playerName)
{
  while(true)
  {
    var rndIndex =  Math.floor(Math.random()*players.length);
    if (players[rndIndex].name != playerName)
      return players[rndIndex];
  }
}

choosePlayerToHack=function(playerName)
{
  var bestIndex = -1;
  var best=-1;
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name != playerName && players[i].beingHacked==false && players[i].cash > best)
    {
      best=players[i].cash;
      bestIndex=i;
    }
  }
  return bestIndex;
}

log=function(msg)
{
  console.log(new Date(gameDate).toLocaleDateString("en-UK")+": "+msg);
}