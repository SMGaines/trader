const GAME_TITLE = "TRADER v1.0";
const FONT_SIZE = 8;
const STOCK_MIN_VALUE = 5;
const STOCK_MAX_VALUE = 400;
 
const HISTORY_SIZE = 10;
const NONE = -1;
const colors = ["#0000FF","#CFB53B", "#808080","#FF1493","#9370DB"];

const CMD_NEW_PRICES="newprices";
const CMD_NEW_MONTH="newmonth";
const CMD_SELL_STOCK="sellstock";
const CMD_BUY_STOCK="buystock";
const CMD_REGISTER="register";
const CMD_REGISTERED="registered";
const CMD_REGISTRATION_ERROR="registrationerror";
const CMD_INSIDER="insider";
const CMD_HACK="hack";
const CMD_SUSPECT="suspect";
const CMD_END_OF_GAME="endofgame";
const CMD_GAME_STARTED="gamestarted";
const CMD_PLAYER_LIST="playerlist";
const CMD_ERROR="error";
const CMD_GET_GAME_ADDRESS="getgameaddress";
const CMD_GAME_ADDRESS="getgameaddress";
const CMD_GAME_LANGUAGE="gamelanguage";
const CMD_GET_GAME_LANGUAGE="getgamelanguage";

const TAX_BEGIN_TIMER = 10000;
const TAX_SHOW_TIMER = 10000;

var stockChart,newspaperChart;

var firstPrices;
var players = [];
var stocks = [];
var gameDate;
var gameLang;

socket = io.connect();

socket.on(CMD_NEW_PRICES,function(data)
{
    var pricesInfo=data.msg;
    gameDate=pricesInfo.date;
    showFinancialData(new Date(gameDate),pricesInfo.interestRate,pricesInfo.inflationRate);
    stocks=pricesInfo.stockSummary;
    if (firstPrices)
    {
        stockChart=new StockChart(document.getElementById("stockDisplay"),stocks);
        firstPrices=false;
    }
    else
        stockChart.draw(stocks);

    financialsDisplay(stocks);
    playerDisplay(players,stocks);
});

socket.on(CMD_GAME_LANGUAGE,function(data)
{  
    gameLang=data.msg;
    console.log("CMD_GAME_LANGUAGE: "+gameLang);
});

socket.on(CMD_NEW_MONTH,function(data)
{  
    var monthEvent=data.msg;
    newspaperChart.initNewsStory(monthEvent);
});

socket.on(CMD_END_OF_GAME,function(data)
{  
    console.log("GAME OVER");
    var endEvent=data.msg;
    newspaperChart.initNewsStory(endEvent);
});

socket.on(CMD_GAME_STARTED,function(data)
{  
    showDate(new Date(data.msg));
});

socket.on(CMD_PLAYER_LIST,function(data)
{
    players=data.msg;
    playerDisplay(players,stocks);
});

init = function()
{
    console.log("ProcessMainDisplay: Initialising");
    firstPrices=true;
    //playerDisplay(players,stocks);
    socket.emit(CMD_GET_GAME_LANGUAGE);
    newspaperChart=new NewsPaperChart();
};

var financialsDisplay = function(stocks)
{
    var html= "<TABLE>";
    html+=addTR(addTH(addHeaderText(gameLang=="PL"?"Akcje":"Stock"))+addTH(addHeaderText(gameLang=="PL"?"ILOŚĆ":"Avail"))+addTH(addHeaderText(gameLang=="PL"?"CENA":"Price")));
    for (var i=0;i<stocks.length;i++)
    {
        var priceDisplay,stockNameDisplay,stockAvailDisplay;
        if (stocks[i].suspensionDays > 0)
        {
            priceDisplay = addTH(addText(stocks[i].price.toFixed(2),"courier",7,"black"));
            stockNameDisplay = addTH(addText(stocks[i].name,"courier",7,"black"));
            stockAvailDisplay = addTH(addText(stocks[i].available,"courier",7,"black"));
        }
        else
        {
            priceDisplay = addTH(addStockText(stocks[i].price.toFixed(2),stocks[i].trend >=0));
            stockNameDisplay = addTH(addText(stocks[i].name,"courier",7,colors[i]));
            stockAvailDisplay = addTH(addText(stocks[i].available,"courier",7,colors[i]));  
        }
        html+=addTR(stockNameDisplay+stockAvailDisplay+priceDisplay);
    };
    html+="</TABLE>"
    document.getElementById('stockNamesDisplay').innerHTML=html;
}

