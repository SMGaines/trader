global.HACKING_DURATION_DAYS = 30;
global.HACKING_SUSPENSION_DAYS=30;
global.ERROR_HACK_ALREADY_IN_PROGRESS=-1;

global.INSIDER_LOOKAHEAD_DAYS = 60;
global.INSIDER_EXPIRY_DAYS=45;
global.INSIDER_SUSPENSION_DAYS_BASE=10;

global.BASE_LOTTERY_WIN = 50000;
global.TAX_PERCENTAGE=20; // Percentage tax rate on shares for a tax return
global.XMAS_PRESENT_BASE=10000;

// *** Shared with processPlayer.js
const PLAYER_INVALID_NAME_LENGTH = -1;
const PLAYER_INVALID_NAME = -2;
const PLAYER_DUPLICATE=-3;
// ***

var player = require('./player.js');
var broker=require("./broker.js");
const { formatMoney } = require('./utils.js');

players=[];

exports.registerPlayer=function(playerName,type)
{
    var newPlayer = new player.Player(playerName,type);
    newPlayer.initialise();
    players.push(newPlayer);
}

exports.clearPlayers=function()
{
    players=[];
}

exports.validateNewPlayer=function(playerName)
{
    if (playerName.length < 3 || playerName.length > 8)
        return PLAYER_INVALID_NAME_LENGTH;
    if (!isAlphaNumeric(playerName))
        return PLAYER_INVALID_NAME;
    if (findPlayer(playerName) != null)
        return PLAYER_DUPLICATE; //Player shouldn't exist
    return 0;
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

exports.processDay=function(gameDate,gameEndDate,newsEvent,interestRate)
{
    processBots(gameDate,gameEndDate);
    checkInsiderTrading(gameDate);
    applyInterestRates(interestRate);
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

// 1) Any borrowed(shorted) shares are paid back at market rate
// 2) If the account has a negative balance, pay it off from the bank account;
// (Used right at end of game)

exports.payAccountDebts=function()
{
    players.forEach(function(player)
    {
        broker.forceMarginCalls(player.name);

        var accountBalance = broker.getCash(player.name);
        if (accountBalance < 0)
        {
            player.debit(Math.abs(accountBalance));
            player.setStatus(MSG_DEBTS_PAID,formatMoney(Math.abs(accountBalance)))
            console.log("Players: payAccountDebts: "+player.name+" paying debts of "+formatMoney(Math.abs(accountBalance)));
        }
    });
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
    //return players.reduce(function(prev, current) {return (prev.y > current.y) ? prev : current}).name;
    
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

exports.shortStock=function(playerName,stockName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.shortStock(stockName,amount);
}

exports.repayStock=function(playerName,stockName)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.repayStock(stockName);
}

exports.sellStock=function(playerName,stockName,amount)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.sellStock(stockName,amount);
}

exports.setupHack=function(playerName,hackedPlayerName)
{
    var hackingPlayer=findPlayer(playerName);
    if (hackingPlayer!=null)
        hackingPlayer.setupHack(hackedPlayerName);
}

exports.suspectHacking=function(playerName)
{
    var player=findPlayer(playerName);
    if (player!=null)
        player.suspectHacking();
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

processBots=function(gameDate,gameEndDate)
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name.startsWith(EINSTEIN_PREFIX))
      players[i].processEinstein(gameDate,gameEndDate,players.length);
    else if (players[i].name.startsWith(BOT_NAME_PREFIX))
      players[i].processBot(gameDate,gameEndDate,players.length);
  }
  //logBotActivity(gameDate);
}

// ****** Internal functions **********

logBotActivity=function(gameDate)
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
        console.log(gameDate.toLocaleDateString("en-UK")+": "+players[i].name+"/Bank:"+formatMoney(pSummary.balance)+"/Cash:"+formatMoney(pSummary.account.cash)+
                    "/Suspended:"+(pSummary.account.suspensionDays>0?"Y":"N")+"/stocks:"+stockStr+"("+formatMoney(broker.getStockValue(players[i].name))+")");
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

// Interest rate is a number between 1 and 5
applyInterestRates = function(interestRate)
{
  players.forEach(function(player)
  {
    if (player.balance > 0)
    {
        player.balance*=(100+interestRate/10)/100;
    }
  });
}