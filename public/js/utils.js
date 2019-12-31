getLanguageIndex=function(lang)
{
  if (lang == "EN")
    return LANG_EN;
  if (lang == "PL")
    return LANG_PL;
    return LANG_EN;
}
exports.getLanguageIndex=getLanguageIndex;

isAlphaNumeric = function(str) 
{
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) 
  {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
}
exports.isAlphaNumeric=isAlphaNumeric;

daysElapsed = function(nowDate,lastCrimeDate)
{
  const diffTime = Math.abs(nowDate - lastCrimeDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
exports.daysElapsed=daysElapsed;

formatMoney = function(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    return formatter.format(amount);
}
exports.formatMoney=formatMoney;

roundStock =function(amount)
{
  return STOCK_INCREMENT*Math.floor(amount/STOCK_INCREMENT);
}
exports.roundStock=roundStock;

getRandomFactor = function ()
{
  return 3*(Math.random()-Math.random());
}
exports.getRandomFactor=getRandomFactor;

getRiskMultiplier = function (riskiness)
{
    switch(riskiness)
    {
        case RISK_NONE: return 1;
        case RISK_LOW: return 1.1;
        case RISK_MEDIUM: return 1.3;
        case RISK_HIGH: return 1.5;
        case RISK_CRAZY: return 2;
    }
}
exports.getRiskMultiplier=getRiskMultiplier;

getMonthYear = function(aDate)
{
    return aDate.toLocaleString('default', { month: 'long' }) + " "+aDate.getFullYear();
}

getPlayerStatusMsg=function(msgType,lang,argX,argY,argZ)
{
  var msg =msgType[lang];
  if (argX !== undefined) msg=msg.replace("$x",argX);
  if (argY !== undefined) msg=msg.replace("$y",argY);
  if (argZ !== undefined) msg=msg.replace("$z",argZ);
  return msg;
}

getInsiderEventPlayerStatus = function(event,lang)
{
  var interestingEventDate = getMonthYear(event.date);
  switch(event.type)
  {
    case EVENT_CRASH: return getPlayerStatusMsg(MSG_EVENT_STOCK_CRASH,lang,event.stockName,interestingEventDate);
    case EVENT_BOOM: return getPlayerStatusMsg(MSG_EVENT_STOCK_BOOM,lang,event.stockName,interestingEventDate);
    case EVENT_CRASH_ALL_STOCKS: return getPlayerStatusMsg(MSG_EVENT_STOCK_MARKET_CRASH,lang,interestingEventDate);
    case EVENT_BOOM_ALL_STOCKS: return getPlayerStatusMsg(MSG_EVENT_STOCK_MARKET_BOOM,lang,interestingEventDate);
    case EVENT_STOCK_IPO:return getPlayerStatusMsg(MSG_EVENT_STOCK_IPO,lang,interestingEventDate);
    case EVENT_STOCK_RELEASE: return getPlayerStatusMsg(MSG_EVENT_EXTRA_STOCK,lang,event.stockName,interestingEventDate);
    case EVENT_STOCK_DIVIDEND: return getPlayerStatusMsg(MSG_EVENT_STOCK_DIVIDEND,lang,event.stockName,interestingEventDate);
    case EVENT_STOCK_SUSPENDED: return getPlayerStatusMsg(MSG_EVENT_STOCK_SUSPENDED,lang,event.stockName,interestingEventDate);
    default: log("setupInsider: Unknown event type: "+event.type);return "";
  }
}
exports.getInsiderEventPlayerStatus=getInsiderEventPlayerStatus;