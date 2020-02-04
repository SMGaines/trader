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
global.EVENT_STOCK_SUSPENDED = 15;
global.EVENT_STOCK_SPLIT=16;
global.EVENT_MARKET_CLOSED=17;

global.AVERAGE_MONTH_LENGTH=30.5;

global.TAX_RETURN_MONTH=8; //i.e. September 

var events=[];

exports.initialise=function(gameStartDate,gameDurationInMonths,stocks)
{
  createMainEvents(stocks);
  addTaxEvents(gameDurationInMonths);
  shuffleEvents();
  setEventDates(gameStartDate,gameDurationInMonths);
  adjustForTaxEvents(gameDurationInMonths);
  
  for (var i=0;i<events.length;i++)
  {
    console.log(events[i].date.toLocaleDateString('en-US')+": "+events[i].type+","+events[i].date+","+events[i].headLine);
  }
}

exports.getEndOfGameEvent=function(winnerName)
{
  return new NewsEvent(EVENT_GAME_WINNER,"",getNewsMsg(MSG_NEWS_HEAD_WINNER,winnerName),getNewsMsg(MSG_NEWS_SUB_WINNER),true);
}

getNewsEvent = function(aDate)
{
  for (var i=0;i<events.length;i++)
  {
    if (aDate.getMonth() == events[i].date.getMonth() && aDate.getYear() == events[i].date.getYear() && aDate.getDate() == events[i].date.getDate())
      return events[i];
  }
  return null;
}
exports.getNewsEvent = getNewsEvent;

getNewsMsg=function(msgType,argX,argY,argZ)
{
  var msg=msgType[LANG_EN];
  if (argX !== undefined) msg=msg.replace("$x",argX);
  if (argY !== undefined) msg=msg.replace("$y",argY);
  if (argZ !== undefined) msg=msg.replace("$z",argZ);
  return msg;
}

function setEventDates(gameStartDate,gameDurationInMonths)
{
  var eventInterval = Math.floor(events.length*AVERAGE_MONTH_LENGTH/gameDurationInMonths);
  for (var i=0;i<events.length;i++)
  {
    events[i].date=new Date(gameStartDate);
    events[i].date.setDate(gameStartDate.getDate()+i*eventInterval);
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

function createMainEvents(stocks)
{
  events.push(new NewsEvent(EVENT_NONE,"","","")); // Dummy event since we don't have one in very first month
  events.push(new NewsEvent(EVENT_CRASH,"OIL",getNewsMsg(MSG_NEWS_HEAD_OIL_CRASH),getNewsMsg(MSG_NEWS_SUB_OIL_CRASH)));
  events.push(new NewsEvent(EVENT_BOOM,"GOLD",getNewsMsg(MSG_NEWS_HEAD_GOLD_BOOM),getNewsMsg(MSG_NEWS_SUB_GOLD_BOOM)));
  events.push(new NewsEvent(EVENT_BOOM,"OIL",getNewsMsg(MSG_NEWS_HEAD_OIL_BOOM),getNewsMsg(MSG_NEWS_SUB_OIL_BOOM)));
  events.push(new NewsEvent(EVENT_CRASH_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_CRASH),getNewsMsg(MSG_NEWS_SUB_MKT_CRASH)));
  events.push(new NewsEvent(EVENT_CRASH_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_CRASH),getNewsMsg(MSG_NEWS_SUB_MKT_CRASH)));
  events.push(new NewsEvent(EVENT_BOOM,"HITECH",getNewsMsg(MSG_NEWS_HEAD_TECH_BOOM),getNewsMsg(MSG_NEWS_SUB_TECH_BOOM)));
  events.push(new NewsEvent(EVENT_BOOM,"HITECH",getNewsMsg(MSG_NEWS_HEAD_TECH_BOOM),getNewsMsg(MSG_NEWS_SUB_TECH_BOOM)));
  events.push(new NewsEvent(EVENT_CRASH,"HITECH",getNewsMsg(MSG_NEWS_HEAD_TECH_CRASH),getNewsMsg(MSG_NEWS_SUB_TECH_CRASH)));
  events.push(new NewsEvent(EVENT_BOOM_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_BOOM),getNewsMsg(MSG_NEWS_SUB_MKT_BOOM)));
  events.push(new NewsEvent(EVENT_BOOM_ALL_STOCKS,"",getNewsMsg(MSG_NEWS_HEAD_MKT_BOOM),getNewsMsg(MSG_NEWS_SUB_MKT_BOOM)));
  events.push(new NewsEvent(EVENT_LOTTERY_WIN,"",getNewsMsg(MSG_NEWS_HEAD_LOTTERY),getNewsMsg(MSG_NEWS_SUB_LOTTERY)));
  events.push(new NewsEvent(EVENT_LOTTERY_WIN,"",getNewsMsg(MSG_NEWS_HEAD_LOTTERY),getNewsMsg(MSG_NEWS_SUB_LOTTERY)));
  events.push(new NewsEvent(EVENT_STOCK_IPO,"",getNewsMsg(MSG_NEWS_HEAD_IPO),getNewsMsg(MSG_NEWS_SUB_IPO)));
  events.push(new NewsEvent(EVENT_STOCK_IPO,"",getNewsMsg(MSG_NEWS_HEAD_IPO),getNewsMsg(MSG_NEWS_SUB_IPO)));
  var stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_RELEASE,stockName,getNewsMsg(MSG_NEWS_HEAD_EXTRA_SHARES),getNewsMsg(MSG_NEWS_SUB_EXTRA_SHARES,stockName)));
  stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_RELEASE,stockName,getNewsMsg(MSG_NEWS_HEAD_EXTRA_SHARES),getNewsMsg(MSG_NEWS_SUB_EXTRA_SHARES,stockName)));
  stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_RELEASE,stockName,getNewsMsg(MSG_NEWS_HEAD_EXTRA_SHARES),getNewsMsg(MSG_NEWS_SUB_EXTRA_SHARES,stockName)));
  stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_DIVIDEND,stockName,getNewsMsg(MSG_NEWS_HEAD_DIVIDEND),getNewsMsg(MSG_NEWS_SUB_DIVIDEND,stockName)));
  stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_DIVIDEND,stockName,getNewsMsg(MSG_NEWS_HEAD_DIVIDEND),getNewsMsg(MSG_NEWS_SUB_DIVIDEND,stockName)));
  stockName= getRandomStock(stocks,"");
  events.push(new NewsEvent(EVENT_STOCK_DIVIDEND,stockName,getNewsMsg(MSG_NEWS_HEAD_DIVIDEND),getNewsMsg(MSG_NEWS_SUB_DIVIDEND,stockName)));
  stockName= getRandomStock(stocks,"GOVT");
  events.push(new NewsEvent(EVENT_STOCK_SUSPENDED,stockName,getNewsMsg(MSG_NEWS_HEAD_SUSPENDED,stockName),getNewsMsg(MSG_NEWS_SUB_SUSPENDED)));
  stockName= getRandomStock(stocks,"GOVT");
  events.push(new NewsEvent(EVENT_STOCK_SUSPENDED,stockName,getNewsMsg(MSG_NEWS_HEAD_SUSPENDED,stockName),getNewsMsg(MSG_NEWS_SUB_SUSPENDED)));
  stockName=findHighestPriceStock(stocks);
  events.push(new NewsEvent(EVENT_STOCK_SPLIT,stockName,getNewsMsg(MSG_NEWS_HEAD_SPLIT,stockName),getNewsMsg(MSG_NEWS_SUB_SPLIT)));
  stockName=findHighestPriceStock(stocks);
  events.push(new NewsEvent(EVENT_STOCK_SPLIT,stockName,getNewsMsg(MSG_NEWS_HEAD_SPLIT,stockName),getNewsMsg(MSG_NEWS_SUB_SPLIT)));
  stockName=findHighestPriceStock(stocks);
  events.push(new NewsEvent(EVENT_STOCK_SPLIT,stockName,getNewsMsg(MSG_NEWS_HEAD_SPLIT,stockName),getNewsMsg(MSG_NEWS_SUB_SPLIT)));
  events.push(new NewsEvent(EVENT_MARKET_CLOSED,"",getNewsMsg(MSG_NEWS_HEAD_MKT_CLOSE),getNewsMsg(MSG_NEWS_SUB_MKT_CLOSE)));
  events.push(new NewsEvent(EVENT_MARKET_CLOSED,"",getNewsMsg(MSG_NEWS_HEAD_MKT_CLOSE),getNewsMsg(MSG_NEWS_SUB_MKT_CLOSE)));
}

