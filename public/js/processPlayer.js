const GAME_NAME="TRADER";
const GAME_VERSION="2.1";

const COOKIE_EXPIRY_MS = 60*60*1000;
const COOKIE_USER_PARAMETER = "username";
const COOKIE_GAME_ID_PARAMETER = "gameid";

const STOCK_INCREMENT = 50;
const MAX_STOCK = 1000;
const REG_PLAYER_EXISTS=1;
const LANG_EN=0;
const LANG_PL=1;

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

// *** Shared with Players.js
const PLAYER_INVALID_NAME_LENGTH = -1;
const PLAYER_INVALID_NAME = -2;
const PLAYER_DUPLICATE=-3;
// ***

const NONE = "NONE";

var stocks=[];
var numStocks;
var players = [];
var myPlayer;
var myPlayerName;
var gameDate,gameEndDate;
var policeAudioPlayed;
var bankAmountMonitor;
var sellStockAmountMonitor,sellStockSelectedIndex;
var buyStockAmountMonitor,buyStockSelectedIndex;
var gameID;
var liftMusic;

socket = io.connect();

socket.on(CMD_GAME_STARTED,function(data)
{
  console.log("processPlayer: Game Started");
  closeGameWaitForm();
});

socket.on(CMD_NEW_PRICES,function(data)
{
  stocks=data.msg;
});

socket.on(CMD_GAME_DATE,function(data)
{
  var gameDates=data.msg;
  gameDate=new Date(gameDates.currentDate);
  gameEndDate=new Date(gameDates.endDate);
});

socket.on(CMD_END_OF_GAME,function(data)
{
  var winnerName=data.msg;
  openGameOverForm(winnerName);
});

socket.on(CMD_REGISTERED,function(data)
{
  gameID=data.msg;
  setCookie(COOKIE_GAME_ID_PARAMETER,gameID);
  document.getElementById("gameTitle").innerHTML= GAME_NAME+" "+GAME_VERSION+": "+ gameID;
  closeRegistrationForm();
  openGameWaitForm(myPlayerName,gameID);
});

socket.on(CMD_REGISTRATION_ERROR,function(data)
{
  var regError = data.msg;
  console.log("Error in registration: "+regError);
  showRegistrationError(regError);
});

socket.on(CMD_ERROR,function(data)
{
  var msg=data.msg;
  console.log("Error: "+msg);
  //openStatusForm("Error: "+msg);
});

socket.on(CMD_PLAYER_LIST,function(data)
{
  var tradeOccurred=false;
  if (myPlayer != null)
    tradeOccurred=checkForTrades(data.msg);

  players=data.msg;
  myPlayer=findMyPlayer(players);
  if (myPlayer == null)
  {
    console.log("Player not found: "+myPlayerName);
    return;
  }
  document.getElementById("bankBalance").innerHTML=formatMoney(myPlayer.account.cash);
  if (tradeOccurred)
    document.getElementById("trade").play();

  if (myPlayer.account.suspensionDays > 0)
  {
    openSuspensionForm(myPlayer);
  }
  else if (myPlayer.account.hackDaysLeft > 0)
    showHackInProgressForm(myPlayer.account.hackDaysLeft);
  else if (myPlayer.status != "")
  {
    if (isChristmas(gameDate))
      document.getElementById("xmas").play();
    openStatusForm(myPlayer.status);
  }
});

init = function()
{
    console.log("Init");
    numStocks=0;
    policeAudioPlayed=false;
    gameID=getCookie(COOKIE_GAME_ID_PARAMETER);
    openRegistrationForm();
};

// ********** Start OF STATUS FORM FUNCTIONS **********

function openStatusForm(statusMsg) 
{
  document.getElementById('playerStatus').innerHTML=statusMsg;
  document.getElementById('statusForm').style.display= "block";
}

function closeStatusForm() 
{
  document.getElementById('statusForm').style.display= "none";
}

// ********** END OF STATUS FORM FUNCTIONS **********

// ********** START OF BUY FUNCTION ********** 

buy = function()
{
    closeBuyForm();
    var stockAmount = parseInt(document.getElementById("buyStockSlider").value);
    var stockName=stocks[buySelectedStockIndex].name;
    console.log("Buying "+stockAmount+" shares of "+stockName);
    socket.emit(CMD_BUY_STOCK,gameID,myPlayer.name,stockName,stockAmount);
}

function openBuyForm()
{
  buySelectedStockIndex=0;
  updateBuyStockButtons();
  buyStockAmountMonitor=setInterval(lookForBuyStockAmountChange,100);
  var buyStockSlider= document.getElementById("buyStockSlider");
  buyStockSlider.min=0;
  buyStockSlider.max=0;
  buyStockSlider.step=0;
  buyStockSlider.value=0;
  document.getElementById("buyStockAmount").innerHTML=0;
  document.getElementById("buyForm").style.display= "block";
}

