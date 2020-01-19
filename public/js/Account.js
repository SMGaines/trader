global.ACCOUNT_INSUFFICIENT_FUNDS=-1;
global.NONE = "NONE";

exports.Account=function(name)
{
    this.name=name;
    this.cash=0;
    this.stocks=[];
    this.isHacking=NONE;
    this.beingHackedBy=NONE;
    this.accountSuspensionDays=0;
    this.hackDaysLeft=0;

    this.deposit=function(amount)
    {
        this.cash+=amount;
    }    
    
    this.withdraw=function(amount)
    {
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
        if(accountSuspensionDays > 0)
            accountSuspensionDays--;
    }

    this.isSuspended=function()
    {
        return this.suspensionDays > 0;
    }

    this.suspendAccount=function(numDays)
    {
        this.suspensionDays=numDays;
    }

    this.getSuspensionDays=function()
    {
        return this.suspensionDays;
    }

    this.beingHacked=function()
    {
        return this.beingHackedBy!=NONE;
    }

    this.progressHack=function()
    {
        if (this.hackDaysLeft > 0)
        this.hackDaysLeft--;
    }

    this.hackComplete=function()
    {
        return this.hackDaysLeft == 0;
    }

    this.hackInProgress=function()
    {
        return this.isHacking != NONE;
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

    this.clearHack=function(hackerName)
    {
        this.beingHackedBy=NONE;
    }

    this.getHackerName=function()
    {
        return this.beingHackedBy;
    }

    this.endHackInProgress=function()
    {
        this.beingHacked=false;
    }
    
    this.getCash=function()
    {
        return this.cash;
    }

    this.payDividend=function(stockName,amount)
    {
        var stockIndex=this.getStockIndex(stockName);
        if (stockIndex != NO_SUCH_STOCK)
           this.stocks[stockIndex].amount+=amount;
    }

    this.buyStock=function(stockName,amount)
    {
        var stockPrice=mkt.getStockPrice(stockName);
        var totalValue = amount*stockPrice;
        if (totalValue > this.cash)
            return ACCOUNT_INSUFFICIENT_FUNDS;
        mkt.buyStock(stockName,amount);
        this.addToStockHolding(stockName,amount);
    }

    this.sellStock = function(stockName,amount)
    {
        var sellableAmount = Math.min(this.getStockHolding(stockName),amount);
        var salePrice = stock.calculateSalePrice();
        if (sellableAmount > 0)
        {
            var response = mkt.sellStock(stockName,sellableAmount); // TODO: Check for suspensions etc
            this.reduceStockHolding(stockName,sellableAMount);
            this.deposit(salePrice*sellableAmount);
        }
    }

    this.sellAllStock=function()
    {
        this.stocks.forEach(function(stockHolding)
        {
            if (stockHolding.amount > 0)
            {
                this.sellStock(stockHolding.name,stockHolding.amount);
            }
        });
    }

    // ****** Internal functions ********

    this.getStockHolding= function (stockName)
    {
        for (var i=0;i<this.stocks.length;i++)
        {
            if (this.stocks[i].name==stockName)
                return this.stocks[i].amount;
        }
        return 0;
    }

    this.addToStockHolding= function (stockName,amount)
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
        this.stocks.push(new this.StockHolding(stockName,amount));
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

    this.StockHolding = function (name,amount)
    {
        this.name=name;
        this.amount=amount;
    }
}