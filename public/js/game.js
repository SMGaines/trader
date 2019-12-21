const INITIAL_INTEREST_RATE=5;
const INITIAL_INFLATION_RATE=5;

const REG_PLAYER_OK = 0;
const REG_PLAYER_EXISTS=1;
const REG_PLAYER_ERROR = 2;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 8;

const HACKING_DURATION_DAYS = 60;
const HACKING_FEE = 5000;
const HACKING_FINE = 25000;
const HACKING_FRACTION = .3;
const MIN_HACKING_AMOUNT = 10000;
const HACKING_INCORRECT_SUSPICION_FINE = 10000;
const HACKING_PRISON_SENTENCE=30;
const INSIDER_FEE=5000;
const INSIDER_BASE_FINE = 10000;
const INSIDER_LOOKAHEAD_MONTHS = 3;

const NO_PLAYER="NONE";

const PRISON_DAYS_INCREMENT = 10;
const CRIME_EXPIRY_DAYS = 60;

const BASE_LOTTERY_WIN = 50000;

const TAX_PERCENTAGE=20;

var stk =require("./stock.js");
var player = require('./player.js');
var events = require('./events.js');
var msgs = require("./messages.js");

var stocks = [];
var players=[];

var numBots;
var interestRate;
var inflationRate;
var gameDate;
var gameEndDate;

