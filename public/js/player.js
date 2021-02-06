const STARTING_CASH = 50000;

global.PLAYER_HUMAN=0;
global.PLAYER_BOT=1;
global.PLAYER_EINSTEIN=2;

var broker=require("./broker.js");
var events = require('./events.js');
var ai = require("./ai.js");

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
    var accountSummary=broker.getAccountSummary(this.name);
    if (accountSummary.status != "")
      this.status=accountSummary.status;
    return new PlayerSummary(this.name,this.balance,this.status,broker.getAccountSummary(this.name));
  }

  this.clearStatus=function()
  {
    this.status="";
    broker.clearStatus(this.name);
  }

  this.bankCash = function(amount)
  {
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    var result=broker.withdrawCash(this.name,amount);
    switch(result)
    {
      case BROKER_ACCOUNT_OVERDRAWN:
        this.setStatus(MSG_ACCOUNT_OVERDRAWN);
        break;
      default:
        this.setStatus(MSG_BANKED,formatMoney(result));
        this.balance+=result;
        break;
    }
  }

  this.depositCash=function(amount)
  {
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    if (this.balance >=amount)
      broker.depositCash(this.name,amount);
    this.balance-=amount;
  }

  this.getBankBalance=function()
  {
    return this.balance;
  }
  
  this.isMillionnaire=function()
  {
    return this.balance >=1000000;
  }

  this.amMillionnaireOnPaper=function()
  {
    return this.balance + broker.getStockValue(this.name) +broker.getCash(this.name) >= 1000000;
  }

  this.clearInsiderTrading=function()
  {
    this.numInsiderDeals = 0;
    this.lastInsiderTradeDate=0;
  }

  this.sellStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    var result=broker.sellStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_STOCK:
        this.setStatus(MSG_NO_STOCK);
        break;
      case MARKET_NO_BUYER:
        this.setStatus(MSG_NO_BUYER);
        break;
      case MARKET_CLOSED:
        this.setStatus(MSG_MARKET_CLOSED);
        break;
      case BROKER_STOCK_SUSPENDED:
        this.setStatus(MSG_STOCK_SUSPENDED);
        break;
      default:
        this.setStatus(MSG_SHARE_SALE,result,stockName);
        break;
    }
  }

  this.buyStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    
    var result = broker.buyStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_FUNDS:
        this.setStatus(MSG_INSUFFICIENT_FUNDS);
        break;
      case BROKER_INSUFFICIENT_STOCK:
        this.setStatus(MSG_INSUFFICIENT_STOCK);
        break;
      case BROKER_ACCOUNT_OVERDRAWN:
        this.setStatus(MSG_ACCOUNT_OVERDRAWN);
        break;
      case MARKET_CLOSED:
        this.setStatus(MSG_MARKET_CLOSED);
        break;
      case BROKER_STOCK_SUSPENDED:
        this.setStatus(MSG_STOCK_SUSPENDED);
        break;
      default: 
        this.setStatus(MSG_SHARE_BUY,result,stockName);
        break;
    }
  }
  
  this.shortStock = function(stockName,amount)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    
    var result = broker.shortStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_FUNDS:
        this.setStatus(MSG_INSUFFICIENT_FUNDS);
        break;
      case BROKER_INSUFFICIENT_STOCK:
        this.setStatus(MSG_INSUFFICIENT_STOCK);
        break;
      case BROKER_ACCOUNT_OVERDRAWN:
        this.setStatus(MSG_ACCOUNT_OVERDRAWN);
        break;
      case MARKET_CLOSED:
        this.setStatus(MSG_MARKET_CLOSED);
        break;
      case BROKER_STOCK_SUSPENDED:
        this.setStatus(MSG_STOCK_SUSPENDED);
        break;
      case BROKER_STOCK_ALREADY_BORROWED:
        this.setStatus(MSG_STOCK_ALREADY_BORROWED);
        break;
      default: 
        this.setStatus(MSG_SHARE_BORROW,result,stockName);
        break;
    }
  }

  this.repayStock=function(stockName)
  {
    broker.repayStock(this.name,stockName);
  }

  this.setupHack=function(hackedPlayerName)
  {
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_ALREADY_HACKING,hackedPlayerName);
      return;
    }
    var error=broker.setupHack(this.name,hackedPlayerName);
    switch(error)
    {
      case BROKER_OK:
        this.setStatus(MSG_HACK_INITIATED,hackedPlayerName);
        return;
      case ERROR_HACK_ALREADY_IN_PROGRESS:
        this.setStatus(MSG_ALREADY_BEING_HACKED,hackedPlayerName);
        return;
      default: 
        log(this.name+": setupHack: error: "+error);
        return;
    } 
  }

  this.suspectHacking=function()
  {
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (!broker.beingHacked(this.name))
    {
      this.setStatus(MSG_SUSPICION_IGNORED);
      return;
    }
    
    var hackerName=broker.getHackerName(this.name);

    if (hackerName != NONE) // Is actually being hacked
    {
      broker.suspendAccount(hackerName,HACKING_SUSPENSION_DAYS);
      this.setStatus(MSG_HACK_DETECTED,hackerName,HACKING_SUSPENSION_DAYS);
      broker.clearHack(hackerName,this.name);
    }
    else
    {
      var suspension = Math.floor(HACKING_SUSPENSION_DAYS/numPlayers);
      broker.suspendAccount(this.name,suspension);
      this.setStatus(MSG_SUSPICION_IGNORED);
    }
  }

  this.setupInsider = function(gameDate)
  {
    log("setupInsider: "+this.name+" asking for Insider information on "+gameDate);
    if (broker.accountIsSuspended(this.name))
    {
      this.setStatus(MSG_SUSPENDED);
      return;
    }
    if (broker.hackInProgress(this.name))
    {
      this.setStatus(MSG_HACK_IN_PROGRESS);
      return;
    }

    var upcomingEvent = events.findUpcomingEvent(gameDate,INSIDER_LOOKAHEAD_DAYS);
    if (upcomingEvent == null)
    {
      this.setStatus(MSG_NO_INTERESTING_EVENTS);
      return;
    }

    this.setInsiderStatus(upcomingEvent);
    
    this.numInsiderDeals++;
    this.lastInsiderTradeDate=new Date(gameDate); 
  }

  this.processBot=function(gameDate,gameEndDate,numPlayers)
  {
    ai.processBot(this,gameDate,gameEndDate,numPlayers);
  }
  
  this.processEinstein=function(gameDate,gameEndDate,numPlayers)
  {
    ai.processEinstein(this,gameDate,gameEndDate,numPlayers);
  }

  this.setStatus=function(msgType,argX,argY,argZ)
  {
    var msg =msgType[LANG_EN];
    if (argX !== undefined) msg=msg.replace("$x",argX);
    if (argY !== undefined) msg=msg.replace("$y",argY);
    if (argZ !== undefined) msg=msg.replace("$z",argZ);
    this.status=msg;
    //log("player: setStatus: "+this.name+": "+msg);
  }

  this.isConvicted=function()
  {
    return this.numInsiderDeals > 1 && Math.random() < this.numInsiderDeals/300;
  }

  this.setInsiderStatus=function(event)
  {
    var interestingEventDate = getFormattedDate(event.date);
    var lang = LANG_EN;
    switch(event.type)
    {
      case EVENT_CRASH:this.setStatus(MSG_EVENT_STOCK_CRASH,event.stockName,interestingEventDate);break;
      case EVENT_BOOM: this.setStatus(MSG_EVENT_STOCK_BOOM,event.stockName,interestingEventDate);break;
      case EVENT_CRASH_ALL_STOCKS: this.setStatus(MSG_EVENT_STOCK_MARKET_CRASH,interestingEventDate);break;
      case EVENT_BOOM_ALL_STOCKS: this.setStatus(MSG_EVENT_STOCK_MARKET_BOOM,interestingEventDate);break;
      case EVENT_STOCK_IPO: this.setStatus(MSG_EVENT_STOCK_IPO,interestingEventDate);break;
      case EVENT_STOCK_RELEASE: this.setStatus(MSG_EVENT_EXTRA_STOCK,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_DIVIDEND: this.setStatus(MSG_EVENT_STOCK_DIVIDEND,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_SUSPENDED: this.setStatus(MSG_EVENT_STOCK_SUSPENDED,event.stockName,interestingEventDate);break;
      case EVENT_STOCK_SPLIT: this.setStatus(MSG_EVENT_STOCK_SPLIT,event.stockName,interestingEventDate);break;
      case EVENT_MARKET_CLOSED: this.setStatus(MSG_EVENT_MARKET_CLOSED,"",interestingEventDate);break;
      default: log("setupInsider: Unknown event type: "+event.type);
    }
  }

  isBankrupt = function()
  {
    return this.bank < 0;
  }

  PlayerSummary=function(name,balance,status,account)
  {
    this.name=name;
    this.balance = balance;
    this.status=status;
    this.account=account;
  }
}