/* stockmarket .js

- Relies on: Account.js
- Interfaces with server.js and stockmarket.js
- Implements all the functions of the Broker and exposes :-
- createAccount
- getCash
- buyStock
- sellStock
- splitStock
- payDividend
- depositCash
- withdrawCash
- taxReturn
*/

global.BROKER_OK = 0;
global.BROKER_STOCK_SUSPENDED = -1;
global.BROKER_INSUFFICIENT_STOCK = -2;
global.ACCOUNT_INSUFFICIENT_FUNDS=-3;
global.ACCOUNT_INSUFFICIENT_STOCK=-4;
global.BROKER_ACCOUNT_OVERDRAWN=-5;
global.MARKET_CLOSED=-6;
global.MARKET_NO_BUYER=-7;
global.ACCOUNT_MARGIN_CALL=-8;
global.BROKER_STOCK_ALREADY_BORROWED=-9;
global.BROKER_NOTHING_TO_REPAY=-10;

global.MIN_MARGIN_CALL_DAYS = 30;

var account=require("./Account.js");
var mkt=require("./stockmarket.js");

accounts=[];

exports.createAccount=function(accountName)
{
    accounts.push(new account.Account(accountName));
}

exports.clearAccounts=function()
{
  accounts=[];
}

exports.getAccountSummary=function(accountName)
{
  return findAccount(accountName);
}

exports.clearStatus=function(accountName)
{
  findAccount(accountName).status="";
}

exports.processDay=function(gameDate,newsEvent)
{
  checkSuspendedAccounts();
  checkHacks();
  checkMarginCalls();
  if (newsEvent !=null)
    newsEvent=processBrokerEvent(newsEvent);
  return newsEvent;
}

processBrokerEvent=function(newsEvent)
{
  switch(newsEvent.type)
  {
    case EVENT_STOCK_SPLIT:
      splitStocks(newsEvent.stockName);
      break;
    case EVENT_STOCK_DIVIDEND:
      payDividends(newsEvent.stockName);
      break;
  }
  return newsEvent;
}

checkSuspendedAccounts=function()
{
    accounts.forEach(function(account)
    {
        account.progressSuspension();
    });
}

checkMarginCalls=function()
{
    accounts.forEach(function(account)
    {
        account.checkMarginCalls();
    });
}

exports.suspendAccount=function(accountName,numDays)
{
    findAccount(accountName).suspendAccount(numDays);
}

exports.accountIsSuspended=function(accountName)
{
    return findAccount(accountName).isSuspended();
}

exports.getRemainingSuspensionDays=function(accountName)
{
    return findAccount(accountName).getSuspensionDays();
}

exports.getCash=function(accountName)
{
    return findAccount(accountName).getCash();
}

exports.buyStock=function(accountName,stockName,amount)
{
  if (!mkt.isOpen())
    return MARKET_CLOSED;
  if (mkt.stockSuspended(stockName))
    return BROKER_STOCK_SUSPENDED;
  return findAccount(accountName).buyStock(stockName,amount);
}

exports.shortStock=function(accountName,stockName,amount)
{
  if (!mkt.isOpen())
    return MARKET_CLOSED;
  if (mkt.stockSuspended(stockName))
    return BROKER_STOCK_SUSPENDED;
  return findAccount(accountName).shortStock(stockName,amount);
}

//Used at end of game to force payback of a share borrow (short)
exports.forceMarginCalls=function(accountName)
{
  return findAccount(accountName).forceMarginCalls();
}

exports.repayStock=function(accountName,stockName)
{
  return findAccount(accountName).repayStock(stockName);
}

exports.sellStock=function(accountName,stockName,amount)
{
  if (!mkt.isOpen())
    return MARKET_CLOSED;
  if (mkt.stockSuspended(stockName))
    return BROKER_STOCK_SUSPENDED;
  if (mkt.declineTooSteep(stockName))
    return MARKET_NO_BUYER;
return findAccount(accountName).sellStock(stockName,amount);
}

exports.getStockValue=function(accountName)
{
  return findAccount(accountName).getStockValue();
}

exports.getStockHolding=function(accountName,stockName)
{
    return findAccount(accountName).getStockHolding(stockName);
}

