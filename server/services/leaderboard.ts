import {Game, Team} from "./types/Game";
import {PlayerLeaderboard, LeaderboardPlayer, TeamLeaderboard} from "./types/Leaderboard";
import { Player } from "./types/Player";
import { EloRatingChangeResult, GameRankingResult } from "./types/Rating";
import { User } from "./types/User";
import BadgeService from "./badge";
import GameService from "./game";
import GameStateService from "./gameState";
import GameTypeService from "./gameType";
import PlayerService from "./player";
import PlayerStatisticsService from "./playerStatistics";
import RatingService from "./rating";
import PlayerAfkService from "./playerAfk";
import UserLevelService from "./userLevel";

const moment = require('moment');

export enum GameWinnerKind {
    Player = 'player',
    Team = 'team'
}

export type GameWinnerPlayer = {
    kind: GameWinnerKind.Player,
    player: Player
}

export type GameWinnerTeam = {
    kind: GameWinnerKind.Team,
    team: Team
}

export type GameWinner = GameWinnerPlayer | GameWinnerTeam;

const playerWinner = (player: Player): GameWinner => {
    return {
        kind: GameWinnerKind.Player,
        player
    };
}

const teamWinner = (team: Team): GameWinner => {
    return  {
        kind: GameWinnerKind.Team,
        team
    }
}

export default class LeaderboardService {
    static LOCALSORTERS = {
        stars: 'stats.totalStars',
        carriers: 'stats.totalCarriers',
        ships: 'stats.totalShips',
        economy: 'stats.totalEconomy',
        industry: 'stats.totalIndustry',
        science: 'stats.totalScience',
        newShips: 'stats.newShips',
        warpgates: 'stats.warpgates',
        starSpecialists: 'stats.totalStarSpecialists',
        carrierSpecialists: 'stats.totalCarrierSpecialists',
        totalSpecialists: 'stats.totalSpecialists',
        scanning: 'player.research.scanning.level',
        hyperspace: 'player.research.hyperspace.level',
        terraforming: 'player.research.terraforming.level',
        experimentation: 'player.research.experimentation.level',
        weapons: 'player.research.weapons.level',
        banking: 'player.research.banking.level',
        manufacturing: 'player.research.manufacturing.level',
        specialists: 'player.research.specialists.level'
    }

    playerService: PlayerService;
    playerAfkService: PlayerAfkService;
    userLevelService: UserLevelService;
    ratingService: RatingService;
    gameService: GameService;
    gameTypeService: GameTypeService;
    gameStateService: GameStateService;
    badgeService: BadgeService;
    playerStatisticsService: PlayerStatisticsService;

    constructor(
        playerService: PlayerService,
        playerAfkService: PlayerAfkService,
        userLevelService: UserLevelService,
        ratingService: RatingService,
        gameService: GameService,
        gameTypeService: GameTypeService,
        gameStateService: GameStateService,
        badgeService: BadgeService,
        playerStatisticsService: PlayerStatisticsService
    ) {
        this.playerService = playerService;
        this.playerAfkService = playerAfkService;
        this.userLevelService = userLevelService;
        this.ratingService = ratingService;
        this.gameService = gameService;
        this.gameTypeService = gameTypeService;
        this.gameStateService = gameStateService;
        this.badgeService = badgeService;
        this.playerStatisticsService = playerStatisticsService;
    }

