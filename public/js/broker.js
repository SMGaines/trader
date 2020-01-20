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
global.BROKER_INSUFFICIENT_CASH = -2;
global.BROKER_INSUFFICIENT_STOCK = -3;
global.ACCOUNT_INSUFFICIENT_FUNDS=-4;
global.ACCOUNT_INSUFFICIENT_STOCK=-5;

const TAX_PERCENTAGE=20; // Percentage tax rate on shares for a tax return

var account=require("./Account.js");
var mkt=require("./stockmarket.js");

accounts=[];

exports.createAccount=function(accountName)
{
    accounts.push(new account.Account(accountName));
}

exports.getAccountSummary=function(accountName)
{
  return findAccount(accountName);
}

exports.processDay=function(gameDate)
{
  checkSuspendedAccounts();
  checkHacks();
}

checkSuspendedAccounts=function()
{
    accounts.forEach(function(account)
    {
        account.progressSuspension();
    });
}

checkHacks=function()
{
    accounts.forEach(function(account)
    {
        account.progressHack();
        if (account.isHackingAnAccount() && account.hackIsSuccessful())
        {
            //TODO: What do you get when you hack?
        }
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
    return findAccount(accountName).buyStock(stockName,amount);
}

exports.sellStock=function(accountName,stockName,amount)
{
    return findAccount(accountName).sellStock(stockName,amount);
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

exports.payDividend=function(stockName)
{
  accounts.forEach(function(account)
  {
    var accountStock = account.getStockHolding(stockName)
    if (accountStock > 0) 
    {
        var dividendAmount = roundStock(accountStock*STOCK_DIVIDEND_RATIO);
        if (dividendAmount < STOCK_INCREMENT)
            dividendAmount = STOCK_INCREMENT;
        account.payDividend(stockName,dividendAmount);
    }
  });
}

exports.splitStock=function(stockName)
{
  accounts.forEach(function(account)
  {
    account.splitStock(stockName);
  });
}

exports.taxReturn=function()
{
  accounts.forEach(function(account)
  {
    var totalTax=0;
    account.stocks.forEach(function(stockHolding)
    {
      if (stockHolding.amount > 0)
      {
        var taxShares = stockHolding.amount*TAX_PERCENTAGE/100;
        totalTax+= taxShares*mkt.getStockPrice(stockHolding.name);
      }
    });
    log("Tax bill for "+account.name+" = "+formatMoney(totalTax));
    account.debit(totalTax);
    if (account.isOverDrawn())
        account.sellAllStocks();
  });
}

exports.setupHack = function(hackingAccountName,hackedAccountName)
{  
    var hackerAccount=findAccount(hackingAccountName);
    var hackedAccount=findAccount(hackedAccountName);
    if (hackedAccount.beingHacked())
    {
        return ERROR_HACK_ALREADY_IN_PROGRESS;
    }
    hackerAccount.setupHacker(hackedAccountName);
    hackedAccount.setHackOnAccount(hackingAccountName);
}

exports.beingHacked=function(accountName)
{
    return findAccount(accountName).beingHacked();
}

exports.hackInProgress=function(accountName)
{
    return findAccount(accountName).isHackingAnAccount();
}

exports.getHackerName=function(accountName)
{
    return findAccount(accountName).getHackerName();
}

exports.clearHack=function(hackerName,hackedName)
{
  findAccount(hackerName).stopHackingAnAccount();
  findAccount(hackedName).stopBeingHacked();
}

exports.chooseAccountNameToHack=function(accountName)
{
  var bestIndex = -1;
  var best=-1;
  for (var i=0;i<accounts.length;i++)
  {
    if (accounts[i].name != accountName && !accounts[i].beingHacked() && players[i].getBankBalance() > best)
    {
      best=players[i].getBankBalance();
      bestIndex=i;
    }
  }
  return accounts[bestIndex].name;
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