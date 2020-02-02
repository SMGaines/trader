var mkt=require("./stockmarket.js");
var broker=require("./broker.js");
var events = require('./events.js');

exports.processBot=function(player,gameDate,gameEndDate,numPlayers)
{
  if (player.name == "BOT1")
  {
    if (broker.getCash(player.name) > 0)
      player.bankCash(broker.getCash(player.name));
    return;
  }
  if (player.name == "BOT2")
  {
    if (broker.getCash(player.name) > 0)
      player.bankCash(broker.getCash(player.name));
    return;
  }
  var rndAmount = MIN_STOCK_PURCHASE*(1+Math.floor(Math.random()*20));
  var rndStock=mkt.getRandomStock();
  if (nearEndOfGame(gameEndDate,gameDate) || player.amMillionnaireOnPaper())
  {
    var stockNameToSell=findStockNameToSell(player);
    var amount= broker.getStockHolding(player.name,stockNameToSell);
    if (amount>0)
      player.sellStock(stockNameToSell,amount);
    else if (broker.getCash(player.name) > 0)
      player.bankCash(broker.getCash(player.name));
  }    
  else if (broker.getStockHolding(player.name,rndStock.name) > 0 && rndStock.price > 50 && rndStock.trend < 0)
    player.sellStock(rndStock.name,rndAmount);
  else if (rndStock.trend > 0 || rndStock.price < 50 && rndStock.available > 0)
    player.buyStock(rndStock.name,rndAmount);
  else if (Math.random() > .95 && broker.getCash(player.name) > 0)
    player.bankCash(.1*broker.getCash(player.name));
  else if (Math.random() > .95 && !broker.hackInProgress(player.name))
  {
    var playerToHackName=broker.chooseAccountNameToHack(player.name);
    if (playerToHackName!="NONE")
      player.setupHack(playerToHackName);
  }
  else if (Math.random() > .95)
    player.setupInsider(gameDate);
  else if (broker.beingHacked(player.name))
    player.suspectHacker(broker.chooseRandomAccountName(player.name),numPlayers);
}

  function nearEndOfGame(gameEndDate,gameDate)
  {
    return daysElapsed(gameEndDate,gameDate) < 10;
  }

  exports.processEinstein=function(player,gameDate,gameEndDate,numPlayers)
  {
    var bestPerformingStock=mkt.getFastestRisingStock();
    var worstPerformingStock=mkt.getFastestFallingStock();
    if (nearEndOfGame(gameEndDate,gameDate))
    {
      var stockNameToSell=findStockNameToSell(player);
      var amount= broker.getStockHolding(player.name,stockNameToSell);
      if (amount>0)
        player.sellStock(stockNameToSell,amount);
      else if (broker.getCash(player.name) > 0)
        player.bankCash(broker.getCash(player.name));
    }
    else if (Math.random() > .95 && broker.getCash(player.name) > 0)
      player.bankCash(.1*broker.getCash(player.name));
    else if (Math.abs(bestPerformingStock.trend) > Math.abs(worstPerformingStock.trend) && bestPerformingStock.available >0 && (bestPerformingStock.trend >= 1 || bestPerformingStock.price < 50))
      player.buyStock(bestPerformingStock.name,bestPerformingStock.available);
    else if (worstPerformingStock.trend < -1 && broker.getStockHolding(player.name,worstPerformingStock) > 0)
      player.sellStock(worstPerformingStock.name,broker.getStockHolding(player.name,bestPerformingStock.name));
    else if (Math.random() > .95 && !broker.hackInProgress(player.name))
    {
      var playerToHackName=broker.chooseAccountNameToHack(player.name);
      if (playerToHackName!="NONE")
        player.setupHack(playerToHackName);
    }
    else if (broker.beingHacked(player.name) && Math.random() > .95)
      player.suspectHacker(broker.chooseRandomAccountName(player.name),numPlayers);
    else if (player.numInsiderDeals == 0)
    {
      var insiderEvent = player.setupInsider(gameDate);
      if (insiderEvent == null)
        return;
      player.processInsiderEvent(insiderEvent);
    }
  }

  findStockNameToSell=function(player)
  {
    for (var i=0;i<STOCK_NAMES.length;i++)
    {
      var holding = broker.getStockHolding(player.name,STOCK_NAMES[i]);
      if (holding > 0)
        return STOCK_NAMES[i];
    }
    return "NONE";
  }

  processInsiderEvent=function(player,event)
  {
    switch(event.type)
    {
      case EVENT_CRASH:
        if (player.getStockHolding(event.stockName) > 0)
        player.sellStock(event.stockName,broker.getStockHolding(player.name,event.stockName));
        log(player.name+"(sold based on Insider info): "+player.status);
        break;
      case EVENT_BOOM:
        var availableCash=player.balance-10000; // make sure he has some cash
        if (availableCash > 0)
        {
          var sharesToBuy=roundStock(availableCash/getStock(event.stockName).price);
          player.buyStock(event.stockName,sharesToBuy);
        }
        break;
      case EVENT_CRASH_ALL_STOCKS:
        break;
      case EVENT_BOOM_ALL_STOCKS:
        break; 
      case EVENT_STOCK_SUSPENDED:
        if (player.getStockHolding(event.stockName) > 0)
            player.sellStock(event.stockName,broker.getStockHolding(player.name,event.stockName));
        log(player.name+"(sold based on Insider info): "+player.status);
        break;
    }
  }