function selectBuyStock(stockIndex)
{
  console.log("selectBuyStock: "+stocks[stockIndex].name+" selected");
  
  buySelectedStockIndex=stockIndex;
  var buyStockSlider= document.getElementById("buyStockSlider");
  buyStockSlider.min=STOCK_INCREMENT;
  buyStockSlider.step=STOCK_INCREMENT;
  buyStockSlider.max=stocks[buySelectedStockIndex].available;

  for (var i=0;i<stocks.length;i++)
  {
      document.getElementById("buyStock"+i).style.color=(i==stockIndex?"#003200":"white");
  }
}

function updateBuyStockButtons()
{
  if (typeof stocks == 'undefined' || typeof myPlayer == 'undefined')
    return;
  for (var i=0;i<stocks.length;i++)
  {
    var stockButton=document.getElementById("buyStock"+i);
    stockButton.style.backgroundColor=stocks[i].colour;
    stockButton.innerHTML=stocks[i].name;
    stockButton.disabled=(stocks[i].available == 0);
  }
}

function lookForBuyStockAmountChange()
{
  var stockAmount = parseInt(document.getElementById("buyStockSlider").value);
  document.getElementById("buyStockAmount").innerHTML = stockAmount;
}

function closeBuyForm()
{
  clearInterval(buyStockAmountMonitor);
	document.getElementById("buyForm").style.display= "none";
}

// ********** END OF BUY FORM FUNCTIONS **********

// ********** START OF SELL FUNCTION ********** 

sell = function()
{
    closeSellForm();
    var stockAmount = parseInt(document.getElementById("sellStockSlider").value);
    var stockName=stocks[sellSelectedStockIndex].name;
    console.log("Selling "+stockAmount+" shares of "+stockName);
    socket.emit(CMD_SELL_STOCK,gameID,myPlayer.name,stockName,stockAmount);
}

function openSellForm()
{
  sellSelectedStockIndex=0;
  updateSellStockButtons();
  sellStockAmountMonitor=setInterval(lookForSellStockAmountChange,100);
  var sellStockSlider= document.getElementById("sellStockSlider");
  sellStockSlider.min=0;
  sellStockSlider.max=0;
  sellStockSlider.step=0;
  sellStockSlider.value=0;
  document.getElementById("sellStockAmount").innerHTML=0;
  document.getElementById("sellForm").style.display= "block";
}

function selectSellStock(stockIndex)
{
  console.log("selectSellStock: "+stocks[stockIndex].name+" selected");
  
  sellSelectedStockIndex=stockIndex;
  var sellStockSlider= document.getElementById("sellStockSlider");
  sellStockSlider.min=STOCK_INCREMENT;
  sellStockSlider.step=STOCK_INCREMENT;
  sellStockSlider.max=getPlayerStockHolding(myPlayer,stocks[sellSelectedStockIndex].name);

  for (var i=0;i<stocks.length;i++)
  {
      document.getElementById("sellStock"+i).style.color=(i==stockIndex?"#003200":"white");
  }
}

function updateSellStockButtons()
{
  if (typeof stocks == 'undefined' || typeof myPlayer == 'undefined')
    return;
  for (var i=0;i<stocks.length;i++)
  {
    var stockHolding=getPlayerStockHolding(myPlayer,stocks[i].name);
    var stockButton=document.getElementById("sellStock"+i);
    stockButton.style.backgroundColor=stocks[i].colour;
    stockButton.innerHTML=stocks[i].name;
    stockButton.disabled=(stockHolding == 0);
  }
}

function lookForSellStockAmountChange()
{
  var stockAmount = parseInt(document.getElementById("sellStockSlider").value);
  document.getElementById("sellStockAmount").innerHTML = stockAmount;
}

function closeSellForm()
{
  clearInterval(sellStockAmountMonitor);
	document.getElementById("sellForm").style.display= "none";
}

// ********** END OF SELL FORM FUNCTIONS **********

// ********** START OF BANK FUNCTIONS **********

bank = function()
{
    closeBankForm();
    var bankAmount=parseInt(document.getElementById("bankSlider").value);
    socket.emit(CMD_BANK,gameID,myPlayer.name,bankAmount);
}

function lookForBankAmountChange()
{
  var bankAmount = parseInt(document.getElementById("bankSlider").value);
  document.getElementById("bankAmount").innerHTML = formatMoney(bankAmount);
}

function openBankForm()
{
  bankAmountMonitor=setInterval(lookForBankAmountChange,100);
  var bankSlider= document.getElementById("bankSlider");
  bankSlider.min=0;
  bankSlider.max=myPlayer.account.cash;
  bankSlider.step=myPlayer.account.cash/100; // i.e. steps of 1%
  bankSlider.value=Math.floor(myPlayer.account.cash/2);
  document.getElementById("bankAmount").innerHTML=myPlayer.account.cash/2;
  document.getElementById("bankForm").style.display= "block";
}

