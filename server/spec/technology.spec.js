const TechnologyService = require('../services/technology');

let service,
    specialistService;

function setup(starSpecialist, carrierSpecialist) {
    specialistService = {
        getByIdStar: () => { return starSpecialist || null; },
        getByIdCarrier: () => { return carrierSpecialist || null; }
    };

    service = new TechnologyService(specialistService);
}

describe('technology', () => {

    beforeEach(() => {
        service = null;
    });

    it('should get enabled technologies', () => {
        const game = {
            settings: {
                technology: {
                    startingTechnologyLevel: {
                        scanning: 1,
                        hyperspace: 0,
                        weapons: 1000
                    },
                    researchCosts: {
                        scanning: 'standard',
                        hyperspace: 'standard',
                        weapons: 'expensive'
                    }
                }
            }
        };

        setup();

        const enabledTechs = service.getEnabledTechnologies(game);

        expect(enabledTechs.length).toBe(2);
        expect(enabledTechs).toContain('scanning');
        expect(enabledTechs).toContain('weapons');
    });

    it('should return true for researchable technology', () => {
        const game = {
            settings: {
                technology: {
                    researchCosts: {
                        scanning: 'standard'
                    }
                }
            }
        };

        setup();

        const researchable = service.isTechnologyResearchable(game, 'scanning');

        expect(researchable).toBeTruthy();
    });

    it('should return false for not researchable technology', () => {
        const game = {
            settings: {
                technology: {
                    researchCosts: {
                        scanning: 'none'
                    }
                }
            }
        };

        setup();

        const researchable = service.isTechnologyResearchable(game, 'scanning');

        expect(researchable).toBeFalsy();
    });

    it('should return true for enabled technology', () => {
        const game = {
            settings: {
                technology: {
                    startingTechnologyLevel: {
                        scanning: 1
                    }
                }
            }
        };

        setup();

        const isEnabled = service.isTechnologyEnabled(game, 'scanning');

        expect(isEnabled).toBeTruthy();
    });

    it('should return false for disabled technology', () => {
        const game = {
            settings: {
                technology: {
                    startingTechnologyLevel: {
                        scanning: 0
                    }
                }
            }
        };

        setup();

        const isEnabled = service.isTechnologyEnabled(game, 'scanning');

        expect(isEnabled).toBeFalsy();
    });

    /* WEAPON TECH CALCULATIONS */

    it('should get defender bonus if enabled', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'enabled'
                }
            }
        };

        const star = {
            isAsteroidField: false
        };

        setup();

        const bonus = service.getDefenderBonus(game, star);

        expect(bonus).toBe(1);
    });

    it('should get 0 defender bonus if disabled', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'disabled'
                }
            }
        };

        const star = {
            isAsteroidField: false
        };

        setup();

        const bonus = service.getDefenderBonus(game, star);

        expect(bonus).toBe(0);
    });

    it('should get x2 defender bonus if star is asteroid field', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'enabled'
                }
            }
        };

        const star = {
            isAsteroidField: true
        };

        setup();

        const bonus = service.getDefenderBonus(game, star);

        expect(bonus).toBe(2);
    });

    it('should get 0 defender bonus for asteroid field if disabled', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'disabled'
                }
            }
        };

        const star = {
            isAsteroidField: true
        };

        setup();

        const bonus = service.getDefenderBonus(game, star);

        expect(bonus).toBe(0);
    });

    /* EFFECTIVE WEAPON LEVELS */
    /* STAR */

    it('should calculate star effective weapons level - Star - No carriers - No specs - No defender bonus', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'disabled'
                }
            }
        };

        const player = {
            research: {
                weapons: {
                    level: 1
                }
            }
        };

        const star = {
            specialistId: null
        };

        const carriersInOrbit = [];

        setup();

        const weapons = service.getStarEffectiveWeaponsLevel(game, player, star, carriersInOrbit);

        expect(weapons).toBe(1);
    });

    it('should calculate star effective weapons level - Star - No carriers - No specs - Defender bonus', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'enabled'
                }
            }
        };

        const player = {
            research: {
                weapons: {
                    level: 1
                }
            }
        };

        const star = {
            specialistId: null
        };

        const carriersInOrbit = [];

        setup();

        const weapons = service.getStarEffectiveWeaponsLevel(game, player, star, carriersInOrbit);

        expect(weapons).toBe(2);
    });

    it('should calculate star effective weapons level - Star - No carriers - Spec - No defender bonus', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'disabled'
                }
            }
        };

        const player = {
            research: {
                weapons: {
                    level: 1
                }
            }
        };

        const star = {
            specialistId: 1
        };

        const specialist = {
            modifiers: {
                local: {
                    weapons: 1
                }
            }
        };

        const carriersInOrbit = [];

        setup(specialist, null);

        const weapons = service.getStarEffectiveWeaponsLevel(game, player, star, carriersInOrbit);

        expect(weapons).toBe(2);
    });

    it('should calculate star effective weapons level - Star - Carriers - No spec - No defender bonus', () => {
        const game = {
            settings: {
                specialGalaxy: {
                    defenderBonus: 'disabled'
                }
            }
        };

        const player = {
            research: {
                weapons: {
                    level: 1
                }
            }
        };

        const star = {
            specialistId: null
        };

        const specialist = {
            modifiers: {
                local: {
                    weapons: 1
                }
            }
        };

        const carriersInOrbit = [
            {
                specialistId: 1
            }
        ];

        setup(null, specialist);

        const weapons = service.getStarEffectiveWeaponsLevel(game, player, star, carriersInOrbit);

        expect(weapons).toBe(2);
    });

    /* CARRIER */

    it('should calculate a single carrier weapons buff - No specialist', () => {
        const carrier = {
            specialistId: null
        };

        const isCarrierToStarCombat = false;

        setup();

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(0);
    });

    it('should calculate a single carrier weapons buff - Specialist with local weapons', () => {
        const carrier = {
            specialistId: 1
        };

        const isCarrierToStarCombat = false;

        const specialist = {
            modifiers: {
                local: {
                    weapons: 1
                }
            }
        };

        setup(null, specialist);

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(1);
    });

    it('should calculate a single carrier weapons buff - Specialist with carrier to star buff - Carrier to star combat', () => {
        const carrier = {
            specialistId: 1
        };

        const isCarrierToStarCombat = true;

        const specialist = {
            modifiers: {
                local: {
                    carrierToStarCombat: {
                        weapons: 5
                    }
                }
            }
        };

        setup(null, specialist);

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(5);
    });

    it('should calculate a single carrier weapons buff - Specialist with carrier to star buff - Carrier to carrier combat', () => {
        const carrier = {
            specialistId: 1
        };

        const isCarrierToStarCombat = false;

        const specialist = {
            modifiers: {
                local: {
                    carrierToStarCombat: {
                        weapons: 5
                    }
                }
            }
        };

        setup(null, specialist);

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(0);
    });

    it('should calculate a single carrier weapons buff - Specialist with carrier to carrier buff - Carrier to carrier combat', () => {
        const carrier = {
            specialistId: 1
        };

        const isCarrierToStarCombat = false;

        const specialist = {
            modifiers: {
                local: {
                    carrierToCarrierCombat: {
                        weapons: 5
                    }
                }
            }
        };

        setup(null, specialist);

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(5);
    });

    it('should calculate a single carrier weapons buff - Specialist with carrier to carrier buff - Carrier to star combat', () => {
        const carrier = {
            specialistId: 1
        };

        const isCarrierToStarCombat = true;

        const specialist = {
            modifiers: {
                local: {
                    carrierToCarrierCombat: {
                        weapons: 5
                    }
                }
            }
        };

        setup(null, specialist);

        const buff = service.getCarrierWeaponsBuff(carrier, isCarrierToStarCombat);

        expect(buff).toBe(0);
    });

    /* CARRIER ARRAY */

    it('should calculate carrier effective weapons level - Single player - Single carrier - Carrier to star combat', () => {
        const game = { };

        const players = [
            {
                research: {
                    weapons: {
                        level: 1
                    }
                }
            }
        ];

        const carriers = [
            {
                specialistId: null
            }
        ];

        const isCarrierToStarCombat = true;

        setup();

        const weapons = service.getCarriersEffectiveWeaponsLevel(game, players, carriers, isCarrierToStarCombat);

        expect(weapons).toBe(1);
    });

    it('should calculate carrier effective weapons level - Multi player - Single carrier - Carrier to star combat', () => {
        const game = { };

        const players = [
            {
                research: {
                    weapons: {
                        level: 1
                    }
                }
            },
            {
                research: {
                    weapons: {
                        level: 2
                    }
                }
            }
        ];

        const carriers = [
            {
                specialistId: null
            }
        ];

        const isCarrierToStarCombat = true;

        setup();

        const weapons = service.getCarriersEffectiveWeaponsLevel(game, players, carriers, isCarrierToStarCombat);

        expect(weapons).toBe(2);
    });

    it('should calculate carrier effective weapons level - Single player - Multi carrier - Carrier to star combat', () => {
        const game = { };

        const players = [
            {
                research: {
                    weapons: {
                        level: 1
                    }
                }
            }
        ];

        const carriers = [
            {
                specialistId: 1
            }
        ];

        const isCarrierToStarCombat = true;

        const specialist = {
            modifiers: {
                local: {
                    weapons: 1
                }
            }
        };

        setup(null, specialist);

        const weapons = service.getCarriersEffectiveWeaponsLevel(game, players, carriers, isCarrierToStarCombat);

        expect(weapons).toBe(2);
    });

    /* CARRIER DEBUFFS */

    it('should calculate carrier debuff - No carriers', () => {
        const carriers = [];

        setup();

        const debuff = service.getCarriersWeaponsDebuff(carriers);

        expect(debuff).toBe(0);
    });

    it('should calculate carrier debuff - Single carrier with deduction', () => {
        const carriers = [
            {
                specialistId: 1
            }
        ];

        const specialist = {
            modifiers: {
                special: {
                    deductEnemyWeapons: 1
                }
            }
        };

        setup(null, specialist);

        const debuff = service.getCarriersWeaponsDebuff(carriers);

        expect(debuff).toBe(1);
    });

    it('should calculate carrier debuff - Single carrier without deduction', () => {
        const carriers = [
            {
                specialistId: 1
            }
        ];

        const specialist = {
            modifiers: {
                special: {
                    test: 1
                }
            }
        };

        setup(null, specialist);

        const debuff = service.getCarriersWeaponsDebuff(carriers);

        expect(debuff).toBe(0);
    });

    /* STAR BUFF */

    it('should calculate star weapons buff - No specialist', () => {
        const star = {
            specialistId: null
        };

        setup();

        const buff = service.getStarWeaponsBuff(star);

        expect(buff).toBe(0);
    });

    it('should calculate star weapons buff - Specialist with local weapons', () => {
        const star = {
            specialistId: 1
        };

        const specialist = {
            modifiers: {
                local: {
                    weapons: 1
                }
            }
        };

        setup(specialist, null);

        const buff = service.getStarWeaponsBuff(star);

        expect(buff).toBe(1);
    });

    /* PLAYER */

    it('should calculate player effective technology levels - Unknown research levels', () => {
        const game = {};
        const player = { };

        setup();

        const tech = service.getPlayerEffectiveTechnologyLevels(game, player);

        expect(tech.scanning).toBe(1);
        expect(tech.hyperspace).toBe(1);
        expect(tech.terraforming).toBe(1);
        expect(tech.experimentation).toBe(1);
        expect(tech.weapons).toBe(1);
        expect(tech.banking).toBe(1);
        expect(tech.manufacturing).toBe(1);
        expect(tech.specialists).toBe(1);
    });

    it('should calculate player effective technology levels', () => {
        const game = {};
        const player = { 
            research: {
                scanning: { level: 1 },
                hyperspace: { level: 2 },
                terraforming: { level: 3 },
                experimentation: { level: 4 },
                weapons: { level: 5 },
                banking: { level: 6 },
                manufacturing: { level: 7 },
                specialists: { level: 8 }
            }
        };

        setup();

        const tech = service.getPlayerEffectiveTechnologyLevels(game, player);

        expect(tech.scanning).toBe(1);
        expect(tech.hyperspace).toBe(2);
        expect(tech.terraforming).toBe(3);
        expect(tech.experimentation).toBe(4);
        expect(tech.weapons).toBe(5);
        expect(tech.banking).toBe(6);
        expect(tech.manufacturing).toBe(7);
        expect(tech.specialists).toBe(8);
    });

})