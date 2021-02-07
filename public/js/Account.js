global.NONE = "NONE";

var mkt=require("./stockmarket.js");
const { formatMoney } = require("./utils.js");

exports.Account=function(name)
{
    this.name=name;
    this.cash=0;
    this.stocks=[];
    this.borrowedStocks=[];
    this.isHacking=NONE;
    this.suspensionDays=0;
    this.hackDaysLeft=0;
    this.status="";

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

    this.checkMarginCalls=function()
    {
        for (var i=0;i<this.borrowedStocks.length;i++)
        {
            if (this.borrowedStocks[i].marginCallDays > 0)
            {
                this. borrowedStocks[i].marginCallDays--;
                if (this.borrowedStocks[i].marginCallDays == 0)
                {
                    this.handleMarginCall(i);
                }  
            }
        }
    }

    this.handleMarginCall=function(stockIndex)
    {
        // If account has enough stock to cover the margin call then just pay it back
        if (this.getStockHolding(this.borrowedStocks[stockIndex].name) >= this.borrowedStocks[stockIndex].amount)
        {
            this.reduceStockHolding(this.borrowedStocks[stockIndex].name,this.borrowedStocks[stockIndex].amount);
            mkt.repayStock(this.borrowedStocks[stockIndex].name,this.borrowedStocks[stockIndex].amount); 
            this.borrowedStocks[stockIndex].amount=0;
            this.setAccountStatus(MSG_MARGIN_CALL_REPAID_WITH_EXISTING_STOCK);
        }
        else 
        {
            // Repayment is simulated by just debiting the account based on the current shareprice and the amount borrowed
            // (In the real world it is done by the account holder buying the relevant shares on the market and giving them back)
            // Either way, the same net number of shares remain in circulation
            var stockPrice=mkt.getStockPrice(this.borrowedStocks[stockIndex].name);
            //console.log("Account: handleMarginCall: "+stockPrice+"/"+this.borrowedStocks[stockIndex].amount);
            var repaymentAmount=this.borrowedStocks[stockIndex].amount*stockPrice;
            this.debit(repaymentAmount);

            this.setAccountStatus(MSG_MARGIN_CALL_REPAID,formatMoney(repaymentAmount));
            this.borrowedStocks[stockIndex].amount=0;
        }
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

    this.stopHackingAnAccount=function()
    {
        this.isHacking = NONE;
    }

    this.setupHacker=function(hackedName)
    {
        this.isHacking=hackedName;
        this.hackDaysLeft= Math.floor(.5*HACKING_DURATION_DAYS*(1+Math.random())); // i.e. between 50% and 100 % of HACKING_DURATION_DAYS (defined in Players.js)
        console.log("Account: setupHacker: hacker="+this.name+" / hacked="+hackedName+" / "+this.hackDaysLeft);
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
        if (affordableAmount <= 0)
           return ACCOUNT_INSUFFICIENT_FUNDS;
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

    this.shortStock=function(stockName,amount)
    {
        if (this.getBorrowedStockHolding(stockName) > 0)
            return BROKER_STOCK_ALREADY_BORROWED;

        // No checks (deliberately) on Player account cash
        // Upon a margin call, the player could sink into massive debt
 
        var sharesBorrowed=mkt.buyStock(stockName,amount); 
        if (sharesBorrowed > 0)
        {
            this.addToBorrowedStockHolding(stockName,sharesBorrowed);
            var valueOfSale = mkt.sellStock(stockName,sharesBorrowed); 
            this.deposit(valueOfSale);
            this.setAccountStatus(MSG_SHARE_BORROW,sharesBorrowed,stockName,formatMoney(valueOfSale));
            console.log("Account: shortStock: "+this.name+" borrowed "+sharesBorrowed+" shares of "+stockName+" and sold them for "+formatMoney(valueOfSale));
            return sharesBorrowed;
        }
        else
            return BROKER_INSUFFICIENT_STOCK;
    }

    this.repayStock=function(stockName)
    {
        var amount=this.getBorrowedStockHolding(stockName);
        if (amount == 0)
        {
            this.setAccountStatus(MSG_NOTHING_TO_REPAY,amount,stockName);
            return BROKER_NOTHING_TO_REPAY;
        }
        //mkt.repayStock(stockName,amount); 
        var stockPrice=mkt.getStockPrice(stockName);
        this.debit(stockPrice*amount);
        this.setAccountStatus(MSG_STOCK_BORROW_REPAID,amount,stockName,formatMoney(stockPrice*amount));
        this.clearBorrowedStockHolding(stockName);
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

    this.getStockValue=function()
    {
        var totalValue=0;
        for (var i=0;i<this.stocks.length;i++)
        {
            totalValue+=this.stocks[i].amount*mkt.getStockPrice(this.stocks[i].name);
        }
        return totalValue;
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

    this.getBorrowedStockHolding=function(stockName)
    {
        for (var i=0;i<this.borrowedStocks.length;i++)
        {
            if (this.borrowedStocks[i].name==stockName)
                return this.borrowedStocks[i].amount;
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

    this.addToBorrowedStockHolding=function(stockName,amount)
    {
        var marginCallDays=MIN_MARGIN_CALL_DAYS*Math.floor(1+Math.random()*2);
        for (var i=0;i<this.borrowedStocks.length;i++)
        {
            if (this.borrowedStocks[i].name==stockName)
            {
                this.borrowedStocks[i].amount=amount;
                this.borrowedStocks[i].marginCallDays=marginCallDays;
                return;
            }
        }        
        this.borrowedStocks.push(new BorrowedStockHolding(stockName,amount,marginCallDays));
    }

    this.clearBorrowedStockHolding=function(stockName)
    {
        for (var i=0;i<this.borrowedStocks.length;i++)
        {
            if (this.borrowedStocks[i].name==stockName)
            {
                this.borrowedStocks[i].amount=0;
                this.borrowedStocks[i].marginCallDays=0;
                return;
            }
        }      
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

    this.setAccountStatus=function(msgType,argX,argY,argZ)
    {
        var msg =msgType[LANG_EN];
        if (argX !== undefined) msg=msg.replace("$x",argX);
        if (argY !== undefined) msg=msg.replace("$y",argY);
        if (argZ !== undefined) msg=msg.replace("$z",argZ);
        this.status=msg;
        console.log("Account: setStatus: "+this.name+": "+msg);
    }

    StockHolding = function (name,amount)
    {
        this.name=name;
        this.amount=amount;
    }

    BorrowedStockHolding = function (name,amount,marginCallDays)
    {
        this.name=name;
        this.amount=amount;
        this.marginCallDays=marginCallDays;
    }
}