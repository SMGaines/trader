const COOKIE_EXPIRY_MS = 60*60*1000;
const COOKIE_USER_PARAMETER = "username";
const STOCK_INCREMENT = 50;
const MAX_STOCK = 1000;
const REG_PLAYER_EXISTS=1;

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

var stocks=[];
var numStocks;
var numPlayers;
var players = [];
var myPlayer;
var myPlayerName;
var gameStarted;
var gameDate;
var policeAudioPlayed;

socket = io.connect();

registerPlayer = function(playerName)
{
  if (playerName != "" && playerName != null) 
  {
    setCookie(playerName);
    myPlayerName=playerName;
    console.log("Registering player: "+playerName);
    socket.emit(CMD_REGISTER,playerName);
  }
 };

socket.on(CMD_GAME_STARTED,function(data)
{
  console.log("processPlayer: Game Started");
  gameStarted=true;
});

socket.on(CMD_NEW_PRICES,function(data)
{
  gameStarted=true;
  var pricesInfo=data.msg;
  gameDate=pricesInfo.date;
  stocks=pricesInfo.stockSummary; 
});

socket.on(CMD_REGISTERED,function(data)
{
  var newPlayer=data.msg;
  if (newPlayer.name==myPlayerName)
  {
    myPlayer=newPlayer;
    closeRegistration();
    console.log("Registered");
    showStatus("Registered");
  }
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
  showStatus("Error: "+msg);
});

socket.on(CMD_PLAYER_LIST,function(data)
{
  gameStarted=true;
  players=data.msg;
  myPlayer=findMyPlayer(players);
  if (myPlayer == null)
  {
    showStatus("Player not registered");
    return;
  }
  else if (myPlayer.prisonDaysRemaining > 0)
  {
  	showPrison(myPlayer);
  }
  else if (myPlayer.status != "")
  {
    showStatus(myPlayer.status);
  }
});
  
init = function()
{
    console.log("Init");
    numStocks=0;
    numPlayers=0;
    gameStarted=false;
    policeAudioPlayed=false;
    buildStatusForm();
    buildPrisonForm();
    buildRegistrationForm();
    var storedPlayerName=getStoredPlayerName();
    openRegistration(storedPlayerName);
};

buy = function()
{
  closeForm('buyForm');
  var stockName=getSelectedStockName('buy');
  var numShares=getInputValue('buy');
  console.log("Buying "+numShares+" shares of "+stockName);
  socket.emit(CMD_BUY_STOCK,myPlayer.name,stockName,numShares);
}

sell = function()
{
  closeForm('sellForm');
  var stockName=getSelectedStockName('sell');
  var numShares=getInputValue('sell');
  console.log("Selling "+numShares+" shares of "+stockName);
  socket.emit(CMD_SELL_STOCK,myPlayer.name,stockName,numShares);
}

insider = function()
{
  console.log("Insider");
  socket.emit(CMD_INSIDER,myPlayer.name);
}

hack = function()
{
  closeForm('hackForm');
  var hackedPlayerName = getSelectedPlayerName('hack');
  console.log("hack: "+hackedPlayerName);
  if (hackedPlayerName == "NONE")
    return;
  socket.emit(CMD_HACK,myPlayer.name,hackedPlayerName);
}

suspect = function()
{
  closeForm('suspectForm');
 	var suspectedPlayerName = getSelectedPlayerName('suspect');
  console.log("suspect: "+suspectedPlayerName);
  if (suspectedPlayerName == "NONE")
    return;
  socket.emit(CMD_SUSPECT,myPlayer.name,suspectedPlayerName);
}

getPlayerStockHolding = function(stockName)
{
  for (var i=0;i<myPlayer.stocks.length;i++)
  {
    if (myPlayer.stocks[i].name == stockName)
      return myPlayer.stocks[i].amount;
  }
  return 0;
}

findMyPlayer = function(players)
{
  for (var i=0;i<players.length;i++)
  {
    if (players[i].name == myPlayer.name)
      return players[i];
  }
  return null;
}

roundValue = function(amount)
{
    return amount.toFixed(2);
}