exports.depositCash=function(accountName,amount)
{
    findAccount(accountName).deposit(amount);
}

exports.withdrawCash=function(accountName,amount)
{
    return findAccount(accountName).withdraw(amount);
}

payDividends=function(stockName)
{
  accounts.forEach(function(account)
  {
    var accountStock = account.getStockHolding(stockName);
    if (accountStock > 0) 
    {
        var dividendAmount = Math.max(STOCK_INCREMENT,roundStock(accountStock*STOCK_DIVIDEND_RATIO));
        console.log("Paying dividend of "+dividendAmount+" of stock "+stockName+" to "+account.name);
        account.payDividend(stockName,dividendAmount);
    }
  });
}

splitStocks=function(stockName)
{
  accounts.forEach(function(account)
  {
    account.splitStock(stockName);
  });
}

exports.taxReturn=function(accountName)
{
  var totalTax=findAccount(accountName).taxReturn();
  return totalTax;
}

exports.setupHack = function(hackingAccountName,hackedAccountName)
{  
    var hackingAccount=findAccount(hackingAccountName);
    if (beingHacked(hackedAccountName))
    {
        return ERROR_HACK_ALREADY_IN_PROGRESS;
    }
    hackingAccount.setupHacker(hackedAccountName);
    return BROKER_OK;
}

checkHacks=function()
{
    accounts.forEach(function(account)
    {
      if (account.isHackingAnAccount())
      {
        account.progressHack();
        if (account.hackIsSuccessful())
        {
          var hackedAccount=findAccount(account.getHackedAccountName());
          executeHack(account,hackedAccount);
          clearHack(account.name);
        }
      }
    });
}

executeHack=function(hackerAccount,hackedAccount)
{
  if (hackedAccount.hasSomeStock())
  {
    var mostValuableStockName=hackedAccount.getMostValuableStockName();
    var holding=hackedAccount.getStockHolding(mostValuableStockName);
    var stolenAmount=Math.max(STOCK_INCREMENT,roundStock(holding/2));
    hackedAccount.reduceStockHolding(mostValuableStockName,stolenAmount);
    hackedAccount.setAccountStatus(MSG_HACK_STEAL,hackerAccount.name,stolenAmount,mostValuableStockName)
    hackerAccount.addToStockHolding(mostValuableStockName,stolenAmount);
    hackerAccount.setAccountStatus(MSG_SUCCESSFUL_HACK,stolenAmount,mostValuableStockName);
  }
  else
  {
    hackerAccount.setAccountStatus(MSG_SUCCESSFUL_HACK_NO_SHARES,hackedAccount.name);
  }
}

beingHacked=function(accountName)
{
  for (var i=0;i<accounts.length;i++)
  {
    if (accounts[i].isHacking == accountName)
      return true;
  }
  return false;
}
exports.beingHacked=beingHacked;

exports.hackInProgress=function(accountName)
{
    return findAccount(accountName).isHackingAnAccount();
}

exports.getHackerName=function(accountName)
{
  for (var i=0;i<accounts.length;i++)
  {
    if (accounts[i].isHacking == accountName)
      return accounts[i].name;
  }
  return NONE;
}

clearHack=function(hackerAccountName)
{
  findAccount(hackerAccountName).stopHackingAnAccount();
}
exports.clearHack=clearHack;

exports.chooseAccountNameToHack=function(accountName)
{
  var bestIndex = -1;
  var best=-1;
  for (var i=0;i<accounts.length;i++)
  {
    if (accounts[i].name != accountName && !beingHacked(accounts[i].name) && players[i].getBankBalance() > best)
    {
      best=players[i].getBankBalance();
      bestIndex=i;
    }
  }
  return bestIndex==-1?"NONE":accounts[bestIndex].name;
}

exports.chooseRandomAccountName=function(accountName)
{
  while(true)
  {
    var rndIndex=Math.floor(Math.random()*accounts.length);
    if (accounts[rndIndex].name != accountName)
        return accounts[rndIndex].name;
  }
}

// ****** Internal functions **********

findAccount = function(accountName)
{
    for (var i=0;i<accounts.length;i++)
    {
        if (accountName==accounts[i].name)
            return accounts[i];
    }
    return null;
}