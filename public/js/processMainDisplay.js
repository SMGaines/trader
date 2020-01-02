const GAME_TITLE = "TRADER v1.0";
const FONT_SIZE = 40;
const STOCK_MIN_VALUE = 5;
const STOCK_MAX_VALUE = 400;
 
const HISTORY_SIZE = 10;
const NONE = -1;

const CMD_NEW_PRICES="newprices";
const CMD_NEWS_EVENT="newsevent";
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

var stockChart,newspaperChart,stockTicker;

var numStocks;
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
    if (numStocks !=stocks.length)
    {
        stockChart=new StockChart(document.getElementById("stockDisplay"),stocks);
        stockTicker.initTickers("stockTicker",stocks);
        numStocks=stocks.length;
    }
    else
        stockChart.draw(stocks);
    stockTicker.loadTickers(stocks);
    financialsDisplay(stocks);
    playerDisplay(players,stocks);
});

socket.on(CMD_GAME_LANGUAGE,function(data)
{  
    gameLang=data.msg;
    console.log("CMD_GAME_LANGUAGE: "+gameLang);
});

socket.on(CMD_NEWS_EVENT,function(data)
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
    stockTicker=new StockTicker();
    numStocks=0;
    socket.emit(CMD_GET_GAME_LANGUAGE);
    newspaperChart=new NewsPaperChart();
};

var financialsDisplay = function(stocks)
{
    var thWidth = 100/stocks.length;
    var html= "<TABLE align='center'>";
    html+=addTR(addTH(addHeaderText(gameLang=="PL"?"Avail":"Avail")));
    for (var i=0;i<stocks.length;i++)
    {
        html+=addTR(addTH(addText(stocks[i].available,"courier",FONT_SIZE,stocks[i].suspensionDays > 0?"black":stocks[i].colour)));
    };
    html+="</TABLE>"
    document.getElementById('stockAvailDisplay').innerHTML=html;
}

var playerDisplay = function(players,stocks)
{
    var html= "<TABLE style='width:100%'>";
    html+="<TR>";
    html+=addTH(addHeaderText(gameLang=="PL"?"Gracz":"Player"));
    html+=addTH(addHeaderText(gameLang=="PL"?"Gotówka":"Cash"));
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
        if (player.netWorth<0)
            html+=addTH(addText(gameLang=="PL"?"UPADŁY":"BANKRUPT","courier",FONT_SIZE,"red"));
        else
            html+=addTH(addStandardText(formatMoney(player.netWorth)));
        html+="</TR>";
    };
    html+="</TABLE>"
    document.getElementById('leaderBoardDisplay').innerHTML=html;
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
    return "<font  style='font-size:"+fontSize+"px' color='"+fontColour+"' face='"+fontName+"'>"+text+"</font>";
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
    document.getElementById('interestRateHeader').innerHTML=addHeaderText((gameLang=="PL"?"Oprocentowanie":"Interest"));
    document.getElementById('inflationRateHeader').innerHTML=addHeaderText((gameLang=="PL"?"Inflacja":"Inflation"));
    document.getElementById('interestRate').innerHTML=addStandardText(interestRate.toFixed(1)+"%");
    document.getElementById('inflationRate').innerHTML=addStandardText(inflationRate.toFixed(1)+"%");
}