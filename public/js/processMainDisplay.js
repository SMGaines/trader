const GAME_TITLE = "TRADER v2.0";
const FONT_SIZE = 40;
const FONT_NAME = "courier";

const MAX_STOCKS = 6; // Co-ordinate with stockmarket.js
const STOCK_MIN_VALUE = 5;
const STOCK_MAX_VALUE = 500;
const STOCK_COLOURS = ["#0000FF","#CFB53B", "#808080","#FF1493","#9370DB","#dc143c"]; // Must sync with stock.js
const STOCK_NAMES=["GOVT","GOLD","OIL","HITECH","PHARMA","MINING"];// Must sync with stock.js

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
const CMD_GAME_DATE="gamedate";
const CMD_DEPOSIT="deposit";
const CMD_BANK="bank";
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
    stockChart=new StockChart(document.getElementById("stockDisplay"));
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
        stockChart.updateStocks(stocks);
        stockTicker.initTickers("stockTicker",stocks);
        numStocks=stocks.length;
    }
    stockChart.draw(stocks);
    stockTicker.loadTickers(stocks);
    financialsDisplay(stocks);
    playerDisplay(players);
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
    if (monthEvent.isFinalEvent)
    {
        console.log("GAME OVER");
        playerDisplay(players);
        document.getElementById("openingBell").play();
    }
    newspaperChart.initNewsStory(monthEvent);
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
    var tableRow = document.getElementById('stockAvail');
    var newCell;
    tableRow.innerHTML="";
    newCell = tableRow.insertCell();    
    newCell.style.padding="10px";
    newCell.style.width="13%";   
    newCell.innerHTML=createSpan("Avail","mainDisplayText","white");

    for (var i=0;i<MAX_STOCKS;i++)
    {
        newCell = tableRow.insertCell();    
        newCell.style.padding="10px";
        newCell.style.width="13%";   
        if (i<stocks.length)
             newCell.innerHTML = createSpan(stocks[i].available,"mainDisplayText",stocks[i].suspensionDays > 0?"black":stocks[i].colour);
        else
            newCell.innerHTML="&nbsp;";
    };
}

var playerDisplay = function(players)
{
    players.sort((p1, p2) => (p1.balance > p2.balance) ? -1 : 1);
    var tableBody = document.getElementById('leaderBoardTable').getElementsByTagName('tbody')[0];
    var newRow,newCell;
    tableBody.innerHTML="";
 
    for (var i=0;i<players.length;i++)
    {
        var player = players[i];
        newRow=tableBody.insertRow();
        newCell = newRow.insertCell();  
        newCell.style.width="27%";   
        newCell.style.textAlign="left";

        newCell.innerHTML = createSpan(player.name,"mainDisplayText",getPlayerColour(player));
        newCell = newRow.insertCell();     
        newCell.style.width="60%";   
        newCell.style.textAlign="left";
        newCell.innerHTML = createStockDisplay(player.account.stocks);
        newCell = newRow.insertCell();     
        newCell.style.width="13%";   
        newCell.style.textAlign="left";
        newCell.innerHTML = formatMoney(player.balance);
    };
}

function getPlayerColour(player)
{
   if (player.account.suspensionDays > 0)
        return "black";
    else if (player.account.beingHackedBy!="NONE")
        return "red";
    return "white";
}

function createStockDisplay(playerStocks)
{
    var html="";
    for (var i=0;i<playerStocks.length;i++)
    {
        if (playerStocks[i].amount > 0)
            html+=(createSpan(playerStocks[i].amount,"stockDisplayText",getStockColour(playerStocks[i])))+"&nbsp;";
    }
    return html;
}

function getStockColour(stock)
{
    for (var i=0;i<STOCK_NAMES.length;i++)
    {
        if (stock.name == STOCK_NAMES[i])
            return STOCK_COLOURS[i];
    }
    return "white";   
}

function showGameInfo()
{
    document.getElementById('gametitle').innerHTML=GAME_TITLE;
    document.getElementById('gameID').innerHTML=gameID;
}

function showDate()
{
    document.getElementById('gamedate').innerHTML=getLongDate(gameDate);
}

// Utilities

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}

function formatMoney(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    if (amount > 1000000)
        return createSpan(formatter.format(amount/1000000)+"M","mainDisplayText","red");
    else
        return createSpan(formatter.format(amount/1000)+"K","mainDisplayText","white");
}

function getLongDate(aDate)
{
    var options = {year: 'numeric', month: 'short', day: 'numeric' };
    return aDate.toLocaleDateString("en-US", options);
}