    getGameLeaderboard(game: Game, sortingKey?: string): PlayerLeaderboard {
        let SORTERS = LeaderboardService.LOCALSORTERS;

        let kingOfTheHillPlayer: Player | null = null;

        if (this.gameTypeService.isKingOfTheHillMode(game)) {
            kingOfTheHillPlayer = this.playerService.getKingOfTheHillPlayer(game);
        }

        let playerStats = game.galaxy.players.map(p => {
            let isKingOfTheHill = kingOfTheHillPlayer != null && p._id.toString() === kingOfTheHillPlayer._id.toString();
            let stats = p.stats ?? this.playerStatisticsService.getStats(game, p);

            return {
                player: p,
                isKingOfTheHill,
                stats
            };
        });

        const getNestedObject = (nestedObj, pathArr: string[]) => {
            return pathArr.reduce((obj, key) =>
                (obj && obj[key] !== 'undefined') ? obj[key] : -1, nestedObj)
        }

        function sortPlayers(a, b) {
            if (sortingKey) {
                if (getNestedObject(a, SORTERS[sortingKey].split('.')) > getNestedObject(b, SORTERS[sortingKey].split('.'))) return -1;
                if (getNestedObject(a, SORTERS[sortingKey].split('.')) < getNestedObject(b, SORTERS[sortingKey].split('.'))) return 1;
            }

            // If its a conquest and home star victory then sort by home stars first, then by total stars.
            const isHomeStarVictory = game.settings.general.mode === 'conquest' && game.settings.conquest.victoryCondition === 'homeStarPercentage';

            if (isHomeStarVictory) {
                if (a.stats.totalHomeStars > b.stats.totalHomeStars) return -1;
                if (a.stats.totalHomeStars < b.stats.totalHomeStars) return 1;
            }

            if (game.settings.general.mode === 'kingOfTheHill' && a.isKingOfTheHill !== b.isKingOfTheHill) {
                if (a.isKingOfTheHill) return -1;
                if (b.isKingOfTheHill) return 1;
            }

            // Sort by total stars descending
            if (a.stats.totalStars > b.stats.totalStars) return -1;
            if (a.stats.totalStars < b.stats.totalStars) return 1;

            // Then by total ships descending
            if (a.stats.totalShips > b.stats.totalShips) return -1;
            if (a.stats.totalShips < b.stats.totalShips) return 1;

            // Then by total carriers descending
            if (a.stats.totalCarriers > b.stats.totalCarriers) return -1;
            if (a.stats.totalCarriers < b.stats.totalCarriers) return 1;

            // Then by defeated date descending
            if (a.player.defeated && b.player.defeated) {
                if (moment(a.player.defeatedDate) > moment(b.player.defeatedDate)) return -1;
                if (moment(a.player.defeatedDate) < moment(b.player.defeatedDate)) return 1;
            }

            // Sort defeated players last.
            return (a.player.defeated === b.player.defeated) ? 0 : a.player.defeated ? 1 : -1;
        }

        // Sort the undefeated players first.
        let undefeatedLeaderboard = playerStats
            .filter(x => !x.player.defeated)
            .sort(sortPlayers);

        // Sort the defeated players next.
        let defeatedLeaderboard = playerStats
            .filter(x => x.player.defeated)
            .sort(sortPlayers);

        // Join both sorted arrays together to produce the leaderboard.
        let leaderboard = undefeatedLeaderboard.concat(defeatedLeaderboard);

        return {
            leaderboard,
            fullKey: sortingKey ? SORTERS[sortingKey] : null
        };
    }

    getGameLeaderboardPosition(game: Game, player: Player) {
        if (game.state.leaderboard == null) {
            return null;
        }

        return game.state.leaderboard.findIndex(l => l.toString() === player._id.toString()) + 1;
    }

    getTeamLeaderboard(game: Game): TeamLeaderboard | null {
        if (game.settings.general.mode !== 'teamConquest' || !game.galaxy.teams) {
            return null;
        }

        // TODO: Support capitals?

        const leaderboard = game.galaxy.teams.map(t => {
            const starCount = t.players.map(pId => {
                const player = this.playerService.getById(game, pId);

                if (!player) {
                    return 0;
                }

                const stats = player.stats || this.playerStatisticsService.getStats(game, player);

                return stats.totalStars;
            }).reduce((a, b) => a + b, 0);

            return {
                team: t,
                starCount
            }
        });

        leaderboard.sort((a, b) => {
            if (a.starCount > b.starCount) return -1;
            if (a.starCount < b.starCount) return 1;

            return 0;
        });

        return {
            leaderboard
        };
    }

