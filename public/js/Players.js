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

exports.getPlayers=function()
{
    return players;
}

exports.processDay=function(gameDate)
{
    checkInsiderTrading();
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

exports.setupInsider=function(playerName)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.setupInsider();
}

exports.depositCash=function(playerName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.depositCash(amount);
}

exports.withDrawCash=function(playerName,amount)
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

exports.allPlayersBankrupt=function()
{
    for (var i=0;i<players.length;i++)
    {
        if (!players[i].isBankrupt())
            return false;
    }
    return true;
}

exports.processBots=function()
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