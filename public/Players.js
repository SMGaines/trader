const HACKING_DURATION_DAYS = 30;
const HACKING_FEE = 5000;
const HACKING_FINE = 25000;
const HACKING_FRACTION = .3;
const MIN_HACKING_AMOUNT = 10000;
const HACKING_INCORRECT_SUSPICION_FINE = 40000;
const HACKING_PRISON_SENTENCE=30;
const INSIDER_FEE=5000;
const INSIDER_BASE_FINE = 10000;
const INSIDER_LOOKAHEAD_MONTHS = 3;
const BASE_XMAS_PRESENT = 10000;
const NO_PLAYER="NONE";
const PRISON_DAYS_INCREMENT = 10;
const CRIME_EXPIRY_DAYS = 60; //
const REG_PLAYER_OK = 0;
const REG_PLAYER_EXISTS=1;
const REG_PLAYER_ERROR = 2;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 8;

players=[];

registerPlayer=function(playerName,type)
{
  players.push(new Player(playerName,type));
}

getPlayer = function(playerName)
{
    var selectedPlayer=null;
    players.forEach(function(player)
    {
        if (player.name == playerName)
            selectedPlayer = player;
    });
    return selectedPlayer;
}
exports.getPlayer = getPlayer;

exports.getPlayers=function()
{
  // Cannot send functions through the web socket so we calculate the net worth here before sending
  players.forEach(function(player)
  {
    player.netWorth=player.calcNetWorth(stocks);
  });
  return players;
}

exports.setInitialStatusMessages=function()
{
    players.forEach(function(player)
    {
        player.status = getPlayerStatusMsg(MSG_GAME_STARTED,player.lang);
    });
}

exports.applyInterestAndInflation = function()
{
  if (gameOver())
  {
    log("updatePlayerCash ignored - game over");
    return;
  }

  players.forEach(function(player)
  {
    if (player.cash > 0)
    {
      player.cash*=(100-inflationRate/5)/100; 
      player.cash*=(100+interestRate/5)/100;
    // Below creates larger effect for small cash sums
    if (interestRate>inflationRate)
      player.addCash(player,100*(interestRate-inflationRate));
    else
      player.removeCash(player,100*(inflationRate-interestRate));
    }
  });
}

findWinner = function()
{
  var bestPlayerIndex=-1;
  var bestScore = -1;
  for (var i=0;i<players.length;i++)
  {
    var playerNetWorth = players[i].calcNetWorth(stocks);
    if (playerNetWorth > bestScore)
    {
      bestScore=playerNetWorth;
      bestPlayerIndex=i;
    }
  }
  return players[bestPlayerIndex];
}

exports.registerPlayer = function(playerName,language)
{
  log("registerPlayer: Registering new player: "+playerName);
  players.push(new player.Player(playerName,getLanguageIndex(language)));
  //getPlayer(playerName).status=getPlayerStatusMsg(MSG_REGISTERED,getLanguageIndex(language));
}

exports.validateNewPlayer=function(playerName)
{
  if (playerName.length >= MIN_USERNAME_LENGTH && playerName.length <= MAX_USERNAME_LENGTH && isAlphaNumeric(playerName))
  {
    return getPlayer(playerName) != null?REG_PLAYER_EXISTS:REG_PLAYER_OK;
  }
  return REG_PLAYER_ERROR;
}

exports.getLotteryWinner=function()
{
  var best=0;
  var bestIndex=-1;
  for (var i=0;i<players.length;i++)
  {
    var playerNetWorth=players[i].calcNetWorth(stocks);
    if (playerNetWorth <=10000)
      playerNetWorth=10000; // Set minimum net worth for lottery purposes only
    var playerChance = Math.random()/playerNetWorth; // Lower net worth means higher chance of winning
    if (players[i].prisonDaysRemaining > 0 || players[i].cash < 0) // Cannot win the lottery if in prison or if bankrupt already
      playerChance=0;
    if (playerChance > best)
    {
      best=playerChance;
      bestIndex=i;
    }
  }
  return bestIndex;
}
exports.getLotteryWinner=getLotteryWinner;

