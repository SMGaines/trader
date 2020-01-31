/* stockmarket .js

- Relies on: stock.js
- Interfaces with server.js and broker.js

- Implements all the functions of the Market and exposes :-
- initialise
- open to open trading and start price movements
- close the market
- processEndOfDay - to run any daily tasks e.g. checkSuspendedStocks
- getStocks to get all the current info re: stocks
- getPrice of a particular stock
- crashAllStocks
- boomAllStocks
- boomStock
- crashStock
- ipoStock
- suspendStock
- releaseStock
- splitStock
- payDividend
- setStartingStockAmounts (based on number of players)
*/

const IPO_INITIAL_TREND = 2; // IPO's always start well :)

var stk = require("./stock.js");

stocks=[];
var numActiveStocks;
var numPlayers;

exports.initialise=function(aNumPlayers)
{
  numPlayers=aNumPlayers;
  setupStock();
}

exports.open=function()
{
  
}

exports.close=function()
{
}

exports.buyStock=function(stockName,amount)
{
  var sharesToPurchased = getStock(stockName).buy(amount);
  return sharesToPurchased;
}

// Returns value of stock sale
exports.sellStock=function(stockName,amount)
{
  return getStock(stockName).sell(amount);
}

exports.processDay=function(gameDate,newsEvent)
{
  updatePrices();
  checkSuspendedStocks();
  return processMarketEvent(newsEvent);
}

exports.stockSuspended=function(stockName)
{
  return getStock(stockName).suspensionDays > 0;
}

exports.getStockPrice=function(stockName)
{
  return getStock(stockName).price;
}

exports.getStocks=function()
{
  return stocks;
}

exports.getRandomStock=function()
{
  return stocks[Math.floor(Math.random()*stocks.length)];
}

exports.getFastestRisingStock=function()
{
  var best=-999;
  var bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].trend > best) 
    {
      best=stocks[i].trend;
      bestIndex=i;
    }
  }
  return stocks[bestIndex];
}

exports.getFastestFallingStock=function()
{
  var best=999;
  var bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].trend < best)
    {
      best=stocks[i].trend;
      bestIndex=i;
    }
  }
  return stocks[bestIndex];
}

// ****************  Internal functions *******************

processMarketEvent=function(newsEvent)
{
  if (newsEvent != null)
  {
    log("processNewsEvent: "+newsEvent.headLine+"/"+newsEvent.stockName);
    switch(newsEvent.type)
    {
      case EVENT_NONE:              break;
      case EVENT_CRASH:             crashStock(newsEvent.stockName);break;
      case EVENT_BOOM:              boomStock(newsEvent.stockName);break;
      case EVENT_CRASH_ALL_STOCKS:  crashAllStocks();break;
      case EVENT_BOOM_ALL_STOCKS:   boomAllStocks();break;
      case EVENT_STOCK_IPO:         var stockName=newStock();
                                    getStock(stockName).setTrend(IPO_INITIAL_TREND); // IPO's alwats start well :)
                                    newsEvent.headLine = newsEvent.headLine.replace("$name",stockName);
                                    break;
      case EVENT_STOCK_RELEASE:     releaseStock(newsEvent.stockName);break;
      case EVENT_STOCK_SPLIT:       stockSplit(newsEvent.stockName); break;  // This doubles available stock
      case EVENT_STOCK_SUSPENDED:   suspendStock(newsEvent.stockName);break;
    }
  }
  return newsEvent;
}

crashAllStocks=function()
{
  stocks.forEach(function(stock)
  {
    if (stock.riskiness != RISK_NONE)
      stock.trend=-STOCK_MAX_TREND;
  });
}

boomAllStocks=function()
{
  stocks.forEach(function(stock)
  {
    if (stock.riskiness != RISK_NONE)
      stock.trend=STOCK_MAX_TREND;
  });
}

newStock=function()
{
  stocks.push(new stk.Stock(STOCK_NAMES[numActiveStocks],getInitialStockAmount(),STOCK_RISKINESS[numActiveStocks],STOCK_COLOURS[numActiveStocks]));
  var stockName=STOCK_NAMES[numActiveStocks];
  numActiveStocks++;
  return stockName;
}

getInitialStockAmount=function()
{
  return NUM_STARTING_STOCK+STOCK_INCREMENT*numPlayers;
}

releaseStock=function(stockName)
{
  getStock(stockName).available+=MIN_STOCK_RELEASE_AMOUNT+STOCK_INCREMENT*numPlayers;
}

stockSplit=function(stockName)
{
  getStock(stockName).price*=.5; // Split doubles the stock but halves the price
  getStock(stockName).available*=2;
}

suspendStock=function(stockName)
{
  getStock(stockName).price=0;
  getStock(stockName).suspensionDays=30+Math.floor(Math.random()*30);
}

boomStock=function(stockName)
{
  getStock(stockName).trend=STOCK_MAX_TREND;
}

crashStock=function(stockName)
{
  getStock(stockName).trend=-STOCK_MAX_TREND;
}

checkSuspendedStocks=function()
{
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].isSuspended())
    {
      stocks[i].suspensionDays--;
      if (stocks[i].suspensionDays == 0)
      {
        log("nextDay: Suspension lifted for "+stocks[i].name);
        stocks[i].liftSuspension();
      }
    }
  }  
}

function getStock(stockName)
{
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].name == stockName)
      return stocks[i];
  }
  console.log("Unknown stock: "+stockName);
  return null;
}

updatePrices = function()
{
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

function setupStock()
{
  numActiveStocks=0;
  for (var i=0;i<NUM_INITIAL_STOCKS;i++)
  {
    newStock();
  }
  numActiveStocks=NUM_INITIAL_STOCKS;
}

exports.setStartingStockAmounts=function(numAccounts)
{
  for (var i=0;i<stocks.length;i++)
  {
    stocks[i].available=roundStock(NUM_STARTING_STOCK+players.length*.1*NUM_STARTING_STOCK);
  }
}

getRandomFactor = function ()
{
  return 3*(Math.random()-Math.random());
}

getRiskMultiplier = function (riskiness)
{
    switch(riskiness)
    {
        case RISK_NONE: return 1;
        case RISK_LOW: return 1.1;
        case RISK_MEDIUM: return 1.25;
        case RISK_HIGH: return 1.35;
        case RISK_CRAZY: return 1.5;
    }
}