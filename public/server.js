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

var game = require('./js/game.js');
var utils = require("./js/utils.js");
var players=require("./js/Players.js");
var market=require("./js/stockmarket.js");
var msgs=require("./js/messages.js");

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var dayTimer;

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/images',express.static(__dirname + '/images'));
app.use('/audio',express.static(__dirname + '/audio'));

app.get('/player',function(req,res)
{
    res.sendFile(__dirname+'/playerDisplay.html');
});

app.get('/registrationComplete',function(req,res)
{
   res.sendFile(__dirname+'/mainDisplay.html');
   startGame();
});

app.get('/view',function(req,res)
{
   res.sendFile(__dirname+'/mainDisplay.html');
});

app.get('/adminResponse',function(req,res)
{
    game.initialise(req.query.simulation,req.query.gameMonths,req.query.dayDurationStart,req.query.dayDurationEnd,req.query.numBots,req.query.numEinsteins);
    res.sendFile(__dirname+'/registration.html');
});

app.get('/admin',function(req,res)
{
     res.sendFile(__dirname+'/admin.html');
});

app.get('/instructionsEN',function(req,res)
{
     res.sendFile(__dirname+'/instructionsEN.html');
});

app.get('/instructionsPL',function(req,res)
{
     res.sendFile(__dirname+'/instructionsPL.html');
});

server.listen(process.env.PORT || 8081,function()
{
    console.log('Listening on '+server.address().port);
});

function startGame()
{
    game.start();
    sendToClient(CMD_GAME_STARTED,game.getDate());
    setDayTimer();
}

function setDayTimer(aTimeInterval)
{
    if (dayTimer !=null)
        clearInterval(dayTimer);
    dayTimer=setInterval(processDay,aTimeInterval); 
}

function processDay() 
{
    setDayTimer(game.getDayDurationInMS());

    var newsEvent=game.processDay();

    if (game.gameOver())
    {
        processGameOver(newsEvent);
        return;
    }

    updateClients(newsEvent);
}

processGameOver=function(gameOverEvent)
{
    console.log("server: processGameOver"+gameOverEvent.type);
    clearInterval(dayTimer);
    sendToClient(CMD_PLAYER_LIST,players.getPlayerSummaries());
    sendToClient(CMD_NEWS_EVENT,gameOverEvent);
    sendToClient(CMD_END_OF_GAME,players.getWinnerName()); 
}

function updateClients(newsEvent)
{
    if (newsEvent != null)
        sendToClient(CMD_NEWS_EVENT,newsEvent);

    sendToClient(CMD_PLAYER_LIST,players.getPlayerSummaries());
    sendToClient(CMD_NEW_PRICES,market.getStocks());
    sendToClient(CMD_GAME_DATE,game.getDates()); // Sends current game date & game end date
}

function sendToClient(cmd,info)
{
    io.sockets.emit(cmd,{msg:info});
}

io.on('connection',function(socket)
{
    socket.on(CMD_REGISTER,function(playerName,lang,aGameID)
    {
        if (game.registrationOpen())
        {
            var regStatus = players.validateNewPlayer(playerName);
            if (regStatus == 0)
            {
                console.log("Server: New player registered: "+playerName+"("+lang+")");
                players.registerPlayer(playerName,PLAYER_HUMAN);
                sendToClient(CMD_REGISTERED,game.getGameID());
                sendToClient(CMD_PLAYER_LIST,players.getPlayerSummaries());
            }
            else
                sendToClient(CMD_REGISTRATION_ERROR,regStatus);
        }
        else if (game.gameStarted())
        {
            if (players.getPlayer(playerName) != null && game.validID(aGameID))
                console.log("Server: Ignoring player already registered: "+playerName);
            else
                sendToClient(CMD_ERROR,"Player not registered for game: "+game.getGameID());
        }
        else
            console.log("Ignoring registration attempt");
    });

    socket.on(CMD_GET_GAME_LANGUAGE,function()
    {
        sendToClient(CMD_GAME_LANGUAGE,LANG_EN);
    });

    socket.on(CMD_GET_GAME_ID,function()
    {
        sendToClient(CMD_GAME_ID,game.getGameID());
    });
 
    socket.on(CMD_BUY_STOCK,function(aGameID,playerName,stockName,amount)
    {
        console.log("Server: buystock: "+aGameID+"/"+playerName+"/"+stockName+"/"+amount);
        if (game.validID(aGameID))
            players.buyStock(playerName,stockName,amount);
    });

    socket.on(CMD_GET_GAME_ADDRESS,function()
    {
        var myIP = utils.getLocalIP();
        console.log("Server: My IP is: "+myIP[0]);
        sendToClient(CMD_GAME_ADDRESS,myIP[0]);
   });

    socket.on(CMD_SELL_STOCK,function(aGameID,playerName,stockName,amount)
    {
        console.log("Server: sellstock: "+aGameID+"/"+playerName+"/"+stockName+"/"+amount);
        if (game.validID(aGameID))
            players.sellStock(playerName,stockName,amount);
    });    

    socket.on(CMD_HACK,function(aGameID,hackingPlayerName,hackedPlayerName)
    {
        console.log("Server: hack of "+hackedPlayerName+" by "+hackingPlayerName);
        if (game.validID(aGameID))
            players.setupHack(hackingPlayerName,hackedPlayerName);
    });

    socket.on(CMD_SUSPECT,function(aGameID,suspectingPlayerName,suspectedPlayerName)
    {
        console.log("Server: suspect: "+suspectingPlayerName+"/"+suspectedPlayerName);
        if (game.validID(aGameID))
             players.suspectHacker(suspectingPlayerName,suspectedPlayerName);
    });    

    socket.on(CMD_INSIDER,function(aGameID,insiderPlayerName)
    {
        console.log("Server: insider: "+insiderPlayerName);
        if (game.validID(aGameID))
            players.setupInsider(insiderPlayerName,game.getDate());
    });    
    
    socket.on(CMD_DEPOSIT,function(aGameID,playerName,amount)
    {
        console.log("Server: deposit: "+playerName);
        if (game.validID(aGameID))
            players.deposit(playerName,amount);
    });    
    
    socket.on(CMD_BANK,function(aGameID,playerName,amount)
    {
        console.log("Server: withdraw: "+playerName);
        if (game.validID(aGameID))
            players.bankCash(playerName,amount);
    });
});