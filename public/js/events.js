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
var gameLang; // The language that event messages will be in

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

getNewsMsg=function(msgType,argX,argY,argZ)
{
  var msg=msgType[gameLang];
  if (argX !== undefined) msg=msg.replace("$x",argX);
  if (argY !== undefined) msg=msg.replace("$y",argY);
  if (argZ !== undefined) msg=msg.replace("$z",argZ);
  return msg;
}

getEndOfGameEvent = function(aDate)
{
  return new MonthEvent(EVENT_GAME_WINNER,"",getNewsMsg(MSG_NEWS_HEAD_WINNER),getNewsMsg(MSG_NEWS_SUB_WINNER),true); //true==final event
}
exports.getEndOfGameEvent = getEndOfGameEvent;

exports.setupEvents=function(gameStartDate,gameDurationInMonths,stocks,ipoStockName,aLang)
{
  gameLang=aLang; 
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
  events.push(new MonthEvent(EVENT_NONE,"","","")); // Dummy event since we don't have one in very first month
  events.push(new MonthEvent(EVENT_CRASH,"OIL",getNewsMsg(MSG_NEWS_HEAD_OIL_CRASH),getNewsMsg(MSG_NEWS_SUB_OIL_CRASH)));
  events.push(new MonthEvent(EVENT_BOOM,"GOLD",getNewsMsg(MSG_NEWS_HEAD_GOLD_BOOM),getNewsMsg(MSG_NEWS_SUB_GOLD_BOOM)));
  events.push(new MonthEvent(EVENT_BOOM,"OIL",getNewsMsg(MSG_NEWS_HEAD_OIL_BOOM),getNewsMsg(MSG_NEWS_SUB_OIL_BOOM)));
  events.push(new MonthEvent(EVENT_CRASH_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_CRASH),getNewsMsg(MSG_NEWS_SUB_MKT_CRASH)));
  events.push(new MonthEvent(EVENT_BOOM,"HITECH",getNewsMsg(MSG_NEWS_HEAD_TECH_BOOM),getNewsMsg(MSG_NEWS_SUB_TECH_BOOM)));
  events.push(new MonthEvent(EVENT_CRASH,"HITECH",getNewsMsg(MSG_NEWS_HEAD_TECH_CRASH),getNewsMsg(MSG_NEWS_SUB_TECH_CRASH)));
  events.push(new MonthEvent(EVENT_BOOM_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_BOOM),getNewsMsg(MSG_NEWS_SUB_MKT_BOOM)));
  events.push(new MonthEvent(EVENT_LOTTERY_WIN,"",getNewsMsg(MSG_NEWS_HEAD_LOTTERY),getNewsMsg(MSG_NEWS_SUB_LOTTERY)));
  events.push(new MonthEvent(EVENT_LOTTERY_WIN,"",getNewsMsg(MSG_NEWS_HEAD_LOTTERY),getNewsMsg(MSG_NEWS_SUB_LOTTERY)));
  events.push(new MonthEvent(EVENT_STOCK_IPO,ipoStockName,getNewsMsg(MSG_NEWS_HEAD_IPO,ipoStockName),getNewsMsg(MSG_NEWS_SUB_IPO)));
  var rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_RELEASE,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_EXTRA_SHARES),getNewsMsg(MSG_NEWS_SUB_EXTRA_SHARES,stocks[rndStockID].name)));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_RELEASE,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_EXTRA_SHARES),getNewsMsg(MSG_NEWS_SUB_EXTRA_SHARES,stocks[rndStockID].name)));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_DIVIDEND,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_DIVIDEND),getNewsMsg(MSG_NEWS_SUB_DIVIDEND,stocks[rndStockID].name)));
  rndStockID = Math.floor(Math.random()*stocks.length);
  events.push(new MonthEvent(EVENT_STOCK_DIVIDEND,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_DIVIDEND),getNewsMsg(MSG_NEWS_SUB_DIVIDEND,stocks[rndStockID].name)));
  while(true)
  {
      rndStockID = Math.floor(Math.random()*stocks.length);
      if (stocks[rndStockID].name != STOCK_GOVT)
        break;
  }
  events.push(new MonthEvent(EVENT_SHARES_SUSPENDED,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_SUSPENDED,stocks[rndStockID].name),getNewsMsg(MSG_NEWS_SUB_SUSPENDED)));
  
  while(true)
  {
      rndStockID = Math.floor(Math.random()*stocks.length);
      if (stocks[rndStockID].name != STOCK_GOVT)
        break;
  }
  events.push(new MonthEvent(EVENT_SHARES_SUSPENDED,stocks[rndStockID].name,getNewsMsg(MSG_NEWS_HEAD_SUSPENDED,stocks[rndStockID].name),getNewsMsg(MSG_NEWS_SUB_SUSPENDED)));
}

function addTaxEvents(gameDurationInMonths)
{
  // One tax event per year
  for (var i=0;i<gameDurationInMonths/12;i++)
  {
     events.push(new MonthEvent(EVENT_TAX_RETURN,"",getNewsMsg(MSG_NEWS_HEAD_TAX_RETURN),getNewsMsg(MSG_NEWS_SUB_TAX_RETURN)));
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
      case 0: events.push(new MonthEvent(EVENT_INTEREST_RATE_UP,"",getNewsMsg(MSG_NEWS_HEAD_INTEREST_UP),getNewsMsg(MSG_NEWS_SUB_INTEREST_UP)));break;
      case 1: events.push(new MonthEvent(EVENT_INTEREST_RATE_DOWN,"",getNewsMsg(MSG_NEWS_HEAD_INTEREST_DOWN),getNewsMsg(MSG_NEWS_SUB_INTEREST_DOWN)));break;
      case 2: events.push(new MonthEvent(EVENT_INFLATION_RATE_UP,"",getNewsMsg(MSG_NEWS_HEAD_INFLATION_UP),getNewsMsg(MSG_NEWS_SUB_INFLATION_UP)));break;
      case 3: events.push(new MonthEvent(EVENT_INFLATION_RATE_DOWN,"",getNewsMsg(MSG_NEWS_HEAD_INFLATION_DOWN),getNewsMsg(MSG_NEWS_SUB_INFLATION_DOWN)));break;
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