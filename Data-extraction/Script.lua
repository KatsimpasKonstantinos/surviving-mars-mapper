local orig_Init = PGMissionLandingSpotRemastered.Init

function PGMissionLandingSpotRemastered:Init(parent, context)
    orig_Init(self, parent, context)
    
    local mission_host = self

    local function GetSiteName(lat, long, locales_id)
        local name = ""
        if locales_id and rawget(_G, "MarsLocales") and MarsLocales[locales_id] then
            pcall(function()
                local trans = _InternalTranslate(MarsLocales[locales_id])
                if trans and trans ~= "" then
                    name = string.gsub(trans, ",", "") 
                end
            end)
        end
        return name
    end

    local function GetTopography(map_template_id)
        if not map_template_id or map_template_id == "Unknown" then return "Unknown" end
        local MapDataDict = rawget(_G, "MapDataPresets") or rawget(_G, "MapData")
        local mapdata = MapDataDict and MapDataDict[map_template_id]
        local rating = mapdata and mapdata.challenge_rating or 0
        
        if rating <= 59 then return "Flat" end
        if rating <= 99 then return "Rough" end
        if rating <= 139 then return "Steep" end
        return "Mountainous"
    end

    XAction:new({
        ActionId = "extractFullMapCSV",
        ActionSortKey = "zz", 
        ActionName = T(10001, "<green>RUN FULL PLANET SCAN</green>"),
        ActionToolbar = "ActionBar",
        
        OnAction = function (self, host_btn, source, ...)
            CreateRealTimeThread(function()
                print("Starting FULL planet extraction (Headless Mode)...")
                
                local all_bt_ids = {}
                if Presets.TechPreset and Presets.TechPreset.Breakthroughs then
                    all_bt_ids = table.imap(Presets.TechPreset.Breakthroughs, "id")
                end
                
                local bt_translations = {}
                for _, id in ipairs(all_bt_ids) do
                    local name = id
                    if TechDef and TechDef[id] then
                        local t_name = _InternalTranslate(TechDef[id].display_name)
                        if t_name and t_name ~= "" then name = t_name end
                    end
                    bt_translations[id] = string.gsub(name, ",", "")
                end

                print("================== CSV START ==================")
                print("Coords,Lat,Long,Seed,SiteName,Locales,TerrainType,Topography,Altitude,Temperature,Difficulty,MetalsBars,ConcreteBars,WaterBars,DustDevilsBars,DustStormBars,MeteorBars,ColdWaveBars,Metals,Concrete,Water,DustDevils,DustStorm,Meteor,ColdWave,MapTemplateID,Breakthrough1,Breakthrough2,Breakthrough3,Breakthrough4,Breakthrough5,Breakthrough6,Breakthrough7,Breakthrough8,Breakthrough9,Breakthrough10,Breakthrough11,Breakthrough12,Breakthrough13")
                
                local landing = LandingSiteObject:new()
                landing.overlay_grids = {}
                landing:LoadOverlayGrids()

                for lat = -70 * 60, 70 * 60, 60 do
                    for long = -180 * 60, 180 * 60, 60 do
                        
                        GetOverlayValues(lat, long, landing.overlay_grids, landing.map_params)
                        landing:RecalcThreatAndResourceLevels()
                        
                        local p = landing.map_params
                        local threat = landing.threat_resource_levels
                        
                        if p then
                            local orig_params = g_CurrentMapParams
                            g_CurrentMapParams = p
                            local difficulty = (g_TitleObj and g_TitleObj:GetDifficultyBonus()) or 0
                            g_CurrentMapParams = orig_params
                            
                            local site_name = GetSiteName(lat, long, p.Locales)
                            local gen = (type(GetRandomMapGenerator) == "function" and GetRandomMapGenerator()) or { Seed = p.Seed or 0 }
                            
                            local map_template_id = "Unknown"
                            pcall(function() map_template_id = FillRandomMapProps(gen, p) end)
                            local topography = GetTopography(map_template_id)

                            local bt_output = {}
                            if #all_bt_ids > 0 then
                                local break_order = table.copy(all_bt_ids)
                                StableShuffle(break_order, CreateRand(true, gen.Seed or p.Seed or 0, "ShuffleBreakThroughTech"), 100)
                                for j = 1, 13 do
                                    local id = break_order[j]
                                    table.insert(bt_output, bt_translations[id] or "Unknown")
                                end
                            else
                                for j = 1, 13 do table.insert(bt_output, "None") end
                            end
                            
                            local lat_deg = math.floor(lat / 60)
                            local long_deg = math.floor(long / 60)
                            local lat_dir = lat_deg >= 0 and "S" or "N"
                            local long_dir = long_deg >= 0 and "E" or "W"
                            local coord_str = string.format("%d%s%d%s", math.abs(lat_deg), lat_dir, math.abs(long_deg), long_dir)
                            
                            print(string.format("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s",
                                coord_str,                          -- 1 
                                tostring(lat_deg),                  -- 2
                                tostring(long_deg),                 -- 3
                                tostring(p.Seed or 0),              -- 4
                                site_name,                          -- 5
                                tostring(p.Locales or 0),           -- 6
                                tostring(p.TerrainType or "Unknown"),-- 7
                                topography,                         -- 8
                                tostring(p.Altitude or 0),          -- 9
                                tostring(p.Temperature or 0),       -- 10
                                tostring(difficulty),               -- 11
                                tostring(threat.Metals),            -- 12 
                                tostring(threat.Concrete),          -- 13
                                tostring(threat.Water),             -- 14
                                tostring(threat.DustDevils),        -- 15
                                tostring(threat.DustStorm),         -- 16
                                tostring(threat.Meteor),            -- 17
                                tostring(threat.ColdWave),          -- 18
                                tostring(p.Metals or 0),            -- 19 
                                tostring(p.Concrete or 0),          -- 20
                                tostring(p.Water or 0),             -- 21
                                tostring(p.DustDevils or 0),        -- 22
                                tostring(p.DustStorm or 0),         -- 23
                                tostring(p.Meteor or 0),            -- 24
                                tostring(p.ColdWave or 0),          -- 25
                                tostring(map_template_id),          -- 26
                                table.unpack(bt_output)             -- 27 through 39
                            ))
                        end
                    end
                    
                    Sleep(1)
                end
                
                -- Cleanup
                if landing and landing.delete then landing:delete() end

                print("================== CSV END ==================")
                print("Full extraction complete.")
            end)
        end,
    }, self, context)
end