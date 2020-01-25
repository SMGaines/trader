global.NONE = "NONE";

var mkt=require("./stockmarket.js");

exports.Account=function(name)
{
    this.name=name;
    this.cash=0;
    this.stocks=[];
    this.isHacking=NONE;
    this.beingHackedBy=NONE;
    this.suspensionDays=0;
    this.hackDaysLeft=0;

    this.getCash=function()
    {
        return this.cash;
    }

    this.deposit=function(amount)
    {
        this.cash+=amount;
    }    
    
    this.withdraw=function(amount)
    {
        if (this.getCash() < 0)
            return BROKER_ACCOUNT_OVERDRAWN;
        var withdrawalAmount = Math.min(amount,this.cash);
        this.cash-=withdrawalAmount;
        return withdrawalAmount;
    }

    this.debit=function(amount)
    {
        this.cash-=amount;
    }

    this.isOverDrawn=function()
    {
        return this.cash < 0;
    }

    this.progressSuspension=function()
    {
        if(this.suspensionDays > 0)
            this.suspensionDays--;
    }

    this.isSuspended=function()
    {
        return this.suspensionDays > 0;
    }

    this.suspendAccount=function(numDays)
    {
        this.suspensionDays=numDays;
        console.log("suspendAccount: "+this.name+" suspended for "+numDays+" days");
    }

    this.getSuspensionDays=function()
    {
        return this.suspensionDays;
    }

    this.progressHack=function()
    {
        if (this.hackDaysLeft > 0)
           this.hackDaysLeft--;
    }

    this.hackIsSuccessful=function()
    {
        return this.isHackingAnAccount() && this.hackDaysLeft == 0;
    }

    this.isHackingAnAccount=function()
    {
        return this.isHacking != NONE;
    }    

    this.getHackedAccountName=function()
    {
        return this.isHacking;
    }

    this.beingHacked=function()
    {
        return this.beingHackedBy!=NONE;
    }

    this.stopHackingAnAccount=function()
    {
        this.isHacking = NONE;
    }
    
    this.stopBeingHacked=function()
    {
        this.beingHackedBy = NONE;
    }

    this.setupHacker=function(hackedName)
    {
        this.isHacking=hackedName;
        this.hackDaysLeft= HACKING_DURATION_DAYS;
    }

    this.setHackOnAccount=function(hackerName)
    {
        this.beingHackedBy=hackerName;
    }

    this.getHackerName=function()
    {
        return this.beingHackedBy;
    }

    this.splitStock=function(stockName)
    {
        if (this.getStockHolding(stockName) > 0)
            this.addToStockHolding(stockName,this.getStockHolding(stockName));
    }

    this.payDividend=function(stockName,amount)
    {
        this.addToStockHolding(stockName,amount);
    }
    
    this.buyStock=function(stockName,amount)
    {
        if (this.getCash() < 0)
            return BROKER_ACCOUNT_OVERDRAWN;

        var stockPrice=mkt.getStockPrice(stockName);
        var affordableAmount = roundStock(this.cash/stockPrice);
        if (affordableAmount == 0)
           return BROKER_INSUFFICIENT_CASH;
        var sharesPurchased=mkt.buyStock(stockName,Math.min(amount,affordableAmount)); // Buy what you can if not enough cash
        if (sharesPurchased > 0)
        {
            this.addToStockHolding(stockName,sharesPurchased);
            this.debit(sharesPurchased*stockPrice);
            return sharesPurchased;
        }
        else
            return BROKER_INSUFFICIENT_STOCK;
    }

    this.sellStock = function(stockName,amount)
    {
        var sellableAmount = Math.min(this.getStockHolding(stockName),amount);
        if (sellableAmount > 0)
        {
            var valueOfSale = mkt.sellStock(stockName,sellableAmount); // TODO: Check for suspensions etc
            this.reduceStockHolding(stockName,sellableAmount);
            this.deposit(valueOfSale);
            return sellableAmount;
        }
        else
            return ACCOUNT_INSUFFICIENT_STOCK;
    }

    this.taxReturn=function()
    {
        totalTax=0;
        this.stocks.forEach(function(stockHolding)
        {
          if (stockHolding.amount > 0)
          {
            var taxShares = stockHolding.amount*TAX_PERCENTAGE/100;
            totalTax+=taxShares*mkt.getStockPrice(stockHolding.name);
          }
        });
        this.debit(totalTax);
        return totalTax;
    }

    this.hasSomeStock=function()
    {
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].amount>0)
                return true;
       }
       return false;
    }

    this.getMostValuableStockName=function()
    {
        var best=-1;
        var bestName=NONE;
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].amount>0)
            {
                var stockValue=this.stocks[i].amount*mkt.getStockPrice(this.stocks[i].name);
                if (stockValue > best)
                {
                    best=stockValue;
                    bestName=this.stocks[i].name;
                }
            }
        }
        return bestName;
    }

    // ****** Internal functions ********

    this.getStockHolding=function(stockName)
    {
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].name==stockName)
                return this.stocks[i].amount;
        }
        return 0;
    }

    this.addToStockHolding=function(stockName,amount)
    {
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].name==stockName)
            {
                this.stocks[i].amount+=amount;
                return;
            }
        }
        // Failed to find the stock, therefore create a new one
        this.stocks.push(new StockHolding(stockName,amount));
    }

    this.reduceStockHolding= function (stockName,amount)
    {
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].name==stockName)
            {
                this.stocks[i].amount-=amount;
            }
        }
    }

    StockHolding = function (name,amount)
    {
        this.name=name;
        this.amount=amount;
    }
}