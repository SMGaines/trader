const GAME_NAME="TRADER";
const GAME_VERSION="0.5";

const COOKIE_EXPIRY_MS = 60*60*1000;
const COOKIE_USER_PARAMETER = "username";
const COOKIE_GAME_ID_PARAMETER = "gameid";

const STOCK_INCREMENT = 50;
const MAX_STOCK = 1000;
const REG_PLAYER_EXISTS=1;
const LANG_EN=0;
const LANG_PL=1;
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

const NONE = "NONE";

var stocks=[];
var numStocks;
var numPlayers;
var players = [];
var myPlayer;
var myPlayerName;
var gameStarted;
var gameDate;
var policeAudioPlayed;
var bankruptAudioPlayed;
var selectedStock,selectedAmount;
var amountMonitor;
var gameID;

socket = io.connect();

socket.on(CMD_GAME_STARTED,function(data)
{
  console.log("processPlayer: Game Started");
  gameStarted=true;
});

socket.on(CMD_NEW_PRICES,function(data)
{
  gameStarted=true;
  var pricesInfo=data.msg;
  gameDate=new Date(pricesInfo.date);
  stocks=pricesInfo.stockSummary; 
  
  if (numStocks != stocks.length) 
  {
    numStocks=stocks.length;
    updateStockButtons();
  }
});

socket.on(CMD_REGISTERED,function(data)
{
  gameID=data.msg;
  setCookie(COOKIE_GAME_ID_PARAMETER,gameID);
  document.getElementById("gameTitle").innerHTML= GAME_NAME+" "+GAME_VERSION+": "+ gameID;
  openStatusForm(myPlayerName+" registered for game: "+gameID);
  /*var newPlayer=data.msg;
  if (newPlayer.name==myPlayerName)
  {
    myPlayer=newPlayer;
    closeRegistrationForm();
    console.log("Registered");
    openStatusForm(newPlayer.status);
  }*/
});

socket.on(CMD_REGISTRATION_ERROR,function(data)
{
    var regError = data.msg;
    console.log("Error in registration: "+regError);
    openRegistrationErrorForm(regError);
});

socket.on(CMD_ERROR,function(data)
{
  var msg=data.msg;
  console.log("Error: "+msg);
  openStatusForm("Error: "+msg);
});

socket.on(CMD_PLAYER_LIST,function(data)
{
  gameStarted=true;
  var tradeOccurred=false;;
  if (myPlayer != null)
    tradeOccurred=checkForTrades(data.msg);

  players=data.msg;
  myPlayer=findMyPlayer(players);
  if (myPlayer == null)
  {
    console.log("Player not found: "+myPlayerName);
    return;
  }

  if (tradeOccurred)
  {
    console.log("Trade occurred");
    document.getElementById("trade").play();
    updateStockButtons();
  }
  
  if (myPlayer.netWorth < 0)
  {
    openBankruptForm(myPlayer);
  }
  else if (myPlayer.prisonDaysRemaining > 0)
  {
    openPrisonForm(myPlayer);
  }
  else if (myPlayer.status != "")
  {
    if (isChristmas())
    {
      document.getElementById("xmas").play();
    }
    openStatusForm(myPlayer.status);
  }
  if (myPlayer.allStockSold)
  {
    document.getElementById("allstocksold").play();
  }
});

init = function()
{
    console.log("Init");
    numStocks=0;
    numPlayers=0;
    gameStarted=false;
    policeAudioPlayed=false;
    bankruptAudioPlayed=false;
    gameID=getCookie(COOKIE_GAME_ID_PARAMETER);
    openRegistrationForm();
};

// ********** Start OF STATUS FORM FUNCTIONS **********

function openStatusForm(statusMsg) 
{
  document.getElementById('playerStatus').innerHTML=statusMsg;
  document.getElementById('statusForm').style.display= "block";
}

function closeStatusForm(statusMsg) 
{
  document.getElementById('statusForm').style.display= "none";
}

// ********** END OF STATUS FORM FUNCTIONS **********

// ********** START OF TRANSACTION FUNCTIONS **********

buy = function()
{
  closeTransactionForm();
  console.log("Buying "+selectedAmount+" shares of "+selectedStock);
  socket.emit(CMD_BUY_STOCK,gameID,myPlayer.name,selectedStock,selectedAmount);
}

sell = function()
{
    closeTransactionForm();
    if (selectedStock == "NONE")
        return;
    console.log("Selling "+selectedAmount+" shares of "+selectedStock);
    socket.emit(CMD_SELL_STOCK,gameID,myPlayer.name,selectedStock,selectedAmount);
}

