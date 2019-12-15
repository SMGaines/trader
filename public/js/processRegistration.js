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

socket.on('registered',function(data)
{
    player=data.msg;
    players.push(player);
    console.log("new player"+player.name);
    playerDisplay();
});

socket.on(CMD_GAME_ADDRESS,function(data)
{
    var serverIP=data.msg;
    document.getElementById('gameConnectDetails').innerHTML=addStandardText("Connect to http://"+serverIP+":8081/player");
});

init = function()
{
    console.log("Init");
    socket.emit(CMD_GET_GAME_ADDRESS);
};

var playerDisplay = function()
{
    var html= "<TABLE style='width:100%'>";
    html+=addTR(addTH(addStandardText("Registered Players")));

    for (var i=0;i<players.length;i++)
    {
        html+=addTR(addTH(addStandardText(players[i].name)));
    };
    html+="</TABLE>"
    document.getElementById('registrationDisplay').innerHTML=html;
}

// Utilities

function addTH(text)
{
    return "<TH>"+text+"</TH>";
}

function addTR(text)
{
    return "<TR>"+text+"</TR>";
}

function addStandardText(text)
{
    return addText(text,"courier",10,"white");
}

function addText(text,fontName,fontSize,fontColour)
{
    return "<font color='"+fontColour+"' size='"+fontSize+"' face='"+fontName+"'>"+text+"</font>";
}