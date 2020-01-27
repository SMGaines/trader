global.HACKING_DURATION_DAYS = 30;
global.HACKING_SUSPENSION_DAYS=30;
global.ERROR_HACK_ALREADY_IN_PROGRESS=-1;

global.INSIDER_LOOKAHEAD_DAYS = 60;
global.INSIDER_EXPIRY_DAYS=45;
global.INSIDER_SUSPENSION_DAYS_BASE=10;

global.BASE_LOTTERY_WIN = 50000;
global.TAX_PERCENTAGE=20; // Percentage tax rate on shares for a tax return
global.XMAS_PRESENT_BASE=10000;

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

exports.getNumPlayers=function()
{
    return players.length;
}

exports.getPlayerSummaries=function()
{
    var playerSummary=[];
    players.forEach(function(player)
    {
        playerSummary.push(player.getSummary());
        player.clearStatus();
    });
    return playerSummary;
}

exports.processDay=function(gameDate,newsEvent)
{
    processBots(gameDate);
    checkInsiderTrading(gameDate);
    applyInterestRates();
    if (isChristmas(gameDate))
        processChristmas();
    return processPlayersEvent(newsEvent);
}

processPlayersEvent=function(newsEvent)
{
    if (newsEvent!= null)
    {
        switch(newsEvent.type)
        {
            case EVENT_LOTTERY_WIN:
                newsEvent=processLottery(newsEvent);
                break;
            case EVENT_TAX_RETURN:     
                processTaxReturns();   
                break;
        }
    }
    return newsEvent;
}

processChristmas=function()
{
    players.forEach(function(player)
    {
      var xmasPresent=XMAS_PRESENT_BASE*(1+2*Math.random());
      broker.depositCash(player.name,xmasPresent);
      player.setStatus(MSG_HAPPY_XMAS,formatMoney(xmasPresent));
    });
}

processTaxReturns=function()
{
  console.log("taxReturn: Processing");
  players.forEach(function(player)
  {
    var totalTax=broker.taxReturn(player.name);
    player.setStatus(MSG_TAX,formatMoney(totalTax));
  });
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
        player.suspectHacker(hackerName,players.length);
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
        player.bankCash(amount);
}

processBots=function(gameDate)
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name.startsWith(EINSTEIN_PREFIX))
      players[i].processEinstein(gameDate,players.length);
    else if (players[i].name.startsWith(BOT_NAME_PREFIX))
      players[i].processBot(gameDate,players.length);
  }
  logBotActivity();
}

// ****** Internal functions **********

logBotActivity=function()
{
    for (var i=0;i<players.length;i++)
    {
        var pSummary=players[i].getSummary();
        var stockStr="[";
        for (var j=0;j<pSummary.account.stocks.length;j++)
        {
            if (pSummary.account.stocks[j].amount > 0)
                stockStr+=pSummary.account.stocks[j].name+":"+pSummary.account.stocks[j].amount+",";
        }
        stockStr+="]";
        console.log(players[i].name+"/Bank:"+formatMoney(pSummary.balance)+"/Cash:"+formatMoney(pSummary.account.cash)+
                    "/Suspended:"+(pSummary.account.suspensionDays>0?"Y":"N")+"/stocks:"+stockStr);
  }  
}

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
      broker.suspendAccount(player.name,INSIDER_SUSPENSION_DAYS_BASE*(1+player.numInsiderDeals))
      player.clearInsiderTrading();
      player.setStatus(MSG_INSIDER_CONVICTED,broker.getRemainingSuspensionDays(player.name));
    }
    else if (player.numInsiderDeals > 0)
    {
      var daysDiff = daysElapsed(gameDate,player.lastInsiderTradeDate); 
      if (daysDiff > INSIDER_EXPIRY_DAYS)
      {
        player.clearInsiderTrading();
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
  newsEvent.headLine = newsEvent.headLine.replace("$win",formatMoney(win));
  lotteryWinner.setStatus(MSG_EVENT_LOTTERY_WIN,formatMoney(win));
  return newsEvent;
}

findLotteryWinner=function()
{
    var best=-1;
    var bestIndex=-1;
    for (var i=0;i<players.length;i++)
    {
        var playerChance = Math.random()*(1+players[i].getBankBalance()/100000); // More cash in bank means more chance of winning
        if (playerChance > best)
        {
            best=playerChance;
            bestIndex=i;
        }
    }
    return players[bestIndex];
}

applyInterestRates = function()
{
  players.forEach(function(player)
  {
    var interestRate= 1+player.balance/50000;
    if (player.balance > 0)
        player.balance*=(100+interestRate/50)/100;
  });
}