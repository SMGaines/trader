const GAME_TITLE = "TRADER v2.1";
const MAX_STOCKS = 6; // Co-ordinate with stockmarket.js
const STOCK_MIN_VALUE = 5; // The lowest *display* value - actual stock price can go lower
const STOCK_MAX_VALUE = 700; // The highest *display* value - actual stock price can go higher
const STOCK_COLOURS = ["#0000FF","#CFB53B", "#808080","#FF1493","#9370DB","#dc143c"]; // Must sync with stock.js
const STOCK_NAMES=["GOVT","GOLD","OIL","HITECH","PHARMA","MINING"];// Must sync with stock.js

const HISTORY_SIZE = 50;
const NONE = -1;

const COUNTDOWN_DAYS = 10;

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
const CMD_INTEREST_RATE="interestRate";
const CMD_SHORT_STOCK="shortStock";
// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

var stockChart,newspaperChart,stockTicker;

var numStocks;
var players = [];
var stocks = [];
var gameDate,gameEndDate;
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
    console.log("CMD_NEW_PRICES: Stocks length: "+stocks.length);
   
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
  var gameDates=data.msg;
  gameDate=new Date(gameDates.currentDate);
  gameEndDate=new Date(gameDates.endDate);
  showDate();
});

socket.on(CMD_INTEREST_RATE,function(data)
{
  var interestRate=data.msg;
  document.getElementById("interestRate").innerHTML=interestRate.toFixed(1);
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
    var hackDaysLeft=getHackDaysLeft(player);
    if (player.account.suspensionDays > 0)
        return "black";
    else if (hackDaysLeft > 0)
        return getHackedPlayerColour(hackDaysLeft);
    else
        return "white";
}

function getHackDaysLeft(player)
{
    for (var i=0;i<players.length;i++)
    {
        if (players[i].account.isHacking == player.name)
            return players[i].account.hackDaysLeft;
    }
    return 0;
}

function getHackedPlayerColour(daysLeft)
{
    if (daysLeft < 2)
        return "rgb(255,0,0)";
    else if (daysLeft < 10)
        return "rgb(255,200,200)";
    else if (daysLeft < 15)
        return "rgb(255,220,220)";
    else 
        return "rgb(255,240,240)";
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
    var dateObj=document.getElementById('gamedate');
    dateObj.innerHTML=getLongDate(gameDate);
    if (dayDiff(gameDate,gameEndDate) <= COUNTDOWN_DAYS)
        dateObj.style.color="red";
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

function dayDiff(date1,date2)
{
    return Math.ceil((date2 - date1) / (1000 * 60 * 60 * 24)); 
}