function setCookie(userName) 
{
  var d = new Date();
  d.setTime(d.getTime() + COOKIE_EXPIRY_MS);
  var expires = "expires="+d.toUTCString();
  document.cookie = COOKIE_USER_PARAMETER + "=" + userName + ";" + expires + ";path=/";
}

function getCookie() 
{
  var name = COOKIE_USER_PARAMETER + "=";
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

function getStoredPlayerName() 
{
  return getCookie(COOKIE_USER_PARAMETER);
}

function showStatus(statusMsg) 
{
  document.getElementById('playerStatus').innerHTML=statusMsg;
  document.getElementById('statusForm').style.display= "block";
}

function openForm(formName) 
{
  if (!gameStarted)
    showStatus("Game not started");
  else
	if (myPlayer.prisonDaysRemaining > 0)
		return;
  else
  {
    // Only rebuild the forms if we have added new stocks or new players
    if (numStocks != stocks.length)
    {
      buildStockForm('buy',stocks);
      buildStockForm('sell',stocks);
      numStocks = stocks.length;
    }
    if (numPlayers != players.length)
    {
      buildPlayerForm('hack',players);
      buildPlayerForm('suspect',players);
      numPlayers=players.length;
    }
    document.getElementById(formName).style.display= "block";
  }
}

function closeForm(formName) 
{
  document.getElementById(formName).style.display = "none";
}

function addPlayerDropDown(action,players)
{
    var html = "<select class='veryLargeText' id='"+action+"SelectPlayer'>";
    html+= "<option id='selectstock' value='NONE'>Select Player</option>";
    console.log("addPlayerDropDown: "+players.length+"/"+players);
    players.forEach(function(player)
    {
      if (player.name != myPlayer.name)
      {
         html+= "<option id = '"+player.name+"' value = '"+player.name+"'>"+player.name+"</option>";
      }
    });
   
  html+="</select>";
  return html;
}

function addStockDropDown(action,stocks)
{
    var html = "<select class='veryLargeText' id='"+action+"SelectStock'>";
    html+= "<option id='selectstock' value='NONE'>Select Stock</option>";
    stocks.forEach(function(stock)
    {
        html+= "<option id = '"+stock.name+"' value = '"+stock.name+"'>"+stock.name+"</option>";
    });
   
  html+="</select>";
  return html;
}

function getStockByName(stockName,stocks)
{
    for (var i=0;i<stocks.length;i++)
    {
      return stocks[i];
    }
    return null;
}

function inc(action)
{
  var currentAmount = getInputValue(action);
  currentAmount+=STOCK_INCREMENT;
  if (currentAmount > MAX_STOCK)
    currentAmount=MAX_STOCK;
  setInputValue(action,currentAmount);
}

function dec(action)
{
  var currentAmount = getInputValue(action);
  if (currentAmount > STOCK_INCREMENT)
    currentAmount-=STOCK_INCREMENT;
  setInputValue(action,currentAmount);
}

function max(action)
{
  setInputValue(action,"MAX");
}

getInputValue = function(action)
{
  var inputValue=document.getElementById(action+"Amount").innerHTML;
  if (inputValue == "MAX")
    return MAX_STOCK;
  else
    return parseInt(inputValue);
}

setInputValue = function(action,val)
{
  if (val == MAX_STOCK)
    document.getElementById(action+"Amount").innerHTML="MAX";
  else
    document.getElementById(action+"Amount").innerHTML=val;
}

getSelectedPlayerName = function(action)
{
    var dd = document.getElementById(action+'SelectPlayer');
    return dd.options[dd.selectedIndex].value;
}

getSelectedStockName = function(action)
{
    var dd = document.getElementById(action+'SelectStock');
    return dd.options[dd.selectedIndex].value;
}

function addEmptyRow()
{
  return "<TR height=50px></TR>";
}

function buildStockForm(action,stocks)
{
  var html="<TABLE align='center'>";
  html+="<TR><TH>&nbsp;</TH><TH align='center' class='headerText'>"+action.charAt(0).toUpperCase() + action.slice(1)+"</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH colspan='3'>"+addStockDropDown(action,stocks)+"</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH>&nbsp;</TH><TH class='veryLargeText' id='"+action+"Amount'>"+STOCK_INCREMENT+"</TH><TH>&nbsp;</TH></TR>";
  html+=addEmptyRow();
  html+="<TR>";
  html+="<TH><button class='veryLargeText' type='button' onclick='dec(&quot;"+action+"&quot;)' >-50</button></TH>";
  html+="<TH><button class='veryLargeText' type='button' onclick='inc(&quot;"+action+"&quot;)' >+50</button></TH>";
  html+="<TH><button class='veryLargeText' type='button' onclick='max(&quot;"+action+"&quot;)' >MAX</button></TH>";
  html+="</TR>";
  html+=addEmptyRow();
  html+="<TR><TH colspan='3'><button class='veryLargeText' type='button' onclick='"+action+"()'>OK</button></TH></TR>";
  html+="<TR><TH colspan='3'><button class='veryLargeText' type='button' onclick='closeForm(&quot;"+action+"Form&quot;)'>Cancel</button></TH></TR>";
  html+="</TABLE>";
  document.getElementById(action+'Form').innerHTML=html;
}

function buildPlayerForm(action,players)
{
  var html="<TABLE align='center'>";
  html+="<TR><TH class='headerText'>"+action.charAt(0).toUpperCase() + action.slice(1)+"</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH>"+addPlayerDropDown(action,players)+"</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH><button class='veryLargeText' type='submit' onclick='"+action+"()'>OK</button></TH></TR>";
  html+="<TR><TH><button class='largeText' type='button' onclick='closeForm(&quot;"+action+"Form&quot;)'>Cancel</button></TH></TR>";
  html+="</TABLE>";
  document.getElementById(action+'Form').innerHTML=html;
}

function buildRegistrationForm()
{
  var html="<TABLE align='center'>";
  html+="<TR><TH class='headerText'>Register</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH><input class='veryLargeText' id='regName' type='text' maxlength='8' size='8'/></TH></TR>"; 
  html+=addEmptyRow();
  html+="<TR><TH><button class='veryLargeText' type='button' onclick='processRegistrationForm()'>OK</button></TH></TR>";
  html+="<TR><TH class='veryLargeText' id='regStatus'></TH></TR>";
  html+="</TABLE>";
  document.getElementById("registrationForm").innerHTML=html;
}

function processRegistrationForm()
{
	var nameInput=document.getElementById("regName").value;
	if (nameInput.length >=3 && nameInput.length <= 8)
	{
		document.getElementById("registrationForm").style.display= "none";
		registerPlayer(nameInput);
	}
	else
		showRegistrationError(0);
}

function openRegistration(playerName)
{
  document.getElementById("regName").value= playerName;
  document.getElementById("registrationForm").style.display= "block";
}

function closeRegistration()
{
	document.getElementById("registrationForm").style.display= "none";
}

function showRegistrationError(error)
{
	if (error == REG_PLAYER_EXISTS)
		document.getElementById("regStatus").innerHTML="Player name in use";
	else
		document.getElementById("regStatus").innerHTML="Name must be between 3 and 8 chars";
}

function buildStatusForm()
{
  var html="<TABLE align='center'>";
  html+="<TR><TH class='headerText'>Status</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH class='veryLargeText' id='playerStatus'>A</TH></TR>";
  html+=addEmptyRow();
  html+="<TR><TH><button class='veryLargeText' type='button' onclick='closeForm(&quot;statusForm&quot;)'>OK</button></TH></TR>";
  html+="</TABLE>";
  document.getElementById('statusForm').innerHTML=html;
}

function showPrison(player)
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
  document.getElementById('prisonStatus').innerHTML = "Days left: "+(player.prisonDaysRemaining-1);
  document.getElementById('prisonForm').style.display= "block";
}

function buildPrisonForm()
{
  var html="<TABLE align='center'>";
  html+="<TR><TH><img align='center' src='images/prison.jpg'/></TH></TR>";
  html+="<TR><TH align='center' class='veryLargeText' id='prisonReason'></TH></TR>";
  html+="<TR><TH align='center' class='veryLargeText' id='prisonStatus'></TH></TR>";
  html+="</TABLE>";
  document.getElementById('prisonForm').innerHTML=html;
}