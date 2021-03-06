var os = require( 'os' );

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

daysElapsed = function(nowDate,beforeDate)
{
  const diffTime = Math.abs(nowDate - beforeDate);
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

getMonthYear = function(aDate)
{
    return aDate.toLocaleString('default', { month: 'long' }) + " "+aDate.getFullYear();
}

getFormattedDate = function(aDate)
{
  return aDate.toLocaleDateString("en-US", {year: 'numeric', month: 'short', day: 'numeric' }); 
}

isChristmas=function(aDate)
{
  return aDate.getDate() == 23 && aDate.getMonth()==11; // Celebrate on Dec 24th :)
}
exports.isChristmas=isChristmas;

log=function(aDate,msg)
{
  console.log(new Date(aDate).toLocaleDateString("en-UK")+": "+msg);
}

log=function(msg)
{
  console.log(msg);
}

exports.getLocalIP=function() 
{
 const interfaces = os.networkInterfaces();
 const addresses = [];

    Object.keys(interfaces).forEach((netInterface) => {
    interfaces[netInterface].forEach((interfaceObject) => {
    if (interfaceObject.family === 'IPv4' && !interfaceObject.internal) {
    addresses.push(interfaceObject.address);
   }
  });
 });
 return addresses;
}