var endTaxDisplay=function()
{
    processingTaxReturn=false;
    document.getElementById('taxDisplay').style.display= "none";
}

var taxDisplay=function()
{
    processingTaxReturn = true;
    var html= "<TABLE>";
    html+=addTR(addTH(addHeaderText("Player"))+addTH("&nbsp;")+addTH(addHeaderText("Tax Bill")));
    for (var j=0;j<players.length;j++)
    {
        html+=addTR(addTH(addStandardText(players[j].name))+addTH("")+addTHWithID("tax"+players[j].name,addStandardText(formatMoney(0))));
    }
    html+="</TABLE>";
    document.getElementById('taxDisplay').innerHTML=html;
    document.getElementById('taxDisplay').style.display= "block";
    setTimeout(animateTaxReturns,TAX_BEGIN_TIMER);
}

var animateTaxReturns=function()
{
    for (var j=0;j<players.length;j++)
    {
        animateCashValue("tax"+players[j].name,0,players[j].taxBill);
    }
    setTimeout(endTaxDisplay,TAX_SHOW_TIMER);
}

var playerDisplay = function(players,stocks)
{
    var html= "<TABLE style='width:100%'>";
    html+="<TR>";
    html+=addTH(addHeaderText(gameLang=="PL"?"Gracz":"Player"));
    html+=addTH(addHeaderText(gameLang=="PL"?"Gotówka":"Cash"));
    if (stocksReady())
    {
        for (var j=0;j<stocks.length;j++)
        {
            if (stocks[j].suspensionDays>0)
                html+=addTH(addText(stocks[j].name,"courier",FONT_SIZE,"black"));
            else
                html+=addTH(addText(stocks[j].name,"courier",FONT_SIZE,colors[j]));
        }
    }
    html+=addTH(addHeaderText(gameLang=="PL"?"Wartość Netto":"Net Worth"));
    html+="</TR>";

    var sortedPlayerList=sortOnNetWorth(players,stocks);
    for (var i=0;i<sortedPlayerList.length;i++)
    {
        html+="<TR>";
        var player = sortedPlayerList[i];
        if (player.prisonDaysRemaining > 0 && player.netWorth > 0)
            html+=addTH(addText(player.name,"courier",FONT_SIZE,"black"));
        else if (player.beingHacked && player.netWorth > 0)
            html+=addTH(addText(player.name,"courier",FONT_SIZE,"red"));
        else
            html+=addTH(addStandardText(player.name));
         if (player.netWorth<0)
            html+=addTH(addText(gameLang=="PL"?"UPADŁY":"BANKRUPT","courier",FONT_SIZE,"red"));
        else
            html+=addTHWithID("cash"+player.name,addStandardText(formatMoney(player.cash)));
        if (stocksReady())
        {
            for (var j=0;j<stocks.length;j++)
            {
                if (stocks[j].suspensionDays>0)
                    html+=addTH(addText(getPlayerStockHolding(player,stocks[j].name),"courier",FONT_SIZE,"black"));
                else if (player.allStockSold)
                    html+=addTH(addText(getPlayerStockHolding(player,stocks[j].name),"courier",FONT_SIZE,"red"));
                else
                    html+=addTH(addStandardText(getPlayerStockHolding(player,stocks[j].name)));
            }
        }
        if (player.netWorth<0)
            html+=addTH(addText(gameLang=="PL"?"UPADŁY":"BANKRUPT","courier",FONT_SIZE,"red"));
        else
            html+=addTH(addStandardText(formatMoney(player.netWorth)));
        html+="</TR>";
    };
    html+="</TABLE>"
    document.getElementById('leaderBoardDisplay').innerHTML=html;
}