exports.init = function(gameDurationInMonths,gameLang)
{
  gameDate = new Date("January 1 2020 00:00:00");
  gameEndDate=new Date(gameDate);
  gameEndDate.setMonth(gameDate.getMonth()+gameDurationInMonths);
  log("Game ends on: "+gameEndDate);
  setupStock();
  events.setupEvents(gameDate,gameDurationInMonths,stocks,IPO_STOCK,getLanguageIndex(gameLang)); // eg convert "EN" to a number (0)
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

exports.isMonthStart=function()
{
  return gameDate.getDate() == 1;
}

exports.nextDay = function()
{
  for (var i=0;i<players.length;i++)
  {
    players[i].status="";
    if (players[i].prisonDaysRemaining > 0)
    {
      players[i].prisonDaysRemaining--;
      if (players[i].prisonDaysRemaining == 0)
        player.status = getPlayerStatusMsg(MSG_PRISON_RELEASE,player.lang);
    }
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
  checkHackers();
  checkInsiderTrading();
}

gameOver = function()
{
  return gameDate >= gameEndDate;
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
  stocks.push(new stk.Stock(STOCK_GOVT,RISK_NONE));
  stocks.push(new stk.Stock(STOCK_GOLD,RISK_LOW));
  stocks.push(new stk.Stock(STOCK_OIL,RISK_MEDIUM));
  stocks.push(new stk.Stock(STOCK_HITECH,RISK_HIGH));
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

getPlayerStatusMsg=function(msgType,lang,argX,argY,argZ)
{
  var msg =msgType[lang];
  if (argX !== undefined) msg=msg.replace("$x",argX);
  if (argY !== undefined) msg=msg.replace("$y",argY);
  if (argZ !== undefined) msg=msg.replace("$z",argZ);
  return msg;
}

getInsiderEventPlayerStatus = function(event,lang)
{
  var interestingEventDate = getMonthYear(event.date);
  switch(event.type)
  {
    case EVENT_CRASH: return getPlayerStatusMsg(MSG_EVENT_STOCK_CRASH,lang,event.stockName,interestingEventDate);
    case EVENT_BOOM: return getPlayerStatusMsg(MSG_EVENT_STOCK_BOOM,lang,event.stockName,interestingEventDate);
    case EVENT_CRASH_ALL_STOCKS: return getPlayerStatusMsg(MSG_EVENT_STOCK_MARKET_CRASH,lang,interestingEventDate);
    case EVENT_BOOM_ALL_STOCKS: return getPlayerStatusMsg(MSG_EVENT_STOCK_MARKET_BOOM,lang,interestingEventDate);
    case EVENT_STOCK_IPO:return getPlayerStatusMsg(MSG_EVENT_STOCK_IPO,lang,interestingEventDate);
    case EVENT_STOCK_RELEASE: return getPlayerStatusMsg(MSG_EVENT_EXTRA_STOCK,lang,event.stockName,interestingEventDate);
    case EVENT_STOCK_DIVIDEND: return getPlayerStatusMsg(MSG_EVENT_STOCK_DIVIDEND,lang,event.stockName,interestingEventDate);
    case EVENT_SHARES_SUSPENDED: return getPlayerStatusMsg(MSG_EVENT_STOCK_SUSPENDED,lang,event.stockName,interestingEventDate);
    default: log("setupInsider: Unknown event type: "+event.type);return "";
  }
}

function getMonthYear(aDate)
{
    return aDate.toLocaleString('default', { month: 'long' }) + " "+aDate.getFullYear();
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
      removeCash(player,100*(interestRate-inflationRate));
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
  log("addCash: "+player.name+": Cash change from "+ formatMoney(player.cash-amount)+" to "+formatMoney(player.cash));
}

function sellAllPlayerStock(player)
{
  log("sellAllPlayerStock: "+player.name);
  player.stocks.forEach(function(stockHolding)
  {
    if (stockHolding.amount > 0)
    {
      sellStock(player.name,stockHolding.name,stockHolding.amount);
    }
  });
}

function getRandomFactor()
{
  return 3*(Math.random()-Math.random());
}

function getRiskMultiplier(riskiness)
{
    switch(riskiness)
    {
        case RISK_NONE: return 1;
        case RISK_LOW: return 1.1;
        case RISK_MEDIUM: return 1.3;
        case RISK_HIGH: return 1.5;
        case RISK_CRAZY: return 2;
    }
}

sellStock = function(playerName,stockName,amount)
{
  if (gameOver())
  {
    log("sellStock ignored - game over");
    return;
  }
  var player = getPlayer(playerName);
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
     player.sellStock(stockName,sellableAmount,salePrice);
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
    log("buyStock: "+playerName+" buys "+amount+" of "+stockName+" at "+formatMoney(buyPrice));
    removeCash(player,affordableAmount*buyPrice);
    stock.buy(affordableAmount);
    player.status = getPlayerStatusMsg(MSG_SHARE_BUY,player.lang,affordableAmount,stockName,formatMoney(buyPrice));             
  }
}
exports.buyStock = buyStock;

function roundStock(amount)
{
  return STOCK_INCREMENT*Math.floor(amount/STOCK_INCREMENT);
}

exports.processMonth = function()
{
  log("processMonth");
  var monthEvent;
  if (gameOver())
  {
      return null;
  }
  monthEvent=events.getMonthEvent(gameDate);
  if (monthEvent != null)
  {
    switch(monthEvent.type)
    {
      case EVENT_NONE:
        break;
      case EVENT_CRASH:
        var stock = getStock(monthEvent.stockName);
        stock.trend=-STOCK_MAX_TREND;
        break;
      case EVENT_BOOM:
        var stock = getStock(monthEvent.stockName);
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
          monthEvent.headLine = monthEvent.headLine.replace("$name",players[rndPlayerIndex].name);
          monthEvent.headLine = monthEvent.headLine.replace("$win",formatMoney(win));
          log("EVENT_LOTTERY_WIN: "+players[rndPlayerIndex].name+" wins "+formatMoney(win));
          addCash(players[rndPlayerIndex],win);
        }
        else
        {
          monthEvent.headLine = monthEvent.headLine=getPlayerStatusMsg(MSG_NEWS_HEAD_NO_LOTTERY_WINNER,player.lang);
          monthEvent.headLine = monthEvent.tagLine=getPlayerStatusMsg(MSG_NEWS_SUB_NO_LOTTERY_WINNER,player.lang);
        }
        break;
      case EVENT_STOCK_IPO:
        log("EVENT_STOCK_IPO: "+monthEvent.stockName);
        stocks.push(new stk.Stock(monthEvent.stockName,RISK_NONE));
        break;
      case EVENT_STOCK_RELEASE:
        log("EVENT_STOCK_RELEASE: "+monthEvent.stockName);
        getStock(monthEvent.stockName).available+=MIN_STOCK_RELEASE_AMOUNT+STOCK_INCREMENT*Math.floor(Math.random()*10);
        break;
      case EVENT_STOCK_DIVIDEND:
        log("EVENT_STOCK_DIVIDEND: "+monthEvent.stockName);
        players.forEach(function(player)
        {
          var playerStock = player.getStockHolding(monthEvent.stockName)
          if (playerStock > 0 && player.prisonDaysRemaining == 0) // Naughty players dont get stock
          {
            var dividendAmount = roundStock(playerStock*STOCK_DIVIDEND_RATIO);
            if (dividendAmount < STOCK_INCREMENT)
              dividendAmount = STOCK_INCREMENT;
            player.buyStock(monthEvent.stockName,dividendAmount,0);
            player.status= getPlayerStatusMsg(MSG_DIVIDEND,player.lang,dividendAmount,monthEvent.stockName);
          }
        });
        break;       
      case EVENT_SHARES_SUSPENDED:
        getStock(monthEvent.stockName).price=0;
        getStock(monthEvent.stockName).suspensionDays=30+Math.floor(Math.random()*30);
        log("EVENT_SHARES_SUSPENDED: "+monthEvent.stockName+" suspended for "+getStock(monthEvent.stockName).suspensionDays+" days");
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
      case EVENT_INTEREST_RATE_UP:
        interestRate++;
        break;
      case EVENT_INTEREST_RATE_DOWN:
        interestRate--;
        break;
      case EVENT_INFLATION_RATE_UP:
        inflationRate++;
        break;
      case EVENT_INFLATION_RATE_DOWN:
        inflationRate--;
        break;
    }
  }
  return monthEvent;
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
    if (players[i].prisonDaysRemaining > 0) // Cannot win the lottery if in prison
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

function formatMoney(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    return formatter.format(amount);
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

function daysElapsed(nowDate,lastCrimeDate)
{
  const diffTime = Math.abs(nowDate - lastCrimeDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function playerConvicted(player)
{
  return Math.random() < player.numInsiderDeals/300;
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

getLanguageIndex=function(lang)
{
  if (lang == "EN")
    return LANG_EN;
  if (lang == "PL")
    return LANG_PL;
    return LANG_EN;
}

exports.validateNewPlayer=function(playerName)
{
  if (playerName.length >= MIN_USERNAME_LENGTH && playerName.length <= MAX_USERNAME_LENGTH && isAlphaNumeric(playerName))
  {
    return getPlayer(playerName) != null?REG_PLAYER_EXISTS:REG_PLAYER_OK;
  }
  return REG_PLAYER_ERROR;
}

function isAlphaNumeric(str) 
{
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) 
  {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
}
exports.registerBot = function(botName)
{
    var p = getPlayer(botName);
    if (p == null)
    {
        log("addPlayer: Registering new BOT: "+botName);
        players.push(new player.Player(botName,LANG_EN));
        numBots++;
    }
    else
        log("addPlayer: Player "+botName+" already exists - ignoring");
}

exports.processBots=function()
{
  if (numBots==0)
    return;
  var rndBotIndex = 1+Math.floor(numBots*Math.random());
  var rndBotName = BOT_NAME_PREFIX+rndBotIndex;
  var rndAmount = MIN_STOCK_PURCHASE*(1+Math.floor(Math.random()*20));
  var rndStock=Math.floor(Math.random()*stocks.length);
  var p = getPlayer(rndBotName);
  var stockName=stocks[rndStock].name;
  
  if (p.getStockHolding(stockName) > 0 && stocks[rndStock].trend < 0)
    sellStock(rndBotName,stockName,rndAmount);
  if (stocks[rndStock].trend > 0)
      buyStock(rndBotName,stockName,rndAmount);

  if (Math.random() > .95 && p.hacking==NO_PLAYER)
    setupHack(rndBotName,chooseRandomPlayer(rndBotName).name);
  if (Math.random() > .95)
    setupInsider(rndBotName);
  if (p.beingHacked)
    suspectHacker(rndBotName,chooseRandomPlayer(rndBotName).name);

  if (p.status != "")
    log(rndBotName+": "+getPlayer(rndBotName).status);
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

log=function(msg)
{
  console.log(new Date(gameDate).toLocaleDateString("en-UK")+": "+msg);
}