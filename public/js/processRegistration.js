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

var players = [];

socket = io.connect();

socket.on(CMD_PLAYER_LIST,function(data)
{
    players=data.msg;
    playerDisplay();
});

socket.on(CMD_GAME_ADDRESS,function(data)
{
    var serverIP=data.msg;
    document.getElementById('gameConnectDetails').innerHTML=createSpan("Connect to http://"+serverIP+":8080/player");
});

init = function()
{
    console.log("Init");
    socket.emit(CMD_GET_GAME_ADDRESS);
};

var playerDisplay = function()
{
    var regTable = document.getElementById('registrationTable');
    var newRow,newCell;
    regTable.innerHTML="";

    for (var i=0;i<players.length;i++)
    {
        if (i%3==0)
            newRow=regTable.insertRow();
        newCell = newRow.insertCell();  
        newCell.style.width="40%";   
        newCell.innerHTML = createSpan(players[i].name);
    };
}

function createSpan(text)
{
    return "<span class='regDisplayText' style='color:white'>"+text+"</span>";
}