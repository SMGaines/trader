const STARTING_CASH = 100000;
global.PLAYER_HUMAN=0;
global.PLAYER_BOT=1;
global.PLAYER_EINSTEIN=2;

var mkt=require("./stockmarket.js");
var broker=require("./broker.js");
var events = require('./events.js');

exports.Player = function(name,type)
{
  this.name = name;
  this.type = type;
  this.balance = STARTING_CASH;
  this.status="";
  this.numInsiderDeals=0;
  this.lastInsiderTradeDate=0;

  this.initialise=function()
  {
    broker.createAccount(this.name);
    broker.depositCash(this.name,this.balance);
    this.balance=0;
  }

  this.getSummary=function()
  {
    return new PlayerSummary(this.name,this.balance,this.status,broker.getAccountSummary(this.name));
  }

  this.bankCash = function(amount)
  {
    var amountWithdrawn=broker.withdrawCash(this.name,amount);
    setStatus(MSG_BANKED,formatMoney(amountWithdrawn));
    this.balance+=amountWithdrawn;
  }

  this.depositCash=function(amount)
  {
    if (this.balance >=amount)
      broker.depositCash(this.name,amount);
    this.balance-=amount;
  }

  this.getBankBalance=function()
  {
    return this.balance;
  }

  this.sellStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      setStatus(MSG_IN_PRISON);
      return;
    }
    var result=broker.sellStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_STOCK:
        setStatus(MSG_NO_STOCK);
        break;
      default:
        setStatus(MSG_SHARE_SALE,result,stockName);
        break;
    }
  }

  this.buyStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      setStatus(MSG_IN_PRISON);
      return;
    }
    
    var result = broker.buyStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_FUNDS:
        setStatus(MSG_INSUFFICIENT_FUNDS);
        break;
      case BROKER_INSUFFICIENT_STOCK:
        setStatus(MSG_INSUFFICIENT_STOCK);
        break;
      default: 
        setStatus(MSG_SHARE_BUY,result,stockName);
        break;
    }
  }

  this.setupHack=function(hackedPlayerName)
  {
    if (broker.accountIsSuspended(this.name))
    {
      setStatus(MSG_IN_PRISON);
      return;
    }
    if (this.bank < HACKING_FEE)
    {
      setStatus(MSG_CANNOT_AFFORD_HACK,formatMoney(HACKING_FEE));
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      setStatus(MSG_ALREADY_HACKING,hackedPlayerName);
      return;
    }
    this.bank-=HACKING_FEE;
    var error=broker.setupHack(this.name,hackedPlayerName);
    switch(error)
    {
      case BROKER_OK:
        setStatus(MSG_HACK_INITIATED,hackedPlayerName,formatMoney(HACKING_FEE));
        return;
      default: 
        log(this.name+": setupHack: error: "+error);
        return;
    } 
  }

  this.suspectHacker=function(suspectedPlayerName)
  {
    if (broker.accountIsSuspended(this.name))
    {
      setStatus(MSG_IN_PRISON);
      return;
    }
    if (!broker.beingHacked(this.name))
    {
      setStatus(MSG_SUSPICION_IGNORED);
      return;
    }
    
    var hackerName=broker.getHackerName(this.name);

    if (hackerName == suspectedPlayerName) // Correct guess
    {
      this.bank+=HACKING_FINE;
      broker.withdrawCash(hackerName,HACKING_FINE);
      broker.suspendAccount(hackerName,HACKING_SUSPENSION_DAYS);
      setStatus(MSG_HACK_DETECTED,suspectedPlayerName,HACKING_FINE,HACKING_SUSPENSION_DAYS);
      broker.clearHack(hackerName,suspectedPlayerName);
    }
    else
    {
      var amount = HACKING_INCORRECT_SUSPICION_FINE/players.length;
      this.bank-=amount;
      broker.withdrawCash(this.name,amount);
      setStatus(MSG_WRONG_SUSPICION,suspectedPlayerName,formatMoney(HACKING_INCORRECT_SUSPICION_FINE));
    }
  }

  this.setupInsider = function(gameDate)
  {
    log("setupInsider: "+this.name+" asking for Insider information");
    if (broker.accountIsSuspended(this.name))
    {
      setStatus(MSG_IN_PRISON);
      return;
    }
    if (this.bank < INSIDER_FEE)
    {
      setStatus(MSG_CANNOT_AFFORD_INSIDER,formatMoney(INSIDER_FEE));
      return;
    }

    var upcomingEvent = events.findUpcomingEvent(gameDate,INSIDER_LOOKAHEAD_DAYS);
    if (upcomingEvent == null)
    {
      setStatus(MSG_NO_INTERESTING_EVENTS);
      return;
    }

    setInsiderStatus(upcomingEvent);
    
    this.bank-=INSIDER_FEE;
    this.numInsiderDeals++;
    this.lastInsiderTradeDate=new Date(gameDate); 
  }

  setStatus=function(msgType,argX,argY,argZ)
  {
    var msg =msgType[LANG_EN];
    if (argX !== undefined) msg=msg.replace("$x",argX);
    if (argY !== undefined) msg=msg.replace("$y",argY);
    if (argZ !== undefined) msg=msg.replace("$z",argZ);
    this.status=msg;
    log(msg);
  }
  exports.setStatus=setStatus;

  function setInsiderStatus(event)
  {
    var interestingEventDate = getFormattedDate(event.date);

    switch(event.type)
    {
      case EVENT_CRASH:setStatus(MSG_EVENT_STOCK_CRASH,lang,event.stockName,interestingEventDate);break;
      case EVENT_BOOM: setStatus(MSG_EVENT_STOCK_BOOM,lang,event.stockName,interestingEventDate);break;
      case EVENT_CRASH_ALL_STOCKS: setStatus(MSG_EVENT_STOCK_MARKET_CRASH,lang,interestingEventDate);break;
      case EVENT_BOOM_ALL_STOCKS: setStatus(MSG_EVENT_STOCK_MARKET_BOOM,lang,interestingEventDate);break;
      case EVENT_STOCK_IPO: setStatus(MSG_EVENT_STOCK_IPO,lang,interestingEventDate);break;
      case EVENT_STOCK_RELEASE: setStatus(MSG_EVENT_EXTRA_STOCK,lang,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_DIVIDEND: setStatus(MSG_EVENT_STOCK_DIVIDEND,lang,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_SUSPENDED: setStatus(MSG_EVENT_STOCK_SUSPENDED,lang,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_SPLIT: setStatus(MSG_EVENT_STOCK_SPLIT,lang,event.stockName,interestingEventDate);break;
      default: log("setupInsider: Unknown event type: "+event.type);
    }
  }

  function isConvicted()
  {
    return this.numInsiderDeals > 1 && Math.random() < this.numInsiderDeals/300;
  }

  isBankrupt = function()
  {
    return this.bank < 0;
  }

  this.processBot=function()
  {
    var rndAmount = MIN_STOCK_PURCHASE*(1+Math.floor(Math.random()*20));
    var rndStock=mkt.getRandomStock();
    if (broker.getStockHolding(this.name,rndStock.name) > 0 && rndStock.price > 50 && rndStock.trend < 0)
      this.sellStock(rndStock.name,rndAmount);
    else if (rndStock.trend > 0 || rndStock.price < 50)
      this.buyStock(rndStock.name,rndAmount);
    else if (Math.random() > .95 && broker.getCash(this.name) > 0)
      this.bankCash(.1*broker.getCash(this.name));
    else if (Math.random() > .95 && !broker.hackInProgress(this.name))
      this.setupHack(broker.chooseRandomAccountName(this.name));
    else if (Math.random() > .95)
      this.setupInsider();
    else if (broker.beingHacked(this.name))
      this.suspectHacker(broker.chooseRandomAccountName(this.name));
  }

  this.processEinstein=function()
  {
    if (broker.beingHacked(this.name) && this.balance > 50000)
      this.suspectHacker(broker.chooseRandomAccountName(this.name));
    else if (this.numInsiderDeals == 0)
    {
      var insiderEvent = this.setupInsider(this.name);
      if (insiderEvent == null)
        return;
      this.processInsiderEvent(insiderEvent);
    }
    var bestPerformingStock=mkt.getFastestRisingStock();
    var worstPerformingStock=mkt.getFastestFallingStock();
    if (Math.abs(bestPerformingStock.trend) > Math.abs(worstPerformingStock.trend) && (bestPerformingStock.trend > 1 || bestPerformingStock.price < 50))
      this.buyStock(bestPerformingStock.name,bestPerformingStock.available);
    else if (worstPerformingStock.trend < -1)
      this.sellStock(worstPerformingStock.name,broker.getStockHolding(this.name,bestPerformingStock.name));
    else if (this.balance < 20000 && !broker.hackInProgress(this.name))
    {
      var playerToHackName=broker.chooseAccountNameToHack(this.name);
      this.setupHack(this.name,playerToHackName);
    }
  }


  processInsiderEvent=function(event)
  {
    switch(event.type)
    {
      case EVENT_CRASH:
        if (this.getStockHolding(event.stockName) > 0)
          this.sellStock(event.stockName,broker.getStockHolding(this.name,event.stockName));
        log(this.name+"(sold based on Insider info): "+this.status);
        break;
      case EVENT_BOOM:
        var availableCash=this.balance-10000; // make sure he has some cash
        if (availableCash > 0)
        {
          var sharesToBuy=roundStock(availableCash/getStock(event.stockName).price);
          this.buyStock(event.stockName,sharesToBuy);
          log(this.name+": "+this.status);
        }
        break;
      case EVENT_CRASH_ALL_STOCKS:
        break;
      case EVENT_BOOM_ALL_STOCKS:
        break; 
      case EVENT_STOCK_SUSPENDED:
        if (this.getStockHolding(event.stockName) > 0)
          this.sellStock(event.stockName,broker.getStockHolding(this.name,event.stockName));
        log(this.name+"(sold based on Insider info): "+this.status);
        break;
    }
  }
}

PlayerSummary=function(name,balance,status,account)
{
  this.name=name;
  this.balance = balance;
  this.status=status;
  this.account=account;
}