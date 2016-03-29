title: 如何在window phone控制屏幕常亮
date: 2016-01-31 16:54:42
tags: [Windows Phone,Windows Mobile]
categories: 技术博客
---

在WindowPhone下禁用锁屏的事件

<!-- more -->

### 定义工具类
~~~
public ref class Device sealed
{
private:
	Device(){ m_requestActivd = false; };
	Windows::System::Display::DisplayRequest^ m_display_request;
	bool m_requestActivd;
public:
	void DisplayRequestActive()
	{
		if (m_requestActivd) //如果重复调用会抛出错误
		{
			return;
		}
		if (nullptr == m_display_request)
		{
			m_display_request = ref new Windows::System::Display::DisplayRequest();
		}
		m_display_request->RequestActive();
		m_requestActivd = true;
	}

	void DisplayRequestRelease()
	{
		if (!m_requestActivd)
		{
			return;
		}
		if (nullptr != m_display_request)
		{
			m_display_request->RequestRelease();
			m_requestActivd = false;
		}
	}
	static property Device^ Instance
	{
		Device^ get()
		{
			static Device^ instance = ref new Device();
			return instance;
		}
	}
}
~~~

### 使用
~~~
//屏幕常亮
Device::Instance->DisplayRequestActive();
//关闭屏幕常亮
Device::Instance->DisplayRequestRelease();
~~~

over~~