function getRandomStock(stocks,exceptStock)
{
  while(true)
  {
      var rndStockID = Math.floor(Math.random()*stocks.length);
      if (stocks[rndStockID].name != exceptStock) // Don't choose the 'exceptStock'
        return stocks[rndStockID].name;
  }
}

function findHighestPriceStock(stocks)
{
  var best=-999;
  bestIndex=-1;
  for (var i=0;i<stocks.length;i++)
  {
    if (stocks[i].price > best)
    {
      best=stocks[i].price;
      bestIndex=i;
    }
  }
  return stocks[bestIndex].name;
}

function addTaxEvents(gameDurationInMonths)
{
  // One tax event per year
  for (var i=0;i<gameDurationInMonths/12;i++)
  {
     events.push(new NewsEvent(EVENT_TAX_RETURN,"",getNewsMsg(MSG_NEWS_HEAD_TAX_RETURN),getNewsMsg(MSG_NEWS_SUB_TAX_RETURN)));
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

exports.findUpcomingEvent = function (aDate,numDays)
{
  console.log("findUpcomingEvent: "+aDate+"/"+numDays);
  for (var i=0;i<events.length;i++)
  {
    var dayDiff = dayDifference(aDate,events[i].date);
    if (dayDiff>0 && dayDiff <= numDays && interestingEvent(events[i].type))
    {
        return events[i];
    }
  }
  return null;
}

interestingEvent=function(type)
{
  return type > EVENT_LOTTERY_WIN; // See constans at top of file
}

function dayDifference(now, future) 
{
  var msPerDay=1000*60*60*24;
  return (future-now)/msPerDay;
}

NewsEvent = function (type,stockName,headLine,tagLine,finalEvent)
{
  this.date=new Date();
  this.type=type;
  this.goodNews=isGoodNews(type);
  this.isTaxReturn=type==EVENT_TAX_RETURN;
  this.stockName=stockName;
  this.headLine=headLine;
  this.tagLine=tagLine;
  this.isFinalEvent=finalEvent;
}

isGoodNews = function(type)
{
  return  (type == EVENT_NONE || type == EVENT_INTEREST_RATE_UP  || type==EVENT_INFLATION_RATE_DOWN ||
           type == EVENT_GAME_WINNER || type == EVENT_LOTTERY_WIN || type == EVENT_BOOM ||
           type == EVENT_BOOM_ALL_STOCKS || type == EVENT_STOCK_IPO || type == EVENT_STOCK_RELEASE ||
           type == EVENT_STOCK_DIVIDEND || type==EVENT_STOCK_SPLIT);
}