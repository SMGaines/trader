const STARTING_CASH = 100000;

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
    return new PlayerSummary(this.name,this.balance,this.status,broker.getAccountSummary(this.name));
  }

  this.clearStatus=function()
  {
    this.status="";
  }

  this.bankCash = function(amount)
  {
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
    var result=broker.sellStock(this.name,stockName,amount);
    switch(result)
    {
      case ACCOUNT_INSUFFICIENT_STOCK:
        this.setStatus(MSG_NO_STOCK);
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
      default: 
        this.setStatus(MSG_SHARE_BUY,result,stockName);
        break;
    }
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
        this.setStatus(MSG_HACK_INITIATED,hackedPlayerName,formatMoney(HACKING_FEE));
        return;
      default: 
        log(this.name+": setupHack: error: "+error);
        return;
    } 
  }

  this.suspectHacker=function(suspectedPlayerName,numPlayers)
  {
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

    if (hackerName == suspectedPlayerName) // Correct guess
    {
      broker.suspendAccount(hackerName,HACKING_SUSPENSION_DAYS);
      this.setStatus(MSG_HACK_DETECTED,suspectedPlayerName,HACKING_SUSPENSION_DAYS);
      broker.clearHack(hackerName,suspectedPlayerName);
    }
    else
    {
      var suspension = Math.floor(HACKING_SUSPENSION_DAYS/numPlayers);
      broker.suspendAccount(hackerName,suspension);
      this.setStatus(MSG_WRONG_SUSPICION,suspectedPlayerName);
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

  this.processBot=function(gameDate,numPlayers)
  {
    ai.processBot(this,gameDate,numPlayers);
  }
  
  this.processEinstein=function(gameDate,numPlayers)
  {
    ai.processEinstein(this,gameDate,numPlayers);
  }

  this.setStatus=function(msgType,argX,argY,argZ)
  {
    var msg =msgType[LANG_EN];
    if (argX !== undefined) msg=msg.replace("$x",argX);
    if (argY !== undefined) msg=msg.replace("$y",argY);
    if (argZ !== undefined) msg=msg.replace("$z",argZ);
    this.status=msg;
    log(this.name+": "+msg);
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