function openTransactionForm(stockName)
{
    if (!gameStarted)
        openStatusForm(myPlayer.lang==LANG_EN?"Game not started":"Gra się nie rozpoczęła");
    else
        if (myPlayer.prisonDaysRemaining > 0)
            return;
    else
    {
        selectedStock=stockName;
        amountMonitor=setInterval(lookForAmountChange,100);
        document.getElementById("selectedStock").innerHTML=selectedStock;
        document.getElementById("selectedStock").style.backgroundColor=getStockByName(selectedStock).colour;
        document.getElementById("amountSelector").innerHTML="<input id='rangeAmount' type='range' step='50' min='50' max='"+MAX_STOCK+"' value='"+MAX_STOCK/2+"' class='myslider'/>";
        document.getElementById("stockAmount").innerHTML=MAX_STOCK/2;
        document.getElementById("transactionForm").style.display= "block";
    }
}

function updateStockButtons()
{
    selectedStock=NONE;
    if (typeof stocks == 'undefined' || typeof myPlayer == 'undefined')
      return;
    for (var i=0;i<stocks.length;i++)
    {
        stockCell=document.getElementById("stock"+i);
        stockCell.innerHTML =addStockButton(stocks[i]);
    }
}

function addStockButton(stock)
{
  console.log("Stock "+stock.name+"="+getPlayerStockHolding(myPlayer,stock.name));
  return "<button id='stockButton"+stock.name+"' class='stockButton' style='background-color:"+ stock.colour+"; type='button' onclick='openTransactionForm(&quot;"+stock.name+"&quot;)'>"+
  getPlayerStockHolding(myPlayer,stock.name)+"</button>";
}

function lookForAmountChange()
{
  selectedAmount = parseInt(document.getElementById("rangeAmount").value);
  document.getElementById("stockAmount").innerHTML = selectedAmount;
}

function closeTransactionForm()
{
    clearInterval(amountMonitor);
	document.getElementById("transactionForm").style.display= "none";
}

// ********** END OF TRANSACTION FORM FUNCTIONS **********

// ********** START OF SUSPECT FUNCTIONS **********

suspect = function()
{
    closeSuspectForm();
    var suspectedPlayerName = getSuspectedPlayerName();
    if (suspectedPlayerName == NONE)
        return;
    socket.emit(CMD_SUSPECT,gameID,myPlayer.name,suspectedPlayerName);
}

function openSuspectForm()
{
    if (!gameStarted)
        openStatusForm(myPlayer.lang==LANG_EN?"Game not started":"Gra się nie rozpoczęła");
    else
	    if (myPlayer.prisonDaysRemaining > 0)
		    return;
    else
    {
        if (numPlayers != players.length)
        {
          document.getElementById('suspectPlayers').innerHTML=addSuspectPlayerDropDown();
          numPlayers=players.length;
        }  
        document.getElementById('suspectForm').style.display= "block";
    }
}

getSuspectedPlayerName = function(action)
{
    var dd = document.getElementById('suspectSelectPlayer');
    return dd.options[dd.selectedIndex].value;
}

function addSuspectPlayerDropDown()
{
    return addPlayerDropDown("suspectSelectPlayer");
}

function closeSuspectForm()
{
	document.getElementById("suspectForm").style.display= "none";
}

// ********** END OF SUSPECT FORM FUNCTIONS **********

// ********** START OF HACK FUNCTIONS **********

hack = function()
{
    closeHackForm();
    var hackedPlayerName = getHackedPlayerName();
    if (hackedPlayerName == NONE)
        return;
    socket.emit(CMD_HACK,gameID,myPlayer.name,hackedPlayerName);
}

function openHackForm()
{
  if (!gameStarted)
    openStatusForm(myPlayer.lang==LANG_EN?"Game not started":"Gra się nie rozpoczęła");
  else
	if (myPlayer.prisonDaysRemaining > 0)
		return;
  else
  {
    if (numPlayers != players.length)
    {
        document.getElementById('hackPlayers').innerHTML=addHackPlayerDropDown();
        numPlayers=players.length;
    }
    document.getElementById('hackForm').style.display= "block";
  }
}

function addHackPlayerDropDown()
{
    return addPlayerDropDown("hackSelectPlayer");
}

getHackedPlayerName = function(action)
{
    var dd = document.getElementById('hackSelectPlayer');
    return dd.options[dd.selectedIndex].value;
}

function closeHackForm()
{
	document.getElementById("hackForm").style.display= "none";
}

// ********** END OF HACK FORM FUNCTIONS **********

// ********** START OF INSIDER FUNCTIONS **********

insider = function()
{    
  document.getElementById("insider").play();
  socket.emit(CMD_INSIDER,gameID,myPlayer.name);
}

// ********** END OF INSIDER FUNCTIONS **********

// ********** START OF REGISTRATION FUNCTIONS **********

registerPlayer = function(playerName,lang)
{
  if (playerName != "" && playerName != null) 
  {
    setCookie(COOKIE_USER_PARAMETER,playerName);
    myPlayerName=playerName;
    console.log("Registering player: "+playerName);
    socket.emit(CMD_REGISTER,playerName,lang,gameID);
  }
};

