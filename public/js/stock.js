global.NUM_STARTING_STOCK = 500;

global.RISK_NONE=0;
global.RISK_LOW=1;
global.RISK_MEDIUM=2;
global.RISK_HIGH=3;
global.RISK_CRAZY=4;

global.STOCK_COLOURS = ["#0000FF","#CFB53B", "#808080","#FF1493","#9370DB","#dc143c"];
global.STOCK_RISKINESS = [RISK_NONE,RISK_LOW,RISK_MEDIUM,RISK_CRAZY,RISK_MEDIUM,RISK_LOW];
global.STOCK_NAMES=["GOVT","GOLD","OIL","HITECH","PHARMA","MINING"];

global.STOCK_MIN_VALUE = 5;
global.STOCK_MAX_VALUE = 450;
global.STOCK_ADJUSTMENT_FACTOR = 1;
global.STOCK_DAMPING_FACTOR = .95; // How quickly does stock growth/decline slow down. Nearer to 1 means more slowly
global.STOCK_INCREMENT = 50;
global.MIN_STOCK_RELEASE_AMOUNT = 500;
global.STOCK_MAX_TREND = 3;
global.STOCK_NO_BUYER_TREND=-1;
global.MIN_STOCK_PURCHASE = 50;
global.NUM_INITIAL_STOCKS=4;
global.STOCK_DIVIDEND_RATIO = .25;
global.POST_SUSPENSION_PRICE = 10;
global.TREND_MODIFIER = .0005;

exports.Stock = function(name,amount,riskiness,colour)
{
    this.name = name;
    this.available=amount;
    this.price = getRandomStartingPrice();
    this.riskiness=riskiness;
    this.trend=riskiness==RISK_NONE?1:getRandomTrend();
    this.suspensionDays=0;
    this.colour=colour;

    this.getPrice = function()
    {
        return this.price;
    }

    this.setTrend=function(trend)
    {
        this.trend=trend;
    }

    this.getAvailable = function()
    {
        return this.available;
    }
    
    this.buy = function(amount)
    {
        var sharesPurchased = Math.min(amount,this.available);
            this.available-=sharesPurchased;
        if (riskiness!=RISK_NONE)
            this.trend+=amount*TREND_MODIFIER;
        this.trend=Math.min(STOCK_MAX_TREND,this.trend);
        return sharesPurchased;
   }

    this.sell = function(amount)
    {
        this.available+=amount;
        if (riskiness!=RISK_NONE)
            this.trend-=amount*TREND_MODIFIER;
        if (this.trend < -STOCK_MAX_TREND)
            this.trend=-STOCK_MAX_TREND;
        return this.calculateSalePrice()*amount;
    }

    this.liftSuspension = function()
    {
        this.price=POST_SUSPENSION_PRICE;
        this.trend=1;
        this.suspensionDays=0;
    }
    
    this.isSuspended=function()
    {
        return this.suspensionDays > 0;
    }
    
    this.calculateSalePrice = function()
    {
        // Based on how hot or cold the stock is, calculate the stock sale price
        if (this.trend >= 1)
            return this.price;
          else
            return this.price*(1+.1*this.trend);
        }

    this.calculateBuyPrice = function()
    {
        // Based on how hot or cold the stock is, calculate the stock buy price
        if (this.trend <= 1)
            return this.price;
        else
            return this.price*(1+.1*this.trend);
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
  return STOCK_MAX_VALUE*.1 + STOCK_MAX_VALUE*.2*Math.random();
}