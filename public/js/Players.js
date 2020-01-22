global.EINSTEIN="EINSTEIN";
global.BOT_NAME_PREFIX="BOT";

global.HACKING_DURATION_DAYS = 30;
global.HACKING_SUSPENSION_DAYS=30;
global.ERROR_HACK_ALREADY_IN_PROGRESS=-1;

global.INSIDER_LOOKAHEAD_DAYS = 60;
global.INSIDER_EXPIRY_DAYS=45;

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

exports.processDay=function(gameDate,newsEvent,interestRate)
{
    processBots(gameDate);
    checkInsiderTrading(gameDate);
    applyInterestRates(interestRate);
    return processNewsEvent(newsEvent);
}

processNewsEvent=function(newsEvent)
{
    if (newsEvent!= null)
    {
        switch(newsEvent.type)
        {
            case EVENT_LOTTERY_WIN:
                newsEvent=processLottery(newsEvent);
       }
    }
    return newsEvent;
}

exports.weHaveAMillionnaire=function()
{
    for (var i=0;i<players.length;i++)
    {
        if (players[i].isMillionnaire())
            return true;
    }
    return false;
}

exports.getWinnerName=function()
{
    //return players.reduce(function(prev, current) {return (prev.y > current.y) ? prev : current});
    
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

processBots=function(gameDate)
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name == EINSTEIN)
      players[i].processEinstein(gameDate);
    else if (players[i].name.startsWith(BOT_NAME_PREFIX))
      players[i].processBot(gameDate);
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

function checkInsiderTrading(gameDate)
{
  players.forEach(function(player)
  {
    if (!broker.accountIsSuspended(player.name) && player.isConvicted())
    {
      broker.suspendAccount(player,name,PRISON_DAYS_INCREMENT*(1+player.numInsiderDeals))
      player.numInsiderDeals = 0;
      player.lastInsiderTradeDate=0;
      player.setStatus(MSG_INSIDER_CONVICTED,broker.getRemainingSuspensionDays(player.name));
    }
    else if (player.numInsiderDeals > 0)
    {
      var daysDiff = daysElapsed(gameDate,player.lastInsiderTradeDate); 
      if (daysDiff > INSIDER_EXPIRY_DAYS)
      {
        player.numInsiderDeals=0;
        player.lastInsiderTradeDate=0;
        player.setStatus(MSG_INSIDER_DROPPED);
      }
    }
  });
}

processLottery=function(newsEvent)
{
  var lotteryWinner=findLotteryWinner();
  var win = BASE_LOTTERY_WIN+10000*Math.floor(Math.random()*5);
  broker.depositCash(lotteryWinner.name,win);
  newsEvent.headLine = newsEvent.headLine.replace("$name",lotteryWinner.name);
  newsEvent.headLine = newsEvent.headLine.replace("$win",win);
  lotteryWinner.setStatus(MSG_EVENT_LOTTERY_WIN,formatMoney(win));
  return newsEvent;
}

findLotteryWinner=function()
{
    var best=-1;
    var bestIndex=-1;
    for (var i=0;i<players.length;i++)
    {
        var playerChance = Math.random()*(1+players[i].getBankBalance()); // More cash in bank means more chance of winning
        if (playerChance > best)
        {
            best=playerChance;
            bestIndex=i;
        }
    }
    return players[bestIndex];
}

applyInterestRates = function(interestRate)
{
  players.forEach(function(player)
  {
    if (player.balance > 0)
        player.balance*=(100+interestRate/20)/100;
  });
}