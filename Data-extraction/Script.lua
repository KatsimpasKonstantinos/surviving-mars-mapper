local orig_Init = PGMissionLandingSpotRemastered.Init

local CSV_HEADERS = "Coords,Lat,Long,Seed,xxhashShuffleBreakThroughTech,SiteName,Locales,TerrainType,Topography,Rating,Altitude,Temperature,Difficulty,MapTemplateID"

local function GetSiteName(lat, long, locales_id)
    local name = ""
    if locales_id and rawget(_G, "MarsLocales") and MarsLocales[locales_id] then
        pcall(function()
            local trans = _InternalTranslate(MarsLocales[locales_id])
            if trans and trans ~= "" then name = string.gsub(trans, ",", "") end
        end)
    end
    return name
end

local function GetTopographyAndRating(map_template_id)
    if not map_template_id or map_template_id == "Unknown" then return "Unknown", 0 end
    local MapDataDict = rawget(_G, "MapDataPresets") or rawget(_G, "MapData")
    local mapdata = MapDataDict and MapDataDict[map_template_id]
    local rating = mapdata and mapdata.challenge_rating or 0
    local topo = "Mountainous"
    if rating <= 59 then topo = "Very Flat"
    elseif rating <= 99 then topo = "Steep"
    elseif rating <= 139 then topo = "Rough"
    end
    return topo, rating
end

local function FormatCoordinates(lat, long)
    local lat_deg = math.floor(lat / 60)
    local long_deg = math.floor(long / 60)
    local lat_dir = lat_deg >= 0 and "S" or "N"
    local long_dir = long_deg >= 0 and "E" or "W"
    local coord_str = string.format("%d%s%d%s", math.abs(lat_deg), lat_dir, math.abs(long_deg), long_dir)
    return coord_str, lat_deg, long_deg
end

function PGMissionLandingSpotRemastered:Init(parent, context)
    orig_Init(self, parent, context)
    
    XAction:new({
        ActionId = "extractLeanMapCSV",
        ActionSortKey = "zz", 
        ActionName = T(10001, "<green>RUN LEAN PLANET SCAN</green>"),
        ActionToolbar = "ActionBar",
        
        OnAction = function (self, host_btn, source, ...)
            CreateRealTimeThread(function()
                print("================== CSV START ==================")
                print(CSV_HEADERS)
                
                local landing = LandingSiteObject:new()
                landing.overlay_grids = {}
                landing:LoadOverlayGrids()
                
                for lat = -70 * 60, 70 * 60, 60 do
                    for long = -180 * 60, 180 * 60, 60 do
                        GetOverlayValues(lat, long, landing.overlay_grids, landing.map_params)
                        landing:RecalcThreatAndResourceLevels()
                        local p = landing.map_params
                        
                        if p then
                            local coord_str, lat_deg, long_deg = FormatCoordinates(lat, long)
                            local site_name = GetSiteName(lat, long, p.Locales)
                            local gen = (type(GetRandomMapGenerator) == "function" and GetRandomMapGenerator()) or { Seed = p.Seed or 0 }
                            local seed_val = p.Seed or 0
                            
                            local xxhashShuffleBreakThroughTech = xxhash(seed_val, "ShuffleBreakThroughTech")
                            
                            local map_template_id = "Unknown"
                            pcall(function() map_template_id = FillRandomMapProps(gen, p) end)
                            local topography, rating = GetTopographyAndRating(map_template_id)
                            
                            local row_data = {
                                coord_str, lat_deg, long_deg, seed_val, tostring(xxhashShuffleBreakThroughTech), site_name, 
                                p.Locales or 0, p.TerrainType or "Unknown", topography, rating, 
                                p.Altitude or 0, p.Temperature or 0, (g_TitleObj and g_TitleObj:GetDifficultyBonus()) or 0, 
                                map_template_id
                            }
                            
                            local row_strings = {}
                            for i, v in ipairs(row_data) do row_strings[i] = tostring(v) end
                            print(table.concat(row_strings, ","))
                        end
                    end
                    Sleep(1)
                end
                if landing and landing.delete then landing:delete() end
                print("================== CSV END ==================")
            end)
        end,
    }, self, context)
end