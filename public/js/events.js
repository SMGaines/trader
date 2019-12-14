global.EVENT_NONE=0;
global.EVENT_INTEREST_RATE_UP = 1;
global.EVENT_INTEREST_RATE_DOWN = 2;
global.EVENT_INFLATION_RATE_UP = 3;
global.EVENT_INFLATION_RATE_DOWN = 4;
global.EVENT_GAME_WINNER = 5;
global.EVENT_TAX_RETURN = 6;
global.EVENT_LOTTERY_WIN = 7;
// Events below are 'interesting' events from an Insider perspective
global.EVENT_CRASH=8;
global.EVENT_BOOM=9;
global.EVENT_CRASH_ALL_STOCKS=10;
global.EVENT_BOOM_ALL_STOCKS=11;
global.EVENT_STOCK_IPO =12;
global.EVENT_STOCK_RELEASE = 13;
global.EVENT_STOCK_DIVIDEND = 14;
global.EVENT_SHARES_SUSPENDED = 15;

global.TAX_RETURN_MONTH=11; //i.e. December

var events=[];

MonthEvent = function (type,stockName,headLine,tagLine,finalEvent)
{
  this.date=new Date();
  this.type=type;
  this.stockName=stockName;
  this.headLine=headLine;
  this.tagLine=tagLine;
  this.isFinalEvent=finalEvent;
}

getMonthEvent = function(aDate)
{
  for (var i=0;i<events.length;i++)
  {
    if (aDate.getMonth() == events[i].date.getMonth() && aDate.getYear() == events[i].date.getYear())
      return events[i];
  }
  return null;
}
exports.getMonthEvent = getMonthEvent;

getEndOfGameEvent = function(aDate)
{
  return new MonthEvent(EVENT_GAME_WINNER,"","$name wins!!","Crushes opposition with impressive win",true); //true==final event
}
exports.getEndOfGameEvent = getEndOfGameEvent;

exports.setupEvents=function(gameStartDate,gameDurationInMonths,stocks,ipoStockName)
{
  createMainEvents(stocks,ipoStockName);
  addInterestInflationEvents(gameDurationInMonths);
  addTaxEvents(gameDurationInMonths);
  shuffleEvents();
  setEventDates(gameStartDate);
  adjustForTaxEvents(gameDurationInMonths);
  for (var i=0;i<gameDurationInMonths;i++)
  {
    console.log(events[i].date.toLocaleDateString('en-US')+": "+events[i].type+","+events[i].stockName+","+events[i].headLine);
  }
}

function setEventDates(gameStartDate)
{
  for (var i=0;i<events.length;i++)
  {
    events[i].date=new Date(gameStartDate);
    events[i].date.setMonth(gameStartDate.getMonth()+i);
  }
}

function adjustForTaxEvents(gameDurationInMonths)
{
  // Tax events need to be in December so swap the events
  // that are currently in December with the tax events
  for (var i=0;i<gameDurationInMonths/12;i++)
  {
    for (var j=0;j<events.length;j++)
    {
      if (events[j].type==EVENT_TAX_RETURN && events[j].date.getMonth() != TAX_RETURN_MONTH) // i.e. its not in December
      {
        for (k=0;k<events.length;k++)
        {
          if (events[k].date.getMonth()==TAX_RETURN_MONTH && events[k].type != EVENT_TAX_RETURN)
          {
            var tmp=events[k].date;
            events[k].date=events[j].date;
            events[j].date=tmp;
            [events[k], events[j]] = [events[j], events[k]];
          }
        }
      }
    } 
  }
}

