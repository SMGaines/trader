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
  var bestPerformingStockIndex = findBestPerformingStockIndex(p);
  var interestingStockIndex = findInterestingStockIndex(p);
  if (p.beingHacked && p.cash > 50000)
    suspectHacker(EINSTEIN,chooseRandomPlayer(EINSTEIN).name);
  else if (p.numInsiderDeals == 0)
  {
    var insiderEvent = setupInsider(EINSTEIN);
    if (insiderEvent == null)
      return;
    processInsiderEvent(p,insiderEvent);
  }
  else if (worstPerformingStockIndex !=-1)
  {
    var worstStockName=stocks[worstPerformingStockIndex].name;
    sellStock(EINSTEIN,worstStockName,p.getStockHolding(worstStockName));
    log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
    return;
  }
  else if (bestPerformingStockIndex !=-1)
  {
    var availableCash=p.cash-10000; // make sure he has some cash
    if (availableCash > 0)
    {
      var sharesToBuy=roundStock(availableCash/stocks[bestPerformingStockIndex].price);
      buyStock(EINSTEIN,stocks[bestPerformingStockIndex].name,sharesToBuy);
      log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
    }
    return;
  }
  else if (interestingStockIndex !=-1)
  {
    var availableCash=p.cash-10000; // make sure he has some cash
    if (availableCash > 0)
    {
      var sharesToBuy=roundStock(availableCash/stocks[interestingStockIndex].price);
      buyStock(EINSTEIN,stocks[interestingStockIndex].name,sharesToBuy);
      log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
    }
    return;
  }   
  else if (p.cash < 20000 && p.hacking==NO_PLAYER)
  {
    var playerToHackIndex=choosePlayerToHack(EINSTEIN);
    if (playerToHackIndex !=-1)
      setupHack(EINSTEIN,players[playerToHackIndex].name);
  }
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

processInsiderEvent=function(p,event)
{
  switch(event.type)
  {
    case EVENT_CRASH:
      if (p.getStockHolding(event.stockName) > 0)
        sellStock(EINSTEIN,event.stockName,p.getStockHolding(event.stockName));
      log(EINSTEIN+"(sold based on Insider info): "+getPlayer(EINSTEIN).status);
      break;
    case EVENT_BOOM:
      var availableCash=p.cash-10000; // make sure he has some cash
      if (availableCash > 0)
      {
        var sharesToBuy=roundStock(availableCash/getStock(event.stockName).price);
        buyStock(EINSTEIN,event.stockName,sharesToBuy);
        log(EINSTEIN+": "+getPlayer(EINSTEIN).status);
      }
      break;
    case EVENT_CRASH_ALL_STOCKS:
      break;
    case EVENT_BOOM_ALL_STOCKS:
      break; 
    case EVENT_STOCK_SUSPENDED:
      if (p.getStockHolding(event.stockName) > 0)
        sellStock(EINSTEIN,event.stockName,p.getStockHolding(event.stockName));
      log(EINSTEIN+"(sold based on Insider info): "+getPlayer(EINSTEIN).status);
      break;
  }
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

findInterestingStockIndex = function(p)
{
  var bestTrend = -100;
  var bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].available > 0 && stocks[i].price < 50 && stocks[i].trend > bestTrend)
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
