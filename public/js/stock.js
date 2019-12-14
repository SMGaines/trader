const NUM_STARTING_STOCK = 1000;

global.RISK_NONE=0;
global.RISK_LOW=1;
global.RISK_MEDIUM=2;
global.RISK_HIGH=3;
global.RISK_CRAZY=4;

global.STOCK_MIN_VALUE = 5;
global.STOCK_MAX_VALUE = 350;
global.STOCK_ADJUSTMENT_FACTOR = .5;
global.STOCK_DAMPING_FACTOR = .97;
global.STOCK_INCREMENT = 50;
global.MIN_STOCK_RELEASE_AMOUNT = 200;
global.STOCK_MAX_TREND = 5;
global.MIN_STOCK_PURCHASE = 50;
global.IPO_STOCK = "PHARMA";
global.STOCK_DIVIDEND_RATIO = .25;
global.POST_SUSPENSION_PRICE = 10;

exports.Stock = function(name,riskiness)
{
    this.name = name;
    this.available=NUM_STARTING_STOCK;
    this.price = getRandomStartingPrice();
    this.riskiness=riskiness;
    this.trend=riskiness==RISK_NONE?1:getRandomTrend();
    this.suspensionDays=0;

    this.getPrice = function()
    {
        return this.price;
    }

    this.buy = function(amount)
    {
        this.available-=amount;
        this.trend*=(1+amount/NUM_STARTING_STOCK);
   }

    this.sell = function(amount)
    {
        this.available+=amount;
        this.trend*=(1-amount/NUM_STARTING_STOCK);
    }

    this.getSummary = function()
    {
        return new StockSummary(this.name,this.available,this.price,this.trend,this.suspensionDays);
    }

    this.liftSuspension = function()
    {
        this.price=POST_SUSPENSION_PRICE;
        this.trend=1;
    }
    
    this.calculateSalePrice = function()
    {
        // Based on how hot or cold the stock is, calculate the stock sale price
        if (this.trend >= 1)
            return this.price;
          else
            return this.price*(1+.05*this.trend);
        }

    this.calculateBuyPrice = function()
    {
        // Based on how hot or cold the stock is, calculate the stock buy price
        if (this.trend <= 1)
            return this.price;
        else
            return this.price*(1+.05*this.trend);
    }
}

function getRandomTrend()
{
  if (Math.random() >= .5)
    return 1;
  else
    return -1;
}

function getRandomStartingPrice()
{
  return STOCK_MAX_VALUE*.1 + STOCK_MAX_VALUE*.3*Math.random();
}

function StockSummary(name,available,price,trend,sus)
{
    this.name=name;
    this.available=available;
    this.price=price;
    this.trend=trend;
    this.suspensionDays=sus;
}
