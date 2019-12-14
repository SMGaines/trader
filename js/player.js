const NO_SUCH_STOCK = -1;
const STARTING_CASH = 100000;
const NONE ="";
const MAX_STOCKS = 10;

exports.Player = function(name)
{
  this.name = name;
  this.cash = STARTING_CASH;
  this.status="Player registered - waiting for game to start";
  this.hacking="NONE";
  this.numInsiderDeals=0;
  this.lastInsiderTradeDate=0;
  this.prisonDaysRemaining=0;
  this.prisonReason="";
  this.beingHacked=false;
  this.hackingCompletionDate=0;
  this.bankrupt=false;
  this.stocks=[];
  this.netWorth=0;
  this.taxBill=0;
  this.lastCashChange=0;
  
this.getStockHolding=function(stockName)
{
  var stockIndex=this.getStockIndex(stockName);
  if (stockIndex == NO_SUCH_STOCK)
    return 0;
  else
    return this.stocks[stockIndex].amount;
}

this.calcNetWorth=function(stocks)
{
    var netWorth = this.cash;
    for (var i=0;i<this.stocks.length;i++)
    {
        netWorth += this.getPlayerStockValue(this.stocks[i].name,stocks);
    }
    return netWorth;
}

this.getPlayerStockValue=function(stockName,stocks)
{
  for (var i=0;i<this.stocks.length;i++)
  {
    if (this.stocks[i].name == stockName)
      return this.stocks[i].amount*this.getStockPriceByName(stockName,stocks);
  }
  return 0;
}

this.getStockPriceByName=function(stockName,stocks)
{
    for (var i=0;i<stocks.length;i++)
    {
        if (stocks[i].name == stockName)
            return stocks[i].price;
    }
    return 0;
}

this.buyStock = function (stockName,amount,stockPrice)
{
  var stockIndex=this.getStockIndex(stockName);
  if (stockIndex != NO_SUCH_STOCK)
     this.stocks[stockIndex].amount+=amount;
    else
      this.stocks.push(new this.PlayerHolding(stockName,amount));
    this.cash-=(amount*stockPrice);
}

this.sellStock = function (stockName,amount,stockPrice)
{
  var stockIndex=this.getStockIndex(stockName);
  if (stockIndex != NO_SUCH_STOCK)
      this.stocks[stockIndex].amount-=amount;
   this.cash+=(amount*stockPrice);
}

this.PlayerHolding = function (name,amount)
{
  this.name=name;
  this.amount=amount;
}

this.getStockIndex = function (stockName)
{
    for (var i=0;i<this.stocks.length;i++)
    {
      if (this.stocks[i].name==stockName)
      {
        return i;
      }
    }
    return NO_SUCH_STOCK;
  }
}