    addGameRankings(game: Game, gameUsers: User[], leaderboard: LeaderboardPlayer[]): GameRankingResult {
        let result: GameRankingResult = {
            ranks: [],
            eloRating: null
        };

        let leaderboardPlayers = leaderboard.map(x => x.player);

        for (let i = 0; i < leaderboardPlayers.length; i++) {
            let player = leaderboardPlayers[i];

            let user = gameUsers.find(u => player.userId && u._id.toString() === player.userId.toString());

            // Double check user isn't deleted.
            if (!user) {
                continue;
            }

            // Add to rank:
            // (Number of players / 2) - index of leaderboard
            // But 1st place will receive rank equal to the total number of players.
            // So 1st place of 4 players will receive 4 rank
            // 2nd place will receive 1 rank (4 / 2 - 1)
            // 3rd place will receive 0 rank (4 / 2 - 2)
            // 4th place will receive -1 rank (4 / 2 - 3)

            let rankIncrease = 0;

            if (i == 0) {
                rankIncrease = leaderboard.length; // Note: Using leaderboard length as this includes ALL players (including afk)
            }
            else if (game.settings.general.awardRankTo === 'all') {
                rankIncrease = Math.round(leaderboard.length / 2 - i);
            }

            // For AFK players, do not award any positive rank
            // and make sure they are deducted at least 1 rank.
            if (player.afk) {
                rankIncrease = Math.min(rankIncrease, -1);
            }
            // However if they are active and they have
            // filled an AFK slot then reward the player.
            // Award extra rank (at least 0) and do not allow a decrease in rank.
            else if (player.hasFilledAfkSlot) {
                rankIncrease = Math.max(Math.round(rankIncrease * 1.5), 0);
            }

            // For special game modes, award x2 positive rank.
            if (rankIncrease > 0 && this.gameTypeService.isSpecialGameMode(game)) {
                rankIncrease *= 2;
            }
            
            // Apply any additional rank multiplier at the end.
            rankIncrease *= game.constants.player.rankRewardMultiplier;

            let currentRank = user.achievements.rank;
            let newRank = Math.max(user.achievements.rank + rankIncrease, 0); // Cannot go less than 0.

            user.achievements.rank = newRank;
            user.achievements.level = this.userLevelService.getByRankPoints(newRank).id;

            // Append the rank adjustment to the results.
            result.ranks.push({
                playerId: player._id,
                current: currentRank,
                new: newRank
            });
        }

        result.eloRating = this.addUserRatingCheck(game, gameUsers);

        return result;
    }

    incrementGameWinnerAchievements(game: Game, gameUsers: User[], winner: Player, awardCredits: boolean) {
        let user = gameUsers.find(u => winner.userId && u._id.toString() === winner.userId.toString());

        // Double check user isn't deleted.
        if (!user) {
            return;
        }

        user.achievements.victories++; // Increase the winner's victory count
        
        // Note: We don't really care if its official or not, award a badge for any 32p games.
        if (this.gameTypeService.is32PlayerGame(game)) {
            this.badgeService.awardBadgeForUserVictor32PlayerGame(user);
        }

        if (this.gameTypeService.isSpecialGameMode(game)) {
            this.badgeService.awardBadgeForUserVictorySpecialGame(user, game);
        }

        // Give the winner a galactic credit providing it isn't a 1v1.
        if (!this.gameTypeService.is1v1Game(game) && awardCredits) {
            user.credits++;
        }
    }

    addUserRatingCheck(game: Game, gameUsers: User[]): EloRatingChangeResult | null {
        if (!this.gameTypeService.is1v1Game(game)) {
            return null;
        }
        
        let winningPlayer: Player = game.galaxy.players.find(p => p._id.toString() === game.state.winner!.toString())!;
        let losingPlayer: Player = game.galaxy.players.find(p => p._id.toString() !== game.state.winner!.toString())!;

        let winningUser: User = gameUsers.find(u => winningPlayer.userId && u._id.toString() === winningPlayer.userId.toString())!;
        let losingUser: User = gameUsers.find(u => losingPlayer.userId && u._id.toString() === losingPlayer.userId.toString())!;

        let winningUserOldRating = 1200;
        let losingUserOldRating = 1200;

        if (winningUser) {
            winningUserOldRating = winningUser.achievements.eloRating || 1200;

            winningUser.achievements.victories1v1++;
        }

        if (losingUser) {
            losingUserOldRating = losingUser.achievements.eloRating || 1200;

            losingUser.achievements.defeated1v1++;
        }

        this.ratingService.recalculateEloRating(winningUser, losingUser, true);

        return {
            winner: {
                _id: winningPlayer._id,
                newRating: winningUser ? winningUser.achievements.eloRating! : 1200,
                oldRating: winningUserOldRating
            },
            loser: {
                _id: losingPlayer._id,
                newRating: losingUser ? losingUser.achievements.eloRating! : 1200,
                oldRating: losingUserOldRating
            }
        };
    }

