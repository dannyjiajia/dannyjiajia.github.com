---
title: (cpp)cx中将string转换成GUID
date: 2016-06-24 15:06:05
tags: [Windows Phone]
---

~~~
#include <windows.h>

using namespace Windows::ApplicationModel::Store;
using namespace Windows::Foundation;
using namespace Windows::Foundation::Collections;

Platform::String^ transactionId = "{xxxxx}"; //从微软的内购中获取的订单号字符串
GUID guid;
HRESULT hr = IIDFromString(transactionId->Data(), &guid);
if (SUCCEEDED(hr)) {
	Platform::Guid guid_transactionId(guid);
	auto fuillAsync = CurrentApp::ReportConsumableFulfillmentAsync(productId, guid_transactionId); //完成订单
}
~~~