function animateCashValue(id, start, end) 
{
    var obj = document.getElementById(id);
    var stepTime = 150;
    var value=start;
    var increment = end>start?500:-500;
    function run() 
    {
        value+=increment;
        if (increment > 0 && value >=end)
            value=end;
        if (increment < 0 && value <end)
            value=end;
        obj.innerHTML = addStockText(formatMoney(value),false);
        if (value == end) 
        {
            clearInterval(timer);
        }
    }
    
    timer = setInterval(run, stepTime);
    run();
}

function inJail(player)
{
    return player.prisonDaysRemaining > 0;
}

function sortOnNetWorth(players)
{
    var pNetWorth=[];
    players.forEach(function(player)
    {
        pNetWorth.push(player.netWorth);
    });

    var sortedPlayerList=[];
    while(true)
    {
        var best=-5000000; // KLUDGY!
        var bestIndex=-1;
        for (var j=0;j<pNetWorth.length;j++)
        {
            if (pNetWorth[j]>best)
            {
                best=pNetWorth[j];
                bestIndex=j;
            }
        }
        if (bestIndex == -1)
            break;
        sortedPlayerList.push(players[bestIndex]);
        pNetWorth[bestIndex]= -6000000; // KLUDGY!
    }
    return sortedPlayerList;
}

getPlayerStockHolding=function(player,stockName)
{
  for (var i=0;i<player.stocks.length;i++)
  {
    if (player.stocks[i].name == stockName)
        return player.stocks[i].amount;
  }
  return 0;
}

// Utilities

function getMonthYear(aDate)
{
    return aDate.toLocaleString('default', { month: 'long' }) + " "+aDate.getYear();
}

function addTH(text)
{
    return "<TH>"+text+"</TH>";
}

function addTHWithID(id,text)
{
    return "<TH id='"+id+"'>"+text+"</TH>";
}

function addTR(text)
{
    return "<TR>"+text+"</TR>";
}

function addStockText(text,risingPrice)
{
    return addText(text,"courier",FONT_SIZE,risingPrice?"#00FF00":"#FF0000");
}

function addStandardText(text)
{
    return addText(text,"courier",FONT_SIZE,"white");
}

function addHeaderText(text)
{
    return addText(text,"courier",FONT_SIZE,"#4CAF50");
}

function addText(text,fontName,fontSize,fontColour)
{
    return "<font color='"+fontColour+"' size='"+fontSize+"' face='"+fontName+"'>"+text+"</font>";
}

function formatMoney(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    return formatter.format(amount);
}

function roundValue(amount)
{
    return Math.round(amount * 100) / 100;
}

function stocksReady()
{
    return Array.isArray(stocks) && stocks.length;
}

function getLongDate(aDate,lang)
{
    var options = {year: 'numeric', month: 'long', day: 'numeric' };
    return aDate.toLocaleDateString(lang=="PL"?"PL":"en-US", options);
}

function showFinancialData(aDate,interestRate,inflationRate)
{
    var dateToday = getLongDate(aDate,gameLang);
    document.getElementById('gametitle').innerHTML=addHeaderText(GAME_TITLE);
    document.getElementById('gamedate').innerHTML=addStandardText(dateToday);
    document.getElementById('interestRate').innerHTML=addStandardText((gameLang=="PL"?"Stopa Procentowa":"Interest")+": "+interestRate+"%");
    document.getElementById('inflationRate').innerHTML=addStandardText((gameLang=="PL"?"Inflacja":"Inflation")+": "+inflationRate+"%");
}