updateAll=function()
{
    var numSolvent=0;
    var solventIndex=-1;
    for (var i=0;i<players.length;i++)
    {
        players[i].status="";
        players[i].allStockSold=false;
        if (isChristmas() && players[i].cash >=0 && players[i].prisonDaysRemaining == 0)
        {
        var playerPresent=BASE_XMAS_PRESENT*(1+Math.random()*3);
        console.log("xmasPresent for "+players[i].name+" is "+formatMoney(playerPresent));
        players[i].addCash(playerPresent);
        players[i].status=getPlayerStatusMsg(MSG_HAPPY_XMAS,players[i].lang,formatMoney(playerPresent));
        }
        if (players[i].cash >=0)
        {
            numSolvent++;
            solventIndex=i;
        }
        if (players[i].netWorth > 1000000)
            instantWinner=true;
        if (players[i].prisonDaysRemaining > 0)
        {
            players[i].prisonDaysRemaining--;
            if (players[i].prisonDaysRemaining == 0)
                players[i].status = getPlayerStatusMsg(MSG_PRISON_RELEASE,players[i].lang);
        }
    }  

    if (numSolvent == 0)
    {
        // All lose
        console.log("ALL players lost");
        return;
    }
    if (numSolvent == 1)
    {
        console.log("One player left: "+players[solventIndex].name);
        instantWinner=true;
        return;
    }
}
exports.updateAll=updateAll;

function checkHackers()
{
    players.forEach(function(player)
    {
        if (player.hacking != NO_PLAYER)
        {
          if (gameDate > player.hackingCompletionDate)
          {
            var hackedPlayer=getPlayer(player.hacking);
            if (hackedPlayer.cash <= 0)
            {
              player.status = getPlayerStatusMsg(MSG_SUCCESSFUL_HACK_NO_MONEY,player.lang,hackedPlayer.name);
            }
            else
            {
              var amount = Math.max(MIN_HACKING_AMOUNT,hackedPlayer.cash*HACKING_FRACTION);
              log("checkHackers: Successful hack("+formatMoney(amount)+") of "+hackedPlayer.name+" by "+player.name);
              removeCash(hackedPlayer,amount);
              addCash(player,amount);
              hackedPlayer.status = getPlayerStatusMsg(MSG_HACK_STEAL,hackedPlayer.lang,player.name,formatMoney(amount));
              hackedPlayer.beingHacked=false;
              player.status = getPlayerStatusMsg(MSG_SUCCESSFUL_HACK,player.lang,hackedPlayer.name,formatMoney(amount));
            }
            player.hacking=NO_PLAYER;
          }
        }
    });
}


function checkInsiderTrading()
{
  players.forEach(function(player)
  {
    if (player.prisonDaysRemaining==0 && playerConvicted(player))
    {
       // Player convicted of Insider Trading.
      var fine = INSIDER_BASE_FINE * player.numInsiderDeals;
      removeCash(player,fine);
      player.prisonReason="Insider Trading";
      player.prisonDaysRemaining = PRISON_DAYS_INCREMENT*(1+player.numInsiderDeals);
      log("checkInsiderTrading: "+player.name+" goes to prison for "+player.prisonDaysRemaining+" days");
      player.numInsiderDeals = 0;
      player.lastInsiderTradeDate=0;
      player.status=getPlayerStatusMsg(MSG_INSIDER_CONVICTED,player.prisonDaysRemaining);
    }
    else if (player.numInsiderDeals > 0)
    {
      var daysDiff = daysElapsed(gameDate,player.lastInsiderTradeDate); 
      //log("checkInsiderTrading: daysElapsed="+daysDiff);
      if (daysDiff > CRIME_EXPIRY_DAYS)
      {
        player.numInsiderDeals=0;
        player.lastInsiderTradeDate=0;
        log("checkInsiderTrading: Police have dropped their investigation into "+player.name);
        player.status=getPlayerStatusMsg(MSG_INSIDER_DROPPED,player.lang);
      }
    }
  });
}

