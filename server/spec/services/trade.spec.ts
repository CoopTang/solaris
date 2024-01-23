import TradeService from "../../services/trade"
import ValidationError from "../../errors/validation";

const gameRepo: any = {}
const eventRepo: any = {}
const userService: any = {}
const playerService: any = {}
const diplomacyService: any = {}
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

const _playerIdC: any = 3;
const _playerAliasC: string = 'Player 3';

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
        let game: any = {
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
                                status: "enemies"
                            },
                            {
                                playerId: _playerIdC,
                                status: "allies"
                            }
                        ]
                    },
                    {
                        _id: _playerIdB,
                        alias: _playerAliasB,
                        diplomacy: [
                            {
                                playerId: _playerIdA,
                                status: "allies"
                            },
                            {
                                playerId: _playerIdC,
                                status: "allies"
                            }
                        ]
                    },
                    {
                        _id: _playerIdC,
                        alias: _playerAliasC,
                        diplomacy: [
                            {
                                playerId: _playerIdA,
                                status: "enemies"
                            },
                            {
                                playerId: _playerIdB,
                                status: "allies"
                            }
                        ]
                    }
                ]
            },
            settings: {
                diplomacy: {
                    enabled: 'enabled'
                }
            }
        }

        it("should not allow gifts when aliiances are disabled", async () => {
            game.settings.diplomacy.enabled = 'disabled'
    
            await expectAsync(tradeService.sendStar(game, _playerIdA, {}, _playerIdB))
                .toBeRejectedWithError(ValidationError, 'Cannot Gift Stars in Non-Alliance Games');
        })
        
        it("should not gift star to unallied player", async () => {
            game.settings.diplomacy.enabled = 'enabled'
    
            await expectAsync(tradeService.sendStar(game, _playerIdA, {}, _playerIdB))
                .toBeRejectedWithError(ValidationError, "Cannot Gift Stars to Non-Allied Players");
        })
    })
})