function closeBankForm()
{
  clearInterval(bankAmountMonitor);
	document.getElementById("bankForm").style.display= "none";
}

// ********** END OF BANK FORM FUNCTIONS **********

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
  document.getElementById('suspectPlayers').innerHTML=addSuspectPlayerDropDown();
  document.getElementById('suspectForm').style.display= "block";
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
  document.getElementById('hackPlayers').innerHTML=addHackPlayerDropDown();
  document.getElementById('hackForm').style.display= "block";
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

registerPlayer = function(playerName)
{
  if (playerName != "" && playerName != null) 
  {
    setCookie(COOKIE_USER_PARAMETER,playerName);
    myPlayerName=playerName;
    console.log("Registering player: "+playerName);
    socket.emit(CMD_REGISTER,playerName,"EN",gameID);
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
	//document.getElementById("registrationForm").style.display= "none";
	registerPlayer(nameInput);
}

function closeRegistrationForm()
{
	document.getElementById("registrationForm").style.display= "none";
}

function showRegistrationError(error)
{
	if (error == PLAYER_DUPLICATE)
		document.getElementById("regStatus").innerHTML="Player name in use";
	else if (error == PLAYER_INVALID_NAME_LENGTH)
    document.getElementById("regStatus").innerHTML=("Name must be between 3 and 8 chars");
  else if (error == PLAYER_INVALID_NAME)
    document.getElementById("regStatus").innerHTML=("Name must be alphanumeric");
}

// ********** END OF REGISTRATION FORM FUNCTIONS **********

// ********** START OF SUSPENSION FORM FUNCTIONS **********

function openSuspensionForm(player)
{
  if(!policeAudioPlayed)
  {
    var policeAudio=document.getElementById("police");     
    policeAudio.play();
    policeAudioPlayed=true;
  }
  if (player.account.suspensionDays==1)
  {
    document.getElementById('suspensionForm').style.display= "none";
    policeAudioPlayed=false;
    return;
  }
  document.getElementById('suspensionStatus').innerHTML = "Days left: "+(player.account.suspensionDays-1);
  document.getElementById('suspensionForm').style.display= "block";
}

function closeSuspensionForm()
{
	document.getElementById("suspensionForm").style.display= "none";
}

// ********** END OF SUSPENSION FORM FUNCTIONS **********

// ********** START OF HACK IN PROGRESS FORM FUNCTIONS **********

function showHackInProgressForm(hackDaysLeft)
{
  if (hackDaysLeft==0)
  {
    document.getElementById('hackInProgressForm').style.display= "none";
    return;
  }
  document.getElementById('hackDaysLeft').innerHTML = "Days left: "+hackDaysLeft;
  document.getElementById('hackInProgressForm').style.display= "block";
}

// ********** END OF HACK IN PROGRESS FORM FUNCTIONS **********

// ********** START OF GAME WAIT FORM FUNCTIONS **********

function openGameWaitForm(pName,gID)
{
  liftMusic = document.getElementById("liftMusic");
  liftMusic.play();
  document.getElementById('gameWaitStatus').innerHTML=pName+" registered for Game: "+gID;
  document.getElementById('gameWaitForm').style.display= "block";
}

function closeGameWaitForm()
{
  liftMusic.pause();
	document.getElementById("gameWaitForm").style.display= "none";
}

// ********** END OF GAME WAIT FORM FUNCTIONS **********

// ********** START OF GAME OVER FORM FUNCTIONS **********

function openGameOverForm(winnerName)
{
  document.getElementById('gameWinner').innerHTML=winnerName+" wins!";
  document.getElementById('gameOverForm').style.display= "block";
}

function closeGameOverForm()
{
	document.getElementById("gameOverForm").style.display= "none";
}

// ********** END OF GAME OVER FORM FUNCTIONS **********

// ********** START OF UTILITY FUNCTIONS **********

isChristmas=function(aDate)
{
  if (aDate == null)
    return false;
  return aDate.getDate() == 23 && aDate.getMonth()==11; // Celebrate on Dec 24th :)
}

// Any changes in stock levels, play a 'trade' sound
checkForTrades=function(newPlayers)
{
  var newMyPlayer=findMyPlayer(newPlayers);
  for (var i=0;i<newMyPlayer.account.stocks.length;i++)
  {
    var stockName=newMyPlayer.account.stocks[i].name;
    
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
  for (var i=0;i<player.account.stocks.length;i++)
  {
    if (player.account.stocks[i].name == stockName)
      return player.account.stocks[i].amount;
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
    var html = "<select class='largeText' id='"+selectID+"'>";
    html+= "<option value='"+NONE+"'>Select Player</option>";
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

formatMoney = function(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    var money = amount >1000000?"$1m":formatter.format(Math.abs(amount)/1000)+"k";
    return createSpan(money,"",amount >=0?"white":"red");
}

function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}