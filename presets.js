"use strict";

window.DOTA_ENEMY_CD_PRESETS = {
  starterHeroNames: ["Enigma", "Tidehunter", "Faceless Void", "Magnus", "Warlock"],
  heroes: [
    {
      name: "Abaddon",
      color: "#7bd88f",
      abilities: [{ name: "Borrowed Time", cooldown: 80, type: "ult", tracked: true }],
    },
    {
      name: "Ancient Apparition",
      color: "#6da8ff",
      abilities: [{ name: "Ice Blast", cooldown: 40, type: "ult", tracked: true }],
    },
    {
      name: "Anti-Mage",
      color: "#b08cff",
      abilities: [
        { name: "Mana Void", cooldown: 70, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Arc Warden",
      color: "#6da8ff",
      abilities: [
        { name: "Tempest Double", cooldown: 60, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Axe",
      color: "#e95f6a",
      abilities: [
        { name: "Berserker's Call", cooldown: 11, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Bane",
      color: "#b08cff",
      abilities: [{ name: "Fiend's Grip", cooldown: 120, type: "ult", tracked: true }],
    },
    {
      name: "Batrider",
      color: "#e95f6a",
      abilities: [
        { name: "Flaming Lasso", cooldown: 120, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Beastmaster",
      color: "#f2b84b",
      abilities: [
        { name: "Primal Roar", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Brewmaster",
      color: "#f2b84b",
      abilities: [{ name: "Primal Split", cooldown: 120, type: "ult", tracked: true }],
    },
    {
      name: "Broodmother",
      color: "#7bd88f",
      abilities: [
        { name: "Insatiable Hunger", cooldown: 45, type: "ult", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Centaur Warrunner",
      color: "#f2b84b",
      abilities: [{ name: "Stampede", cooldown: 90, type: "ult", tracked: true }],
    },
    {
      name: "Chaos Knight",
      color: "#e95f6a",
      abilities: [
        { name: "Phantasm", cooldown: 75, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Crystal Maiden",
      color: "#6da8ff",
      abilities: [{ name: "Freezing Field", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Dark Seer",
      color: "#b08cff",
      abilities: [{ name: "Wall of Replica", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Dark Willow",
      color: "#b08cff",
      abilities: [
        { name: "Terrorize", cooldown: 100, type: "ult", tracked: true },
        { name: "Cursed Crown", cooldown: 12, type: "skill", tracked: false },
      ],
    },
    {
      name: "Dazzle",
      color: "#b08cff",
      abilities: [{ name: "Shallow Grave", cooldown: 24, type: "skill", tracked: false }],
    },
    {
      name: "Death Prophet",
      color: "#7bd88f",
      abilities: [{ name: "Exorcism", cooldown: 150, type: "ult", tracked: true }],
    },
    {
      name: "Disruptor",
      color: "#6da8ff",
      abilities: [
        { name: "Static Storm", cooldown: 90, type: "ult", tracked: true },
        { name: "Glimpse", cooldown: 18, type: "skill", tracked: false },
      ],
    },
    {
      name: "Doom",
      color: "#e95f6a",
      abilities: [
        { name: "Doom", cooldown: 145, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Dragon Knight",
      color: "#f2b84b",
      abilities: [
        { name: "Elder Dragon Form", cooldown: 100, type: "ult", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Earth Spirit",
      color: "#7bd88f",
      abilities: [{ name: "Magnetize", cooldown: 80, type: "ult", tracked: true }],
    },
    {
      name: "Earthshaker",
      color: "#f2b84b",
      abilities: [
        { name: "Echo Slam", cooldown: 130, type: "ult", tracked: true },
        { name: "Fissure", cooldown: 18, type: "skill", tracked: false },
      ],
    },
    {
      name: "Elder Titan",
      color: "#f2b84b",
      abilities: [{ name: "Earth Splitter", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Ember Spirit",
      color: "#e95f6a",
      abilities: [
        { name: "Sleight of Fist", cooldown: 6, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Enigma",
      color: "#18b7a0",
      abilities: [
        { name: "Black Hole", cooldown: 180, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
        { name: "Refresher Orb", cooldown: 180, type: "item", tracked: false },
      ],
    },
    {
      name: "Faceless Void",
      color: "#b08cff",
      abilities: [
        { name: "Chronosphere", cooldown: 160, type: "ult", tracked: true },
        { name: "Time Walk", cooldown: 6, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Grimstroke",
      color: "#b08cff",
      abilities: [{ name: "Soulbind", cooldown: 70, type: "ult", tracked: true }],
    },
    {
      name: "Gyrocopter",
      color: "#6da8ff",
      abilities: [
        { name: "Call Down", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Hoodwink",
      color: "#7bd88f",
      abilities: [{ name: "Sharpshooter", cooldown: 45, type: "ult", tracked: false }],
    },
    {
      name: "Invoker",
      color: "#f2b84b",
      abilities: [
        { name: "Cataclysm", cooldown: 100, type: "skill", tracked: true },
        { name: "Tornado", cooldown: 30, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Jakiro",
      color: "#6da8ff",
      abilities: [{ name: "Macropyre", cooldown: 90, type: "ult", tracked: true }],
    },
    {
      name: "Juggernaut",
      color: "#e95f6a",
      abilities: [
        { name: "Omnislash", cooldown: 120, type: "ult", tracked: true },
        { name: "Swift Slash", cooldown: 20, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Keeper of the Light",
      color: "#f2b84b",
      abilities: [{ name: "Will-O-Wisp", cooldown: 120, type: "skill", tracked: true }],
    },
    {
      name: "Kunkka",
      color: "#6da8ff",
      abilities: [
        { name: "Ghostship", cooldown: 80, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Legion Commander",
      color: "#f2b84b",
      abilities: [
        { name: "Duel", cooldown: 50, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Leshrac",
      color: "#b08cff",
      abilities: [
        { name: "Bloodstone", cooldown: 30, type: "item", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Lich",
      color: "#6da8ff",
      abilities: [{ name: "Chain Frost", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Lifestealer",
      color: "#e95f6a",
      abilities: [
        { name: "Rage", cooldown: 18, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Lina",
      color: "#e95f6a",
      abilities: [
        { name: "Laguna Blade", cooldown: 50, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Lion",
      color: "#b08cff",
      abilities: [
        { name: "Finger of Death", cooldown: 80, type: "ult", tracked: true },
        { name: "Hex", cooldown: 24, type: "skill", tracked: false },
      ],
    },
    {
      name: "Luna",
      color: "#6da8ff",
      abilities: [
        { name: "Eclipse", cooldown: 110, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Magnus",
      color: "#e95f6a",
      abilities: [
        { name: "Reverse Polarity", cooldown: 120, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
        { name: "Refresher Orb", cooldown: 180, type: "item", tracked: false },
      ],
    },
    {
      name: "Marci",
      color: "#f2b84b",
      abilities: [
        { name: "Unleash", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Mars",
      color: "#e95f6a",
      abilities: [
        { name: "Arena of Blood", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Medusa",
      color: "#7bd88f",
      abilities: [
        { name: "Stone Gaze", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Mirana",
      color: "#6da8ff",
      abilities: [{ name: "Moonlight Shadow", cooldown: 140, type: "ult", tracked: true }],
    },
    {
      name: "Monkey King",
      color: "#f2b84b",
      abilities: [
        { name: "Wukong's Command", cooldown: 100, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Muerta",
      color: "#b08cff",
      abilities: [
        { name: "Pierce the Veil", cooldown: 75, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Naga Siren",
      color: "#6da8ff",
      abilities: [{ name: "Song of the Siren", cooldown: 160, type: "ult", tracked: true }],
    },
    {
      name: "Necrophos",
      color: "#7bd88f",
      abilities: [{ name: "Reaper's Scythe", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Night Stalker",
      color: "#b08cff",
      abilities: [{ name: "Dark Ascension", cooldown: 140, type: "ult", tracked: true }],
    },
    {
      name: "Nyx Assassin",
      color: "#7bd88f",
      abilities: [
        { name: "Vendetta", cooldown: 70, type: "ult", tracked: false },
        { name: "Spiked Carapace", cooldown: 23, type: "skill", tracked: false },
      ],
    },
    {
      name: "Omniknight",
      color: "#f2b84b",
      abilities: [{ name: "Guardian Angel", cooldown: 160, type: "ult", tracked: true }],
    },
    {
      name: "Oracle",
      color: "#f2b84b",
      abilities: [{ name: "False Promise", cooldown: 115, type: "ult", tracked: true }],
    },
    {
      name: "Outworld Destroyer",
      color: "#b08cff",
      abilities: [
        { name: "Sanity's Eclipse", cooldown: 160, type: "ult", tracked: true },
        { name: "Astral Imprisonment", cooldown: 18, type: "skill", tracked: false },
      ],
    },
    {
      name: "Pangolier",
      color: "#f2b84b",
      abilities: [
        { name: "Rolling Thunder", cooldown: 80, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Phantom Assassin",
      color: "#b08cff",
      abilities: [{ name: "Black King Bar", cooldown: 90, type: "item", tracked: true }],
    },
    {
      name: "Phantom Lancer",
      color: "#6da8ff",
      abilities: [
        { name: "Doppelganger", cooldown: 16, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Phoenix",
      color: "#e95f6a",
      abilities: [
        { name: "Supernova", cooldown: 120, type: "ult", tracked: true },
        { name: "Icarus Dive", cooldown: 30, type: "skill", tracked: false },
      ],
    },
    {
      name: "Puck",
      color: "#b08cff",
      abilities: [
        { name: "Dream Coil", cooldown: 80, type: "ult", tracked: true },
        { name: "Phase Shift", cooldown: 6, type: "skill", tracked: false },
      ],
    },
    {
      name: "Pudge",
      color: "#e95f6a",
      abilities: [{ name: "Dismember", cooldown: 30, type: "ult", tracked: false }],
    },
    {
      name: "Queen of Pain",
      color: "#b08cff",
      abilities: [
        { name: "Sonic Wave", cooldown: 125, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Riki",
      color: "#7bd88f",
      abilities: [{ name: "Smoke Screen", cooldown: 11, type: "skill", tracked: false }],
    },
    {
      name: "Rubick",
      color: "#7bd88f",
      abilities: [{ name: "Spell Steal", cooldown: 20, type: "ult", tracked: false }],
    },
    {
      name: "Sand King",
      color: "#f2b84b",
      abilities: [
        { name: "Epicenter", cooldown: 120, type: "ult", tracked: true },
        { name: "Burrowstrike", cooldown: 14, type: "skill", tracked: false },
      ],
    },
    {
      name: "Shadow Demon",
      color: "#b08cff",
      abilities: [
        { name: "Disruption", cooldown: 26, type: "skill", tracked: false },
        { name: "Demonic Purge", cooldown: 60, type: "ult", tracked: false },
      ],
    },
    {
      name: "Shadow Fiend",
      color: "#e95f6a",
      abilities: [
        { name: "Requiem of Souls", cooldown: 120, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Shadow Shaman",
      color: "#f2b84b",
      abilities: [
        { name: "Mass Serpent Ward", cooldown: 110, type: "ult", tracked: true },
        { name: "Hex", cooldown: 24, type: "skill", tracked: false },
      ],
    },
    {
      name: "Silencer",
      color: "#6da8ff",
      abilities: [{ name: "Global Silence", cooldown: 130, type: "ult", tracked: true }],
    },
    {
      name: "Slark",
      color: "#7bd88f",
      abilities: [
        { name: "Shadow Dance", cooldown: 60, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Snapfire",
      color: "#e95f6a",
      abilities: [{ name: "Mortimer Kisses", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Spectre",
      color: "#b08cff",
      abilities: [
        { name: "Haunt", cooldown: 180, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Spirit Breaker",
      color: "#6da8ff",
      abilities: [{ name: "Nether Strike", cooldown: 50, type: "ult", tracked: false }],
    },
    {
      name: "Storm Spirit",
      color: "#6da8ff",
      abilities: [
        { name: "Electric Vortex", cooldown: 16, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Sven",
      color: "#6da8ff",
      abilities: [
        { name: "God's Strength", cooldown: 110, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Techies",
      color: "#7bd88f",
      abilities: [{ name: "Blast Off!", cooldown: 35, type: "skill", tracked: false }],
    },
    {
      name: "Templar Assassin",
      color: "#b08cff",
      abilities: [
        { name: "Refraction", cooldown: 17, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Terrorblade",
      color: "#b08cff",
      abilities: [
        { name: "Metamorphosis", cooldown: 150, type: "skill", tracked: true },
        { name: "Sunder", cooldown: 120, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Tidehunter",
      color: "#6da8ff",
      abilities: [
        { name: "Ravage", cooldown: 150, type: "ult", tracked: true },
        { name: "Refresher Orb", cooldown: 180, type: "item", tracked: false },
      ],
    },
    {
      name: "Timbersaw",
      color: "#7bd88f",
      abilities: [
        { name: "Chakram", cooldown: 8, type: "ult", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Tiny",
      color: "#f2b84b",
      abilities: [
        { name: "Avalanche", cooldown: 23, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Treant Protector",
      color: "#7bd88f",
      abilities: [
        { name: "Overgrowth", cooldown: 100, type: "ult", tracked: true },
        { name: "Living Armor", cooldown: 30, type: "skill", tracked: false },
      ],
    },
    {
      name: "Troll Warlord",
      color: "#e95f6a",
      abilities: [
        { name: "Battle Trance", cooldown: 90, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Tusk",
      color: "#6da8ff",
      abilities: [
        { name: "Snowball", cooldown: 21, type: "skill", tracked: false },
        { name: "Walrus Punch!", cooldown: 20, type: "ult", tracked: false },
      ],
    },
    {
      name: "Underlord",
      color: "#7bd88f",
      abilities: [{ name: "Fiend's Gate", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Undying",
      color: "#7bd88f",
      abilities: [{ name: "Tombstone", cooldown: 90, type: "skill", tracked: true }],
    },
    {
      name: "Ursa",
      color: "#e95f6a",
      abilities: [
        { name: "Enrage", cooldown: 50, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Vengeful Spirit",
      color: "#6da8ff",
      abilities: [{ name: "Nether Swap", cooldown: 45, type: "ult", tracked: false }],
    },
    {
      name: "Void Spirit",
      color: "#b08cff",
      abilities: [
        { name: "Dissimilate", cooldown: 17, type: "skill", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Warlock",
      color: "#f2b84b",
      abilities: [
        { name: "Chaotic Offering", cooldown: 170, type: "ult", tracked: true },
        { name: "Upheaval", cooldown: 35, type: "skill", tracked: false },
        { name: "Refresher Orb", cooldown: 180, type: "item", tracked: false },
      ],
    },
    {
      name: "Weaver",
      color: "#7bd88f",
      abilities: [
        { name: "Time Lapse", cooldown: 70, type: "ult", tracked: true },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Windranger",
      color: "#7bd88f",
      abilities: [
        { name: "Focus Fire", cooldown: 70, type: "ult", tracked: false },
        { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
      ],
    },
    {
      name: "Winter Wyvern",
      color: "#6da8ff",
      abilities: [
        { name: "Winter's Curse", cooldown: 90, type: "ult", tracked: true },
        { name: "Cold Embrace", cooldown: 24, type: "skill", tracked: false },
      ],
    },
    {
      name: "Witch Doctor",
      color: "#b08cff",
      abilities: [{ name: "Death Ward", cooldown: 100, type: "ult", tracked: true }],
    },
    {
      name: "Wraith King",
      color: "#e95f6a",
      abilities: [{ name: "Reincarnation", cooldown: 180, type: "ult", tracked: true }],
    },
    {
      name: "Zeus",
      color: "#6da8ff",
      abilities: [
        { name: "Thundergod's Wrath", cooldown: 120, type: "ult", tracked: true },
        { name: "Nimbus", cooldown: 45, type: "skill", tracked: false },
      ],
    },
    {
      name: "Custom",
      color: "#7bd88f",
      abilities: [{ name: "New Spell", cooldown: 120, type: "skill", tracked: true }],
    },
  ],
  addons: [
    { name: "Buyback", cooldown: 480, type: "item", tracked: true },
    { name: "Black King Bar", cooldown: 90, type: "item", tracked: true },
    { name: "Refresher Orb", cooldown: 180, type: "item", tracked: true },
    { name: "Aeon Disk", cooldown: 105, type: "item", tracked: true },
  ],
};
