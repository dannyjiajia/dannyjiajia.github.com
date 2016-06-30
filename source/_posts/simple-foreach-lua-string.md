title: lua简单递归字符串
date: 2015-12-07 15:00:44
tags: [lua]
categories: 
---

~~~
	function string_foreach(str,func)
	    str:gsub(".", function(c)
	       func(c)
	    end)
	end

	local test = 'abcd'
	
	string_foreach(test,function(char)
		print(char)
	end)
~~~
