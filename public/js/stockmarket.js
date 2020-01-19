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

const MKT_UPDATE_TIME = 2000; // updatePrices called every MKT_UPDATE_TIME seconds

var stk = require("./stock.js");
var events = require('./events.js');

stocks=[];
var priceUpdateTimer;
var numActiveStocks;

exports.initialise=function(gameDate,gameDurationInMonths)
{
  setupStock();
  events.setupEvents(gameDate,gameDurationInMonths,stocks); 
}

exports.open=function()
{
  priceUpdateTimer=setInterval(updatePrices,MKT_UPDATE_TIME);
}

exports.close=function()
{
  clearInterval(priceUpdateTimer);
}

exports.buyStock=function(stockName,amount)
{
  getStock(stockName).buy(amount);
}

exports.sellStock=function(stockName,amount)
{
  getStock(stockName).sell(amount);
}

exports.processDay=function()
{
  checkSuspendedStocks();
  return processNews();
}

exports.crashAllStocks=function()
{
  stocks.forEach(function(stock)
  {
    if (stock.riskiness != RISK_NONE)
      stock.trend=-STOCK_MAX_TREND;
  });
}

exports.boomAllStocks=function()
{
  stocks.forEach(function(stock)
  {
    if (stock.riskiness != RISK_NONE)
      stock.trend=STOCK_MAX_TREND;
  });
}

exports.ipoStock=function()
{
  stocks.push(new stk.Stock(STOCK_NAMES[numActiveStocks],STOCK_RISKINESS[numActiveStocks],STOCK_COLOURS[numActiveStocks]));
  var stockName=STOCK_NAMES[numActiveStocks];
  numActiveStocks++;
  return stockName;
}

exports.releaseStock=function(stockName)
{
  getStock(stockName).available+=MIN_STOCK_RELEASE_AMOUNT+STOCK_INCREMENT*Math.floor(Math.random()*10);
}

exports.stockSplit=function(stockName)
{
  getStock(stockName).price*=.5; // Split doubles the stock but halves the price
  getStock(stockName).available*=2;
}

exports.suspendStock=function(stockName)
{
  getStock(stockName).price=0;
  getStock(stockName).suspensionDays=30+Math.floor(Math.random()*30);
}

exports.stockSuspended=function(stockName)
{
  return getStock(stockName).suspensionDays > 0;
}

exports.boomStock=function(stockName)
{
  getStock(stockName).trend=STOCK_MAX_TREND;
}

exports.crashStock=function(stockName)
{
  getStock(stockName).trend=STOCK_MAX_TREND;
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
  return stocks[Math.floor(Math.random()*stocks.length)]
}

exports.getFastestRisingStock=function()
{
  var best=-999;
  var bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].trend > best && stocks[i].available > 0) // i.e. there's some to buy
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

processNews=function()
{
  var newsEvent;
  newsEvent=events.getNewsEvent(gameDate);
  if (newsEvent != null)
  {
    log("processNews: "+newsEvent.headLine+"/"+newsEvent.stockName);
    switch(newsEvent.type)
    {
      case EVENT_NONE:              break;
      case EVENT_CRASH:             crashStock(newsEvent.stockName);break;
      case EVENT_BOOM:              boomStock(newsEvent.stockName);break;
      case EVENT_CRASH_ALL_STOCKS:  crashAllStocks();break;
      case EVENT_BOOM_ALL_STOCKS:   boomAllStocks();break;
      case EVENT_STOCK_IPO:         var stockName=ipoStock();newsEvent.headLine = newsEvent.headLine.replace("$name",stockName);break;
      case EVENT_STOCK_RELEASE:     releaseStock(newsEvent.stockName);break;
      case EVENT_STOCK_DIVIDEND:    payDividend(newsEvent.stockName);break;       
      case EVENT_STOCK_SPLIT:       stockSplit(newsEvent.stockName); break;   
      case EVENT_STOCK_SUSPENDED:   suspendStock(newsEvent.stockName);break;
      case EVENT_TAX_RETURN:        taxReturn();break;
    }
  }
  return newsEvent;
}
// ****************  Internal functions *******************

checkSuspendedStocks=function()
{
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
  for (var i=0;i<NUM_INITIAL_STOCKS;i++)
  {
    stocks.push(new stk.Stock(STOCK_NAMES[i],STOCK_RISKINESS[i],STOCK_COLOURS[i]));
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