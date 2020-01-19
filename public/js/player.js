const STARTING_CASH = 100000;
global.PLAYER_HUMAN=0;
global.PLAYER_BOT=1;
global.PLAYER_EINSTEIN=2;

var mkt=require("./stockmarket.js");
var broker=require("./broker.js");

exports.Player = function(name,type)
{
  this.name = name;
  this.type = type;

  this.initialise=function()
  {
    this.balance = STARTING_CASH;
    this.status="";
    this.numInsiderDeals=0;
    this.lastInsiderTradeDate=0;
    broker.createAccount(this.name);
  }

  this.withDrawCash = function(amount)
  {
    var amount=broker.withDrawCash(this.name,amount);
    this.balance+=amount;
  }

  this.depositCash=function(amount)
  {
    if (this.balance >=amount)
      broker.depositCash(this.name,amount);
      this.balance-=amount;
  }

  this.getBankBalance=function()
  {
    return this.bank;
  }

  this.sellStock = function(stockName,amount)
  {
    if (this.prisonDaysRemaining > 0)
    {
        this.status=getPlayerStatusMsg(MSG_IN_PRISON);
        return;
    }
    var error=broker.sellStock(this.name,stockName,amount);
    switch(error)
    {
      default: log(error);
    }
  }

  this.buyStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.status=getPlayerStatusMsg(MSG_IN_PRISON);
      return;
    }
    
    var error = broker.buyStock(this.name,stockName,amount);
    switch(error)
    {
      default: log(error);
    }
  }

  this.setupHack=function(hackedPlayerName)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.status=getPlayerStatusMsg(MSG_IN_PRISON);
      return;
    }
    if (this.bank < HACKING_FEE)
    {
      this.status = getPlayerStatusMsg(MSG_CANNOT_AFFORD_HACK,formatMoney(HACKING_FEE));
      return;
    }
    if (this.hacking != NO_PLAYER)
    {
      this.status=getPlayerStatusMsg(MSG_ALREADY_HACKING,hackedPlayerName);
      return;
    }
    this.bank-=HACKING_FEE;
    var error=broker.setupHack(this.name,hackedPlayerName);
    switch(error)
    {
      case ERROR_NONE:
          this.status=getPlayerStatusMsg(MSG_HACK_INITIATED,hackedPlayerName,formatMoney(HACKING_FEE));
        return;
      default: 
        log(error);
        return;
    } 
  }

  this.suspectHacker=function(suspectedPlayerName)
  {
    log("suspectHacker: "+suspectingPlayerName+" is suspecting "+suspectedPlayerName);

    if (broker.accountIsSuspended(this.name))
    {
      this.status=getPlayerStatusMsg(MSG_IN_PRISON);
      return;
    }
    if (!broker.beingHacked(this.name))
    {
      this.status=getPlayerStatusMsg(MSG_SUSPICION_IGNORED);
      log("Game: suspectHacker: Suspicion ignored - player not being hacked");
      return;
    }
    
    var hackerName=broker.getHackerName(this.name);

    if (hackerName == suspectedPlayerName) // Correct guess
    {
      this.bank+=HACKING_FINE;
      broker.withdrawCash(hackerName,HACKING_FINE);
      broker.suspendAccount(HACKING_PRISON_SENTENCE);
      log("suspectHacker: "+suspectedPlayer.name+" goes to prison for "+HACKING_PRISON_SENTENCE+" days");
      broker.clearHack(hackerName,suspectedPlayerName);
    }
    else
    {
      var amount = HACKING_INCORRECT_SUSPICION_FINE/players.length;
      this.bank-=amount;
      broker.withdrawCash(suspectedPlayerName,amount);
      log("suspectHacker: "+suspectingPlayer.name+" incorrectly suspected "+suspectedPlayer.name+" and is fined "+formatMoney(HACKING_INCORRECT_SUSPICION_FINE));
    }
  }

  this.setupInsider = function()
  {
    log("setupInsider: "+this.name+" asking for Insider information");
    if (broker.accountIsSuspended(this.name))
    {
      this.status=getPlayerStatusMsg(MSG_IN_PRISON);
      return;
    }
    if (this.bank < INSIDER_FEE)
    {
      this.status = getPlayerStatusMsg(MSG_CANNOT_AFFORD_INSIDER,formatMoney(INSIDER_FEE));
      return;
    }

    var upcomingEvent = events.findUpcomingEvent(gameDate,INSIDER_LOOKAHEAD_DAYS);
    if (upcomingEvent == null)
    {
      this.status=getPlayerStatusMsg(MSG_NO_INTERESTING_EVENTS);
      return;
    }
    this.status=getInsiderEventPlayerStatus(upcomingEvent,this.lang);
    
    log("setupInsider: "+this.status);
    this.bank-=INSIDER_FEE;
    this.numInsiderDeals++;
    this.lastInsiderTradeDate=new Date(gameDate); 
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
    else if (Math.random() > .95 && !broker.hackInProgress(this.name))
      this.setupHack(broker.chooseRandomAccountName(this.name));
    else if (Math.random() > .95)
      this.setupInsider();
    else if (broker.beingHacked(this.name))
      this.suspectHacker(broker.chooseRandomAccountName(this.name));

    if (this.status != "")
      log(this.name+": "+this.status);
  }

  this.processEinstein=function()
  {
    if (broker.beingHacked(this.name) && this.balance > 50000)
      this.suspectHacker(broker.chooseRandomAccountName(this.name));
    else if (this.numInsiderDeals == 0)
    {
      var insiderEvent = setupInsider(this.name);
      if (insiderEvent == null)
        return;
      this.processInsiderEvent(insiderEvent);
    }
    var bestPerformingStock=mkt.getFastestRisingStock();
    var worstPerformingStock=mkt.getFastestFallingStock();
    if (Math.abs(bestPerformingStock.trend) > Math.abs(worstPerformingStock.trend) && (bestPerformingStock.trend > 1 || bestPerformingStock.price < 50))
    {
      this.buyStock(bestPerformingStock.name,bestPerformingStock.available);
      log(this.name+": "+this.status);
      return;
    }
    else if (worstPerformingStock.trend < -1)
    {
      this.sellStock(worstPerformingStock.name,broker.getStockHolding(this.name,bestPerformingStock.name));
      log(this.name+": "+this.status);
      return;
    }
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