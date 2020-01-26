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
const CMD_BANK="bank";
// ******* End of shared list of constants between server.js, processMainDisplay.js and processPlayer.js *******

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
var bankAmountMonitor;
var stockAmountMonitor,stockSelectedIndex;
var gameID;
var liftMusic;

socket = io.connect();

socket.on(CMD_GAME_STARTED,function(data)
{
  console.log("processPlayer: Game Started");
  closeGameWaitForm();
  gameStarted=true;
});

socket.on(CMD_NEW_PRICES,function(data)
{
  gameStarted=true;
  stocks=data.msg;
  
  if (numStocks != stocks.length) 
  {
    numStocks=stocks.length;
    updateStockButtons();
  }
});

socket.on(CMD_GAME_DATE,function(data)
{
  gameDate=new Date(data.msg);
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
  openGameWaitForm(myPlayerName,gameID);
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
  //openStatusForm("Error: "+msg);
});

socket.on(CMD_PLAYER_LIST,function(data)
{
  gameStarted=true;
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
  {
    document.getElementById("trade").play();
    updateStockButtons();
  }

  if (myPlayer.account.suspensionDays > 0)
  {
    openSuspensionForm(myPlayer);
  }
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
    numPlayers=0;
    gameStarted=false;
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

// ********** START OF TRANSACTION FUNCTIONS **********

buy = function()
{
  closeTransactionForm();
  var stockAmount = parseInt(document.getElementById("stockSlider").value);
  var stockName=stocks[selectedStockIndex].name;
  console.log("Buying "+stockAmount+" shares of "+stockName);
  socket.emit(CMD_BUY_STOCK,gameID,myPlayer.name,stockName,stockAmount);
}

sell = function()
{
    closeTransactionForm();
    var stockAmount = parseInt(document.getElementById("stockSlider").value);
    var stockName=stocks[selectedStockIndex].name;
    console.log("Selling "+stockAmount+" shares of "+stockName);
    socket.emit(CMD_SELL_STOCK,gameID,myPlayer.name,stockName,stockAmount);
}

function openTransactionForm()
{
    if (!gameStarted)
        openStatusForm("Game not started");
    else
        if (myPlayer.account.suspensionDays > 0)
            return;
    else
    {
      selectedStockIndex=0;
      stockAmountMonitor=setInterval(lookForStockAmountChange,100);
      var stockSlider= document.getElementById("stockSlider");
      stockSlider.min=STOCK_INCREMENT;
      stockSlider.max=MAX_STOCK;
      stockSlider.step=STOCK_INCREMENT;
      document.getElementById("stockAmount").innerHTML=STOCK_INCREMENT;
      document.getElementById("transactionForm").style.display= "block";
    }
}

function selectStock(stockIndex)
{
  console.log("selectStock: "+stocks[stockIndex].name+" selected");
  selectedStockIndex=stockIndex;
  var stockSlider= document.getElementById("stockSlider");
  stockSlider.max=Math.max(stocks[selectedStockIndex].available,getPlayerStockHolding(myPlayer,stocks[selectedStockIndex].name));

  for (var i=0;i<stocks.length;i++)
  {
      document.getElementById("stock"+i).style.color=(i==stockIndex?"#003200":"white");
  }
}

function updateStockButtons()
{
  stockSelectedIndex=0;
  if (typeof stocks == 'undefined' || typeof myPlayer == 'undefined')
    return;
  for (var i=0;i<stocks.length;i++)
  {
    stockCell=document.getElementById("stock"+i);
    stockCell.style.backgroundColor=stocks[i].colour;
    stockCell.innerHTML=stocks[i].name;
  }
}

function lookForStockAmountChange()
{
  var stockAmount = parseInt(document.getElementById("stockSlider").value);
  document.getElementById("stockAmount").innerHTML = stockAmount;
}

function closeTransactionForm()
{
  clearInterval(stockAmountMonitor);
	document.getElementById("transactionForm").style.display= "none";
}

// ********** END OF TRANSACTION FORM FUNCTIONS **********

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
  if (!gameStarted)
    openStatusForm(myPlayer.lang==LANG_EN?"Game not started":"Gra się nie rozpoczęła");
  else
    if (myPlayer.account.suspensionDays > 0)
      return;
  else
  {
    bankAmountMonitor=setInterval(lookForBankAmountChange,100);
    var bankSlider= document.getElementById("bankSlider");
    bankSlider.min=0;
    bankSlider.max=myPlayer.account.cash;
    bankSlider.step=myPlayer.account.cash/100; // i.e. steps of 1%
    document.getElementById("bankAmount").innerHTML=myPlayer.account.cash/20;
    document.getElementById("bankForm").style.display= "block";
  }
}

function closeBankForm()
{
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
    if (!gameStarted)
        openStatusForm(myPlayer.lang==LANG_EN?"Game not started":"Gra się nie rozpoczęła");
    else
	    if (myPlayer.account.suspensionDays > 0)
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
	if (myPlayer.account.suspensionDays > 0)
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

formatMoney = function(amount)
{
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0});
    var money = amount >1000000?"$1m":formatter.format(Math.abs(amount)/1000)+"k";
    return createSpan(money,"veryLargeButton",amount >=0?"white":"red");
}


function createSpan(text,cssClass,colour)
{
    return "<span class='"+cssClass+"' style='color:"+colour+"'>"+text+"</span>";
}