---
title: 用Lua实现A*寻路算法
date: 2016-07-22 19:37:17
tags: [Lua]
---

关于A*寻路的算法参考这篇[文章](http://www.cnblogs.com/zhoug2020/p/3468167.html)
<!-- more -->
# 实现

~~~
-------------------------------------------------------------------------------
-- 预定义工具类
-------------------------------------------------------------------------------
-- 定义类
function class(classname, super)
    local superType = type(super)
    local cls

    if superType ~= "function" and superType ~= "table" then
        superType = nil
        super = nil
    end

    if superType == "function" or (super and super.__ctype == 1) then
        -- inherited from native C++ Object
        cls = {}

        if superType == "table" then
            -- copy fields from super
            for k,v in pairs(super) do cls[k] = v end
            cls.__create = super.__create
            cls.super    = super
        else
            cls.__create = super
            cls.ctor = function() end
        end

        cls.__cname = classname
        cls.__ctype = 1

        function cls.new(...)
            local instance = cls.__create(...)
            -- copy fields from class to native object
            for k,v in pairs(cls) do instance[k] = v end
            instance.class = cls
            instance:ctor(...)
            return instance
        end

    else
        -- inherited from Lua Object
        if super then
            cls = {}
            setmetatable(cls, {__index = super})
            cls.super = super
        else
            cls = {ctor = function() end}
        end

        cls.__cname = classname
        cls.__ctype = 2 -- lua
        cls.__index = cls

        function cls.new(...)
            local instance = setmetatable({}, cls)
            instance.class = cls
            instance:ctor(...)
            return instance
        end
    end

    return cls
end

-- 判断是否是类的实例
function iskindof(obj, classname)
    local t = type(obj)
    local mt
    if t == "table" then
        mt = getmetatable(obj)
    end

    while mt do
        if mt.__cname == classname then
            return true
        end
        mt = mt.super
    end

    return false
end

-------------------------------------------------------------------------------
-- 逻辑
-------------------------------------------------------------------------------

local ASSERT_FUNC = function(op)
    assert(op,string.format("error:%s",debug.getinfo(1).name))
end

-- Point
local PathPoint = class("PathPoint")

function PathPoint:ctor(x,y)
    self:setX(x)
    self:setY(y)
end

function PathPoint:setX(x)
    self.x = x
end

function PathPoint:getX()
    return self.x
end

function PathPoint:setY(y)
    self.y = y
end

function PathPoint:getY()
    return self.y
end

function PathPoint:getXY()
    return self:getX(),self:getY()
end

function PathPoint:setG(g)
    self.g = g
end

function PathPoint:getG()
    return self.g or 0
end

function PathPoint:setH(h)
    self.h = h
end

function PathPoint:getH()
    return self.h
end

function PathPoint:getF()

    return (self:getG() and self:getH()) and (self:getG() + self:getH()) or 0
end

function PathPoint:setParent(point)
    ASSERT_FUNC(iskindof(point, "PathPoint"))
    self.parent = point
end

function PathPoint:getParent()
    return self.parent
end

function PathPoint:generalPointString()
    local infoString = string.format("PathPoint:[%s]@F|G|H:[%s %s %s]",
        self:ID(),
        tostring((self:getF() and self:getF() or  "unkown")),
        tostring((self:getG() and self:getG() or  "unkown")),
        tostring((self:getH() and self:getH() or  "unkown")))
    if self:getParent() then
        infoString = string.format("%s\nPathPoint:[%s]@Parent:%s",
            infoString,
            self:ID(),
            self:getParent():generalPointString())
    end
    return infoString
end

function PathPoint:ID()
    return string.format("%d_%d",self:getX(),self:getY())
end

PathPoint.__tostring = function(point)
    return point:generalPointString()
end 


-- Pathfinding 2D
local Pathfinding = class("Pathfinding")


function Pathfinding:ctor(mapData,reachableFunction)
    self.m_openList = {}
    self.m_closedList = {}
    self:setMapData(mapData)
    self:setReachableFunction(reachableFunction)
end

-- private functions

function Pathfinding:listAddPoint_(list,point)
    ASSERT_FUNC(type(list) == 'table' and iskindof(point,"PathPoint"))
    list[point:ID()] = point
end

function Pathfinding:listRemovePoint_(list,point)
    ASSERT_FUNC(type(list) == 'table' and iskindof(point,"PathPoint"))
    if list[point:ID()] then list[point:ID()] = nil end
end

function Pathfinding:listGetMinFPoint(list)
    ASSERT_FUNC(type(list) == 'table')
    local __,ret = next(list)
    for __,p in pairs(list) do
        if iskindof(p, "PathPoint") then
            if p:getF() < ret:getF() then
                ret = p
            end
        end
    end
    return ret
end

function Pathfinding:listContainsPoint(list,point)
    ASSERT_FUNC(type(list) == 'table' and iskindof(point,"PathPoint"))
    return list[point:ID()]
end

function Pathfinding:listIsEmpty(list)
    ASSERT_FUNC(type(list) == 'table')
    return not next(list)
end

-- logic private methods

function Pathfinding:canReach(point,x,y)
    if not self:isReachableByXY(x,y)  or self:isCloseListContainsPoint(PathPoint.new(x,y)) then return false end
    return math.abs(point:getX() - x) + math.abs(point:getY() - y) == 1
end

function Pathfinding:getSurroundPoints(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    local ret = {}
    for x = point:getX()-1,point:getX()+1 do
        for y = point:getY()-1,point:getY()+1 do
            if self:canReach(point,x,y) then
                table.insert(ret, PathPoint.new(x,y))
            end
        end
    end
    return ret
end

function Pathfinding:closeListAddPoint(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    self:listAddPoint_(self.m_closedList, point)
end

function Pathfinding:isCloseListContainsPoint(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    return self:listContainsPoint(self.m_closedList,point)
end

function Pathfinding:openListMinFPoint()
    return self:listGetMinFPoint(self.m_openList)
end

function Pathfinding:openListAddPoint(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    self:listAddPoint_(self.m_openList, point)
end

function Pathfinding:isOpenListIsEmpty()
    return self:listIsEmpty(self.m_openList)
end

function Pathfinding:openListRemovePoint(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    return self:listRemovePoint_(self.m_openList, point)
end

function Pathfinding:isOpenListContainsPoint(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    return self:listContainsPoint(self.m_openList,point)
end

function Pathfinding:getOpenListMinFPoint()
    return self:listGetMinFPoint(self.m_openList)
end

function Pathfinding:getMapItemDataByXY(x,y)
    if not self.m_mapData or not self.m_mapData[tonumber(x)] or not self.m_mapData[tonumber(x)][tonumber(y)] then
        return
    end
    return self.m_mapData[tonumber(x)][tonumber(y)]
end

function Pathfinding:isReachableByXY(x,y)
    if not self.m_reachableFunc then return true end -- if reachable function is not set,we want all postions are reachable.
    local itemData = self:getMapItemDataByXY(x,y)
    return itemData and self.m_reachableFunc(itemData)
end

function Pathfinding:isPointReadchable(point)
    ASSERT_FUNC(iskindof(point,"PathPoint"))
    return self:isReachableByXY(point:getX(),point:getY())
end

function Pathfinding:calcG(start,point)
    local G = 1
    local parentG = point:getParent() and point:getParent():getG() or 0
    return G + parentG
end

function Pathfinding:calcH(endP,point)
    return math.abs(point:getX() - endP:getX()) + math.abs(point:getY() - endP:getY())
end

function Pathfinding:notFoundPoint(tempStart,endP,point)
    point:setParent(tempStart)
    point:setG(self:calcG(tempStart,point))
    point:setH(self:calcH(endP,point))
    self:openListAddPoint(point)
end

function Pathfinding:foundPoint(tempStart,point)
    local G = self:calcG(tempStart,point)
    if G < point:getG() then
        point:setParent(tempStart)
        point:setG(G)
    end
end

function Pathfinding:generatePoints(point)
    local ret = {}
    if point then
        while point do
            table.insert(ret, point)
            point = point:getParent()
        end
    end
    return ret
end

-- public api
------------------------------------------------------------------

function Pathfinding:setReachableFunction(func)
    if not func then return end
    ASSERT_FUNC(type(func) == 'function')
    self.m_reachableFunc = func
end

function Pathfinding:setMapData(mapData)
    if not mapData then return end
    ASSERT_FUNC(type(mapData) == 'table')
    self.m_mapData = mapData
end

function Pathfinding:findPath(startPoint,endPoint)
    self:openListAddPoint(startPoint)
    while not self:isOpenListIsEmpty() do
        local tempPoint = self:openListMinFPoint()
        self:openListRemovePoint(tempPoint)
        self:closeListAddPoint(tempPoint)
        if self:isCloseListContainsPoint(endPoint) then
            return endPoint
        end
        local surroundPoints = self:getSurroundPoints(tempPoint)
        for __,point in ipairs(surroundPoints) do
            if self:isOpenListContainsPoint(point) then
                self:foundPoint(tempPoint, point)
            else
                self:notFoundPoint(tempPoint, endPoint, point)
            end
        end
        if self:isOpenListContainsPoint(endPoint) then
            return self:isOpenListContainsPoint(endPoint)
        end
    end
    return self:isOpenListContainsPoint(endPoint)
end


Pathfinding.PathPoint = PathPoint

return Pathfinding

~~~

# 使用

~~~
local Pathfinding = require("Pathfinding")
local PathPoint = Pathfinding.PathPoint
function generalMapData()
	local map = {
		{0,0,0,0,0,0},
		{0,0,0,1,0,0},
		{0,0,0,1,0,0},
		{0,1,0,1,0,0},
		{0,0,0,0,0,0},
		{0,0,0,0,0,0}
	}
	return map
end

function dumpMap(map)
	print("------------")
	print("-- Map Data")
	print("------------")
	for iR,row in ipairs(map) do
		if type(row) ~= 'table' then return end
		for iC,column in ipairs(row) do
			io.write(string.format("%s ",tostring(column)))
		end
		io.write("\n")
	end
	print("------------")
end

local data = generalMapData()
dumpMap(data)
local finder = Pathfinding.new(data,function(val)
	return val ~= 1 
end)

-- test find way from 3,2 to 3,5
local retPoint = finder:findPath(PathPoint.new(3,2),PathPoint.new(3,5))
if retPoint then
	while retPoint do
		data[retPoint:getX()][retPoint:getY()] = "*"
		retPoint = retPoint:getParent()
	end
end
dumpMap(data)
~~~