    getGameWinner(game: Game, leaderboard: LeaderboardPlayer[]): GameWinner | null {
        // TODO: Win condition for team games

        let isKingOfTheHillMode = this.gameTypeService.isKingOfTheHillMode(game);
        let isAllUndefeatedPlayersReadyToQuit = this.gameService.isAllUndefeatedPlayersReadyToQuit(game);

        if (isAllUndefeatedPlayersReadyToQuit) {
            if (isKingOfTheHillMode) {
                return playerWinner(this.playerService.getKingOfTheHillPlayer(game) || this.getFirstPlacePlayer(leaderboard));
            }

            return playerWinner(this.getFirstPlacePlayer(leaderboard));
        }

        if (this.gameTypeService.isConquestMode(game)) {
            let starWinner = this.getStarCountWinner(game, leaderboard);

            if (starWinner) {
                return playerWinner(starWinner);
            }
        }

        if (this.gameStateService.isCountingDownToEnd(game) && this.gameStateService.hasReachedCountdownEnd(game)) {
            if (isKingOfTheHillMode) {
                return playerWinner(this.playerService.getKingOfTheHillPlayer(game) || this.getFirstPlacePlayer(leaderboard));
            }

            return playerWinner(this.getFirstPlacePlayer(leaderboard));
        }

        let lastManStanding = this.getLastManStanding(game, leaderboard);

        if (lastManStanding) {
            return playerWinner(lastManStanding);
        }

        // TODO: Hardcoded limit to games, 10000 ticks?

        return null;
    }

    getStarCountWinner(game: Game, leaderboard: LeaderboardPlayer[]): Player | null {
        // There could be more than one player who has reached
        // the number of stars required at the same time.
        // In this case we pick the player who has the most ships.
        // If that's equal, then pick the player who has the most carriers.

        // If conquest and home star percentage then use the totalHomeStars as the sort
        // All other cases use totalStars
        let totalStarsKey = this.gameTypeService.isConquestMode(game)
            && game.settings.conquest.victoryCondition === 'homeStarPercentage' ? 'totalHomeStars' : 'totalStars';

        // Firstly, check if ANYONE has reached the star limit, if so we need to end the game.
        let starWinners = leaderboard.filter(p => p.stats[totalStarsKey] >= game.state.starsForVictory);

        // If someone has reached the star limit then pick the first player who is not defeated.
        if (starWinners.length) {
            return leaderboard.filter(p => !p.player.defeated).map(p => p.player)[0];
        }

        return null;
    }

    getLastManStanding(game: Game, leaderboard: LeaderboardPlayer[]): Player | null {
        let undefeatedPlayers = game.galaxy.players.filter(p => !p.defeated);

        if (undefeatedPlayers.length === 1) {
            return undefeatedPlayers[0];
        }

        // If all players have been defeated somehow then pick the player
        // who is currently in first place.
        let defeatedPlayers = game.galaxy.players.filter(p => p.defeated);

        if (defeatedPlayers.length === game.settings.general.playerLimit) {
            return this.getFirstPlacePlayer(leaderboard);
        }

        // If the remaining players alive are all AI then pick the player in 1st.
        // Note: Don't include pseudo afk, only legit actual afk players.
        let undefeatedAI = undefeatedPlayers.filter(p => this.playerAfkService.isAIControlled(game, p, false));
        
        if (undefeatedAI.length === undefeatedPlayers.length) {
            return this.getFirstPlacePlayer(leaderboard);
        }

        return null;
    }

    getFirstPlacePlayer(leaderboard: LeaderboardPlayer[]): Player {
        return leaderboard[0].player;
    }

    markNonAFKPlayersAsEstablishedPlayers(game: Game, gameUsers: User[]) {
        // Any player who isn't afk in an NPG is now considered an established player.
        for (let player of game.galaxy.players) {
            let user = gameUsers.find(u => player.userId && u._id.toString() === player.userId.toString());

            if (!user) {
                continue;
            }

            if (!player.afk) {
                user.isEstablishedPlayer = true;
            }
        }
    }

    incrementPlayersCompletedAchievement(game: Game, gameUsers: User[]) {
        for (let player of game.galaxy.players.filter(p => !p.defeated && !p.afk)) {
            let user = gameUsers.find(u => player.userId && u._id.toString() === player.userId.toString());

            if (!user) {
                continue;
            }

            user.achievements.completed++;
        }
    }

};
