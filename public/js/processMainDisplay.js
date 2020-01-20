const GAME_TITLE = "TRADER v2.0";
const FONT_SIZE = 40;
const FONT_NAME = "courier";

const STOCK_MIN_VALUE = 5;
const STOCK_MAX_VALUE = 500;
 
const HISTORY_SIZE = 50;
const NONE = -1;

// ******* Shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******
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
const CMD_NEW_RATES="newrates";
const CMD_GAME_DATE="gamedate";
const CMD_DEPOSIT="deposit";
const CMD_WITHDRAW="withdraw";
// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

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
    stocks=data.msg;
    
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

socket.on(CMD_NEW_RATES,function(data)
{
    var ratesInfo=data.msg;
    showRates(ratesInfo.interestRate,ratesInfo.inflationRate);
});

socket.on(CMD_GAME_DATE,function(data)
{
    gameDate=new Date(data.msg);
    showDate();
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
    showGameInfo();
    document.getElementById("openingBell").play();
    var tFloor = document.getElementById("tradingFloor")
    tFloor.loop = true;
    tFloor.play();
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
    console.log("Game started");
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
        newCell.style.width="60%";   
        var col="white";
        if (player.account.accountSuspensionDays > 0)
            col ="black";
        else if (player.account.beingHackedBy!="NONE")
            col="red";
        newCell.innerHTML = createSpan(player.name,col);

        newCell = newRow.insertCell();     
        newCell.style.width="40%";   
        newCell.innerHTML = formatMoney(player.balance);
    };
}

function showGameInfo()
{
    document.getElementById('gametitle').innerHTML=GAME_TITLE;
    document.getElementById('gameID').innerHTML="Game:"+gameID;
}

function showRates(interestRate,inflationRate)
{
    document.getElementById('interestRate').innerHTML=createSpan(interestRate.toFixed(1)+"%","white");
    //document.getElementById('inflationRate').innerHTML=createSpan(inflationRate.toFixed(1)+"%","white");
}

function showDate()
{
    document.getElementById('gamedate').innerHTML=getLongDate(gameDate);
}

// Utilities

function sortOnNetWorth(players)
{
    var pNetWorth=[];
    players.forEach(function(player)
    {
        pNetWorth.push(player.balance);
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
    return "<span class='mainDisplayText' style='text-align: center;color:"+colour+"'>"+text+"</span>";
}

function formatMoney(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    return createSpan(formatter.format(amount/1000)+"K","white");
}

function getLongDate(aDate)
{
    var options = {year: 'numeric', month: 'long', day: 'numeric' };
    return aDate.toLocaleDateString("en-US", options);
}