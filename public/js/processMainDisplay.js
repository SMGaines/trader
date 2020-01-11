const GAME_TITLE = "TRADER v1.0";
const FONT_SIZE = 40;
const FONT_NAME = "courier";

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
const CMD_GAME_ID="gameID";
const CMD_GET_GAME_ID="getgameID";

const TAX_BEGIN_TIMER = 10000;
const TAX_SHOW_TIMER = 10000;

var stockChart,newspaperChart,stockTicker;

var numStocks;
var players = [];
var stocks = [];
var gameDate;
var gameLang;
var gameID;

init = function()
{
    console.log("ProcessMainDisplay: Initialising");
    stockTicker=new StockTicker();
    numStocks=0;
    socket.emit(CMD_GET_GAME_LANGUAGE);
    socket.emit(CMD_GET_GAME_ID);
    newspaperChart=new NewsPaperChart();
};

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

socket.on(CMD_GAME_ID,function(data)
{  
    gameID=data.msg;
    console.log("CMD_GAME_ID: "+gameID);
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

var financialsDisplay = function(stocks)
{
    var tableBody = document.getElementById('stockAvailDisplay').getElementsByTagName('tbody')[0];
    var newRow,newCell;
    tableBody.innerHTML="";
    for (var i=0;i<stocks.length;i++)
    {
        newRow=tableBody.insertRow();
        newCell = newRow.insertCell();    
        newCell.innerHTML = createSpan(stocks[i].available,stocks[i].suspensionDays > 0?"black":stocks[i].colour);
    };
}

var playerDisplay = function(players,stocks)
{
    var tableBody = document.getElementById('leaderBoardTable').getElementsByTagName('tbody')[0];
    var newRow,newCell;
    tableBody.innerHTML="";
 
    var sortedPlayerList=sortOnNetWorth(players,stocks);
    for (var i=0;i<sortedPlayerList.length;i++)
    {
        var player = sortedPlayerList[i];

        newRow=tableBody.insertRow();
        newCell = newRow.insertCell();  
        newCell.style.width="40%";   
        var col="white";
        if (player.prisonDaysRemaining > 0 && player.netWorth > 0)
            col ="black";
        else if (player.beingHacked && player.netWorth > 0)
            col="red";
        newCell.innerHTML = createSpan(player.name,col);

        newCell = newRow.insertCell();     
        newCell.style.width="30%";   
        if (player.netWorth<0)
            newCell.innerHTML = createSpan("BANKRUPT","red");
        else
            newCell.innerHTML = createSpan(formatMoney(player.cash),"white");
         
        newCell = newRow.insertCell();     
        newCell.style.width="30%";   
        if (player.netWorth<0)
            newCell.innerHTML = createSpan("BANKRUPT","red");
        else
            newCell.innerHTML = createSpan(formatMoney(player.netWorth),"white");
    };
}

function showFinancialData(aDate,interestRate,inflationRate)
{
    document.getElementById('gametitle').innerHTML=GAME_TITLE;
    document.getElementById('gamedate').innerHTML=getLongDate(aDate,gameLang);
    document.getElementById('gameID').innerHTML=gameID;
    document.getElementById('interestRateHeader').innerHTML="Interest";
    document.getElementById('inflationRateHeader').innerHTML="Inflation";
    document.getElementById('interestRate').innerHTML=createSpan(interestRate.toFixed(1)+"%","white");
    document.getElementById('inflationRate').innerHTML=createSpan(inflationRate.toFixed(1)+"%","white");
}

// Utilities

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

function createSpan(text,colour)
{
    return "<span class='mainDisplayText' style='color:"+colour+"'>"+text+"</span>";
}

function formatMoney(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    return formatter.format(amount);
}

function getLongDate(aDate,lang)
{
    var options = {year: 'numeric', month: 'long', day: 'numeric' };
    return aDate.toLocaleDateString(lang=="PL"?"PL":"en-US", options);
}