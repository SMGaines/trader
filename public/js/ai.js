var mkt=require("./stockmarket.js");
var broker=require("./broker.js");
var events = require('./events.js');

exports.processBot=function(player,gameDate)
  {
    var rndAmount = MIN_STOCK_PURCHASE*(1+Math.floor(Math.random()*20));
    var rndStock=mkt.getRandomStock();
    if (nearEndOfGame(gameDate))
      player.bankCash(.5*broker.getCash(player.name));
    else if (broker.getStockHolding(player.name,rndStock.name) > 0 && rndStock.price > 50 && rndStock.trend < 0)
      player.sellStock(rndStock.name,rndAmount);
    else if (rndStock.trend > 0 || rndStock.price < 50 && rndStock.available > 0)
      player.buyStock(rndStock.name,rndAmount);
    else if (Math.random() > .95 && broker.getCash(player.name) > 0)
      player.bankCash(.1*broker.getCash(player.name));
    else if (Math.random() > .95 && !broker.hackInProgress(player.name))
      player.setupHack(broker.chooseRandomAccountName(player.name));
    else if (Math.random() > .95)
      player.setupInsider();
    else if (broker.beingHacked(player.name))
      player.suspectHacker(broker.chooseRandomAccountName(player.name));
  }

  function nearEndOfGame(gameDate)
  {
    return gameDate.getMonth()==11 && gameDate.getYear()==2021;
  }

  exports.processEinstein=function(player,gameDate)
  {
    var bestPerformingStock=mkt.getFastestRisingStock();
    var worstPerformingStock=mkt.getFastestFallingStock();
    if (broker.beingHacked(player.name) &&Math.random() > .95)
      player.suspectHacker(broker.chooseRandomAccountName(player.name));
    else if (player.numInsiderDeals == 0)
    {
      var insiderEvent = player.setupInsider(gameDate);
      if (insiderEvent == null)
        return;
      player.processInsiderEvent(insiderEvent);
    }
    else if (nearEndOfGame(gameDate))
      player.bankCash(.5*broker.getCash(player.name));
    else if (Math.random() > .95 && broker.getCash(player.name) > 0)
      player.bankCash(.1*broker.getCash(player.name));
    else if (Math.abs(bestPerformingStock.trend) > Math.abs(worstPerformingStock.trend) && bestPerformingStock.available >0 && (bestPerformingStock.trend > 1 || bestPerformingStock.price < 50))
      player.buyStock(bestPerformingStock.name,bestPerformingStock.available);
    else if (worstPerformingStock.trend < -1 && broker.getStockHolding(player.name,worstPerformingStock) > 0)
      player.sellStock(worstPerformingStock.name,broker.getStockHolding(player.name,bestPerformingStock.name));
    else if (!broker.hackInProgress(player.name))
    {
      var playerToHackName=broker.chooseAccountNameToHack(player.name);
      player.setupHack(player.name,playerToHackName);
    }
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