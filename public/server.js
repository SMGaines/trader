const STATE_INITIALISING = 0;
const STATE_REGISTRATION = 1;
const STATE_STARTED = 2;

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

const BOT_TIMER = 10000;

global.EINSTEIN="EINSTEIN";
global.BOT_NAME_PREFIX="BOT";

var game = require('./js/game.js');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var os = require( 'os' );

var state;
var dayTimer,botTimer;
var dayDuration;
var gameLang;

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
    startGame();
    res.sendFile(__dirname+'/mainDisplayV2.html');
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

function getLocalIP() 
{
 const interfaces = os.networkInterfaces();
 const addresses = [];

    Object.keys(interfaces).forEach((netInterface) => {
    interfaces[netInterface].forEach((interfaceObject) => {
    if (interfaceObject.family === 'IPv4' && !interfaceObject.internal) {
    addresses.push(interfaceObject.address);
   }
  });
 });
 return addresses;
}

function initialiseGame(gameDuration,dayLength,numBots,aGameLang,aEinstein)
{
    gameLang=aGameLang;
    console.log("Server: Initialising: "+gameLang);
    state=STATE_INITIALISING;
    dayDuration=dayLength*1000;
    game.init(gameDuration,gameLang);
    
    console.log("Server: Starting registration");
    state=STATE_REGISTRATION;
    for (var i=0;i<numBots;i++)
    {
        game.registerPlayer(BOT_NAME_PREFIX+(i+1),"EN");
        io.sockets.emit(CMD_REGISTERED,{msg:game.getPlayer(BOT_NAME_PREFIX+(i+1))});
    }
    if (aEinstein)
    {
        game.registerPlayer(EINSTEIN,"EN");
        io.sockets.emit(CMD_REGISTERED,{msg:game.getPlayer(EINSTEIN)});
    }
}

function startGame()
{
    console.log("Server: Starting game");
    game.start();
    state=STATE_STARTED;
    informPlayersGameStarted();
    startTimerEvents();
}

function stopTimerEvents()
{
    clearInterval(dayTimer);
    clearInterval(botTimer);
}

function startTimerEvents()
{
    dayTimer=setInterval(newDay,dayDuration);
    botTimer = setInterval(processBots, BOT_TIMER);
}

function processBots()
{
	game.processBots();
}

function processGameOver()
{
	stopTimerEvents();
}

function newDay() 
{
    game.nextDay();
    if (game.gameOver())
    {
    	processGameOver();
        io.sockets.emit(CMD_END_OF_GAME,{msg:game.getEndOfGameEvent()}); 
        return;
    }
    var newsEvent=game.processNews();
    if (newsEvent != null)
    {
        io.sockets.emit(CMD_NEWS_EVENT,{msg:newsEvent});
    }

    game.updatePrices();
    game.applyInterestAndInflation();
    sendPlayerList();
    sendNewPrices();
}

function sendNewPrices()
{
    io.sockets.emit(CMD_NEW_PRICES,{msg:game.getNewPrices()});
}

function informPlayersGameStarted() 
{
    console.log("Server: game started");
    io.sockets.emit(CMD_GAME_STARTED,{msg:game.getDate()});
}

function sendPlayerList()
{
    io.sockets.emit(CMD_PLAYER_LIST,{msg:game.getPlayers()});
}

io.on('connection',function(socket)
{
    socket.on(CMD_REGISTER,function(playerName,lang)
    {
        if (state == STATE_REGISTRATION)
        {
            var regStatus = game.validateNewPlayer(playerName);
            if (regStatus == 0)
            {
                console.log("Server: New player registered: "+playerName+"("+lang+")");
                game.registerPlayer(playerName,lang);
                io.sockets.emit(CMD_REGISTERED,{msg:game.getPlayer(playerName)});
            }
            else
                io.sockets.emit(CMD_REGISTRATION_ERROR,{msg:regStatus});
        }
        else if (state == STATE_STARTED)
        {
            var aPlayer = game.getPlayer(playerName);
            if (aPlayer != null)
            {
                console.log("Server: Ignoring player already registered: "+playerName);
            }
            else
                io.sockets.emit(CMD_ERROR,{msg:"Game already in progress"});
        }
        else
            console.log("Ignoring registration attempt");
    });

    socket.on(CMD_GET_GAME_LANGUAGE,function()
    {
        io.sockets.emit(CMD_GAME_LANGUAGE,{msg:gameLang});
    });
 
    socket.on(CMD_BUY_STOCK,function(playerName,stockName,amount)
    {
        console.log("Server: buystock: "+playerName+"/"+stockName+"/"+amount);
        game.buyStock(playerName,stockName,amount);
        sendPlayerList();
        //sendNewPrices();
    });

    socket.on(CMD_GET_GAME_ADDRESS,function()
    {
        var myIP = getLocalIP();
        console.log("Server: My IP is: "+myIP[0]);
        io.sockets.emit(CMD_GAME_ADDRESS,{msg:myIP[0]});
   });

    socket.on(CMD_SELL_STOCK,function(playerName,stockName,amount)
    {
        console.log("Server: sellstock: "+playerName+"/"+stockName+"/"+amount);
        game.sellStock(playerName,stockName,amount);
        sendPlayerList();
        //sendNewPrices();
   });    

    socket.on(CMD_HACK,function(hackingPlayerName,hackedPlayerName)
    {
        console.log("Server: hack of "+hackedPlayerName+" by "+hackingPlayerName);
        game.setupHack(hackingPlayerName,hackedPlayerName);
        sendPlayerList();
   });

    socket.on(CMD_SUSPECT,function(suspectingPlayerName,suspectedPlayerName)
    {
        console.log("Server: suspect: "+suspectingPlayerName+"/"+suspectedPlayerName);
        game.suspectHacker(suspectingPlayerName,suspectedPlayerName);
        sendPlayerList();
    });    

    socket.on(CMD_INSIDER,function(insiderPlayerName)
    {
        console.log("Server: insider: "+insiderPlayerName);
        game.setupInsider(insiderPlayerName);
        sendPlayerList();
    });
});