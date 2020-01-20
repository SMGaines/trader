const STATE_INITIALISING = 0;
const STATE_REGISTRATION = 1;
const STATE_STARTED = 2;

const MIN_GAME_ID=10000;

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

var game = require('./js/game.js');
var utils = require("./js/utils.js");
var players=require("./js/Players.js");
var mkt=require("./js/stockmarket.js");
var broker=require("./js/broker.js");
var events = require('./js/events.js');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var state;
var dayTimer;
var dayDuration;
var gameID;

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

app.get('/adminResponse',function(req,res)
{
    initialiseGame(req.query.gameMonths,req.query.dayDuration,req.query.numBots,req.query.gameLang,req.query.einstein);
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

function initialiseGame(gameDuration,dayLength,numBots,aGameLang,aEinstein)
{
    console.log("Server: Initialising: "+gameID);
    gameID=MIN_GAME_ID+9*Math.floor(MIN_GAME_ID*Math.random());
    dayDuration=dayLength*1000;
    state=STATE_INITIALISING;

    game.initialise(gameDuration,aGameLang);
    mkt.initialise(game.getDate(),gameDuration);
    events.initialise(game.getDate(),gameDuration,stocks); 

    console.log("Server: Starting registration");
    state=STATE_REGISTRATION;
    registerBots(aEinstein=="Yes",numBots);

    sendToClient(CMD_PLAYER_LIST,players.getPlayerSummaries());
}

function registerBots(einstein,numBots)
{
    if (einstein)
    {
        players.registerPlayer(EINSTEIN,PLAYER_EINSTEIN);
        sendToClient(CMD_REGISTERED,players.getPlayer(EINSTEIN));
    }
    for (var i=0;i<numBots;i++)
    {
        players.registerPlayer(BOT_NAME_PREFIX+(i+1),PLAYER_BOT);
        sendToClient(CMD_REGISTERED,players.getPlayer(BOT_NAME_PREFIX+(i+1)));
    }
}

function startGame()
{
    console.log("Server: Starting game");
    game.start();
    mkt.open();
    state=STATE_STARTED;
    sendToClient(CMD_GAME_STARTED,game.getDate());
    dayTimer=setInterval(newDay,dayDuration);
}

function processGameOver()
{
    clearInterval(dayTimer);
    console.log(players.getWinnerName()+" wins");
}

function newDay() 
{
    game.processDay();
    var gameDate=game.getDate();
    var newsEvent = events.getNewsEvent(gameDate);

    newsEvent=mkt.processDay(gameDate,newsEvent); // Some post-processing done on the event
    newsEvent=players.processDay(gameDate,newsEvent); // Some post-processing done on the event
    if (newsEvent !=null)
        sendToClient(CMD_NEWS_EVENT,newsEvent);
    
    broker.processDay(gameDate);

    if (game.gameCompleted() || players.weHaveAMillionnaire())
    {
        processGameOver();
        sendToClient(CMD_END_OF_GAME,players.getEndOfGameEvent()); 
        return;
    }

    sendToClient(CMD_PLAYER_LIST,players.getPlayerSummaries());
    sendToClient(CMD_NEW_PRICES,mkt.getStocks());
    sendToClient(CMD_NEW_RATES,game.getRates());
    sendToClient(CMD_GAME_DATE,game.getDate());
}

function sendToClient(cmd,info)
{
    io.sockets.emit(cmd,{msg:info});
}

io.on('connection',function(socket)
{
    socket.on(CMD_REGISTER,function(playerName,lang,aGameID)
    {
        if (state == STATE_REGISTRATION)
        {
            var regStatus = game.validateNewPlayer(playerName);
            if (regStatus == 0)
            {
                console.log("Server: New player registered: "+playerName+"("+lang+")");
                players.registerPlayer(playerName,PLAYER_HUMAN);
                sendToClient(CMD_REGISTERED,gameID);
                sendToClient(CMD_PLAYER_LIST,players.getPlayers());
            }
            else
                sendToClient(CMD_REGISTRATION_ERROR,regStatus);
        }
        else if (state == STATE_STARTED)
        {
            if (players.getPlayer(playerName) != null && aGameID==gameID)
                console.log("Server: Ignoring player already registered: "+playerName);
            else
                sendToClient(CMD_ERROR,"Player not registered for game: "+gameID);
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
        sendToClient(CMD_GAME_ID,gameID);
    });
 
    socket.on(CMD_BUY_STOCK,function(aGameID,playerName,stockName,amount)
    {
        console.log("Server: buystock: "+aGameID+"/"+playerName+"/"+stockName+"/"+amount);
        if (aGameID==gameID)
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
        if (aGameID==gameID)
            players.sellStock(playerName,stockName,amount);
    });    

    socket.on(CMD_HACK,function(aGameID,hackingPlayerName,hackedPlayerName)
    {
        console.log("Server: hack of "+hackedPlayerName+" by "+hackingPlayerName);
        if (aGameID==gameID)
            players.setupHack(hackingPlayerName,hackedPlayerName);
    });

    socket.on(CMD_SUSPECT,function(aGameID,suspectingPlayerName,suspectedPlayerName)
    {
        console.log("Server: suspect: "+suspectingPlayerName+"/"+suspectedPlayerName);
        if (aGameID==gameID)
             players.suspectHacker(suspectingPlayerName,suspectedPlayerName);
    });    

    socket.on(CMD_INSIDER,function(aGameID,insiderPlayerName)
    {
        console.log("Server: insider: "+insiderPlayerName);
        if (aGameID==gameID)
            players.setupInsider(insiderPlayerName.game.getDate());
    });    
    
    socket.on(CMD_DEPOSIT,function(aGameID,playerName,amount)
    {
        console.log("Server: deposit: "+playerName);
        if (aGameID==gameID)
            players.deposit(playerName,amount);
    });    
    
    socket.on(CMD_WITHDRAW,function(aGameID,playerName,amount)
    {
        console.log("Server: withdraw: "+playerName);
        if (aGameID==gameID)
            players.bankCash(playerName,amount);
    });
});