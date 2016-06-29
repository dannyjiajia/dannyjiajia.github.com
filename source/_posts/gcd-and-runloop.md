---
title: GCD与RunLoop
date: 2016-06-24 10:33:15
tags: [GCD,RunLoop]
---

最近发现iOS中的RunLoop和GCD被讨论的挺多的,我也写点复习下:)

### GCD
~~~
#import <Foundation/Foundation.h>

int main()
{
    dispatch_queue_t globalQ = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
    
    /** 异步任务 **/
    dispatch_async(globalQ, ^{
        NSLog(@"async task");
    });
    
    /** 同步任务 **/
    dispatch_sync(globalQ, ^{
        NSLog(@"sync task");
    });
    NSLog(@"sync end");
    
    /** 一次性执行 **/
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        NSLog(@"once task");
    });
    
    /**  延迟 2 秒执行 **/
    double delayInSeconds = 2.0;
    dispatch_time_t popTime = dispatch_time(DISPATCH_TIME_NOW, delayInSeconds * NSEC_PER_SEC);
    dispatch_after(popTime, globalQ, ^(void){
        NSLog(@"delay task");
    });
    
    
    /** global queue是并行的 **/
    dispatch_async(globalQ, ^{
        NSLog(@"global_queue_task_1");
    });

    
    dispatch_async(globalQ, ^{
        NSLog(@"global_queue_task_2");
    });
    
    /** 自定义串行queue **/
    dispatch_queue_t customSerialQ = dispatch_queue_create("customSerialQ", DISPATCH_QUEUE_SERIAL);
    
    dispatch_async(customSerialQ, ^{
        NSLog(@"customSerialQ_task_1");
    });
    
    
    dispatch_async(customSerialQ, ^{
        NSLog(@"customSerialQ_task_2");
    });

    
    /** 自定义并行queue **/
    dispatch_queue_t customConcurrentQ = dispatch_queue_create("customConcurrentQ", DISPATCH_QUEUE_CONCURRENT);
    
    dispatch_async(customConcurrentQ, ^{
        NSLog(@"customConcurrentQ_task_1");
    });
    
    
    dispatch_async(customConcurrentQ, ^{
        NSLog(@"customConcurrentQ_task_2");
    });
    
    
    /** 并行任务归总 **/
    
    dispatch_group_t group = dispatch_group_create();
    dispatch_group_async(group, globalQ, ^{
        NSLog(@"并行执行的线程1");
    });
    dispatch_group_async(group, globalQ, ^{
        NSLog(@"并行执行的线程2");
    });
    dispatch_group_notify(group, globalQ, ^{
       NSLog(@"并行执行任务完成");
    });
    
    /** dispatch_source **/
    //1. timer
    
    dispatch_source_t gcd_timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0,globalQ);
    dispatch_source_set_timer(gcd_timer, DISPATCH_TIME_NOW, 5ull * NSEC_PER_SEC, 0); //5s
    dispatch_source_set_event_handler(gcd_timer, ^{
        NSLog(@"gcd timer task");
    });
    dispatch_resume(gcd_timer);

    //2. 自定义source任务
    dispatch_source_t gcd_source = dispatch_source_create(DISPATCH_SOURCE_TYPE_DATA_ADD, 0, 0,globalQ);
    dispatch_source_set_event_handler(gcd_source, ^{
        NSLog(@"gcd source task");
    });
    dispatch_resume(gcd_source);
    
    //2s后触发source任务
    dispatch_after(popTime, globalQ, ^(void){
        NSLog(@"fire gcd source task");
        dispatch_source_merge_data(gcd_source, 1);
    });
    
    /** 信号量 **/
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    
    dispatch_async(globalQ, ^{
        NSLog(@"完成信号量任务");
        dispatch_semaphore_signal(semaphore);//增加信号量
    });
    //设置超时时间
    dispatch_time_t timeoutTime = dispatch_time(DISPATCH_TIME_NOW, 1ull*NSEC_PER_SEC);
    if (dispatch_semaphore_wait(semaphore, timeoutTime)) {
        NSLog(@"信号量任务超时");
    }
    dispatch_main(); //执行提交到main queue中的blocks,在iOS和Mac的桌面应用你不需要调用
}
~~~

### RunLoop

~~~
#import <Foundation/Foundation.h>

static void
_perform(void *info __unused)
{
    printf("Source0 event\n");
}

static void
_timer(CFRunLoopTimerRef timer __unused, void *info)
{
    NSLog(@"Timer fire Source0");
    CFRunLoopSourceSignal(info);
}

int main()
{

    /** 注册observer **/
    CFRunLoopRef runLoop = CFRunLoopGetCurrent();
    CFStringRef runLoopMode = kCFRunLoopDefaultMode;
    CFRunLoopObserverRef observer = CFRunLoopObserverCreateWithHandler(kCFAllocatorDefault, kCFRunLoopAllActivities, true, 0, ^(CFRunLoopObserverRef observer, CFRunLoopActivity _) {
        NSLog(@"observer event:%lu",_);
    });
    CFRunLoopAddObserver(runLoop, observer, runLoopMode);
    
    /** Source 0 **/
    CFRunLoopSourceRef source;
    CFRunLoopSourceContext source_context;
    bzero(&source_context, sizeof(source_context));
    source_context.perform = _perform;
    source = CFRunLoopSourceCreate(NULL, 0, &source_context);
    CFRunLoopAddSource(CFRunLoopGetCurrent(), source, kCFRunLoopDefaultMode);
    
    //2s后触发source0
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC), dispatch_get_main_queue(), ^(void){
        CFRunLoopSourceSignal(source);
    });
    
    /** Timer **/

    CFRunLoopTimerRef timer;
    CFRunLoopTimerContext timer_context;
    bzero(&timer_context, sizeof(timer_context));
    timer_context.info = source;
    timer = CFRunLoopTimerCreate(NULL, CFAbsoluteTimeGetCurrent(), 5, 0, 0,
                                 _timer, &timer_context);
    CFRunLoopAddTimer(CFRunLoopGetCurrent(), timer, kCFRunLoopDefaultMode);
    CFRunLoopRun();
    
}
~~~

### 我的总结

- 系统通过RunLoop执行主队列中的任务,这个RunLoop由`UIApplicationMain`或者`NSApplicationMain`或者`CFRunLoopRun`创建
- 两个不同的Timer,`NSTimer`依赖RunLoop来执行,GCD的Timer不需要RunLoop存在也能执行

### 最后

写的用例都是在Mac的命令行项目下测试的,感觉更能说明RunLoop的真实运行状态,比如测试`NSTimer`,如果不执行`CFRunLoopRun`,主线程是没有`RunLoop`的,`NSTimer`也会失效,而在`iOS`项目中,整个生命周期都是基于RunLoop,`NSTimer`也不会出现无效的情况.(指定特殊`Mode`的任务除外)