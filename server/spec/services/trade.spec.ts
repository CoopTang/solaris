import DiplomacyService from '../../services/diplomacy';
import { DiplomaticState } from '../../services/types/Diplomacy';
import TradeService from "../../services/trade"
import ValidationError from "../../errors/validation";

const gameRepo: any = {}
const eventRepo: any = {}
const userService: any = {}
const playerService: any = {}
const diplomacyUpkeepService: any = {};
const diplomacyService: DiplomacyService = new DiplomacyService(gameRepo, eventRepo, diplomacyUpkeepService);
const ledgerService: any = {}
const achievementService: any = {}
const reputationService: any = {}
const gameTypeService: any = {}
const randomService: any = {}
const playerCreditsService: any = {}
const playerAfkService: any = {}

const _playerIdA: any = 1;
const _playerAliasA: string = 'Player 1';

const _playerIdB: any = 2;
const _playerAliasB: string = 'Player 2';

describe("TradeService", () => {
    
    let tradeService

    beforeEach(() => {
        tradeService = new TradeService(
            gameRepo,
            eventRepo,
            userService,
            playerService,
            diplomacyService,
            ledgerService,
            achievementService,
            reputationService,
            gameTypeService,
            randomService,
            playerCreditsService,
            playerAfkService,
        )
    })

    describe("sendStar()", () => {
        const setupPlayerDiplomacyGame = (playerAStatusToB: DiplomaticState, playerBStatusToA: DiplomaticState) => {
            const game: any = {
                constants: {
                    star: {
                        resources: {
                            minNaturalResources: 10,
                            maxNaturalResources: 50
                        }
                    }
                },
                galaxy: {
                    players: [
                        {
                            _id: _playerIdA,
                            alias: _playerAliasA,
                            diplomacy: [
                                {
                                    playerId: _playerIdB,
                                    status: playerAStatusToB
                                }
                            ]
                        },
                        {
                            _id: _playerIdB,
                            alias: _playerAliasB,
                            diplomacy: [
                                {
                                    playerId: _playerIdA,
                                    status: playerBStatusToA
                                }
                            ]
                        }
                    ],
                    stars: [
                        {
                            _id: 1,
                            ownedByPlayerId: _playerIdA
                        }
                    ]
                },
                settings: {
                    diplomacy: {
                        enabled: 'enabled'
                    }
                }
            }
    
            return game;
        };

        it("should transfer onwership of star between two allied players", async () => {
            const game = setupPlayerDiplomacyGame("allies", "allies")
        })

        it("should not allow gifts when aliiances are disabled", async () => {
            const game = setupPlayerDiplomacyGame("neutral", "neutral")
            game.settings.diplomacy.enabled = 'disabled'
    
            await expectAsync(tradeService.sendStar(game, _playerIdA, _playerIdB, {}))
                .toBeRejectedWithError(ValidationError, 'Cannot Gift Stars in Non-Alliance Games');
        })
        
        it("should not gift star to unallied player", async () => {
            const game1 = setupPlayerDiplomacyGame("neutral", "neutral")
            const game2 = setupPlayerDiplomacyGame("allies", "enemies")

            await expectAsync(tradeService.sendStar(game1, _playerIdA, _playerIdB, {}))
                .toBeRejectedWithError(ValidationError, "Cannot Gift Stars to Non-Allied Players");
            await expectAsync(tradeService.sendStar(game1, _playerIdA, _playerIdB, {}))
                .toBeRejectedWithError(ValidationError, "Cannot Gift Stars to Non-Allied Players");
        })
    })
})