function openRegistrationForm()
{
  var storedPlayerName=getCookie(COOKIE_USER_PARAMETER);
 
  document.getElementById("regName").value= storedPlayerName;
  document.getElementById("registrationForm").style.display= "block";
}

function processRegistrationForm()
{
  var nameInput=document.getElementById("regName").value;
  var langInput=document.getElementById("regLang").value;
	if (nameInput.length >=3 && nameInput.length <= 8)
	{
		document.getElementById("registrationForm").style.display= "none";
		registerPlayer(nameInput,langInput);
	}
	else
		openRegistrationErrorForm(0);
}

function closeRegistrationForm()
{
	document.getElementById("registrationForm").style.display= "none";
}

function openRegistrationErrorForm(error)
{
	if (error == REG_PLAYER_EXISTS)
		document.getElementById("regStatus").innerHTML="Player name in use";
	else
		document.getElementById("regStatus").innerHTML=(myPlayer.lang==LANG_EN?"Name must be between 3 and 8 chars":"Nazwa musi zawierać od 3 do 8 znaków");
}

// ********** END OF REGISTRATION FORM FUNCTIONS **********

// ********** START OF PRISON FORM FUNCTIONS **********

function openPrisonForm(player)
{
  if(!policeAudioPlayed)
  {
    var policeAudio=document.getElementById("police");     
    policeAudio.play();
    policeAudioPlayed=true;
  }
  if (player.prisonDaysRemaining==1)
  {
    document.getElementById('prisonForm').style.display= "none";
    policeAudioPlayed=false;
    return;
  }
  document.getElementById('prisonReason').innerHTML = player.prisonReason;
  document.getElementById('prisonStatus').innerHTML = (myPlayer.lang==LANG_EN?"Days left: ":"Pozostało Dni:")+(player.prisonDaysRemaining-1);
  document.getElementById('prisonForm').style.display= "block";
}

function closePrisonForm()
{
	document.getElementById("prisonForm").style.display= "none";
}

// ********** END OF PRISON FORM FUNCTIONS **********

// ********** START OF BANKRUPT FORM FUNCTIONS **********

function openBankruptForm(player)
{
  if(!bankruptAudioPlayed)
  {
    var bankruptAudio=document.getElementById("bankrupt");     
    bankruptAudio.play();
    bankruptAudioPlayed=true;
  }
  
  document.getElementById('bankruptStatus').innerHTML = (myPlayer.lang==LANG_EN?"BANKRUPT":"UPADŁY");
  document.getElementById('bankruptForm').style.display= "block";
}

// ********** END OF BANKRUPT FORM FUNCTIONS **********

// ********** START OF UTILITY FUNCTIONS **********

isChristmas=function()
{
  return gameDate.getDate() == 23 && gameDate.getMonth()==11; // Celebrate on Dec 24th :)
}

// Any changes in stock levels, play a 'trade' sound
checkForTrades=function(newPlayers)
{
  var newMyPlayer=findMyPlayer(newPlayers);
  for (var i=0;i<newMyPlayer.stocks.length;i++)
  {
    var stockName=newMyPlayer.stocks[i].name;
    
    if (getPlayerStockHolding(newMyPlayer,stockName) != getPlayerStockHolding(myPlayer,stockName))
    {
      return true;
    }
  }
  return false;
}

getPlayerStockHolding = function(player,stockName)
{
  if (typeof player == 'undefined' || player == null)
    return 0;
  for (var i=0;i<player.stocks.length;i++)
  {
    if (player.stocks[i].name == stockName)
      return player.stocks[i].amount;
  }
  return 0;
}

function getStockByName(stockName)
{
    for (var i=0;i<stocks.length;i++)
    {
        if (stocks[i].name == stockName)
            return stocks[i];
    }
    return null;
}

function addPlayerDropDown(selectID)
{
    var html = "<select class='veryLargeText' id='"+selectID+"'>";
    html+= "<option value='"+NONE+"'>"+(myPlayer.lang==LANG_EN?"Select Player":"Wybierz gracza")+"</option>";
    players.forEach(function(player)
    {
      if (player.name != myPlayer.name)
      {
         html+= "<option value = '"+player.name+"'>"+player.name+"</option>";
      }
    });
   
  html+="</select>";
  return html;
}

findMyPlayer = function(players)
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name == myPlayerName)
      return players[i];
  }
  return null;
}

function setCookie(name,value) 
{
  var d = new Date();
  d.setTime(d.getTime() + COOKIE_EXPIRY_MS);
  var expires = "expires="+d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) 
{
  var name = name + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) 
  {
    var c = ca[i];
    while (c.charAt(0) == ' ') 
    {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) 
    {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}