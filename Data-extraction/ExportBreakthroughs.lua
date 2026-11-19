-- Exports the name and description of every breakthrough to the game log.
-- Adds a second button ("EXPORT BREAKTHROUGHS") next to the planet-scan button
-- from Script.lua in the landing-site screen. Load it after Script.lua.
--
-- Output, between the markers below, one breakthrough per line:
--   <tech id> TAB <display name> TAB <description>
-- Convert it with log2breakthroughs.py.
--
-- NOTE: written without being able to run the game. If a description comes out
-- with raw placeholders such as <param1>, the translation context below is the
-- part to adjust.

local BREAKTHROUGHS_START = "================== BREAKTHROUGHS START =================="
local BREAKTHROUGHS_END = "================== BREAKTHROUGHS END =================="

-- Translate a T() value, resolving <param> placeholders from the tech itself.
local function Translate(text, context)
    if text == nil or text == "" then
        return ""
    end
    local ok, result = pcall(function()
        return _InternalTranslate(T { text, context })
    end)
    if ok and type(result) == "string" then
        return result
    end
    ok, result = pcall(_InternalTranslate, text)
    if ok and type(result) == "string" then
        return result
    end
    return tostring(text)
end

-- Tabs and line breaks would break the one-line-per-breakthrough format.
local function OneLine(text)
    return (text:gsub("[\r\n\t]+", " "))
end

local function ExportBreakthroughs()
    print(BREAKTHROUGHS_START)
    local count = 0
    ForEachPreset("TechPreset", function(tech)
        if tech.group == "Breakthroughs" then
            print(table.concat({
                tech.id,
                OneLine(Translate(tech.display_name, tech)),
                OneLine(Translate(tech.description, tech)),
            }, "\t"))
            count = count + 1
        end
    end)
    print(BREAKTHROUGHS_END)
    print("Exported " .. count .. " breakthroughs")
end

local orig_Init_breakthroughs = PGMissionLandingSpotRemastered.Init

function PGMissionLandingSpotRemastered:Init(parent, context)
    orig_Init_breakthroughs(self, parent, context)

    XAction:new({
        ActionId = "exportBreakthroughs",
        ActionSortKey = "zzz",
        ActionName = T(10002, "<green>EXPORT BREAKTHROUGHS</green>"),
        ActionToolbar = "ActionBar",
        OnAction = function()
            CreateRealTimeThread(ExportBreakthroughs)
        end,
    }, self, context)
end