function createMainEvents(stocks,ipoStockName)
{
  // Set initially with 0 dates since the dates are assigned later in setEventDates()
  events.push(new MonthEvent(EVENT_NONE,"","","")); // Dummy event since we don't have one in very first month
  events.push(new MonthEvent(EVENT_CRASH,"GOLD","Gold prices tumble","Massive new mine discovered in South Africa"));
  events.push(new MonthEvent(EVENT_BOOM,"GOLD","Gold in huge demand","Investors seek safe haven"));
  events.push(new MonthEvent(EVENT_BOOM,"OIL","Oil prices surge","Fighting in Iraq reduces supply"));
  events.push(new MonthEvent(EVENT_CRASH_ALL_STOCKS,"","Stock Market Crash","Panic as prices freefall"));
  events.push(new MonthEvent(EVENT_BOOM,"HITECH","Technology Boom!","Prices skyrocket in buying frenzy"));
  events.push(new MonthEvent(EVENT_CRASH,"HITECH","Tech Bubble Bursts!","Investors dump stock"));
  events.push(new MonthEvent(EVENT_BOOM_ALL_STOCKS,"","Markets Soar!","End of Trump Presidency boosts confidence"));
  events.push(new MonthEvent(EVENT_LOTTERY_WIN,"","$name wins $win!!", "Massive Lottery win!"));
  events.push(new MonthEvent(EVENT_LOTTERY_WIN,"","$name wins $win!!","Massive Lottery win!"));
  events.push(new MonthEvent(EVENT_STOCK_IPO,ipoStockName,ipoStockName+" issues IPO!","Hottest stock on the market!"));
  var rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_RELEASE,stocks[rndStockID].name,"Extra Shares Available",stocks[rndStockID].name+" releases more shares"));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_RELEASE,stocks[rndStockID].name,"Extra Shares Available",stocks[rndStockID].name+" releases more shares"));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_DIVIDEND,stocks[rndStockID].name,"STOCK DIVIDEND!",stocks[rndStockID].name+" pays out extra shares!"));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_DIVIDEND,stocks[rndStockID].name,"STOCK DIVIDEND!",stocks[rndStockID].name+" pays out extra shares!"));
  while(true)
  {
      rndStockID = Math.floor(Math.random()*stocks.length);
      if (rndStockID != "GOVT")
        break;
  }
  events.push(new MonthEvent(EVENT_SHARES_SUSPENDED,stocks[rndStockID].name,stocks[rndStockID].name+" SHARES SUSPENDED!","Internal corruption exposed!"));
  
  while(true)
  {
      rndStockID = Math.floor(Math.random()*stocks.length);
      if (rndStockID != "GOVT")
        break;
  }
  events.push(new MonthEvent(EVENT_SHARES_SUSPENDED,stocks[rndStockID].name,stocks[rndStockID].name+" SHARES SUSPENDED!","Internal corruption exposed!"));
}

function addTaxEvents(gameDurationInMonths)
{
  // One tax event per year
  for (var i=0;i<gameDurationInMonths/12;i++)
  {
     events.push(new MonthEvent(EVENT_TAX_RETURN,"","TAX RETURNS DUE!","Panic as government demands payment!"));
  }
}

function addInterestInflationEvents(gameDurationInMonths)
{
  for (var i=events.length;i<gameDurationInMonths;i++)
  {
    var rndEvent=Math.floor(Math.random()*4);
    switch(rndEvent)
    {
      // Set initially with 0 dates since the dates are assigned later in setEventDates()
      case 0: events.push(new MonthEvent(EVENT_INTEREST_RATE_UP,"","Interest Rates Up","Govt hikes rates again!"));break;
      case 1: events.push(new MonthEvent(EVENT_INTEREST_RATE_DOWN,"","Interest Rates Down","Rates sink further!"));break;
      case 2: events.push(new MonthEvent(EVENT_INFLATION_RATE_UP,"","Inflation soars","Rates hit new high!"));break;
      case 3: events.push(new MonthEvent(EVENT_INFLATION_RATE_DOWN,"","Inflation Rates Down","Rate drops further!"));break;
    }
  }
}

function shuffleEvents() 
{
  let i = events.length;
  while (i-->1) 
  {
    const ri = 1+Math.floor(Math.random() * i);
    [events[i], events[ri]] = [events[ri], events[i]];
  }
}

function getRandomDate(gameStartDate,gameDurationInMonths)
{
  var rndMonths = Math.floor(Math.random*numMonths);
  gameStartDate.setMonth(gameStartDate.getMonth()+rndMonths);
  return gameStartDate;
}

exports.findUpcomingEvent = function (aDate,numMonths)
{
  for (var i=0;i<events.length;i++)
  {
    var monthDiff = monthDifference(aDate,events[i].date);
    if (monthDiff>0 && monthDiff <= numMonths && interestingEvent(events[i].type))
    {
        return events[i];
    }
  }
  return null;
}

interestingEvent=function(type)
{
  return type > EVENT_LOTTERY_WIN;
}

function monthDifference(now, future) 
{
    var months;
    months = (future.getFullYear() - now.getFullYear()) * 12;
    months -= now.getMonth() + 1;
    months += future.getMonth();
    return months <= 0 ? 0 : months;
}