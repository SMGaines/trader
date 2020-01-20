global.EINSTEIN="EINSTEIN";
global.BOT_NAME_PREFIX="BOT";
global.HACKING_DURATION_DAYS = 30;
global.HACKING_SUSPENSION_DAYS=30;
global.HACKING_FEE = 5000;
global.HACKING_FINE = 25000;
global.HACKING_FRACTION = .3;
global.MIN_HACKING_AMOUNT = 10000;
global.HACKING_INCORRECT_SUSPICION_FINE = 40000;
global.ERROR_HACK_ALREADY_IN_PROGRESS=-1;
global.INSIDER_FEE=5000;
global.INSIDER_BASE_FINE = 10000;
global.INSIDER_LOOKAHEAD_DAYS = 60;
global.BASE_LOTTERY_WIN = 50000;

var player = require('./player.js');
var broker=require("./broker.js");

players=[];

exports.registerPlayer=function(playerName,type)
{
    var newPlayer = new player.Player(playerName,type);
    newPlayer.initialise();
    players.push(newPlayer);
}

exports.getPlayer=function(playerName)
{
    return findPlayer(playerName);
}

exports.getPlayerSummaries=function()
{
    var playerSummary=[];
    players.forEach(function(player)
    {
        playerSummary.push(player.getSummary());
    });
    return playerSummary;
}

exports.processDay=function(gameDate,mktEvent)
{
    if (mktEvent!= null)
    {
        switch(mktEvent.type)
        {
            case EVENT_STOCK_SPLIT:
                broker.splitStock(mktEvent.stockName);
                break;
            case EVENT_STOCK_DIVIDEND:
                broker.payDividend(mktEvent.stockName);
                break;
            case EVENT_TAX_RETURN:     
                broker.taxReturn();   
                break; 
            case EVENT_LOTTERY_WIN:
                processLottery(mktEvent);
                break; 
        }
    }
        
    processBots();
    checkInsiderTrading();
    applyInterestRates();
    return mktEvent;
}

exports.weHaveAMillionnaire=function()
{
    for (var i=0;i<players.length;i++)
    {
        if (players[i].balance >= 1000000)
            return true;
    }
    return false;
}

exports.getWinnerName=function()
{
    var bestIndex=-1;
    var bestScore=-1;
    for (var i=0;i<players.length;i++)
    {
        if (players[i].balance > bestScore)
        {
            bestScore=players[i].balance;
            bestIndex=i;
        }
    }
    return players[bestIndex].name;
}

exports.buyStock=function(playerName,stockName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.buyStock(stockName,amount);
}

exports.sellStock=function(playerName,stockName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.sellStock(stockName,amount);
}

exports.setupHack=function(playerName,hackedPlayerName)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.setupHack(hackedPlayerName);
}

exports.suspectHacker=function(playerName,hackerName)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.suspectHacker(hackerName);
}

exports.setupInsider=function(playerName,gameDate)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.setupInsider(gameDate);
}

exports.depositCash=function(playerName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.depositCash(amount);
}

exports.bankCash=function(playerName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.withDrawCash(amount);
}

exports.findLotteryWinner=function()
{
    var best=0;
    var bestIndex=-1;
    for (var i=0;i<players.length;i++)
    {
        var bankBalance=players[i].getBankBalance();
        var playerChance = players[i].bankrupt()?0:Math.random()*(1+bankBalance); // More cash in bank means more chance of winning
        if (playerChance > best)
        {
            best=playerChance;
            bestIndex=i;
        }
    }
    return players[bestIndex];
}

allPlayersBankrupt=function()
{
    for (var i=0;i<players.length;i++)
    {
        if (!players[i].isBankrupt())
            return false;
    }
    return true;
}

processBots=function()
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name == EINSTEIN)
      players[i].processEinstein();
    else if (players[i].name.startsWith(BOT_NAME_PREFIX))
      players[i].processBot();
  }
}

// ****** Internal functions **********

findPlayer = function(playerName)
{
    for (var i=0;i<players.length;i++)
    {
        if (playerName==players[i].name)
            return players[i];
    }
    return null;
}

function checkInsiderTrading()
{
  players.forEach(function(player)
  {
    if (player.prisonDaysRemaining==0 && playerConvicted(player))
    {
       // Player convicted of Insider Trading.
      var fine = INSIDER_BASE_FINE * player.numInsiderDeals;
      this.balance-=fine;
      broker.suspendAccount(player,name,PRISON_DAYS_INCREMENT*(1+player.numInsiderDeals))
      log("checkInsiderTrading: "+player.name+" goes to prison for "+broker.getRemainingSuspensionDays(player.name)+" days");
      player.numInsiderDeals = 0;
      player.lastInsiderTradeDate=0;
      player.status=getPlayerStatusMsg(MSG_INSIDER_CONVICTED,broker.getRemainingSuspensionDays(player.name));
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

processLottery=function(newsEvent)
{
  // Need to generate a random winner and update the text
  if (allPlayersBankrupt())
  {
    newsEvent.headLine = newsEvent.headLine=getPlayerStatusMsg(MSG_NEWS_HEAD_NO_LOTTERY_WINNER);
    newsEvent.headLine = newsEvent.tagLine=getPlayerStatusMsg(MSG_NEWS_SUB_NO_LOTTERY_WINNER);
  }
  var lotteryWinner=players.getLotteryWinner();
  var win = BASE_LOTTERY_WIN+10000*Math.floor(Math.random()*5);
  broker.depositCash(this.name,win);
  return newsEvent;
}

exports.getEndOfGameEvent=function()
{
  var endEvent = events.getEndOfGameEvent();
  endEvent.headLine = endEvent.headLine.replace("$name",getWinnerName());
  log("getEndOfGameEvent: "+endEvent.headLine);
  return endEvent;
}

applyInterestRates = function()
{
  players.forEach(function(player)
  {
    if (player.balance > 0)
        player.balance*=(100+interestRate/5)/100;
  });
}